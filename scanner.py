#!/usr/bin/env python3
"""
GitHub Repository API Key Scanner
Scans GitHub repositories for exposed API keys and secrets.
"""

import re
import sys
import base64
import argparse
import urllib.request
import urllib.error
import json
from dataclasses import dataclass, field
from typing import Optional


# Patterns for common API keys and secrets
PATTERNS = {
    "AWS Access Key ID":        r"(?<![A-Z0-9])(AKIA|ABIA|ACCA|ASIA)[A-Z0-9]{16}(?![A-Z0-9])",
    "AWS Secret Access Key":    r"(?i)aws[_\-\s]*secret[_\-\s]*(?:access[_\-\s]*)?key['\"]?\s*[=:]\s*['\"]?([A-Za-z0-9/+=]{40})",
    "GitHub Token":             r"gh[pousr]_[A-Za-z0-9_]{36,255}",
    "GitHub Fine-grained Token":r"github_pat_[A-Za-z0-9_]{82}",
    "Slack Bot Token":          r"xoxb-[0-9]{10,13}-[0-9]{10,13}-[A-Za-z0-9]{24}",
    "Slack App Token":          r"xapp-\d-[A-Z0-9]+-\d+-[a-f0-9]+",
    "Slack Webhook":            r"https://hooks\.slack\.com/services/T[A-Z0-9]+/B[A-Z0-9]+/[A-Za-z0-9]+",
    "Stripe Live Key":          r"sk_live_[A-Za-z0-9]{24,}",
    "Stripe Test Key":          r"sk_test_[A-Za-z0-9]{24,}",
    "Stripe Publishable Key":   r"pk_live_[A-Za-z0-9]{24,}",
    "Twilio Account SID":       r"AC[a-f0-9]{32}",
    "Twilio Auth Token":        r"(?i)twilio[^'\"\n]{0,30}['\"]([a-f0-9]{32})['\"]",
    "SendGrid API Key":         r"SG\.[A-Za-z0-9_\-]{22}\.[A-Za-z0-9_\-]{43}",
    "Mailgun API Key":          r"key-[a-f0-9]{32}",
    "Google API Key":           r"AIza[A-Za-z0-9_\-]{35}",
    "Google OAuth Client":      r"[0-9]+-[A-Za-z0-9_]{32}\.apps\.googleusercontent\.com",
    "Firebase URL":             r"https://[a-z0-9-]+\.firebaseio\.com",
    "Heroku API Key":           r"(?i)heroku[^'\"\n]{0,30}['\"]([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})['\"]",
    "Private Key Block":        r"-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----",
    "JWT Token":                r"eyJ[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}",
    "NPM Token":                r"npm_[A-Za-z0-9]{36}",
    "PyPI Token":               r"pypi-[A-Za-z0-9_\-]{50,}",
    "Telegram Bot Token":       r"[0-9]{8,10}:[A-Za-z0-9_\-]{35}",
    "Cloudflare API Token":     r"(?i)cloudflare[^'\"\n]{0,30}['\"]([A-Za-z0-9_\-]{40})['\"]",
    "DigitalOcean Token":       r"(?i)digitalocean[^'\"\n]{0,30}['\"]([a-f0-9]{64})['\"]",
    "Generic Secret":           r"(?i)(?:secret|password|passwd|api[_-]?key|auth[_-]?token|access[_-]?token|private[_-]?key)['\"]?\s*[=:]\s*['\"]([A-Za-z0-9+/=_\-]{16,})['\"]",
}

# File extensions to skip (binary/large files unlikely to contain secrets as text)
SKIP_EXTENSIONS = {
    ".png", ".jpg", ".jpeg", ".gif", ".ico", ".svg", ".webp", ".bmp",
    ".mp4", ".mp3", ".wav", ".avi", ".mov", ".pdf", ".zip", ".tar",
    ".gz", ".jar", ".class", ".pyc", ".pyo", ".woff", ".woff2",
    ".ttf", ".eot", ".bin", ".exe", ".dll", ".so", ".dylib",
    ".lock",  # package-lock.json etc still scanned but .lock files skipped
}

# Files that commonly contain legitimate dummy/example values
LOW_CONFIDENCE_FILES = {
    "readme.md", "readme.rst", "readme.txt", "contributing.md",
    "changelog.md", "license", "example", "sample", "test",
}


@dataclass
class Finding:
    pattern_name: str
    file_path: str
    line_number: int
    line_content: str
    match: str


@dataclass
class ScanResult:
    repo: str
    files_scanned: int = 0
    files_skipped: int = 0
    findings: list = field(default_factory=list)


class GitHubScanner:
    BASE = "https://api.github.com"

    def __init__(self, token: Optional[str] = None):
        self.token = token
        self.headers = {
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        }
        if token:
            self.headers["Authorization"] = f"Bearer {token}"

    def _get(self, url: str) -> dict | list:
        req = urllib.request.Request(url, headers=self.headers)
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                return json.loads(resp.read().decode())
        except urllib.error.HTTPError as e:
            body = e.read().decode()
            raise RuntimeError(f"HTTP {e.code} for {url}: {body[:200]}")

    def get_tree(self, owner: str, repo: str, ref: str = "HEAD") -> list[dict]:
        """Return the full recursive file tree."""
        url = f"{self.BASE}/repos/{owner}/{repo}/git/trees/{ref}?recursive=1"
        data = self._get(url)
        if data.get("truncated"):
            print("[!] Tree is truncated — very large repo, results may be incomplete.", file=sys.stderr)
        return [item for item in data.get("tree", []) if item["type"] == "blob"]

    def get_file(self, owner: str, repo: str, path: str) -> Optional[str]:
        """Fetch file content (decoded from base64)."""
        url = f"{self.BASE}/repos/{owner}/{repo}/contents/{path}"
        try:
            data = self._get(url)
        except RuntimeError:
            return None
        if data.get("encoding") == "base64":
            try:
                return base64.b64decode(data["content"]).decode("utf-8", errors="replace")
            except Exception:
                return None
        return data.get("content")

    def scan_content(self, content: str, path: str) -> list[Finding]:
        findings = []
        lines = content.splitlines()
        for lineno, line in enumerate(lines, start=1):
            # Skip lines that look like comments explaining patterns
            stripped = line.strip()
            if stripped.startswith(("#", "//", "*", "<!--")):
                continue
            for name, pattern in PATTERNS.items():
                for m in re.finditer(pattern, line):
                    match_str = m.group(0)
                    # Use capture group 1 if present (extracts the secret value)
                    if m.lastindex and m.lastindex >= 1:
                        match_str = m.group(1)
                    findings.append(Finding(
                        pattern_name=name,
                        file_path=path,
                        line_number=lineno,
                        line_content=line.rstrip()[:200],
                        match=match_str[:80],
                    ))
        return findings

    def scan_repo(self, owner: str, repo: str, ref: str = "HEAD",
                  max_file_size: int = 1_000_000) -> ScanResult:
        result = ScanResult(repo=f"{owner}/{repo}")
        print(f"[*] Fetching file tree for {owner}/{repo} @ {ref} ...")
        blobs = self.get_tree(owner, repo, ref)
        print(f"[*] {len(blobs)} files found. Starting scan ...\n")

        for blob in blobs:
            path = blob["path"]
            ext = "." + path.rsplit(".", 1)[-1].lower() if "." in path else ""

            if ext in SKIP_EXTENSIONS:
                result.files_skipped += 1
                continue

            # Skip very large files
            if blob.get("size", 0) > max_file_size:
                result.files_skipped += 1
                continue

            content = self.get_file(owner, repo, path)
            if content is None:
                result.files_skipped += 1
                continue

            result.files_scanned += 1
            findings = self.scan_content(content, path)

            # Flag low-confidence files
            fname = path.lower().split("/")[-1]
            is_low_conf = any(lc in fname for lc in LOW_CONFIDENCE_FILES)

            for f in findings:
                f.pattern_name = f"{f.pattern_name} [LOW CONFIDENCE - example file?]" if is_low_conf else f.pattern_name
                result.findings.append(f)
                print(f"  [FOUND] {f.pattern_name}")
                print(f"          File   : {f.file_path}:{f.line_number}")
                print(f"          Match  : {f.match}")
                print(f"          Line   : {f.line_content}\n")

        return result


def print_summary(result: ScanResult):
    print("=" * 60)
    print(f"  Scan complete: {result.repo}")
    print(f"  Files scanned : {result.files_scanned}")
    print(f"  Files skipped : {result.files_skipped}")
    print(f"  Findings      : {len(result.findings)}")
    print("=" * 60)
    if not result.findings:
        print("  No secrets detected.")
    else:
        # Group by pattern
        by_type: dict[str, list[Finding]] = {}
        for f in result.findings:
            by_type.setdefault(f.pattern_name, []).append(f)
        print("\n  Breakdown by type:")
        for pname, flist in sorted(by_type.items(), key=lambda x: -len(x[1])):
            print(f"    {len(flist):3d}  {pname}")


def main():
    parser = argparse.ArgumentParser(
        description="Scan a GitHub repository for exposed API keys and secrets."
    )
    parser.add_argument("repo", help="Repository in owner/repo format (e.g. octocat/Hello-World)")
    parser.add_argument("--token", "-t", help="GitHub personal access token (increases rate limit)", default=None)
    parser.add_argument("--ref", "-r", help="Git ref (branch, tag, commit SHA) to scan", default="HEAD")
    parser.add_argument("--max-size", "-s", type=int, default=1_000_000,
                        help="Max file size in bytes to scan (default: 1MB)")
    parser.add_argument("--output", "-o", help="Write findings as JSON to this file")
    args = parser.parse_args()

    if "/" not in args.repo:
        parser.error("repo must be in owner/repo format")

    owner, repo = args.repo.split("/", 1)
    scanner = GitHubScanner(token=args.token)

    try:
        result = scanner.scan_repo(owner, repo, ref=args.ref, max_file_size=args.max_size)
    except RuntimeError as e:
        print(f"[ERROR] {e}", file=sys.stderr)
        sys.exit(1)

    print_summary(result)

    if args.output:
        data = {
            "repo": result.repo,
            "files_scanned": result.files_scanned,
            "files_skipped": result.files_skipped,
            "findings": [
                {
                    "pattern": f.pattern_name,
                    "file": f.file_path,
                    "line": f.line_number,
                    "match": f.match,
                    "line_content": f.line_content,
                }
                for f in result.findings
            ],
        }
        with open(args.output, "w") as fh:
            json.dump(data, fh, indent=2)
        print(f"\n[*] Results written to {args.output}")


if __name__ == "__main__":
    main()

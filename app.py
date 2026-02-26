from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field
from datetime import datetime
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

BASE_DIR = Path(__file__).parent


@dataclass
class Contact:
    id: int
    name: str
    title: str
    email: str
    phone: str
    company: str
    industry: str
    employee_count: int
    location: str
    seniority: str
    intent_score: int
    technologies: list[str] = field(default_factory=list)


@dataclass
class Deal:
    id: int
    company: str
    value: int
    stage: str
    owner: str


CONTACTS: list[Contact] = [
    Contact(1, "Ava Chen", "VP Marketing", "ava@northstar.ai", "+1-415-555-1101", "Northstar AI", "SaaS", 350, "San Francisco, CA", "VP", 92, ["HubSpot", "Salesforce"]),
    Contact(2, "Ethan Brooks", "Director of RevOps", "ethan@luminahealth.com", "+1-617-555-1102", "Lumina Health", "Healthcare", 1200, "Boston, MA", "Director", 84, ["Marketo", "Snowflake"]),
    Contact(3, "Sofia Patel", "Head of Sales", "sofia@orbitpay.io", "+1-646-555-1103", "OrbitPay", "FinTech", 540, "New York, NY", "Head", 78, ["Outreach", "Stripe"]),
    Contact(4, "Noah Garcia", "CTO", "noah@veridianlogistics.com", "+1-312-555-1104", "Veridian Logistics", "Logistics", 2000, "Chicago, IL", "C-Level", 66, ["AWS", "Datadog"]),
    Contact(5, "Maya Singh", "Growth Lead", "maya@skylabdata.com", "+1-206-555-1105", "SkyLab Data", "SaaS", 95, "Seattle, WA", "Manager", 88, ["Pipedrive", "Segment"]),
    Contact(6, "Liam Turner", "COO", "liam@heliobiotech.com", "+1-919-555-1106", "Helio Biotech", "Biotech", 430, "Raleigh, NC", "C-Level", 73, ["SAP", "Tableau"]),
]

LISTS: dict[str, list[int]] = {"High Intent SaaS": [1, 5], "Q3 ABM Targets": [2, 3]}
SEQUENCES: list[dict] = []
DEALS: list[Deal] = [
    Deal(1, "Northstar AI", 45000, "Qualified", "Alex"),
    Deal(2, "OrbitPay", 78000, "Demo Scheduled", "Sam"),
    Deal(3, "Lumina Health", 125000, "Proposal", "Jordan"),
]


class Handler(BaseHTTPRequestHandler):
    def _json(self, payload, status=HTTPStatus.OK):
        raw = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def _read_json(self):
        length = int(self.headers.get("Content-Length", "0"))
        data = self.rfile.read(length) if length else b"{}"
        return json.loads(data.decode("utf-8"))

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/":
            return self._serve_file(BASE_DIR / "templates" / "index.html", "text/html")
        if parsed.path.startswith("/static/"):
            return self._serve_static(parsed.path)
        if parsed.path == "/api/contacts":
            return self._contacts(parsed.query)
        if parsed.path == "/api/lists":
            payload = []
            for list_name, ids in LISTS.items():
                contacts = [asdict(c) for c in CONTACTS if c.id in ids]
                payload.append({"name": list_name, "count": len(ids), "contacts": contacts})
            return self._json(payload)
        if parsed.path == "/api/deals":
            return self._json([asdict(d) for d in DEALS])
        if parsed.path == "/api/dashboard":
            total_contacts = len(CONTACTS)
            high_intent = len([c for c in CONTACTS if c.intent_score >= 80])
            total_pipeline = sum(d.value for d in DEALS)
            return self._json({
                "totalContacts": total_contacts,
                "highIntentContacts": high_intent,
                "totalPipeline": total_pipeline,
                "activeSequences": len(SEQUENCES),
                "conversionRate": 23.4,
            })

        self.send_error(HTTPStatus.NOT_FOUND, "Not found")

    def do_POST(self):
        parsed = urlparse(self.path)
        data = self._read_json()
        if parsed.path == "/api/lists":
            name = data.get("name", "").strip()
            ids = [int(i) for i in data.get("ids", [])]
            if not name:
                return self._json({"error": "List name is required"}, HTTPStatus.BAD_REQUEST)
            LISTS[name] = ids
            return self._json({"ok": True, "name": name, "count": len(ids)})
        if parsed.path == "/api/enrich":
            contact_id = int(data.get("contactId", 0))
            match = next((c for c in CONTACTS if c.id == contact_id), None)
            if not match:
                return self._json({"error": "Contact not found"}, HTTPStatus.NOT_FOUND)
            return self._json({
                "linkedin": f"https://linkedin.com/in/{match.name.lower().replace(' ', '-')}",
                "signals": [
                    "Visited pricing page in last 14 days",
                    f"Hiring for {match.industry} roles",
                    "Recently expanded GTM team",
                ],
                "lastUpdated": datetime.utcnow().isoformat() + "Z",
            })
        if parsed.path == "/api/sequences":
            sequence = {
                "name": data.get("name", "New Sequence"),
                "steps": data.get("steps", []),
                "contactIds": data.get("contactIds", []),
                "createdAt": datetime.utcnow().isoformat() + "Z",
            }
            SEQUENCES.append(sequence)
            return self._json({"ok": True, "sequence": sequence})

        self.send_error(HTTPStatus.NOT_FOUND, "Not found")

    def _contacts(self, query: str):
        params = parse_qs(query)
        industry = (params.get("industry", [""])[0]).strip().lower()
        location = (params.get("location", [""])[0]).strip().lower()
        seniority = (params.get("seniority", [""])[0]).strip().lower()
        min_employees = int(params.get("minEmployees", [0])[0] or 0)
        min_intent = int(params.get("minIntent", [0])[0] or 0)
        technology = (params.get("technology", [""])[0]).strip().lower()

        filtered = CONTACTS
        if industry:
            filtered = [c for c in filtered if c.industry.lower() == industry]
        if location:
            filtered = [c for c in filtered if location in c.location.lower()]
        if seniority:
            filtered = [c for c in filtered if c.seniority.lower() == seniority]
        if technology:
            filtered = [c for c in filtered if any(technology in t.lower() for t in c.technologies)]
        filtered = [c for c in filtered if c.employee_count >= min_employees and c.intent_score >= min_intent]
        return self._json([asdict(c) for c in filtered])

    def _serve_static(self, route_path: str):
        local = BASE_DIR / route_path.lstrip("/")
        if local.suffix == ".css":
            return self._serve_file(local, "text/css")
        if local.suffix == ".js":
            return self._serve_file(local, "text/javascript")
        return self.send_error(HTTPStatus.NOT_FOUND, "Unknown static")

    def _serve_file(self, filepath: Path, content_type: str):
        if not filepath.exists():
            return self.send_error(HTTPStatus.NOT_FOUND, "Missing file")
        raw = filepath.read_bytes()
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)


if __name__ == "__main__":
    server = ThreadingHTTPServer(("0.0.0.0", 5000), Handler)
    print("Serving ProspectPilot at http://localhost:5000")
    server.serve_forever()

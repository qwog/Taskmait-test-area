import { createHash } from 'crypto';

function sortKeys(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(sortKeys);
  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj as Record<string, unknown>)
      .sort()
      .reduce((acc, key) => {
        (acc as Record<string, unknown>)[key] = sortKeys(
          (obj as Record<string, unknown>)[key]
        );
        return acc;
      }, {} as Record<string, unknown>);
  }
  return obj;
}

export function hashPDO(
  proof: unknown,
  decision: unknown,
  outcome: unknown
): string {
  const payload = sortKeys({ proof, decision, outcome });
  return createHash('sha256')
    .update(JSON.stringify(payload))
    .digest('hex');
}

export function verifyHash(
  proof: unknown,
  decision: unknown,
  outcome: unknown,
  expectedHash: string
): boolean {
  return hashPDO(proof, decision, outcome) === expectedHash;
}

export function hashString(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

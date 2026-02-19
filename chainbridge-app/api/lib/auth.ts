import type { VercelRequest, VercelResponse } from '@vercel/node';

export interface AuthContext {
  org_id: string;
  user_id: string;
}

/**
 * Extracts and validates auth context from a Supabase JWT.
 * In production, use a proper JWT library (e.g. jsonwebtoken) to verify
 * the signature against SUPABASE_JWT_SECRET. For MVP we decode claims only.
 */
export function verifyAuth(req: VercelRequest): AuthContext | null {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7);
  try {
    // Base64url decode the payload segment (index 1)
    const payloadB64 = token.split('.')[1];
    if (!payloadB64) return null;
    const payload = JSON.parse(
      Buffer.from(payloadB64, 'base64url').toString('utf8')
    );

    const org_id: string | undefined = payload.app_metadata?.org_id;
    const user_id: string | undefined = payload.sub;

    if (!org_id || !user_id) return null;

    // Check token expiry
    if (payload.exp && Date.now() / 1000 > payload.exp) return null;

    return { org_id, user_id };
  } catch {
    return null;
  }
}

/** Helper to return a 401 and short-circuit a handler. */
export function unauthorized(res: VercelResponse): void {
  res.status(401).json({ error: 'Unauthorized' });
}

import { createClient, RedisClientType } from 'redis';

let _redis: RedisClientType | null = null;
let _connecting = false;

/**
 * Returns a connected Redis client.
 * Reuses the existing connection if already established.
 * SCRAM state is stored in Redis for fast real-time access alongside
 * the durable Supabase record.
 */
export async function getRedis(): Promise<RedisClientType> {
  if (_redis?.isOpen) return _redis;

  if (_connecting) {
    // Wait for the in-progress connection
    await new Promise((r) => setTimeout(r, 200));
    if (_redis?.isOpen) return _redis!;
  }

  _connecting = true;

  const url = process.env.REDIS_URL || 'redis://localhost:6379';
  const client = createClient({ url }) as RedisClientType;

  client.on('error', (err) => {
    console.error('[Redis] connection error:', err);
  });

  await client.connect();
  _redis = client;
  _connecting = false;

  return _redis;
}

// ── SCRAM helpers ──────────────────────────────────────────────────────────

const SCRAM_PREFIX = 'scram:active:';
const SCRAM_TTL_SECONDS = 60 * 60 * 24; // 24 h fallback TTL

export interface ScramRedisEntry {
  id: string;
  org_id: string;
  facility_id: string;
  severity: string;
  reason: string;
  triggered_at: string;
  status: 'active' | 'resolved' | 'escalated';
}

export async function setScramActive(entry: ScramRedisEntry): Promise<void> {
  const redis = await getRedis();
  const key = `${SCRAM_PREFIX}${entry.id}`;
  await redis.set(key, JSON.stringify(entry), { EX: SCRAM_TTL_SECONDS });
  // Also push to a per-org set for quick listing
  await redis.sAdd(`scrams:org:${entry.org_id}`, entry.id);
}

export async function resolveScramInRedis(scramId: string, orgId: string): Promise<void> {
  const redis = await getRedis();
  await redis.del(`${SCRAM_PREFIX}${scramId}`);
  await redis.sRem(`scrams:org:${orgId}`, scramId);
}

export async function getActiveScramIds(orgId: string): Promise<string[]> {
  const redis = await getRedis();
  return redis.sMembers(`scrams:org:${orgId}`);
}

export async function getScramById(scramId: string): Promise<ScramRedisEntry | null> {
  const redis = await getRedis();
  const raw = await redis.get(`${SCRAM_PREFIX}${scramId}`);
  if (!raw) return null;
  return JSON.parse(raw) as ScramRedisEntry;
}

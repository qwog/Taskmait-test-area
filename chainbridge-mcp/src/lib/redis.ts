// Use the named Redis export which has proper constructor typings
import { Redis } from 'ioredis';

let redis: Redis | null = null;

export function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(process.env.UPSTASH_REDIS_URL!, {
      password: process.env.UPSTASH_REDIS_TOKEN,
      tls: { rejectUnauthorized: false },
      retryStrategy: (times: number) => Math.min(times * 100, 3000),
      maxRetriesPerRequest: 3,
    });
  }
  return redis;
}

export async function setScramState(
  scramId: string,
  facilityId: string,
  lineId: string,
  severity: string
): Promise<void> {
  const r = getRedis();
  const key = `scram:active:${scramId}`;
  await r.setex(
    key,
    86400,
    JSON.stringify({
      scramId,
      facilityId,
      lineId,
      severity,
      triggeredAt: new Date().toISOString(),
    })
  );
  await r.sadd('scrams:active', scramId);
}

export async function clearScramState(scramId: string): Promise<void> {
  const r = getRedis();
  await r.del(`scram:active:${scramId}`);
  await r.srem('scrams:active', scramId);
}

export async function getActiveScrams(): Promise<string[]> {
  const r = getRedis();
  return r.smembers('scrams:active');
}

export async function setCache(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  const r = getRedis();
  await r.setex(key, ttlSeconds, JSON.stringify(value));
}

export async function getCache<T>(key: string): Promise<T | null> {
  const r = getRedis();
  const raw = await r.get(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function deleteCache(key: string): Promise<void> {
  const r = getRedis();
  await r.del(key);
}

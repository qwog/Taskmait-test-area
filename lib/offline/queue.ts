"use client";

import { openDB, type IDBPDatabase } from "idb";

const DB = "pourguard-offline";
const STORE = "queue";

interface QueueRecord {
  id?: number;
  createdAt: string;
  endpoint: string;
  method: "POST" | "PATCH" | "PUT";
  body: unknown;
}

async function db(): Promise<IDBPDatabase> {
  return openDB(DB, 1, {
    upgrade(d) {
      if (!d.objectStoreNames.contains(STORE)) {
        d.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
      }
    },
  });
}

export async function enqueue(record: Omit<QueueRecord, "id" | "createdAt">) {
  const d = await db();
  await d.add(STORE, { ...record, createdAt: new Date().toISOString() });
}

export async function flush(): Promise<number> {
  if (!navigator.onLine) return 0;
  const d = await db();
  const tx = d.transaction(STORE, "readwrite");
  const store = tx.objectStore(STORE);
  const all = (await store.getAll()) as QueueRecord[];
  let flushed = 0;
  for (const rec of all) {
    try {
      const res = await fetch(rec.endpoint, {
        method: rec.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rec.body),
      });
      if (res.ok && rec.id !== undefined) {
        await store.delete(rec.id);
        flushed++;
      }
    } catch {
      // keep for next attempt
    }
  }
  await tx.done;
  return flushed;
}

export function installFlushListener() {
  if (typeof window === "undefined") return;
  window.addEventListener("online", () => void flush());
}

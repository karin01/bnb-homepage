import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type RuntimeTempBlock = {
  ip: string;
  reason: string;
  until: number;
  countryCode: string;
};

export type RuntimeAccessEvent = {
  ip: string;
  countryCode: string;
  action: string;
  allowed: boolean;
  at: number;
  message: string;
};

type RuntimeStore = {
  tempBlocks: RuntimeTempBlock[];
  recent: RuntimeAccessEvent[];
  hourly: Record<string, number[]>;
};

const STORE_FILE = path.join(process.cwd(), "data", "security-runtime.json");
const MAX_RECENT = 80;

const memory: { cache: RuntimeStore | null } = { cache: null };

function emptyStore(): RuntimeStore {
  return { tempBlocks: [], recent: [], hourly: {} };
}

async function readStore(): Promise<RuntimeStore> {
  if (memory.cache) {
    return memory.cache;
  }
  try {
    const raw = await readFile(STORE_FILE, "utf8");
    const parsed = JSON.parse(raw) as RuntimeStore;
    memory.cache = {
      tempBlocks: Array.isArray(parsed.tempBlocks) ? parsed.tempBlocks : [],
      recent: Array.isArray(parsed.recent) ? parsed.recent : [],
      hourly: parsed.hourly && typeof parsed.hourly === "object" ? parsed.hourly : {},
    };
    return memory.cache;
  } catch {
    memory.cache = emptyStore();
    return memory.cache;
  }
}

async function writeStore(store: RuntimeStore) {
  memory.cache = store;
  await mkdir(path.dirname(STORE_FILE), { recursive: true });
  await writeFile(STORE_FILE, JSON.stringify(store, null, 2), "utf8");
}

function pruneOld(store: RuntimeStore, now: number) {
  store.tempBlocks = store.tempBlocks.filter((item) => item.until > now);
  const hourAgo = now - 60 * 60 * 1000;
  const nextHourly: Record<string, number[]> = {};
  for (const [key, stamps] of Object.entries(store.hourly)) {
    const kept = (stamps ?? []).filter((stamp) => stamp > hourAgo);
    if (kept.length > 0) {
      nextHourly[key] = kept;
    }
  }
  store.hourly = nextHourly;
}

export async function listRuntimeTempBlocks() {
  const store = await readStore();
  pruneOld(store, Date.now());
  await writeStore(store);
  return store.tempBlocks;
}

export async function listRuntimeEvents() {
  const store = await readStore();
  return store.recent;
}

export async function findActiveTempBlock(ip: string) {
  const store = await readStore();
  const now = Date.now();
  pruneOld(store, now);
  return store.tempBlocks.find((item) => item.ip === ip && item.until > now) ?? null;
}

export async function addRuntimeTempBlock(input: RuntimeTempBlock) {
  const store = await readStore();
  const now = Date.now();
  pruneOld(store, now);
  store.tempBlocks = store.tempBlocks.filter((item) => item.ip !== input.ip);
  store.tempBlocks.unshift(input);
  await writeStore(store);
}

export async function removeRuntimeTempBlock(ip: string) {
  const store = await readStore();
  store.tempBlocks = store.tempBlocks.filter((item) => item.ip !== ip);
  await writeStore(store);
}

export async function recordAccessEvent(event: RuntimeAccessEvent) {
  const store = await readStore();
  store.recent = [event, ...store.recent].slice(0, MAX_RECENT);
  await writeStore(store);
}

export async function countAndAddHourly(ip: string, action: string) {
  const store = await readStore();
  const now = Date.now();
  pruneOld(store, now);
  const key = `${action}:${ip}`;
  const stamps = store.hourly[key] ?? [];
  stamps.push(now);
  store.hourly[key] = stamps;
  await writeStore(store);
  return stamps.length;
}

export async function countRecentActions(ip: string, windowMs: number) {
  const store = await readStore();
  const since = Date.now() - windowMs;
  return store.recent.filter((item) => item.ip === ip && item.at >= since).length;
}

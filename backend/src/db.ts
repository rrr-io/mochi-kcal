import { createRequire } from "node:module";
import type { DatabaseSync as DatabaseSyncT } from "node:sqlite";
// loaded with require: SQLite built into Node 22, no native modules to compile for arm64
const { DatabaseSync } = createRequire(import.meta.url)("node:sqlite") as { DatabaseSync: typeof DatabaseSyncT };
import fs from "node:fs";
import path from "node:path";
import { config } from "./config.js";

fs.mkdirSync(config.dataDir, { recursive: true });
export const db = new DatabaseSync(path.join(config.dataDir, "mochi.db"));
db.exec("PRAGMA journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS days (
  date TEXT PRIMARY KEY,           -- YYYY-MM-DD, local time
  entries TEXT NOT NULL DEFAULT '[]',
  water INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS foods (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  updated INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS weights (
  date TEXT PRIMARY KEY,
  kg REAL NOT NULL
);
CREATE TABLE IF NOT EXISTS kv (
  k TEXT PRIMARY KEY,
  v TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS barcodes (
  code TEXT PRIMARY KEY,
  data TEXT,                       -- null = not found
  fetched INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS push_subs (
  endpoint TEXT PRIMARY KEY,
  sub TEXT NOT NULL
);
`);

export const DEFAULT_PROFILE = { goal: 1600, protein: 80, water: 2100, sex: "f", act: "1.2" };

export function getProfile(): Record<string, unknown> {
  const row = db.prepare("SELECT v FROM kv WHERE k='profile'").get() as { v: string } | undefined;
  return row ? { ...DEFAULT_PROFILE, ...JSON.parse(row.v) } : { ...DEFAULT_PROFILE };
}
export function setProfile(p: Record<string, unknown>) {
  db.prepare("INSERT INTO kv(k,v) VALUES('profile',?) ON CONFLICT(k) DO UPDATE SET v=excluded.v").run(JSON.stringify(p));
}

export type Day = { date: string; entries: unknown[]; water: number };
export function getDay(date: string): Day {
  const row = db.prepare("SELECT entries, water FROM days WHERE date=?").get(date) as { entries: string; water: number } | undefined;
  return { date, entries: row ? JSON.parse(row.entries) : [], water: row?.water ?? 0 };
}
export function putDay(d: Day) {
  db.prepare(
    "INSERT INTO days(date,entries,water) VALUES(?,?,?) ON CONFLICT(date) DO UPDATE SET entries=excluded.entries, water=excluded.water"
  ).run(d.date, JSON.stringify(d.entries), d.water);
}

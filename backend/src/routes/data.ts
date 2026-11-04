import type { FastifyInstance } from "fastify";
import crypto from "node:crypto";
import { db, getDay, getProfile, putDay, setProfile } from "../db.js";
import { isDate, num } from "../util.js";

const MEALS = new Set(["breakfast", "lunch", "dinner", "snack"]);

function cleanEntry(e: any) {
  return {
    id: String(e?.id || crypto.randomUUID()).slice(0, 40),
    t: Number(e?.t) || Date.now(),
    name: String(e?.name || "Food").slice(0, 120),
    grams: e?.grams ? num(e.grams) : null,
    meal: MEALS.has(e?.meal) ? e.meal : "snack",
    kcal: Math.round(num(e?.kcal)),
    p: +num(e?.p).toFixed(1),
    c: +num(e?.c).toFixed(1),
    f: +num(e?.f).toFixed(1),
  };
}

function cleanFood(f: any) {
  return {
    id: String(f?.id || crypto.randomUUID()).slice(0, 40),
    name: String(f?.name || "Food").slice(0, 80),
    brand: f?.brand ? String(f.brand).slice(0, 40) : null,
    kcal100: num(f?.kcal100), p100: num(f?.p100), c100: num(f?.c100), f100: num(f?.f100),
    pack: num(f?.pack) || null,
    portion: f?.portion ? String(f.portion).slice(0, 40) : null,
    portionGrams: num(f?.portionGrams) || null,
    barcode: f?.barcode ? String(f.barcode).slice(0, 20) : null,
  };
}

export async function dataRoutes(app: FastifyInstance) {
  // --- days ---
  app.get<{ Params: { date: string } }>("/api/days/:date", async (req, reply) => {
    if (!isDate(req.params.date)) return reply.code(400).send({ error: "Invalid date." });
    return getDay(req.params.date);
  });

  app.get<{ Querystring: { from?: string; to?: string } }>("/api/days", async (req, reply) => {
    const { from, to } = req.query;
    if (!isDate(from) || !isDate(to)) return reply.code(400).send({ error: "Invalid range." });
    const rows = db.prepare("SELECT date, entries, water FROM days WHERE date BETWEEN ? AND ? ORDER BY date").all(from, to) as any[];
    return rows.map((r) => {
      const entries = JSON.parse(r.entries) as { kcal: number }[];
      return { date: r.date, kcal: entries.reduce((a, e) => a + (e.kcal || 0), 0), water: r.water };
    });
  });

  app.post<{ Params: { date: string }; Body: { entries?: unknown[] } }>("/api/days/:date/entries", async (req, reply) => {
    if (!isDate(req.params.date)) return reply.code(400).send({ error: "Invalid date." });
    const list = Array.isArray(req.body?.entries) ? req.body.entries : [];
    if (!list.length) return reply.code(400).send({ error: "No food to add." });
    const d = getDay(req.params.date);
    d.entries = [...d.entries, ...list.slice(0, 30).map(cleanEntry)];
    putDay(d);
    return d;
  });

  app.delete<{ Params: { date: string; id: string } }>("/api/days/:date/entries/:id", async (req, reply) => {
    if (!isDate(req.params.date)) return reply.code(400).send({ error: "Invalid date." });
    const d = getDay(req.params.date);
    d.entries = d.entries.filter((e: any) => e.id !== req.params.id);
    putDay(d);
    return d;
  });

  // restore after "Undo"
  app.put<{ Params: { date: string }; Body: { entries?: unknown[]; water?: number } }>("/api/days/:date", async (req, reply) => {
    if (!isDate(req.params.date)) return reply.code(400).send({ error: "Invalid date." });
    const d = getDay(req.params.date);
    if (Array.isArray(req.body?.entries)) d.entries = req.body.entries.slice(0, 200).map(cleanEntry);
    if (req.body?.water != null) d.water = Math.min(Math.round(num(req.body.water)), 6000);
    putDay(d);
    return d;
  });

  app.post<{ Params: { date: string }; Body: { delta?: number } }>("/api/days/:date/water", async (req, reply) => {
    if (!isDate(req.params.date)) return reply.code(400).send({ error: "Invalid date." });
    const d = getDay(req.params.date);
    d.water = Math.max(0, Math.min(6000, d.water + Math.round(Number(req.body?.delta) || 0)));
    putDay(d);
    return d;
  });

  // --- saved foods ---
  app.get("/api/foods", async () =>
    (db.prepare("SELECT data FROM foods ORDER BY updated DESC LIMIT 300").all() as { data: string }[]).map((r) => JSON.parse(r.data))
  );
  app.post<{ Body: unknown }>("/api/foods", async (req) => {
    const f = cleanFood(req.body);
    // same name+brand → update instead of duplicating
    const dup = (db.prepare("SELECT id, data FROM foods").all() as { id: string; data: string }[]).find((r) => {
      const x = JSON.parse(r.data);
      return (x.name + "|" + (x.brand || "")).toLowerCase() === (f.name + "|" + (f.brand || "")).toLowerCase();
    });
    if (dup) f.id = dup.id;
    db.prepare("INSERT INTO foods(id,data,updated) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data, updated=excluded.updated").run(
      f.id, JSON.stringify(f), Date.now()
    );
    return f;
  });
  app.delete<{ Params: { id: string } }>("/api/foods/:id", async (req) => {
    db.prepare("DELETE FROM foods WHERE id=?").run(req.params.id);
    return { ok: true };
  });

  // --- weight ---
  app.get("/api/weights", async () => db.prepare("SELECT date, kg FROM weights ORDER BY date").all());
  app.put<{ Params: { date: string }; Body: { kg?: number } }>("/api/weights/:date", async (req, reply) => {
    const kg = num(req.body?.kg);
    if (!isDate(req.params.date) || kg < 20 || kg > 400) return reply.code(400).send({ error: "Invalid weight or date." });
    db.prepare("INSERT INTO weights(date,kg) VALUES(?,?) ON CONFLICT(date) DO UPDATE SET kg=excluded.kg").run(req.params.date, Math.round(kg * 10) / 10);
    return { ok: true };
  });
  app.delete<{ Params: { date: string } }>("/api/weights/:date", async (req) => {
    db.prepare("DELETE FROM weights WHERE date=?").run(req.params.date);
    return { ok: true };
  });

  // --- profile / goals ---
  app.get("/api/profile", async () => getProfile());
  app.put<{ Body: Record<string, unknown> }>("/api/profile", async (req) => {
    const b = req.body ?? {};
    const cur = getProfile();
    const pick = <T>(k: string, f: (v: unknown) => T) => (k in b ? f(b[k]) : cur[k]);
    const next = {
      goal: pick("goal", (v) => Math.round(num(v)) || 1600),
      protein: pick("protein", (v) => Math.round(num(v))),
      water: pick("water", (v) => Math.min(Math.round(num(v)), 6000) || 2100),
      sex: pick("sex", (v) => (v === "m" ? "m" : "f")),
      age: pick("age", (v) => num(v) || null),
      height: pick("height", (v) => num(v) || null),
      act: pick("act", (v) => (["1.2", "1.375", "1.55", "1.725"].includes(String(v)) ? String(v) : "1.2")),
      targetKg: pick("targetKg", (v) => num(v) || null),
      targetDate: pick("targetDate", (v) => (isDate(v) ? v : null)),
    };
    setProfile(next);
    return next;
  });
}

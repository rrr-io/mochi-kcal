import { afterAll, beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { FastifyInstance } from "fastify";

// temporary database, no network: the AI and Open Food Facts are never called
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mochi-"));
Object.assign(process.env, { NODE_ENV: "test", APP_PASSWORD: "test", COOKIE_SECRET: "x".repeat(32), DATA_DIR: dir, GEMINI_API_KEY: "" });

let app: FastifyInstance;
let cookie = "";

beforeAll(async () => {
  const { buildApp } = await import("./app.js");
  app = await buildApp();
  const res = await app.inject({ method: "POST", url: "/api/login", payload: { password: "test" } });
  cookie = String(res.headers["set-cookie"]).split(";")[0];
});
afterAll(async () => {
  await app.close();
  fs.rmSync(dir, { recursive: true, force: true });
});

const call = (method: "GET" | "POST" | "PUT" | "DELETE", url: string, payload?: object) =>
  app.inject({ method, url, payload, headers: { cookie } });

describe("access", () => {
  it("rejects requests without a session", async () => {
    const res = await app.inject({ method: "GET", url: "/api/profile" });
    expect(res.statusCode).toBe(401);
  });
  it("rejects a wrong password", async () => {
    const res = await app.inject({ method: "POST", url: "/api/login", payload: { password: "nope" } });
    expect(res.statusCode).toBe(401);
  });
});

describe("diary", () => {
  it("adds a food and cleans its fields", async () => {
    const res = await call("POST", "/api/days/2026-11-04/entries", { entries: [{ name: "Konjac", grams: 127, meal: "lunch", kcal: 74.9, p: 0.94, c: 11.7, f: 3.3, extra: "x" }] });
    const d = res.json();
    expect(d.entries).toHaveLength(1);
    expect(d.entries[0]).toMatchObject({ name: "Konjac", meal: "lunch", kcal: 75, p: 0.9 });
    expect(d.entries[0].extra).toBeUndefined();
  });
  it("adds water without going below zero", async () => {
    await call("POST", "/api/days/2026-11-04/water", { delta: 150 });
    const d = (await call("POST", "/api/days/2026-11-04/water", { delta: -1000 })).json();
    expect(d.water).toBe(0);
  });
  it("summarises the week", async () => {
    const r = (await call("GET", "/api/days?from=2026-10-29&to=2026-11-04")).json();
    expect(r).toEqual([{ date: "2026-11-04", kcal: 75, water: 0 }]);
  });
  it("rejects an invalid date", async () => {
    expect((await call("GET", "/api/days/4-11-2026")).statusCode).toBe(400);
  });
});

describe("weight and profile", () => {
  it("saves a weigh-in and rejects absurd values", async () => {
    expect((await call("PUT", "/api/weights/2026-11-04", { kg: 62.43 })).statusCode).toBe(200);
    expect((await call("PUT", "/api/weights/2026-11-05", { kg: 5 })).statusCode).toBe(400);
    expect((await call("GET", "/api/weights")).json()).toEqual([{ date: "2026-11-04", kg: 62.4 }]);
  });
  it("updates only the fields sent", async () => {
    const p = (await call("PUT", "/api/profile", { age: 29, height: 163, act: "9" })).json();
    expect(p).toMatchObject({ goal: 1600, age: 29, height: 163, act: "1.2" });
  });
});

describe("AI", () => {
  it("answers with a clear message when the key is missing", async () => {
    const res = await call("POST", "/api/ai/search", { q: "mela" });
    expect(res.statusCode).toBe(503);
    expect(res.json().error).toMatch(/GEMINI_API_KEY/);
  });
});

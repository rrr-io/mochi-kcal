import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { computePlan } from "./plan";
import type { Profile } from "./types";

const base: Profile = { goal: 1600, protein: 80, water: 2100, sex: "f", age: 29, height: 163, act: "1.2", targetKg: 58, targetDate: "2027-03-01" };

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 10, 4, 10, 0));
});
afterEach(() => vi.useRealTimers());

describe("computePlan", () => {
  it("asks for missing data", () => {
    expect(computePlan({ ...base, height: null }, 62.4).kind).toBe("missing");
    expect(computePlan(base, null).kind).toBe("missing");
  });

  it("computes needs and calories at a gentle pace", () => {
    const r = computePlan(base, 62.4);
    if (r.kind !== "ok") throw new Error(r.kind);
    // Mifflin-St Jeor: 10·62.4 + 6.25·163 − 5·29 − 161 = 1336.75 → ×1.2
    expect(Math.round(r.tdee)).toBe(1604);
    expect(r.rate).toBeCloseTo(0.26, 2);
    expect(r.kcal).toBe(1310);
    expect(r.warn).toBeNull();
  });

  it("warns when the pace is too fast and never goes below 1200 kcal", () => {
    const r = computePlan({ ...base, targetDate: "2026-12-04" }, 62.4);
    if (r.kind !== "ok") throw new Error(r.kind);
    expect(r.warn).toMatch(/half a kilo per week/);
    expect(r.kcal).toBe(1200);
    expect(r.floored).toBe(true);
  });

  it("offers no calories for a goal below a healthy weight", () => {
    const r = computePlan({ ...base, targetKg: 45 }, 62.4);
    if (r.kind !== "ok") throw new Error(r.kind);
    expect(r.kcal).toBeNull();
    expect(r.block).toMatch(/doctor or a dietitian/);
  });

  it("rejects a past date", () => {
    expect(computePlan({ ...base, targetDate: "2026-11-01" }, 62.4)).toEqual({ kind: "error", message: "Pick a goal date in the future." });
  });
});

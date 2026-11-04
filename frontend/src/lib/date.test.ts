import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { daysBetween, defaultMeal, ds, longDay, shift } from "./date";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 10, 4, 9, 30));
});
afterEach(() => vi.useRealTimers());

describe("date", () => {
  it("uses the local date", () => expect(ds()).toBe("2026-11-04"));
  it("shifts days across months", () => {
    expect(shift("2026-11-01", -1)).toBe("2026-10-31");
    expect(shift("2026-12-31", 1)).toBe("2027-01-01");
  });
  it("counts days across a clock change", () => expect(daysBetween("2026-10-20", "2026-11-04")).toBe(15));
  it("names today and yesterday", () => {
    expect(longDay("2026-11-04")).toMatch(/^Today, 4 November/);
    expect(longDay("2026-11-03")).toMatch(/^Yesterday/);
  });
  it("picks the meal from the hour", () => expect(defaultMeal()).toBe("breakfast"));
});

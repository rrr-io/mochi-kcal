import { describe, expect, it } from "vitest";
import { MASCOT_COLORS, mascotFor } from "./Mascot";
import { shift } from "../lib/date";

describe("mascotFor", () => {
  const cycle = MASCOT_COLORS.length * 2;
  const days = Array.from({ length: cycle }, (_, i) => mascotFor(shift("2026-11-04", i)));

  it("flips between star and flower every day", () => {
    days.forEach((d, i) => i > 0 && expect(d.shape).not.toBe(days[i - 1].shape));
  });

  it("shows every colour as both a star and a flower within one cycle", () => {
    for (const color of MASCOT_COLORS) {
      const shapes = new Set(days.filter((d) => d.color === color).map((d) => d.shape));
      expect(shapes).toEqual(new Set(["star", "flower"]));
    }
  });

  it("repeats after 10 days", () => {
    expect(mascotFor(shift("2026-11-04", cycle))).toEqual(days[0]);
  });
});

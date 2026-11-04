import type { Profile } from "./types";
import { daysBetween, ds, shift, toDate } from "./date";

export type PlanResult =
  | { kind: "missing" }
  | { kind: "error"; message: string }
  | {
      kind: "ok";
      tdee: number;
      rate: number; // kg per week, positive = loss
      kcal: number | null; // null when blocked
      floor: number;
      floored: boolean;
      warn: string | null;
      block: string | null;
    };

/** Energy needs with Mifflin-St Jeor, deficit of ~7700 kcal per kg, with safety limits. */
export function computePlan(p: Profile, currentKg: number | null): PlanResult {
  if (!currentKg || !p.age || !p.height || !p.targetKg || !p.targetDate) return { kind: "missing" };
  const days = daysBetween(ds(), p.targetDate);
  if (days <= 0) return { kind: "error", message: "Pick a goal date in the future." };

  const bmr = 10 * currentKg + 6.25 * p.height - 5 * p.age + (p.sex === "m" ? 5 : -161);
  const tdee = bmr * (Number(p.act) || 1.2);
  const diff = currentKg - p.targetKg;
  const rate = diff / (days / 7);
  const floor = p.sex === "m" ? 1500 : 1200;
  const bmiGoal = p.targetKg / Math.pow(p.height / 100, 2);

  if (bmiGoal < 18.5) {
    return {
      kind: "ok", tdee, rate, kcal: null, floor, floored: false, warn: null,
      block: "This goal weight is below the healthy range for your height. For a goal like this it is best to be followed by a doctor or a dietitian.",
    };
  }

  let warn: string | null = null;
  const maxRate = Math.min(1, currentKg * 0.01);
  if (rate > maxRate) {
    const safeDays = Math.ceil((diff / Math.min(0.5, currentKg * 0.007)) * 7);
    const when = toDate(shift(ds(), safeDays)).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    warn = `A pace of ${rate.toLocaleString("en-GB", { maximumFractionDigits: 1 })} kg per week is faster than usually advised. At about half a kilo per week you would get there around ${when}.`;
  }

  let kcal = tdee - (diff * 7700) / days;
  let floored = false;
  if (kcal < floor) {
    kcal = floor;
    floored = true;
  }
  return { kind: "ok", tdee, rate, kcal: Math.round(kcal / 10) * 10, floor, floored, warn, block: null };
}

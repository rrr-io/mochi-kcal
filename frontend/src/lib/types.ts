export type MealId = "breakfast" | "lunch" | "dinner" | "snack";

export type Entry = {
  id: string;
  t: number;
  name: string;
  grams: number | null;
  meal: MealId;
  kcal: number;
  p: number;
  c: number;
  f: number;
};

export type Day = { date: string; entries: Entry[]; water: number };

/** A food with values per 100 g (from search, barcode, photo or saved). */
export type Food = {
  id?: string;
  name: string;
  brand?: string | null;
  kcal100: number;
  p100: number;
  c100: number;
  f100: number;
  pack?: number | null;
  portion?: string | null;
  portionGrams?: number | null;
  grams?: number | null;
  note?: string | null;
  barcode?: string | null;
  example?: boolean;
};

export type Profile = {
  goal: number;
  protein: number;
  water: number;
  sex: "f" | "m";
  age: number | null;
  height: number | null;
  act: string;
  targetKg: number | null;
  targetDate: string | null;
};

export type Weight = { date: string; kg: number };
export type DaySummary = { date: string; kcal: number; water: number };

export const MEALS: [MealId, string][] = [
  ["breakfast", "Breakfast"],
  ["lunch", "Lunch"],
  ["dinner", "Dinner"],
  ["snack", "Snacks"],
];

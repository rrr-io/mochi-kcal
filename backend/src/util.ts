import { config } from "./config.js";

/** Today's date (YYYY-MM-DD) in the app time zone. */
export function today(tz = config.timezone): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export const isDate = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);

export const num = (v: unknown): number => {
  const n = parseFloat(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

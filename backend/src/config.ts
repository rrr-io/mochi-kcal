function req(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable: ${name}`);
  return v;
}

export const config = {
  port: Number(process.env.PORT ?? 3000),
  dataDir: process.env.DATA_DIR ?? "./data",
  appPassword: req("APP_PASSWORD"),
  cookieSecret: req("COOKIE_SECRET"),
  geminiKey: process.env.GEMINI_API_KEY ?? "",
  // free-tier models; override them from .env if Google renames them
  modelQuick: process.env.MODEL_QUICK ?? "gemini-3.5-flash-lite",
  modelVision: process.env.MODEL_VISION ?? "gemini-3.8-flash",
  vapidPublic: process.env.VAPID_PUBLIC_KEY ?? "",
  vapidPrivate: process.env.VAPID_PRIVATE_KEY ?? "",
  vapidSubject: process.env.VAPID_SUBJECT ?? "https://mochi.rrriooo.com",
  timezone: process.env.TZ_REMINDERS ?? "Europe/Rome",
  waterHours: process.env.WATER_HOURS ?? "7-20",
  secureCookie: process.env.NODE_ENV === "production",
};

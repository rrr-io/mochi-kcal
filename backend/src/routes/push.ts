import type { FastifyInstance } from "fastify";
import webpush from "web-push";
import { config } from "../config.js";
import { db, getDay, getProfile } from "../db.js";
import { today } from "../util.js";

const enabled = Boolean(config.vapidPublic && config.vapidPrivate);
if (enabled) webpush.setVapidDetails(config.vapidSubject, config.vapidPublic, config.vapidPrivate);

async function sendAll(payload: object) {
  const subs = db.prepare("SELECT endpoint, sub FROM push_subs").all() as { endpoint: string; sub: string }[];
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(JSON.parse(s.sub), JSON.stringify(payload), { TTL: 1800 });
      } catch (e: any) {
        // subscription expired or revoked
        if (e?.statusCode === 404 || e?.statusCode === 410) db.prepare("DELETE FROM push_subs WHERE endpoint=?").run(s.endpoint);
      }
    })
  );
  return subs.length;
}

function hourIn(tz: string) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return { h: get("hour"), m: get("minute") };
}

/** Every full hour within WATER_HOURS (e.g. 7-20): remind only if the water goal is not reached yet. */
export function startWaterReminders(log: { info: (m: string) => void }) {
  if (!enabled) return log.info("Push disabled: VAPID keys are missing.");
  const [from, to] = config.waterHours.split("-").map(Number);
  let lastSent = "";
  setInterval(async () => {
    const { h, m } = hourIn(config.timezone);
    const key = today() + "T" + h;
    if (m !== 0 || h < from || h > to || key === lastSent) return;
    lastSent = key;
    const d = getDay(today());
    const goal = Number(getProfile().water) || 2100;
    if (d.water >= goal) return;
    const left = Math.ceil((goal - d.water) / 150);
    await sendAll({
      title: "Time for a sip 💧",
      body: `Drink a 150 ml glass: ${left} more to reach ${(goal / 1000).toLocaleString("en-GB")} L.`,
      tag: "water",
      date: d.date,
    });
  }, 20_000).unref();
  log.info(`Water reminders on from ${from} to ${to} (${config.timezone}).`);
}

export async function pushRoutes(app: FastifyInstance) {
  app.get("/api/push/key", async () => ({ key: enabled ? config.vapidPublic : null }));

  app.post<{ Body: { endpoint?: string } }>("/api/push/subscribe", async (req, reply) => {
    const sub = req.body;
    if (!sub?.endpoint || !/^https:\/\//.test(sub.endpoint)) return reply.code(400).send({ error: "Invalid push subscription." });
    db.prepare("INSERT INTO push_subs(endpoint,sub) VALUES(?,?) ON CONFLICT(endpoint) DO UPDATE SET sub=excluded.sub").run(sub.endpoint, JSON.stringify(sub));
    return { ok: true };
  });

  app.post<{ Body: { endpoint?: string } }>("/api/push/unsubscribe", async (req) => {
    if (req.body?.endpoint) db.prepare("DELETE FROM push_subs WHERE endpoint=?").run(req.body.endpoint);
    return { ok: true };
  });

  app.post("/api/push/test", async (_req, reply) => {
    if (!enabled) return reply.code(503).send({ error: "Push is not set up on the server." });
    const n = await sendAll({ title: "Mochi Kcal", body: "Notifications work! 🌸", tag: "test" });
    return { sent: n };
  });
}

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import crypto from "node:crypto";
import { config } from "./config.js";

const COOKIE = "mochi_session";
const MAX_AGE = 60 * 60 * 24 * 180; // 180 days

function safeEqual(a: string, b: string) {
  const ha = crypto.createHash("sha256").update(a).digest();
  const hb = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

export function isAuthed(req: FastifyRequest): boolean {
  const raw = req.cookies[COOKIE];
  if (!raw) return false;
  const r = req.unsignCookie(raw);
  return r.valid && r.value === "rio";
}

export async function requireAuth(req: FastifyRequest, reply: FastifyReply) {
  if (!isAuthed(req)) return reply.code(401).send({ error: "Sign in to continue." });
}

export async function authRoutes(app: FastifyInstance) {
  app.post<{ Body: { password?: string } }>(
    "/api/login",
    { config: { rateLimit: { max: 8, timeWindow: "15 minutes" } } },
    async (req, reply) => {
      const pw = String(req.body?.password ?? "");
      if (!safeEqual(pw, config.appPassword)) return reply.code(401).send({ error: "Wrong password." });
      reply.setCookie(COOKIE, "rio", {
        path: "/",
        httpOnly: true,
        sameSite: "strict",
        secure: config.secureCookie,
        signed: true,
        maxAge: MAX_AGE,
      });
      return { ok: true };
    }
  );
  app.post("/api/logout", async (_req, reply) => {
    reply.clearCookie(COOKIE, { path: "/" });
    return { ok: true };
  });
  app.get("/api/me", async (req) => ({ authed: isAuthed(req) }));
}

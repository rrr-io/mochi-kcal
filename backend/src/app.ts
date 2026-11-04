import Fastify from "fastify";
import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";
import { config } from "./config.js";
import { authRoutes, requireAuth } from "./auth.js";
import { dataRoutes } from "./routes/data.js";
import { aiRoutes } from "./routes/ai.js";
import { barcodeRoutes } from "./routes/barcode.js";
import { pushRoutes } from "./routes/push.js";

export async function buildApp() {
const app = Fastify({ logger: process.env.NODE_ENV === "test" ? false : { level: "info" }, bodyLimit: 20 * 1024 * 1024, trustProxy: true });

app.setErrorHandler((err: any, _req, reply) => {
  const status = err.statusCode && err.statusCode >= 400 ? err.statusCode : 500;
  if (status >= 500) app.log.error(err);
  reply.code(status).send({ error: status === 500 ? "Server error, try again." : err.message });
});

await app.register(cookie, { secret: config.cookieSecret });
await app.register(rateLimit, { global: false });

app.get("/api/health", async () => ({ ok: true }));
await app.register(authRoutes);

// everything else needs a session
await app.register(async (secured) => {
  secured.addHook("onRequest", requireAuth);
  await secured.register(dataRoutes);
  await secured.register(aiRoutes);
  await secured.register(barcodeRoutes);
  await secured.register(pushRoutes);
});

return app;
}

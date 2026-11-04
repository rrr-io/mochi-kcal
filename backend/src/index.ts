import { buildApp } from "./app.js";
import { config } from "./config.js";
import { startWaterReminders } from "./routes/push.js";

const app = await buildApp();
startWaterReminders(app.log);
await app.listen({ port: config.port, host: "0.0.0.0" });

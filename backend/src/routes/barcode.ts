import type { FastifyInstance } from "fastify";
import { db } from "../db.js";
import { num } from "../util.js";

const TTL_FOUND = 1000 * 60 * 60 * 24 * 30; // 30 days
const TTL_MISSING = 1000 * 60 * 60 * 24;   // retry "not found" codes after a day

export async function barcodeRoutes(app: FastifyInstance) {
  app.get<{ Params: { code: string } }>("/api/barcode/:code", async (req, reply) => {
    const code = req.params.code.replace(/\D/g, "");
    if (code.length < 6 || code.length > 14) return reply.code(400).send({ error: "Invalid barcode." });

    const cached = db.prepare("SELECT data, fetched FROM barcodes WHERE code=?").get(code) as { data: string | null; fetched: number } | undefined;
    if (cached && Date.now() - cached.fetched < (cached.data ? TTL_FOUND : TTL_MISSING)) {
      return cached.data ? JSON.parse(cached.data) : reply.code(404).send({ error: "Product not found on Open Food Facts." });
    }

    const url = `https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=product_name,product_name_en,brands,nutriments,product_quantity,quantity`;
    let res: Response;
    try {
      res = await fetch(url, { headers: { "User-Agent": "MochiKcal/1.0 (personal calorie tracker)" }, signal: AbortSignal.timeout(8000) });
    } catch {
      return reply.code(502).send({ error: "Open Food Facts is not responding, try again in a moment." });
    }
    if (!res.ok && res.status !== 404) return reply.code(502).send({ error: "Open Food Facts is not responding, try again in a moment." });
    const j: any = res.ok ? await res.json() : null;
    const p = j?.status === 1 ? j.product : null;
    const n = p?.nutriments ?? {};
    const kcal = num(n["energy-kcal_100g"]) || Math.round(num(n["energy_100g"]) / 4.184);
    const food = p && kcal
      ? {
          name: String(p.product_name_en || p.product_name || "Product").slice(0, 80),
          brand: p.brands ? String(p.brands).split(",")[0].trim().slice(0, 40) : null,
          kcal100: kcal,
          p100: num(n.proteins_100g),
          c100: num(n.carbohydrates_100g),
          f100: num(n.fat_100g),
          pack: num(p.product_quantity) || null,
          barcode: code,
        }
      : null;
    db.prepare("INSERT INTO barcodes(code,data,fetched) VALUES(?,?,?) ON CONFLICT(code) DO UPDATE SET data=excluded.data, fetched=excluded.fetched").run(
      code, food ? JSON.stringify(food) : null, Date.now()
    );
    return food ?? reply.code(404).send({ error: "Product not found on Open Food Facts." });
  });
}

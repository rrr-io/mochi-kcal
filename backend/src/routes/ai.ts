import type { FastifyInstance } from "fastify";
import { config } from "../config.js";
import { num } from "../util.js";

type Img = { mediaType: string; data: string };
const OK_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const fail = (statusCode: number, message: string) => Object.assign(new Error(message), { statusCode });

function extractJson(text: string): any {
  const s = text.indexOf("{"), e = text.lastIndexOf("}");
  if (s < 0 || e < s) throw new Error("no json");
  return JSON.parse(text.slice(s, e + 1));
}

/** One call to Gemini (Google AI Studio free tier) that answers in JSON. */
async function ask(model: string, prompt: string, images: Img[] = []) {
  if (!config.geminiKey) throw fail(503, "AI is not set up: GEMINI_API_KEY is missing on the server.");
  const parts = [...images.map((i) => ({ inline_data: { mime_type: i.mediaType, data: i.data } })), { text: prompt }];
  let res: Response;
  try {
    res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": config.geminiKey },
      body: JSON.stringify({ contents: [{ role: "user", parts }], generationConfig: { responseMimeType: "application/json", temperature: 0.2 } }),
      signal: AbortSignal.timeout(60_000),
    });
  } catch {
    throw fail(502, "Gemini is not responding, try again in a moment.");
  }
  if (res.status === 429) throw fail(429, "You reached the Gemini free limit: try again later or use Quick add.");
  if (res.status === 400 || res.status === 403) throw fail(502, "Gemini rejected the request: check GEMINI_API_KEY and the model name.");
  if (!res.ok) throw fail(502, "Gemini had a problem, try again.");
  const j: any = await res.json();
  const text = (j?.candidates?.[0]?.content?.parts ?? []).map((p: any) => p.text ?? "").join("");
  if (!text) throw fail(502, "Gemini gave no answer: try rephrasing or another photo.");
  try {
    return extractJson(text);
  } catch {
    throw fail(502, "The answer was not in the expected format: try again.");
  }
}

const item = (x: any) => ({
  name: String(x?.name || "Food").slice(0, 80),
  brand: x?.brand ? String(x.brand).slice(0, 40) : null,
  kcal100: num(x?.kcal100), p100: num(x?.p100), c100: num(x?.c100), f100: num(x?.f100),
  grams: num(x?.grams) || null,
  portion: x?.portion ? String(x.portion).slice(0, 40) : null,
  pack: num(x?.packageGrams) || null,
  note: x?.note ? String(x.note).slice(0, 200) : null,
});

function images(body: any): Img[] {
  const list = Array.isArray(body?.images) ? body.images.slice(0, 4) : [];
  const out = list.filter((i: any) => OK_TYPES.has(i?.mediaType) && typeof i?.data === "string" && i.data.length < 6_000_000);
  if (!out.length) throw Object.assign(new Error("Add at least one photo (JPEG, PNG or WebP)."), { statusCode: 400 });
  return out;
}

export async function aiRoutes(app: FastifyInstance) {
  const rl = { config: { rateLimit: { max: 30, timeWindow: "1 minute" } } };

  app.post<{ Body: { q?: string; saved?: string[] } }>("/api/ai/search", rl, async (req, reply) => {
    const q = String(req.body?.q ?? "").trim().slice(0, 300);
    if (!q) return reply.code(400).send({ error: "Type what you ate." });
    const saved = (req.body?.saved ?? []).slice(0, 40).map(String).join("\n");
    const r = await ask(
      config.modelQuick,
      `You are a nutrition assistant for a calorie-counting app. The user typed what they ate (it may be in English or Italian): "${q}".
Interpret quantities and portions (e.g. "half a pack", "2 slices", "a cappuccino at the café"). Use realistic values from nutrition tables (USDA, CREA) or from known labels of branded products.
If the request matches one of these foods saved by the user, put it first using its values:
${saved || "(none)"}
Reply ONLY with JSON: {"items":[{"name":"short name in English","brand":null,"kcal100":0,"p100":0,"c100":0,"f100":0,"grams":0,"portion":"estimated portion","packageGrams":null}]}
1 to 4 candidates, most likely first. Values per 100 g; "grams" = the grams the user most likely ate. For drinks, use ml as grams.`
    );
    return { items: (Array.isArray(r.items) ? r.items : []).slice(0, 4).map(item) };
  });

  app.post("/api/ai/label", rl, async (req) => {
    const r = await ask(
      config.modelVision,
      `The images show a food package (front and/or back with the nutrition table, possibly in several languages).
Read the "per 100 g" nutrition table for the product as sold (seasonings included). If there is only a per-serving value, convert it to 100 g. If the pack highlights a value that differs from the table (e.g. for only part of the product), use the table and explain it in "note".
Find the package net weight if visible.
Reply ONLY with JSON: {"name":"short name in English","brand":"brand or null","kcal100":0,"p100":0,"c100":0,"f100":0,"packageGrams":null,"note":"one useful sentence in English or null"}
If the table is not readable, estimate the values and say so in "note".`,
      images(req.body)
    );
    return item(r);
  });

  app.post("/api/ai/plate", rl, async (req) => {
    const r = await ask(
      config.modelVision,
      `The images show a meal (a plate, a bowl or a tray). Identify each visible food or component separately (e.g. pasta, sauce, grated cheese, side dish, bread, visible dressing such as oil).
Estimate the grams of each one using the size of the plate, cutlery and hands, if present, as reference. Include likely fats (oil, butter) only if plausible, as a separate item.
For each item give nutrition values per 100 g from standard tables (USDA, CREA).
Reply ONLY with JSON: {"items":[{"name":"short name in English","grams":0,"kcal100":0,"p100":0,"c100":0,"f100":0}],"note":"one sentence in English about what is uncertain, or null"}
If the image shows no food, return {"items":[],"note":"reason"}.`,
      images(req.body)
    );
    return { items: (Array.isArray(r.items) ? r.items : []).slice(0, 15).map(item), note: r.note ? String(r.note).slice(0, 200) : null };
  });
}

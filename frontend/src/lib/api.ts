import type { Day, DaySummary, Entry, Food, Profile, Weight } from "./types";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function call<T>(method: string, url: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      credentials: "same-origin",
      headers: body ? { "content-type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, "You are offline or the server is not responding.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, (data as any).error || "Something went wrong, try again.");
  return data as T;
}

export type Img = { mediaType: string; data: string };

export const api = {
  me: () => call<{ authed: boolean }>("GET", "/api/me"),
  login: (password: string) => call<{ ok: true }>("POST", "/api/login", { password }),
  logout: () => call("POST", "/api/logout"),

  day: (date: string) => call<Day>("GET", `/api/days/${date}`),
  range: (from: string, to: string) => call<DaySummary[]>("GET", `/api/days?from=${from}&to=${to}`),
  addEntries: (date: string, entries: Partial<Entry>[]) => call<Day>("POST", `/api/days/${date}/entries`, { entries }),
  removeEntry: (date: string, id: string) => call<Day>("DELETE", `/api/days/${date}/entries/${id}`),
  putDay: (date: string, d: Partial<Day>) => call<Day>("PUT", `/api/days/${date}`, d),
  water: (date: string, delta: number) => call<Day>("POST", `/api/days/${date}/water`, { delta }),

  foods: () => call<Food[]>("GET", "/api/foods"),
  saveFood: (f: Food) => call<Food>("POST", "/api/foods", f),
  deleteFood: (id: string) => call("DELETE", `/api/foods/${id}`),

  weights: () => call<Weight[]>("GET", "/api/weights"),
  putWeight: (date: string, kg: number) => call("PUT", `/api/weights/${date}`, { kg }),
  deleteWeight: (date: string) => call("DELETE", `/api/weights/${date}`),

  profile: () => call<Profile>("GET", "/api/profile"),
  putProfile: (p: Partial<Profile>) => call<Profile>("PUT", "/api/profile", p),

  search: (q: string, saved: string[]) => call<{ items: Food[] }>("POST", "/api/ai/search", { q, saved }),
  label: (images: Img[]) => call<Food>("POST", "/api/ai/label", { images }),
  plate: (images: Img[]) => call<{ items: Food[]; note: string | null }>("POST", "/api/ai/plate", { images }),
  barcode: (code: string) => call<Food>("GET", `/api/barcode/${code}`),

  pushKey: () => call<{ key: string | null }>("GET", "/api/push/key"),
  subscribe: (sub: PushSubscriptionJSON) => call("POST", "/api/push/subscribe", sub),
  unsubscribe: (endpoint: string) => call("POST", "/api/push/unsubscribe", { endpoint }),
  testPush: () => call<{ sent: number }>("POST", "/api/push/test"),
};

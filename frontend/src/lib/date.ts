const z = (n: number) => String(n).padStart(2, "0");

export const ds = (d = new Date()) => `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
export const toDate = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
export const shift = (s: string, n: number) => {
  const d = toDate(s);
  d.setDate(d.getDate() + n);
  return ds(d);
};
export const daysBetween = (a: string, b: string) => Math.round((toDate(b).getTime() - toDate(a).getTime()) / 864e5);

export const fmt = (n: number | null | undefined, d = 0) =>
  Number(n || 0).toLocaleString("en-GB", { maximumFractionDigits: d });

export const longDay = (s: string) => {
  const t = ds();
  const name = s === t ? "Today" : s === shift(t, -1) ? "Yesterday" : toDate(s).toLocaleDateString("en-GB", { weekday: "long" });
  return `${name}, ${toDate(s).toLocaleDateString("en-GB", { day: "numeric", month: "long" })}`;
};

export const defaultMeal = () => {
  const h = new Date().getHours();
  return h < 11 ? "breakfast" : h < 15 ? "lunch" : h < 18 ? "snack" : "dinner";
};

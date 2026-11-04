import type { Day, DaySummary, MealId, Profile } from "../lib/types";
import { MEALS } from "../lib/types";
import { ds, fmt, shift, toDate } from "../lib/date";
import { Glass, Drop, MealIcon } from "../components/Icons";

const GLASS = 150;

export function totals(entries: Day["entries"]) {
  return entries.reduce((a, e) => ({ k: a.k + (e.kcal || 0), p: a.p + (e.p || 0), c: a.c + (e.c || 0), f: a.f + (e.f || 0) }), { k: 0, p: 0, c: 0, f: 0 });
}

type Props = {
  date: string;
  day: Day;
  profile: Profile;
  week: DaySummary[];
  onPickDate: (d: string) => void;
  onAdd: (meal: MealId) => void;
  onRemove: (id: string) => void;
  onWater: (ml: number) => void;
};

export function Today({ date, day, profile, week, onPickDate, onAdd, onRemove, onWater }: Props) {
  const t = totals(day.entries);
  const goal = profile.goal || 1600;
  const left = goal - t.k;
  const frac = Math.min(t.k / goal, 1);
  const macro = [
    { k: "p", label: "Protein", v: t.p, goal: profile.protein || 1 },
    { k: "c", label: "Carbs", v: t.c, goal: Math.round((goal * 0.5) / 4) || 1 },
    { k: "f", label: "Fat", v: t.f, goal: Math.round((goal * 0.3) / 9) || 1 },
  ];
  const wGoal = profile.water || 2100;
  const nGlass = Math.round(wGoal / GLASS);
  const filled = Math.round((day.water || 0) / GLASS);
  const end = date > ds() ? ds() : date;
  const days = Array.from({ length: 7 }, (_, i) => shift(end, i - 6));

  return (
    <div className="wrap">
      <section className="hero" aria-label="Today's calories">
        <div className="ring">
          <svg viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="52" fill="none" stroke="#FFFFFF" strokeWidth="13" />
            <circle cx="60" cy="60" r="52" fill="none" stroke={left < 0 ? "#F2A26C" : "#5FCDBE"} strokeWidth="13" strokeLinecap="round" strokeDasharray="326.7" strokeDashoffset={326.7 * (1 - frac)} />
          </svg>
          <div className="c"><div><div className="big num">{fmt(Math.abs(left))}</div><div className="lbl">{left >= 0 ? "kcal left" : "kcal over"}</div></div></div>
        </div>
        <div className="hstats">
          <div className="pill"><span>Eaten</span><b className="num">{fmt(t.k)} kcal</b></div>
          <div className="pill"><span>Goal</span><b className="num">{fmt(goal)} kcal</b></div>
        </div>
      </section>

      <section className="macros" aria-label="Macronutrients">
        {macro.map((m) => (
          <div key={m.k} className={"mc " + m.k}>
            <span className="t">{m.label}</span>
            <b className="num">{fmt(m.v)} g</b>
            <small className="num">of {fmt(m.goal)} g</small>
            <div className="bar"><span style={{ width: Math.min((m.v / m.goal) * 100, 100) + "%" }} /></div>
          </div>
        ))}
      </section>

      <section className="card water" aria-label="Water">
        <div className="mh">
          <span className="mi wi"><Drop /></span>
          <div className="mt"><b>Water</b><small className="num">{fmt(day.water)} / {fmt(wGoal)} ml{day.water >= wGoal ? " · goal reached!" : ""}</small></div>
          <button className="plus" aria-label="Remove a glass" onClick={() => onWater(Math.max(0, day.water - GLASS))}>−</button>
          <button className="plus" aria-label="Add a 150 ml glass" onClick={() => onWater(day.water + GLASS)}>+</button>
        </div>
        <div className="glasses">
          {Array.from({ length: Math.max(nGlass, filled) }, (_, i) => (
            <button key={i} type="button" className="glass" aria-label={`${i + 1} glasses`} onClick={() => onWater((i + 1 === filled ? i : i + 1) * GLASS)}>
              <Glass on={i < filled} />
            </button>
          ))}
        </div>
      </section>

      <section className="card weekcard">
        <h2>This week</h2>
        <nav className="week" aria-label="Last 7 days">
          {days.map((d) => {
            const k = d === date ? t.k : week.find((w) => w.date === d)?.kcal ?? 0;
            return (
              <button key={d} className={"wd" + (d === date ? " sel" : "") + (k > goal ? " over" : "")} onClick={() => onPickDate(d)}
                aria-label={`${toDate(d).toLocaleDateString("en-GB", { weekday: "long", day: "numeric" })}: ${fmt(k)} kcal`}>
                <div className="col"><span style={{ height: Math.min((k / goal) * 100, 100) + "%" }} /></div>
                <span>{toDate(d).toLocaleDateString("en-GB", { weekday: "narrow" })}</span>
              </button>
            );
          })}
        </nav>
      </section>

      {MEALS.map(([id, label]) => {
        const items = day.entries.filter((e) => e.meal === id);
        const kc = totals(items).k;
        return (
          <section key={id} className={"card meal m-" + id}>
            <div className="mh">
              <span className="mi"><MealIcon id={id} /></span>
              <div className="mt">
                <b>{label}</b>
                <small className="num">{items.length ? `${fmt(kc)} kcal · ${items.length} ${items.length === 1 ? "food" : "foods"}` : "Nothing yet"}</small>
              </div>
              <button className="plus" aria-label={"Add to " + label.toLowerCase()} onClick={() => onAdd(id)}>+</button>
            </div>
            {items.length > 0 && (
              <ul>
                {items.map((e) => (
                  <li key={e.id}>
                    <div className="n">
                      <div>{e.name}</div>
                      <small className="num">{e.grams ? fmt(e.grams) + " g · " : ""}P {fmt(e.p, 1)} · C {fmt(e.c, 1)} · F {fmt(e.f, 1)}</small>
                    </div>
                    <span className="kc num">{fmt(e.kcal)}</span>
                    <button className="x" aria-label={"Remove " + e.name} onClick={() => onRemove(e.id)}>✕</button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}

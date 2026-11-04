import { useState } from "react";
import type { Profile, Weight as W } from "../lib/types";
import { ds, fmt, toDate } from "../lib/date";
import { computePlan } from "../lib/plan";

type Props = {
  weights: W[];
  profile: Profile;
  onSaveWeight: (date: string, kg: number) => void;
  onDeleteWeight: (w: W) => void;
  onProfile: (p: Partial<Profile>, persist: boolean) => void;
};

function Chart({ weights, target }: { weights: W[]; target: number | null }) {
  const pts = weights.slice(-60);
  if (pts.length < 2) return <p className="hint">Log at least two weigh-ins to see the curve.</p>;
  const w = 320, h = 150, pl = 34, pr = 10, pt = 10, pb = 22;
  const t0 = toDate(pts[0].date).getTime(), t1 = toDate(pts[pts.length - 1].date).getTime();
  const vals = pts.map((x) => x.kg).concat(target ? [target] : []);
  let lo = Math.floor(Math.min(...vals) - 0.5), hi = Math.ceil(Math.max(...vals) + 0.5);
  if (hi - lo < 2) hi = lo + 2;
  const X = (t: number) => pl + (t1 === t0 ? 0 : (t - t0) / (t1 - t0)) * (w - pl - pr);
  const Y = (v: number) => pt + ((hi - v) / (hi - lo)) * (h - pt - pb);
  const step = Math.max(1, Math.round((hi - lo) / 3));
  const ticks: number[] = [];
  for (let v = lo; v <= hi; v += step) ticks.push(v);
  const xy = pts.map((x) => [X(toDate(x.date).getTime()), Y(x.kg)] as const);
  const line = xy.map((p) => p.join(",")).join(" ");
  const dl = (d: string) => toDate(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  return (
    <svg className="chart" viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Weight trend">
      {ticks.map((v) => (
        <g key={v}>
          <line x1={pl} x2={w - pr} y1={Y(v)} y2={Y(v)} stroke="#E1F2EE" />
          <text x={pl - 6} y={Y(v) + 4} textAnchor="end" fontSize="11" fill="#8FAAA6">{v}</text>
        </g>
      ))}
      {target && (
        <>
          <line x1={pl} x2={w - pr} y1={Y(target)} y2={Y(target)} stroke="#F5A8BE" strokeWidth="2" strokeDasharray="5 4" />
          <text x={w - pr} y={Y(target) - 5} textAnchor="end" fontSize="11" fill="#E27D9C" fontWeight="700">goal</text>
        </>
      )}
      <polygon points={`${pl},${h - pb} ${line} ${xy[xy.length - 1][0]},${h - pb}`} fill="#DDF6F1" opacity=".7" />
      <polyline points={line} fill="none" stroke="#5FCDBE" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
      {xy.map((p, i) => (i === xy.length - 1 || pts.length <= 12) && (
        <circle key={i} cx={p[0]} cy={p[1]} r={i === xy.length - 1 ? 5 : 3} fill="#fff" stroke="#3EAA9B" strokeWidth="2" />
      ))}
      <text x={pl} y={h - 5} fontSize="11" fill="#8FAAA6">{dl(pts[0].date)}</text>
      <text x={w - pr} y={h - 5} fontSize="11" fill="#8FAAA6" textAnchor="end">{dl(pts[pts.length - 1].date)}</text>
    </svg>
  );
}

export function Weight({ weights, profile: P, onSaveWeight, onDeleteWeight, onProfile }: Props) {
  const [kg, setKg] = useState("");
  const [date, setDate] = useState(ds());
  const last = weights[weights.length - 1] ?? null;
  const first = weights[0] ?? null;
  const tk = P.targetKg;
  const total = first && tk ? Math.abs(first.kg - tk) : 0;
  const done = first && last && total ? Math.min((Math.abs(first.kg - last.kg) / total) * 100, 100) : 0;
  const plan = computePlan(P, last?.kg ?? null);
  const numOrNull = (v: string) => (v === "" ? null : Number(v));
  const field = (k: keyof Profile) => ({
    id: "p-" + k,
    value: (P[k] ?? "") as string | number,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const raw = e.target.value;
      const v = k === "sex" || k === "act" || k === "targetDate" ? raw || null : numOrNull(raw);
      onProfile({ [k]: v } as Partial<Profile>, false);
    },
    onBlur: () => onProfile({}, true),
  });

  return (
    <div className="wrap">
      <section className="whero" aria-label="Weight">
        <div>
          <div className="hint">Current weight</div>
          <div className="wtop">
            <b className="num">{last ? fmt(last.kg, 1) : "–"}</b><span>kg</span>
            {first && last && first !== last && <small className="num">{last.kg - first.kg > 0 ? "+" : ""}{fmt(last.kg - first.kg, 1)} kg since start</small>}
          </div>
        </div>
        <div className="wprog"><span style={{ width: done + "%" }} /></div>
        <div className="hstats">
          <div className="pill"><span>Goal</span><b className="num">{tk ? fmt(tk, 1) + " kg" : "–"}</b></div>
          <div className="pill"><span>To go</span><b className="num">{last && tk ? fmt(Math.abs(last.kg - tk), 1) + " kg" : "–"}</b></div>
        </div>
      </section>

      <section className="card">
        <h2>Log your weight</h2>
        <form className="row2" onSubmit={(e) => {
          e.preventDefault();
          const v = parseFloat(kg.replace(",", "."));
          if (!(v > 20 && v < 400)) return;
          onSaveWeight(date || ds(), Math.round(v * 10) / 10);
          setKg("");
        }}>
          <input id="wKg" type="number" step="0.1" inputMode="decimal" placeholder="kg" aria-label="Weight in kg" value={kg} onChange={(e) => setKg(e.target.value)} />
          <input id="wDate" type="date" aria-label="Date" value={date} max={ds()} onChange={(e) => setDate(e.target.value)} />
          <button className="btn" style={{ gridColumn: "1/-1" }} disabled={!kg}>Save weight</button>
        </form>
      </section>

      <section className="card">
        <h2>Trend</h2>
        <Chart weights={weights} target={tk} />
        <ul className="wlist">
          {weights.slice(-6).reverse().map((w) => (
            <li key={w.date}>
              <span>{toDate(w.date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}</span>
              <b className="num">{fmt(w.kg, 1)} kg</b>
              <button className="x" aria-label="Delete weigh-in" onClick={() => onDeleteWeight(w)}>✕</button>
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h2>Your plan</h2>
        <form className="plan" onSubmit={(e) => e.preventDefault()}>
          <div className="row2">
            <label className="l" htmlFor="p-sex">Sex<select {...field("sex")}><option value="f">Female</option><option value="m">Male</option></select></label>
            <label className="l" htmlFor="p-age">Age<input type="number" inputMode="numeric" min={14} max={100} {...field("age")} /></label>
            <label className="l" htmlFor="p-height">Height (cm)<input type="number" inputMode="numeric" min={120} max={220} {...field("height")} /></label>
            <label className="l" htmlFor="p-act">Activity
              <select {...field("act")}>
                <option value="1.2">Sedentary</option><option value="1.375">Light (1-3 workouts)</option>
                <option value="1.55">Moderate (3-5)</option><option value="1.725">Intense (6-7)</option>
              </select>
            </label>
            <label className="l" htmlFor="p-targetKg">Goal weight (kg)<input type="number" step="0.1" inputMode="decimal" {...field("targetKg")} /></label>
            <label className="l" htmlFor="p-targetDate">By<input type="date" min={ds()} {...field("targetDate")} /></label>
          </div>
          <PlanOut plan={plan} hasWeight={!!last} goal={P.goal} onApply={(k) => onProfile({ goal: k }, true)} />
        </form>
      </section>
    </div>
  );
}

function PlanOut({ plan, hasWeight, goal, onApply }: { plan: ReturnType<typeof computePlan>; hasWeight: boolean; goal: number; onApply: (k: number) => void }) {
  if (plan.kind === "missing")
    return <p className="hint">{hasWeight ? "Fill in age, height, goal weight and date to work out your calories." : "Log your weight and fill in the fields to work out your calories."}</p>;
  if (plan.kind === "error") return <div className="note warn">{plan.message}</div>;
  return (
    <>
      <div className="plines">
        <div>Estimated needs<b className="num">{fmt(Math.round(plan.tdee / 10) * 10)} kcal</b></div>
        <div>Pace<b className="num">{plan.rate > 0 ? "−" : "+"}{fmt(Math.abs(plan.rate), 2)} kg/week</b></div>
      </div>
      {plan.block ? (
        <div className="note warn">{plan.block}</div>
      ) : (
        <>
          <div className="pbig"><span>Calories per day</span><b className="num">{fmt(plan.kcal)} kcal</b></div>
          {plan.warn && <div className="note warn">{plan.warn}</div>}
          {plan.floored && <div className="note">I kept calories at {fmt(plan.floor)} kcal, the minimum advised without supervision: with this date the deficit would have been too steep.</div>}
          <button type="button" className="btn" disabled={goal === plan.kcal} onClick={() => onApply(plan.kcal!)}>
            {goal === plan.kcal ? "Already your goal" : `Use ${fmt(plan.kcal)} kcal as my goal`}
          </button>
        </>
      )}
    </>
  );
}

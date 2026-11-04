import { useCallback, useEffect, useState } from "react";
import type { Day, DaySummary, Entry, Food, MealId, Profile, Weight as W } from "./lib/types";
import { api, ApiError } from "./lib/api";
import { defaultMeal, ds, fmt, longDay, shift } from "./lib/date";
import { Mascot } from "./components/Mascot";
import { Chevron, Target } from "./components/Icons";
import { useToast } from "./components/Toast";
import { Login } from "./components/Login";
import { AddSheet } from "./components/AddSheet";
import { GoalSheet } from "./components/GoalSheet";
import { Today } from "./pages/Today";
import { Weight } from "./pages/Weight";

const DEFAULT_PROFILE: Profile = { goal: 1600, protein: 80, water: 2100, sex: "f", age: null, height: null, act: "1.2", targetKg: null, targetDate: null };
type View = "today" | "weight";

export function App() {
  const toast = useToast();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [view, setView] = useState<View>(location.hash === "#weight" ? "weight" : "today");
  const [date, setDate] = useState(ds());
  const [day, setDay] = useState<Day>({ date: ds(), entries: [], water: 0 });
  const [week, setWeek] = useState<DaySummary[]>([]);
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [foods, setFoods] = useState<Food[]>([]);
  const [weights, setWeights] = useState<W[]>([]);
  const [sheet, setSheet] = useState<MealId | null>(null);
  const [goalOpen, setGoalOpen] = useState(false);

  const fail = useCallback((e: unknown) => {
    if (e instanceof ApiError && e.status === 401) setAuthed(false);
    else toast(e instanceof Error ? e.message : "Something went wrong.");
  }, [toast]);

  useEffect(() => { api.me().then((r) => setAuthed(r.authed)).catch(() => setAuthed(true)); }, []);

  useEffect(() => {
    if (!authed) return;
    Promise.all([api.profile(), api.foods(), api.weights()]).then(([p, f, w]) => { setProfile(p); setFoods(f); setWeights(w); }).catch(fail);
  }, [authed, fail]);

  const loadDay = useCallback(() => {
    if (!authed) return;
    api.day(date).then(setDay).catch(fail);
    api.range(shift(date, -6), date).then(setWeek).catch(() => {});
  }, [authed, date, fail]);
  useEffect(loadDay, [loadDay]);

  // refresh when you come back to the app or when a notification logs water
  useEffect(() => {
    const vis = () => document.visibilityState === "visible" && loadDay();
    const msg = (e: MessageEvent) => e.data?.type === "water-updated" && loadDay();
    document.addEventListener("visibilitychange", vis);
    navigator.serviceWorker?.addEventListener("message", msg);
    return () => { document.removeEventListener("visibilitychange", vis); navigator.serviceWorker?.removeEventListener("message", msg); };
  }, [loadDay]);

  useEffect(() => {
    const h = () => setView(location.hash === "#weight" ? "weight" : "today");
    window.addEventListener("hashchange", h);
    return () => window.removeEventListener("hashchange", h);
  }, []);
  const go = (v: View) => { setView(v); history.replaceState(null, "", v === "weight" ? "#weight" : "#today"); };

  if (authed === null) return null;
  if (!authed) return <Login onDone={() => setAuthed(true)} />;

  const addEntries = async (list: Partial<Entry>[]) => {
    setSheet(null);
    try {
      setDay(await api.addEntries(date, list));
      const k = list.reduce((a, e) => a + (e.kcal || 0), 0);
      toast(list.length > 1 ? `Added ${list.length} foods: ${fmt(k)} kcal` : `Added: ${fmt(k)} kcal`);
    } catch (e) { fail(e); }
  };
  const removeEntry = async (id: string) => {
    const prev = day;
    setDay({ ...day, entries: day.entries.filter((e) => e.id !== id) });
    try {
      await api.removeEntry(date, id);
      toast("Removed", () => api.putDay(date, { entries: prev.entries }).then(setDay).catch(fail));
    } catch (e) { setDay(prev); fail(e); }
  };
  const setWater = async (ml: number) => {
    const prev = day;
    setDay({ ...day, water: ml });
    try { await api.putDay(date, { water: ml }); } catch (e) { setDay(prev); fail(e); }
  };
  const saveFood = async (f: Food) => {
    try { const s = await api.saveFood(f); setFoods([s, ...foods.filter((x) => x.id !== s.id)]); } catch (e) { fail(e); }
  };
  const updateProfile = async (p: Partial<Profile>, persist: boolean) => {
    const next = { ...profile, ...p };
    setProfile(next);
    if (persist) {
      try { setProfile(await api.putProfile(next)); if (p.goal) toast(`Goal: ${fmt(p.goal)} kcal`); } catch (e) { fail(e); }
    }
  };
  const saveWeight = async (d: string, kg: number) => {
    try {
      await api.putWeight(d, kg);
      setWeights([...weights.filter((w) => w.date !== d), { date: d, kg }].sort((a, b) => (a.date < b.date ? -1 : 1)));
      toast(`Weight saved: ${fmt(kg, 1)} kg`);
    } catch (e) { fail(e); }
  };
  const deleteWeight = async (w: W) => {
    const prev = weights;
    setWeights(weights.filter((x) => x.date !== w.date));
    try {
      await api.deleteWeight(w.date);
      toast("Weigh-in deleted", () => saveWeight(w.date, w.kg));
    } catch (e) { setWeights(prev); fail(e); }
  };

  return (
    <>
      <div className="wrap">
        <header>
          <Mascot />
          <div className="hello">
            <h1>Hi Rio!</h1>
            {view === "today" && (
              <div className="dnav">
                <button aria-label="Previous day" onClick={() => setDate(shift(date, -1))}><Chevron dir="l" /></button>
                <span id="dateLbl">{longDay(date)}</span>
                <button aria-label="Next day" disabled={date >= ds()} onClick={() => setDate(shift(date, 1))}><Chevron dir="r" /></button>
              </div>
            )}
          </div>
          <button className="iconbtn" aria-label="Goals and notifications" onClick={() => setGoalOpen(true)}><Target /></button>
        </header>

        <div className="seg" role="tablist" aria-label="Pages">
          <button role="tab" aria-selected={view === "today"} onClick={() => go("today")}>Today</button>
          <button role="tab" aria-selected={view === "weight"} onClick={() => go("weight")}>Weight</button>
        </div>

        {view === "today" ? (
          <Today date={date} day={day} profile={profile} week={week} onPickDate={setDate} onAdd={setSheet} onRemove={removeEntry} onWater={setWater} />
        ) : (
          <Weight weights={weights} profile={profile} onSaveWeight={saveWeight} onDeleteWeight={deleteWeight} onProfile={updateProfile} />
        )}
      </div>

      {view === "today" && (
        <button className="fab" onClick={() => setSheet(defaultMeal() as MealId)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          Add
        </button>
      )}

      {sheet && <AddSheet meal={sheet} foods={foods} onClose={() => setSheet(null)} onAdd={addEntries} onSaveFood={saveFood} />}
      {goalOpen && (
        <GoalSheet profile={profile} onClose={() => setGoalOpen(false)}
          onSave={(p) => { updateProfile(p, true); setGoalOpen(false); }}
          onLogout={() => api.logout().finally(() => { setGoalOpen(false); setAuthed(false); })} />
      )}
    </>
  );
}

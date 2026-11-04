import { useEffect, useState } from "react";
import type { Profile } from "../lib/types";
import { currentSubscription, disablePush, enablePush, pushSupported } from "../lib/push";
import { api } from "../lib/api";
import { useToast } from "./Toast";

export function GoalSheet({ profile, onClose, onSave, onLogout }: { profile: Profile; onClose: () => void; onSave: (p: Partial<Profile>) => void; onLogout: () => void }) {
  const [goal, setGoal] = useState(String(profile.goal));
  const [protein, setProtein] = useState(String(profile.protein));
  const [water, setWater] = useState(String(profile.water));
  const [pushOn, setPushOn] = useState<boolean | null>(null);
  const [pushMsg, setPushMsg] = useState("");
  const toast = useToast();
  const low = Number(goal) > 0 && Number(goal) < 1200;

  useEffect(() => { currentSubscription().then((s) => setPushOn(!!s)).catch(() => setPushOn(false)); }, []);

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <section className="sheet" role="dialog" aria-modal="true" aria-labelledby="goalTitle">
        <form className="in" onSubmit={(e) => {
          e.preventDefault();
          if (!Number(goal)) return;
          onSave({ goal: Math.round(Number(goal)), protein: Math.round(Number(protein)) || 0, water: Math.round(Number(water)) || 2100 });
        }}>
          <div className="grab" />
          <h3><span id="goalTitle">Goals</span><button type="button" className="x" onClick={onClose} aria-label="Close">✕</button></h3>
          <div className="row2">
            <label className="l" htmlFor="gK">Calories (kcal)<input id="gK" type="number" inputMode="numeric" value={goal} onChange={(e) => setGoal(e.target.value)} /></label>
            <label className="l" htmlFor="gP">Protein (g)<input id="gP" type="number" inputMode="numeric" value={protein} onChange={(e) => setProtein(e.target.value)} /></label>
            <label className="l" htmlFor="gW">Water (ml)<input id="gW" type="number" inputMode="numeric" step={150} value={water} onChange={(e) => setWater(e.target.value)} /></label>
          </div>
          <div className={"note" + (low ? " warn" : "")}>For most adults it is best not to go below about 1200 kcal a day without support from a doctor or a dietitian.</div>
          <button className="btn">Save goals</button>

          {pushSupported() && (
            <div className="card" style={{ boxShadow: "none", padding: "12px 0 0" }}>
              <div className="setrow">
                <span>Water reminders (hourly, 7–20)</span>
                <button type="button" className={"btn" + (pushOn ? " ghost" : "")} onClick={async () => {
                  setPushMsg("");
                  if (pushOn) { await disablePush(); setPushOn(false); return; }
                  const err = await enablePush().catch((e) => e.message as string);
                  if (err) setPushMsg(err); else { setPushOn(true); toast("Reminders on 💧"); }
                }}>{pushOn ? "Turn off" : "Turn on"}</button>
              </div>
              {pushOn && <button type="button" className="linkbtn" onClick={() => api.testPush().then(() => toast("Test notification sent")).catch((e) => setPushMsg(e.message))}>Send a test notification</button>}
              {pushMsg && <p className="hint">{pushMsg}</p>}
              <p className="hint">They only arrive if you haven't reached your goal yet, and you can log +150 ml straight from the notification.</p>
            </div>
          )}
          <button type="button" className="linkbtn" onClick={onLogout}>Sign out</button>
        </form>
      </section>
    </>
  );
}

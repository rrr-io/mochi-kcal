import { useState } from "react";
import { api } from "../lib/api";
import { Mascot } from "./Mascot";

export function Login({ onDone }: { onDone: () => void }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="wrap login">
      <Mascot />
      <h1>Mochi Kcal</h1>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setErr("");
          try {
            await api.login(pw);
            onDone();
          } catch (e: any) {
            setErr(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <input id="pw" type="password" autoComplete="current-password" placeholder="Password" value={pw} onChange={(e) => setPw(e.target.value)} />
        <button className="btn" disabled={busy || !pw}>Sign in</button>
        {err && <p className="err">{err}</p>}
      </form>
    </div>
  );
}

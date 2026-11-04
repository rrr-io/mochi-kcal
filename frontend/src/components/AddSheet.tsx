import { useCallback, useEffect, useMemo, useState } from "react";
import type { Entry, Food, MealId } from "../lib/types";
import { MEALS } from "../lib/types";
import { api } from "../lib/api";
import { fmt } from "../lib/date";
import { toImg } from "../lib/image";
import { Camera } from "./Icons";
import { BarcodeScanner } from "./BarcodeScanner";

type Tab = "search" | "barcode" | "photo" | "mine" | "quick";
const TABS: [Tab, string][] = [["search", "Search"], ["barcode", "Barcode"], ["photo", "Photo"], ["mine", "Saved"], ["quick", "Quick"]];

const EXAMPLE: Food = { name: "Sweet & sour konjac noodles", brand: "Hi A'Kuan", kcal100: 59, p100: 0.7, c100: 9.2, f100: 2.6, pack: 255, example: true };

type Props = {
  meal: MealId;
  foods: Food[];
  onClose: () => void;
  onAdd: (entries: Partial<Entry>[]) => void;
  onSaveFood: (f: Food) => void;
};

const entryFrom = (f: Food, grams: number, meal: MealId): Partial<Entry> => {
  const r = grams / 100;
  return { name: f.name + (f.brand ? " · " + f.brand : ""), grams: Math.round(grams), meal, kcal: Math.round(f.kcal100 * r), p: +(f.p100 * r).toFixed(1), c: +(f.c100 * r).toFixed(1), f: +(f.f100 * r).toFixed(1) };
};

function Dots({ text }: { text: string }) {
  return <div className="status"><span className="dots"><span /><span /><span /></span>{text}</div>;
}

export function AddSheet({ meal: initialMeal, foods, onClose, onAdd, onSaveFood }: Props) {
  const [meal, setMeal] = useState<MealId>(initialMeal);
  const [tab, setTab] = useState<Tab>("search");
  const [picked, setPicked] = useState<{ food: Food; save: boolean; fromMine?: boolean } | null>(null);

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  const pick = (food: Food, save = true, fromMine = false) => setPicked({ food, save, fromMine });

  return (
    <>
      <div className="scrim" onClick={onClose} />
      <section className="sheet" role="dialog" aria-modal="true" aria-labelledby="sheetTitle">
        <div className="in">
          <div className="grab" />
          <h3><span id="sheetTitle">Add to</span><button className="x" onClick={onClose} aria-label="Close">✕</button></h3>
          <div className="chips" role="group" aria-label="Meal">
            {MEALS.map(([id, l]) => (
              <button key={id} className="chip" aria-pressed={id === meal} onClick={() => setMeal(id)}>{l}</button>
            ))}
          </div>
          <div className="tabs" role="tablist">
            {TABS.map(([id, l]) => (
              <button key={id} role="tab" aria-selected={tab === id && !picked} onClick={() => { setPicked(null); setTab(id); }}>{l}</button>
            ))}
          </div>

          {picked ? (
            <Picker {...picked} onBack={() => setPicked(null)} onConfirm={(grams, save) => {
              onAdd([entryFrom(picked.food, grams, meal)]);
              if (save && !picked.fromMine) onSaveFood({ ...picked.food, example: undefined, note: undefined });
            }} />
          ) : (
            <>
              {tab === "search" && <SearchTab foods={foods} onPick={(f) => pick(f)} />}
              {tab === "barcode" && <BarcodeTab onPick={(f) => pick(f)} />}
              {tab === "photo" && <PhotoTab meal={meal} onPick={(f) => pick(f)} onAddMany={onAdd} />}
              {tab === "mine" && <MineTab foods={foods} onPick={(f) => pick(f, false, true)} />}
              {tab === "quick" && <QuickTab onAdd={(name, kcal) => onAdd([{ name, kcal, meal, p: 0, c: 0, f: 0 }])} />}
            </>
          )}
        </div>
      </section>
    </>
  );
}

function ResRow({ f, right, sub, onClick }: { f: Food; right: string; sub: string; onClick: () => void }) {
  return (
    <button className="res" type="button" onClick={onClick}>
      <div className="n">
        <b>{f.name}{f.example && <span className="tag">example</span>}</b>
        <small>{[f.brand, sub].filter(Boolean).join(" · ")}</small>
      </div>
      <span className="kc num">{right}</span>
    </button>
  );
}

function SearchTab({ foods, onPick }: { foods: Food[]; onPick: (f: Food) => void }) {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [items, setItems] = useState<Food[]>([]);
  const saved = useMemo(() => foods.slice(0, 40).map((f) => `${f.name}${f.brand ? ` (${f.brand})` : ""}: ${f.kcal100} kcal/100g${f.pack ? `, confezione ${f.pack} g` : ""}`), [foods]);
  return (
    <div className="in">
      <form className="field" onSubmit={async (e) => {
        e.preventDefault();
        if (!q.trim()) return;
        setBusy(true); setErr(""); setItems([]);
        try {
          const r = await api.search(q.trim(), saved);
          setItems(r.items.map((x) => ({ ...x, portionGrams: x.grams })));
          if (!r.items.length) setErr("No results: try describing it differently.");
        } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
      }}>
        <input id="q" type="text" autoComplete="off" placeholder="e.g. half a pack of konjac noodles" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
        <button className="btn" disabled={busy}>Search</button>
      </form>
      <p className="hint">Write it the way you would say it: "2 slices of wholemeal bread", "café cappuccino", "a medium apple".</p>
      {busy && <Dots text="Looking up nutrition values…" />}
      {err && <div className="status">{err}</div>}
      <div className="results">
        {items.map((it, i) => (
          <ResRow key={i} f={it} right={it.portionGrams ? fmt((it.kcal100 * it.portionGrams) / 100) + " kcal" : fmt(it.kcal100) + "/100g"}
            sub={[it.portion, it.portionGrams ? fmt(it.portionGrams) + " g" : ""].filter(Boolean).join(" · ")} onClick={() => onPick(it)} />
        ))}
      </div>
    </div>
  );
}

function BarcodeTab({ onPick }: { onPick: (f: Food) => void }) {
  const [scanning, setScanning] = useState(true);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const look = useCallback(async (c: string) => {
    setScanning(false); setBusy(true); setErr(""); setCode(c);
    try { onPick(await api.barcode(c)); }
    catch (e: any) { setErr(e.status === 404 ? "This product is not on Open Food Facts: try a photo of the label." : e.message); }
    finally { setBusy(false); }
  }, [onPick]);
  return (
    <div className="in">
      {scanning ? <BarcodeScanner onCode={look} /> : <button className="btn ghost" onClick={() => { setErr(""); setScanning(true); }}>Scan again</button>}
      <form className="field" onSubmit={(e) => { e.preventDefault(); if (code.trim()) look(code.trim()); }}>
        <input id="code" type="text" inputMode="numeric" placeholder="or type the code" value={code} onChange={(e) => setCode(e.target.value)} />
        <button className="btn" disabled={busy}>Look up</button>
      </form>
      {busy && <Dots text="Looking up the product…" />}
      {err && <div className="status">{err}</div>}
    </div>
  );
}

type PlateItem = Food & { grams: number; on: boolean };

function PhotoTab({ meal, onPick, onAddMany }: { meal: MealId; onPick: (f: Food) => void; onAddMany: (e: Partial<Entry>[]) => void }) {
  const [mode, setMode] = useState<"plate" | "label">("plate");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [plate, setPlate] = useState<PlateItem[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const thumbs = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);

  const run = async () => {
    setBusy(true); setErr(""); setPlate([]);
    try {
      const imgs = await Promise.all(files.map((f) => toImg(f)));
      if (mode === "label") {
        const f = await api.label(imgs);
        onPick({ ...f, portionGrams: f.pack || 100 });
      } else {
        const r = await api.plate(imgs);
        if (!r.items.length) setErr(r.note || "No food recognised: try a closer, brighter photo.");
        setPlate(r.items.map((x) => ({ ...x, grams: x.grams || 100, on: true })));
        setNote(r.note);
      }
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };

  const on = plate.filter((x) => x.on && x.grams > 0);
  const total = on.reduce((a, x) => a + (x.kcal100 * x.grams) / 100, 0);

  return (
    <div className="in">
      <div className="chips" role="group" aria-label="What you are photographing">
        <button className="chip" aria-pressed={mode === "plate"} onClick={() => { setMode("plate"); setPlate([]); }}>Plate</button>
        <button className="chip" aria-pressed={mode === "label"} onClick={() => { setMode("label"); setPlate([]); }}>Label</button>
      </div>
      <label className="drop" htmlFor="photoIn">
        <Camera />
        <b>{mode === "plate" ? "Photograph the plate" : "Photograph the label"}</b>
        <span className="hint">{mode === "plate" ? "From above with the whole plate in view: the AI recognises the foods and estimates the grams." : "The nutrition table and, if you like, the front of the pack too."}</span>
        <div className="thumbs">{thumbs.map((u) => <img key={u} src={u} alt="" />)}</div>
      </label>
      <input id="photoIn" type="file" accept="image/*" multiple hidden onChange={(e) => { setFiles([...(e.target.files ?? [])].slice(0, 4)); setPlate([]); }} />
      <button className="btn" disabled={!files.length || busy} onClick={run}>{mode === "plate" ? "Analyse the plate" : "Read the label"}</button>
      {busy && <Dots text={mode === "plate" ? "Recognising the foods on the plate…" : "Reading the label…"} />}
      {err && <div className="status">{err}</div>}

      {plate.length > 0 && (
        <div className="picker">
          <div className="t">On the plate<small>Fix the grams or untick anything you didn't eat.</small></div>
          <div>
            {plate.map((it, i) => (
              <div key={i} className={"pr" + (it.on ? "" : " off")}>
                <input type="checkbox" id={"plc" + i} checked={it.on} aria-label={"Include " + it.name}
                  onChange={(e) => setPlate(plate.map((x, j) => (j === i ? { ...x, on: e.target.checked } : x)))} />
                <div className="n"><b>{it.name}</b><small className="num">{fmt(it.kcal100)} kcal/100 g · g</small></div>
                <input type="number" id={"plg" + i} inputMode="decimal" min={0} value={Math.round(it.grams)} aria-label={"Grams of " + it.name}
                  onChange={(e) => setPlate(plate.map((x, j) => (j === i ? { ...x, grams: Number(e.target.value) || 0 } : x)))} />
                <span className="kc num">{fmt((it.kcal100 * it.grams) / 100)}</span>
              </div>
            ))}
          </div>
          <div className="ptot"><span>Total</span><span className="num">{fmt(total)} kcal</span></div>
          {note && <div className="note">{note}</div>}
          <p className="hint">Photo estimates can be off by 20-30%: if you weigh the food, type the real grams.</p>
          <button className="btn" disabled={!on.length} onClick={() => onAddMany(on.map((x) => entryFrom(x, x.grams, meal)))}>Add to meal</button>
        </div>
      )}
    </div>
  );
}

function MineTab({ foods, onPick }: { foods: Food[]; onPick: (f: Food) => void }) {
  const list = foods.length ? foods : [EXAMPLE];
  return (
    <div className="in">
      <p className="hint">Foods saved from searches, barcodes and photos, to add again in one tap.</p>
      <div className="results">
        {list.map((f, i) => <ResRow key={f.id ?? i} f={f} right={fmt(f.kcal100) + "/100g"} sub={f.pack ? `pack ${fmt(f.pack)} g` : ""} onClick={() => onPick(f)} />)}
      </div>
      {!foods.length && <p className="hint">The foods you save will show up here. The one above is an example.</p>}
    </div>
  );
}

function QuickTab({ onAdd }: { onAdd: (name: string, kcal: number) => void }) {
  const [name, setName] = useState("");
  const [kcal, setKcal] = useState("");
  return (
    <form className="in" onSubmit={(e) => { e.preventDefault(); const k = Math.round(Number(kcal)); if (k > 0) onAdd(name.trim() || "Quick snack", k); }}>
      <label className="l" htmlFor="qName">What you ate<input id="qName" type="text" placeholder="e.g. a colleague's biscuits" value={name} onChange={(e) => setName(e.target.value)} /></label>
      <label className="l" htmlFor="qKcal">Calories<input id="qKcal" type="number" inputMode="numeric" min={0} placeholder="kcal" value={kcal} onChange={(e) => setKcal(e.target.value)} /></label>
      <button className="btn" disabled={!kcal}>Add</button>
    </form>
  );
}

function Picker({ food, save: saveDefault, fromMine, onBack, onConfirm }: { food: Food; save: boolean; fromMine?: boolean; onBack: () => void; onConfirm: (g: number, save: boolean) => void }) {
  const presets: [string, number][] = [];
  if (food.pack) presets.push([`All (${fmt(food.pack)} g)`, food.pack], [`Half (${fmt(food.pack / 2)} g)`, food.pack / 2]);
  if (food.portionGrams && food.portionGrams !== food.pack) presets.push([`${food.portion || "Portion"} (${fmt(food.portionGrams)} g)`, food.portionGrams]);
  presets.push(["100 g", 100]);
  const [grams, setGrams] = useState<number>(Math.round((food.portionGrams || food.pack || 100) * 10) / 10);
  const [save, setSave] = useState(saveDefault);
  const r = grams / 100;
  return (
    <div className="picker">
      <div className="t">{food.name}<small>{food.brand ? food.brand + " · " : ""}{fmt(food.kcal100)} kcal per 100 g</small></div>
      <div className="chips">
        {presets.map(([l, g]) => <button key={l} className="chip" aria-pressed={g === grams} onClick={() => setGrams(Math.round(g * 10) / 10)}>{l}</button>)}
      </div>
      <label className="l" htmlFor="pkGrams">Amount (g)<input id="pkGrams" type="number" inputMode="decimal" min={0} value={grams || ""} onChange={(e) => setGrams(Number(e.target.value) || 0)} /></label>
      <div className="calc">
        <div><b className="num">{fmt(food.kcal100 * r)}</b><small>kcal</small></div>
        <div><b className="num">{fmt(food.p100 * r, 1)}</b><small>protein g</small></div>
        <div><b className="num">{fmt(food.c100 * r, 1)}</b><small>carb g</small></div>
        <div><b className="num">{fmt(food.f100 * r, 1)}</b><small>fat g</small></div>
      </div>
      {food.note && <div className="note">{food.note}</div>}
      {!fromMine && <label className="check"><input type="checkbox" id="pkSave" checked={save} onChange={(e) => setSave(e.target.checked)} /> Save to my foods</label>}
      <div className="row2">
        <button className="btn ghost" onClick={onBack}>Back</button>
        <button className="btn" disabled={!grams} onClick={() => onConfirm(grams, save)}>Add</button>
      </div>
    </div>
  );
}

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

type Toast = { msg: string; undo?: () => void } | null;
const Ctx = createContext<(msg: string, undo?: () => void) => void>(() => {});
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [t, setT] = useState<Toast>(null);
  const timer = useRef<number>();
  const show = useCallback((msg: string, undo?: () => void) => {
    window.clearTimeout(timer.current);
    setT({ msg, undo });
    timer.current = window.setTimeout(() => setT(null), undo ? 5000 : 2400);
  }, []);
  return (
    <Ctx.Provider value={show}>
      {children}
      {t && (
        <div className="toast" role="status">
          <span>{t.msg}</span>
          {t.undo && (
            <button onClick={() => { t.undo!(); setT(null); }}>Undo</button>
          )}
        </div>
      )}
    </Ctx.Provider>
  );
}

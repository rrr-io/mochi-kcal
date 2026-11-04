import type { MealId } from "../lib/types";

const p = { fill: "none", stroke: "currentColor", strokeWidth: 2.2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

export const MealIcon = ({ id }: { id: MealId }) => {
  switch (id) {
    case "breakfast":
      return <svg viewBox="0 0 24 24" {...p}><circle cx="12" cy="13" r="4" /><path d="M12 4v2M5 13H3M21 13h-2M6.5 7.5 5 6M17.5 7.5 19 6M4 19h16" /></svg>;
    case "lunch":
      return <svg viewBox="0 0 24 24" {...p}><path d="M3 11h18a9 9 0 0 1-18 0zM8 7c0-1.5 1-1.5 1-3M12 7c0-1.5 1-1.5 1-3M16 7c0-1.5 1-1.5 1-3" /></svg>;
    case "dinner":
      return <svg viewBox="0 0 24 24" {...p}><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" /></svg>;
    default:
      return <svg viewBox="0 0 24 24" {...p}><path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z" /></svg>;
  }
};

export const Chevron = ({ dir }: { dir: "l" | "r" }) => (
  <svg viewBox="0 0 24 24" {...p} strokeWidth={3}><path d={dir === "l" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} /></svg>
);

export const Target = () => (
  <svg viewBox="0 0 24 24" {...p}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.3" fill="currentColor" /></svg>
);

export const Drop = () => <svg viewBox="0 0 24 24" {...p}><path d="M12 3s6 6.6 6 11a6 6 0 0 1-12 0c0-4.4 6-11 6-11z" /></svg>;

export const Camera = () => (
  <svg width="36" height="36" viewBox="0 0 24 24" {...p} strokeWidth={1.8} stroke="var(--aqua-text)"><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>
);

export const Glass = ({ on }: { on: boolean }) => (
  <svg viewBox="0 0 24 30">
    <path d="M4 3h16l-2 23a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z" fill={on ? "#BFE6F8" : "#F3FAFD"} stroke={on ? "#7CC3EA" : "#D6EAF4"} strokeWidth="2" strokeLinejoin="round" />
    {on && <path d="M6.4 11h11.2" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" opacity=".8" />}
  </svg>
);

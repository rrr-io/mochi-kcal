import { ds } from "../lib/date";

export type MascotShape = "star" | "flower";

/** Aqua, baby yellow, baby blue, baby pink, lilac. */
export const MASCOT_COLORS = ["#A6E5DA", "#FDE7A6", "#BFE3F7", "#F9C9D6", "#DCCFF8"] as const;

/**
 * Today's mascot: the shape flips every day and the colour moves on every two days,
 * so each colour shows up as both a star and a flower (a 10-day cycle).
 */
export function mascotFor(date: string): { shape: MascotShape; color: string } {
  const n = Math.floor(new Date(date + "T12:00:00").getTime() / 864e5);
  return {
    shape: n % 2 ? "flower" : "star",
    color: MASCOT_COLORS[Math.floor(n / 2) % MASCOT_COLORS.length],
  };
}

const Face = () => (
  <>
    <circle cx="16.2" cy="20.2" r="1.7" fill="#41605C" />
    <circle cx="23.8" cy="20.2" r="1.7" fill="#41605C" />
    <circle cx="16.7" cy="19.6" r=".5" fill="#fff" />
    <circle cx="24.3" cy="19.6" r=".5" fill="#fff" />
    <path d="M18.3 23.2q1.7 1.6 3.4 0" stroke="#41605C" strokeWidth="1.4" fill="none" strokeLinecap="round" />
    <circle cx="13.6" cy="23.4" r="1.6" fill="#F2A0B6" />
    <circle cx="26.4" cy="23.4" r="1.6" fill="#F2A0B6" />
  </>
);

const Star = ({ color }: { color: string }) => (
  <svg viewBox="0 0 40 40">
    <path d="M20 4 25 14.1 36.2 15.8 28.1 23.6 30 34.8 20 29.5 10 34.8 11.9 23.6 3.8 15.8 15 14.1Z" fill={color} stroke={color} strokeWidth="5" strokeLinejoin="round" />
    <Face />
  </svg>
);

const Flower = ({ color }: { color: string }) => (
  <svg viewBox="0 0 40 40">
    <g fill={color}>
      <circle cx="20" cy="10.5" r="7.6" /><circle cx="30" cy="17.8" r="7.6" /><circle cx="26.2" cy="29.5" r="7.6" />
      <circle cx="13.8" cy="29.5" r="7.6" /><circle cx="10" cy="17.8" r="7.6" /><circle cx="20" cy="21" r="10" />
    </g>
    <Face />
  </svg>
);

/** One day a star, the next a flower, in a rotating pastel colour. */
export function Mascot({ className = "mascot" }: { className?: string }) {
  const { shape, color } = mascotFor(ds());
  return <span className={className} aria-hidden="true">{shape === "flower" ? <Flower color={color} /> : <Star color={color} />}</span>;
}

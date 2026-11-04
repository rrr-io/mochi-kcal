import { ds } from "../lib/date";

const Face = () => (
  <>
    <circle cx="16.2" cy="20.2" r="1.7" fill="#41605C" />
    <circle cx="23.8" cy="20.2" r="1.7" fill="#41605C" />
    <circle cx="16.7" cy="19.6" r=".5" fill="#fff" />
    <circle cx="24.3" cy="19.6" r=".5" fill="#fff" />
    <path d="M18.3 23.2q1.7 1.6 3.4 0" stroke="#41605C" strokeWidth="1.4" fill="none" strokeLinecap="round" />
    <circle cx="13.6" cy="23.4" r="1.6" fill="#F5A8BE" />
    <circle cx="26.4" cy="23.4" r="1.6" fill="#F5A8BE" />
  </>
);

const Star = () => (
  <svg viewBox="0 0 40 40">
    <path d="M20 4 25 14.1 36.2 15.8 28.1 23.6 30 34.8 20 29.5 10 34.8 11.9 23.6 3.8 15.8 15 14.1Z" fill="#A6E5DA" stroke="#A6E5DA" strokeWidth="5" strokeLinejoin="round" />
    <Face />
  </svg>
);

const Flower = () => (
  <svg viewBox="0 0 40 40">
    <g fill="#F9C9D6">
      <circle cx="20" cy="10.5" r="7.6" /><circle cx="30" cy="17.8" r="7.6" /><circle cx="26.2" cy="29.5" r="7.6" />
      <circle cx="13.8" cy="29.5" r="7.6" /><circle cx="10" cy="17.8" r="7.6" /><circle cx="20" cy="21" r="10" />
    </g>
    <Face />
  </svg>
);

/** One day the little star, the next day the little flower. */
export function Mascot({ className = "mascot" }: { className?: string }) {
  const n = Math.floor(new Date(ds() + "T12:00:00").getTime() / 864e5);
  return <span className={className} aria-hidden="true">{n % 2 ? <Flower /> : <Star />}</span>;
}

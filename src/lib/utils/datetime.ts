/**
 * Consistent date/time formatting for attempt timestamps.
 *
 * All callers render these only after data arrives from Firestore (client-side),
 * so there's no server/client timezone mismatch to worry about.
 */

const DAY = { weekday: "long" } as const;
const DATE = { day: "numeric", month: "long", year: "numeric" } as const;
const TIME = { hour: "numeric", minute: "2-digit", hour12: true } as const;

export interface FormattedMoment {
  /** e.g. "Monday" */
  day: string;
  /** e.g. "3 August 2026" */
  date: string;
  /** e.g. "4:55 AM" */
  time: string;
  /** e.g. "Monday, 3 August 2026 · 4:55 AM" */
  full: string;
}

export function formatMoment(ms: number | null | undefined): FormattedMoment | null {
  if (!ms || !Number.isFinite(ms)) return null;

  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return null;

  const day = d.toLocaleDateString(undefined, DAY);
  const date = d.toLocaleDateString(undefined, DATE);
  const time = d.toLocaleTimeString(undefined, TIME);

  return { day, date, time, full: `${day}, ${date} · ${time}` };
}

/** Short form for tight spaces, e.g. "Mon, 3 Aug · 4:55 AM". */
export function formatMomentShort(ms: number | null | undefined): string {
  if (!ms || !Number.isFinite(ms)) return "—";
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return "—";
  return (
    d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" }) +
    " · " +
    d.toLocaleTimeString(undefined, TIME)
  );
}

/** Seconds -> "1h 04m 09s" / "12m 30s". */
export function formatElapsed(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}m ${s.toString().padStart(2, "0")}s`;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

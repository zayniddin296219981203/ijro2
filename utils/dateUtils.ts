/**
 * Canonical date parsing and formatting for Ijro Monitoring.
 *
 * CRITICAL: JavaScript's `new Date("03/06/2026")` interprets the string as
 * MM/DD/YYYY (March 6), not DD/MM/YYYY (June 3). This causes silent,
 * platform-dependent bugs (Web vs Expo Go behave differently).
 *
 * Rule: NEVER call new Date(untrusted string) directly.
 *       Always parse DD/MM/YYYY explicitly FIRST.
 *
 * All date-only values use local noon (12:00:00) to avoid DST and timezone
 * edge cases where midnight UTC can shift the calendar day by ±1.
 */

/**
 * Parse a date string in any of the supported formats:
 *   "DD/MM/YYYY"             → always DD/MM/YYYY, never MM/DD
 *   "Wednesday, April 15, 2026" → English long format (unambiguous)
 *   "April 15, 2026"         → English medium format
 *
 * Returns a local Date at noon to avoid timezone/DST off-by-one errors.
 * Returns null when the string cannot be parsed.
 */
export function parseDeadline(raw: string | undefined): Date | null {
  if (!raw) return null;

  // ── 1. DD/MM/YYYY ──────────────────────────────────────────────────────
  // MUST come before new Date() — "03/06/2026" would be wrongly parsed as
  // March 6 by JS Date constructor (MM/DD/YYYY interpretation).
  const dmyMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmyMatch) {
    const dd = +dmyMatch[1];
    const mm = +dmyMatch[2];
    const yyyy = +dmyMatch[3];
    if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
    return new Date(yyyy, mm - 1, dd, 12, 0, 0, 0);
  }

  // ── 2. English long/medium — strip optional weekday prefix ─────────────
  // "Wednesday, April 15, 2026" → "April 15, 2026" → unambiguous for JS Date
  const stripped = raw.replace(/^[A-Za-z]+,\s*/, "");
  const d = new Date(stripped);
  if (!isNaN(d.getTime())) return d;

  return null;
}

/**
 * Days from today (midnight) to a date (midnight).
 * Negative = date is in the past, Zero = today, Positive = future.
 */
export function daysFromToday(date: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Days between two dates (a - b).
 * Positive → a is after b. Negative → a is before b.
 */
export function daysBetween(a: Date, b: Date): number {
  const da = new Date(a); da.setHours(0, 0, 0, 0);
  const db = new Date(b); db.setHours(0, 0, 0, 0);
  return Math.round((da.getTime() - db.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * How many days late a submission is.
 * completedDate > deadline → positive (late), otherwise 0.
 */
export function calcDelayDays(completedDate: Date, deadline: Date): number {
  return Math.max(0, daysBetween(completedDate, deadline));
}

/** Format a Date to "DD/MM/YYYY" */
export function formatDMY(date: Date): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/**
 * Sort priority bucket:
 * 0 = Kechikdi        (overdue, never submitted)
 * 1 = Tekshirishda    (submitted, pending approval)
 * 2 = Jarayonda/other (active)
 * 3 = Yakunlandi      (fully completed)
 */
export function sortBucket(holati: string): number {
  if (holati === "Kechikdi") return 0;
  if (holati === "Tekshirishda") return 1;
  if (holati === "Yakunlandi") return 3;
  return 2;
}

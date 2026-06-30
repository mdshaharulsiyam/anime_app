/**
 * Airing-schedule helpers. Jikan reports a weekly broadcast slot in JST
 * (e.g. day: "Saturdays", time: "23:00", timezone: "Asia/Tokyo"). From that we
 * compute the next real-world air instant and a live countdown. Japan has no
 * DST, so a fixed +9h offset is accurate.
 */
import { useEffect, useState } from 'react';

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const DAY_INDEX: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

export interface Broadcast {
  day?: string | null;
  time?: string | null;
  timezone?: string | null;
}

/** Returns the timestamp (ms) of the next weekly broadcast, or null if unknown. */
export function nextAiring(b?: Broadcast | null, now = Date.now()): number | null {
  if (!b?.day || !b.time) return null;
  const dayKey = b.day.trim().toLowerCase().replace(/s$/, ''); // "Saturdays" -> "saturday"
  const target = DAY_INDEX[dayKey];
  if (target === undefined) return null;

  const m = /^(\d{1,2}):(\d{2})/.exec(b.time.trim());
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);

  // Read "now" as JST wall-clock by shifting and using UTC getters.
  const jstNow = new Date(now + JST_OFFSET_MS);
  const dayDiff = (target - jstNow.getUTCDay() + 7) % 7;

  // Build the target wall-clock instant, then convert JST -> real UTC.
  const wallAsUtc = Date.UTC(
    jstNow.getUTCFullYear(),
    jstNow.getUTCMonth(),
    jstNow.getUTCDate() + dayDiff,
    hh,
    mm,
    0,
  );
  let instant = wallAsUtc - JST_OFFSET_MS;
  if (instant <= now) instant += WEEK_MS;
  return instant;
}

/** Human-readable countdown, e.g. "2d 4h 9m" or "3h 12m" or "47s". */
export function formatCountdown(target: number, now = Date.now()): string {
  let s = Math.max(0, Math.floor((target - now) / 1000));
  const d = Math.floor(s / 86400);
  s -= d * 86400;
  const h = Math.floor(s / 3600);
  s -= h * 3600;
  const m = Math.floor(s / 60);
  s -= m * 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

/**
 * Live countdown string for a broadcast slot. Re-renders every second so the
 * timer stays accurate. Returns null when there is no usable schedule.
 */
export function useCountdown(b?: Broadcast | null): string | null {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const target = nextAiring(b, now);
  if (target === null) return null;
  return formatCountdown(target, now);
}

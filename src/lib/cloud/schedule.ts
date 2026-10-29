import { LOCALE } from "../format";
import type { Schedule } from "./types";

type Timing = Pick<Schedule, "frequency" | "weekday" | "monthDay" | "time">;

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const lastDayOf = (year: number, month: number) => new Date(year, month + 1, 0).getDate();

/** The first run strictly after `from`, in local time. */
export function nextRunAt(s: Timing, from: Date): Date {
  const [hours, minutes] = s.time.split(":").map(Number);
  const at = (y: number, m: number, d: number) => new Date(y, m, d, hours, minutes);
  const y = from.getFullYear();
  const m = from.getMonth();
  const d = from.getDate();

  if (s.frequency === "daily") {
    const today = at(y, m, d);
    return today > from ? today : at(y, m, d + 1);
  }
  if (s.frequency === "weekly") {
    const candidate = at(y, m, d + ((s.weekday - from.getDay() + 7) % 7));
    return candidate > from ? candidate : at(y, m, d + 7);
  }
  // Monthly: short months run on their last day instead of skipping.
  const thisMonth = at(y, m, Math.min(s.monthDay, lastDayOf(y, m)));
  if (thisMonth > from) return thisMonth;
  return at(y, m + 1, Math.min(s.monthDay, lastDayOf(y, m + 1)));
}

const ordinal = (n: number) => `${n}${n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th"}`;

export function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  return new Date(2000, 0, 1, h, m).toLocaleTimeString(LOCALE, { hour: "numeric", minute: "2-digit" });
}

/** "Every day at 9:00 AM", "Every Monday at 9:00 AM", "Monthly on the 1st at 9:00 AM" */
export function describeSchedule(s: Timing): string {
  const time = formatTime(s.time);
  if (s.frequency === "daily") return `Every day at ${time}`;
  if (s.frequency === "weekly") return `Every ${WEEKDAYS[s.weekday]} at ${time}`;
  return `Monthly on the ${ordinal(s.monthDay)} at ${time}`;
}

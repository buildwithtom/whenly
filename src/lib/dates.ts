import {
  addDays,
  addWeeks,
  addMonths,
  differenceInCalendarDays,
  differenceInCalendarMonths,
  differenceInCalendarYears,
  format,
  isValid,
} from "date-fns";
import type { CompletionEvent, Reminder } from "../types";

export function validPastDate(value: number, now = Date.now()) {
  return Number.isFinite(value) && isValid(new Date(value)) && value <= now;
}
export function elapsed(value: number | null, now = Date.now()): string {
  if (value === null) return "Not recorded yet";
  if (!validPastDate(value, now)) return "Invalid date";
  const date = new Date(value),
    today = new Date(now);
  const days = differenceInCalendarDays(today, date);
  if (days === 0) {
    const minutes = Math.floor((now - value) / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60)
      return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  }
  if (days === 1) return "Yesterday";
  if (days < 21) return `${days} days ago`;
  const months = differenceInCalendarMonths(today, date);
  if (days < 60 || months < 2) return `${Math.floor(days / 7)} weeks ago`;
  const years = differenceInCalendarYears(today, date);
  if (months < 12 || years < 1) return `${months} months ago`;
  return `${years} ${years === 1 ? "year" : "years"} ago`;
}
export function longDate(value: number) {
  return format(value, "MMMM d, yyyy");
}
export function shortDate(value: number) {
  return format(value, "MMM d");
}
export function dateInput(value = Date.now()) {
  return format(value, "yyyy-MM-dd'T'HH:mm");
}
export function intervals(events: CompletionEvent[]) {
  const sorted = [...events].sort((a, b) => a.completedAt - b.completedAt);
  const gaps = sorted
    .slice(1)
    .map((e, i) =>
      differenceInCalendarDays(e.completedAt, sorted[i].completedAt),
    );
  return {
    count: events.length,
    average: gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length : null,
    longest: gaps.length ? Math.max(...gaps) : null,
    shortest: gaps.length ? Math.min(...gaps) : null,
  };
}
export function intervalLabel(value: number | null) {
  return value === null
    ? "—"
    : `${Number(value.toFixed(1))} ${value === 1 ? "day" : "days"}`;
}
export function dueAt(
  latest: number | null,
  reminder: Reminder | null,
): number | null {
  if (latest === null || !reminder) return null;
  const add = { days: addDays, weeks: addWeeks, months: addMonths }[
    reminder.unit
  ];
  return add(latest, reminder.amount).getTime();
}
export function isDue(
  latest: number | null,
  reminder: Reminder | null,
  now = Date.now(),
) {
  const due = dueAt(latest, reminder);
  return due !== null && differenceInCalendarDays(now, due) >= 0;
}
export function suggestedInterval(events: CompletionEvent[]) {
  return events.length >= 4
    ? Math.max(1, Math.round(intervals(events).average!))
    : null;
}
export function greeting(now = new Date()) {
  const hour = now.getHours();
  return hour < 12
    ? "Good morning."
    : hour < 17
      ? "Good afternoon."
      : "Good evening.";
}

import { describe, expect, it } from "vitest";
import {
  dueAt,
  elapsed,
  intervals,
  isDue,
  suggestedInterval,
  validPastDate,
} from "./dates";
import type { CompletionEvent } from "../types";
const time = (y: number, m: number, d: number, h = 12, min = 0) =>
  new Date(y, m - 1, d, h, min).getTime();
const event = (date: number): CompletionEvent => ({
  id: String(date),
  activityId: "a",
  completedAt: date,
  note: "",
  createdAt: date,
  updatedAt: date,
});
describe("Human-friendly local dates", () => {
  const now = time(2026, 11, 14);
  it("shows unknown separately from recorded dates", () =>
    expect(elapsed(null, now)).toBe("Not recorded yet"));
  it("handles just now, minutes, and hours", () => {
    expect(elapsed(now, now)).toBe("Just now");
    expect(elapsed(now - 3 * 60000, now)).toBe("3 minutes ago");
    expect(elapsed(now - 3 * 3600000, now)).toBe("3 hours ago");
  });
  it("uses calendar midnight rather than 24 hours for yesterday", () =>
    expect(elapsed(time(2026, 11, 13, 23, 59), time(2026, 11, 14, 0, 1))).toBe(
      "Yesterday",
    ));
  it("counts calendar days rather than truncating milliseconds", () =>
    expect(elapsed(time(2026, 11, 10, 23), time(2026, 11, 14, 0))).toBe(
      "4 days ago",
    ));
  it("formats weeks, months, and years", () => {
    expect(elapsed(time(2026, 10, 20), now)).toBe("3 weeks ago");
    expect(elapsed(time(2026, 9, 14), now)).toBe("2 months ago");
    expect(elapsed(time(2025, 11, 14), now)).toBe("1 year ago");
  });
  it("handles leap-year boundaries", () =>
    expect(elapsed(time(2024, 2, 28, 23), time(2024, 3, 1, 1))).toBe(
      "2 days ago",
    ));
  it("counts days across spring DST without shortening the interval", () => {
    const stats = intervals([event(time(2026, 3, 7)), event(time(2026, 3, 9))]);
    expect(stats.average).toBe(2);
  });
  it("counts days across autumn DST without adding an interval", () => {
    expect(
      intervals([event(time(2026, 10, 31)), event(time(2026, 11, 2))]).average,
    ).toBe(2);
  });
  it("rejects invalid and future dates", () => {
    expect(validPastDate(NaN, now)).toBe(false);
    expect(validPastDate(Infinity, now)).toBe(false);
    expect(validPastDate(now + 1, now)).toBe(false);
    expect(elapsed(now + 1, now)).toBe("Invalid date");
  });
});
describe("History intervals and reminders", () => {
  it("does not invent averages with zero or one record", () => {
    expect(intervals([]).average).toBeNull();
    expect(intervals([event(time(2026, 11, 1))]).longest).toBeNull();
  });
  it("calculates sorted average, shortest and longest calendar intervals", () => {
    const stats = intervals([
      event(time(2026, 11, 10)),
      event(time(2026, 11, 1)),
      event(time(2026, 11, 3)),
    ]);
    expect(stats).toEqual({ count: 3, average: 4.5, longest: 7, shortest: 2 });
  });
  it("requires four real records for a suggestion", () => {
    const events = [1, 4, 7, 10].map((d) => event(time(2026, 11, d)));
    expect(suggestedInterval(events.slice(0, 3))).toBeNull();
    expect(suggestedInterval(events)).toBe(3);
  });
  it("adds calendar months and clamps the last day", () =>
    expect(dueAt(time(2024, 1, 31), { amount: 1, unit: "months" })).toBe(
      time(2024, 2, 29),
    ));
  it("does not call an activity due without an interval or a history", () => {
    expect(isDue(time(2026, 1, 1), null)).toBe(false);
    expect(isDue(null, { amount: 1, unit: "days" })).toBe(false);
  });
  it("becomes due on the configured local calendar day", () =>
    expect(
      isDue(
        time(2026, 11, 1, 17),
        { amount: 2, unit: "days" },
        time(2026, 11, 3, 1),
      ),
    ).toBe(true));
});

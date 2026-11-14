import { describe, expect, it } from "vitest";
import { filterActivities, withHistory } from "./activities";
import type { Activity, CompletionEvent } from "../types";
const activity = (id: string, name: string, categoryId = "home"): Activity => ({
  id,
  name,
  categoryId,
  emoji: "✨",
  notes: "",
  createdAt: Number(id),
  updatedAt: 1,
  reminder: null,
  archivedAt: null,
  order: Number(id),
});
const event = (activityId: string, completedAt: number): CompletionEvent => ({
  id: crypto.randomUUID(),
  activityId,
  completedAt,
  note: "",
  createdAt: 1,
  updatedAt: 1,
});
const activities = withHistory(
  [
    activity("1", "Plants"),
    activity("2", "Bedsheets"),
    activity("3", "Call parents", "relationships"),
  ],
  [event("1", 100), event("2", 200)],
);
describe("Sorting and filtering", () => {
  it("places unknown dates after recorded dates in both chronological sorts", () => {
    expect(
      filterActivities(activities, "", "all", "oldest").map((a) => a.id),
    ).toEqual(["1", "2", "3"]);
    expect(
      filterActivities(activities, "", "all", "recent").map((a) => a.id),
    ).toEqual(["2", "1", "3"]);
  });
  it("sorts alphabetically, by creation, and custom order", () => {
    expect(
      filterActivities(activities, "", "all", "name").map((a) => a.id),
    ).toEqual(["2", "3", "1"]);
    expect(
      filterActivities(activities, "", "all", "added").map((a) => a.id),
    ).toEqual(["3", "2", "1"]);
    expect(
      filterActivities(activities, "", "all", "custom").map((a) => a.id),
    ).toEqual(["1", "2", "3"]);
  });
  it("combines trimmed case-insensitive search and category filters", () => {
    expect(
      filterActivities(activities, " PLANT ", "home", "name").map((a) => a.id),
    ).toEqual(["1"]);
    expect(
      filterActivities(activities, "plant", "relationships", "name"),
    ).toEqual([]);
  });
  it("keeps archived activities separate", () => {
    const rows = activities.map((a) => ({
      ...a,
      archivedAt: a.id === "1" ? 1 : null,
    }));
    expect(
      filterActivities(rows, "", "all", "name", true).map((a) => a.id),
    ).toEqual(["1"]);
    expect(filterActivities(rows, "", "all", "name")).toHaveLength(2);
  });
  it("derives the latest event without altering the source arrays", () => {
    const events = [event("1", 10), event("1", 50), event("1", 20)];
    expect(withHistory([activity("1", "A")], events)[0].latest).toBe(50);
    expect(events[0].completedAt).toBe(10);
  });
});

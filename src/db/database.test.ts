import { beforeEach, afterEach, describe, expect, it } from "vitest";
import {
  WhenlyDB,
  saveActivity,
  recordCompletion,
  deleteActivity,
  addCategory,
  deleteCategory,
  reorderActivities,
} from "./index";
import { withHistory } from "../lib/activities";
import { intervals } from "../lib/dates";
let database: WhenlyDB;
const input = {
  name: "Changed bedsheets",
  emoji: "🛏️",
  categoryId: "home",
  notes: "",
  reminder: null,
};
beforeEach(async () => {
  database = new WhenlyDB(`test-${crypto.randomUUID()}`);
  await database.open();
});
afterEach(async () => {
  await database.delete();
});
describe("Persistent activities and event history", () => {
  it("creates default categories without inventing any user activities", async () => {
    expect(await database.categories.count()).toBe(7);
    expect(await database.activities.count()).toBe(0);
    expect(await database.events.count()).toBe(0);
  });
  it("creates an unknown-date activity without a completion", async () => {
    const a = await saveActivity(input, undefined, undefined, database);
    expect(a.name).toBe(input.name);
    expect(await database.events.count()).toBe(0);
  });
  it("creates a known-date activity and a separate event atomically", async () => {
    const date = Date.now() - 86400000;
    const a = await saveActivity(input, undefined, date, database);
    expect(await database.events.where("activityId").equals(a.id).count()).toBe(
      1,
    );
    expect((await database.events.toArray())[0].completedAt).toBe(date);
  });
  it("rejects empty names, long names, duplicate names, and future dates", async () => {
    await expect(
      saveActivity({ ...input, name: " " }, undefined, undefined, database),
    ).rejects.toThrow("name");
    await expect(
      saveActivity(
        { ...input, name: "x".repeat(121) },
        undefined,
        undefined,
        database,
      ),
    ).rejects.toThrow("120");
    await saveActivity(input, undefined, undefined, database);
    await expect(
      saveActivity(
        { ...input, name: "  CHANGED BEDSHEETS " },
        undefined,
        undefined,
        database,
      ),
    ).rejects.toThrow("already");
    await expect(
      saveActivity(
        { ...input, name: "Other" },
        undefined,
        Date.now() + 86400000,
        database,
      ),
    ).rejects.toThrow("future");
    expect(await database.activities.count()).toBe(1);
  });
  it("edits an activity while keeping its original history and creation date", async () => {
    const a = await saveActivity(
      input,
      undefined,
      Date.now() - 86400000,
      database,
    );
    const edited = await saveActivity(
      { ...input, name: "Fresh sheets", notes: "Linen" },
      a,
      undefined,
      database,
    );
    expect(edited.id).toBe(a.id);
    expect(edited.createdAt).toBe(a.createdAt);
    expect((await database.events.toArray())[0].activityId).toBe(a.id);
    expect(edited.notes).toBe("Linen");
  });
  it("prevents concurrent rapid-tap completions transactionally", async () => {
    const a = await saveActivity(input, undefined, undefined, database);
    const now = Date.now() - 100;
    const result = await Promise.all([
      recordCompletion(a.id, now, "", undefined, database),
      recordCompletion(a.id, now + 1, "", undefined, database),
    ]);
    expect(result.filter((r) => r.created)).toHaveLength(1);
    expect(await database.events.count()).toBe(1);
  });
  it("undo deletes only the exact newly created event", async () => {
    const old = Date.now() - 86400000;
    const a = await saveActivity(input, undefined, old, database);
    const { event } = await recordCompletion(
      a.id,
      Date.now(),
      "",
      undefined,
      database,
    );
    await database.events.delete(event.id);
    const history = withHistory(
      await database.activities.toArray(),
      await database.events.toArray(),
    );
    expect(history[0].latest).toBe(old);
    expect(history[0].events).toHaveLength(1);
  });
  it("edits and deletes records and recalculates the latest completion and interval", async () => {
    const a = await saveActivity(input, undefined, undefined, database);
    const now = Date.now();
    const first = await recordCompletion(
      a.id,
      now - 10 * 86400000,
      "first",
      undefined,
      database,
    );
    const last = await recordCompletion(
      a.id,
      now - 2 * 86400000,
      "last",
      undefined,
      database,
    );
    await recordCompletion(
      a.id,
      now - 5 * 86400000,
      "edited",
      last.event.id,
      database,
    );
    expect(intervals(await database.events.toArray()).average).toBe(5);
    await database.events.delete(last.event.id);
    expect(withHistory([a], await database.events.toArray())[0].latest).toBe(
      first.event.completedAt,
    );
  });
  it("rejects future completions and missing activities", async () => {
    const a = await saveActivity(input, undefined, undefined, database);
    await expect(
      recordCompletion(a.id, Date.now() + 100000, "", undefined, database),
    ).rejects.toThrow("future");
    await expect(
      recordCompletion("missing", Date.now(), "", undefined, database),
    ).rejects.toThrow("no longer");
  });
  it("preserves data across closing and reopening IndexedDB", async () => {
    const a = await saveActivity(input, undefined, Date.now() - 5000, database);
    database.close();
    await database.open();
    expect(await database.activities.get(a.id)).toEqual(a);
    expect(await database.events.count()).toBe(1);
  });
  it("deletes an activity together with its own history only", async () => {
    const a = await saveActivity(input, undefined, Date.now() - 5000, database);
    const b = await saveActivity(
      { ...input, name: "Plants" },
      undefined,
      Date.now() - 5000,
      database,
    );
    await deleteActivity(a.id, database);
    expect(await database.events.count()).toBe(1);
    expect((await database.events.toArray())[0].activityId).toBe(b.id);
  });
  it("archives without losing history and disallows recording until restored", async () => {
    const a = await saveActivity(input, undefined, Date.now() - 5000, database);
    await database.activities.update(a.id, { archivedAt: Date.now() });
    await expect(
      recordCompletion(a.id, Date.now(), "", undefined, database),
    ).rejects.toThrow("Restore");
    expect(await database.events.count()).toBe(1);
  });
  it("moves deleted custom categories to Other without losing history", async () => {
    const c = await addCategory("Garden", database);
    const a = await saveActivity(
      { ...input, categoryId: c.id },
      undefined,
      Date.now() - 5000,
      database,
    );
    await deleteCategory(c.id, database);
    expect((await database.activities.get(a.id))?.categoryId).toBe("other");
    expect(await database.events.count()).toBe(1);
    await expect(deleteCategory("home", database)).rejects.toThrow("Built-in");
  });
  it("persists custom ordering", async () => {
    const a = await saveActivity(input, undefined, undefined, database),
      b = await saveActivity(
        { ...input, name: "Plants" },
        undefined,
        undefined,
        database,
      );
    await reorderActivities(a.id, b.id, database);
    expect((await database.activities.get(a.id))?.order).toBe(b.order);
    expect((await database.activities.get(b.id))?.order).toBe(a.order);
  });
});

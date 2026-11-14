import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { WhenlyDB, saveActivity, recordCompletion, addCategory } from "../db";
import { exportBackup, importBackup, validateBackup } from "./backup";
import type { Backup } from "../types";
let source: WhenlyDB, target: WhenlyDB;
beforeEach(async () => {
  source = new WhenlyDB(`source-${crypto.randomUUID()}`);
  target = new WhenlyDB(`target-${crypto.randomUUID()}`);
  await Promise.all([source.open(), target.open()]);
});
afterEach(async () => {
  await Promise.all([source.delete(), target.delete()]);
});
async function fixture(): Promise<Backup> {
  const a = await saveActivity(
    {
      name: "My plant",
      categoryId: "home",
      emoji: "🪴",
      notes: "A sunny corner",
      reminder: { amount: 1, unit: "weeks" },
    },
    undefined,
    Date.now() - 86400000,
    source,
  );
  await recordCompletion(
    a.id,
    Date.now() - 10000,
    "Happy leaves",
    undefined,
    source,
  );
  return exportBackup(source);
}
describe("Safe, versioned backups", () => {
  it("exports and validates a complete backup", async () => {
    const backup = await fixture();
    expect(validateBackup(JSON.parse(JSON.stringify(backup)))).toEqual(backup);
    expect(backup.schemaVersion).toBe(1);
    expect(backup.events).toHaveLength(2);
  });
  it("rejects corrupted or incompatible structure", () => {
    expect(() => validateBackup(null)).toThrow("supported");
    expect(() => validateBackup({ schemaVersion: 2 })).toThrow("supported");
    expect(() =>
      validateBackup({ schemaVersion: 1, exportedAt: "not a date" }),
    ).toThrow("date");
  });
  it("rejects future, orphaned, or invalid event dates", async () => {
    const backup = await fixture();
    for (const change of [
      { completedAt: Date.now() + 86400000 },
      { activityId: "missing" },
      { completedAt: NaN },
    ]) {
      const broken = structuredClone(backup);
      Object.assign(broken.events[0], change);
      expect(() => validateBackup(broken)).toThrow("memory");
    }
  });
  it("rejects duplicate identifiers and missing categories", async () => {
    const backup = await fixture();
    const broken = structuredClone(backup);
    broken.events.push(broken.events[0]);
    expect(() => validateBackup(broken)).toThrow("duplicate");
    const missing = structuredClone(backup);
    missing.categories = [];
    expect(() => validateBackup(missing)).toThrow("category");
  });
  it("rejects malformed reminders and preferences", async () => {
    const backup = await fixture();
    backup.activities[0].reminder = { amount: -1, unit: "days" };
    expect(() => validateBackup(backup)).toThrow("reminder");
    backup.activities[0].reminder = null;
    (backup.preferences as unknown as { theme: string }).theme = "sepia";
    expect(() => validateBackup(backup)).toThrow("preferences");
  });
  it("merges idempotently, avoiding duplicate events on repeated imports", async () => {
    const backup = await fixture();
    expect(await importBackup(backup, "merge", target)).toEqual({
      addedActivities: 1,
      addedEvents: 2,
    });
    expect(await importBackup(backup, "merge", target)).toEqual({
      addedActivities: 0,
      addedEvents: 0,
    });
    expect(await target.events.count()).toBe(2);
  });
  it("merges matching names with different IDs and deduplicates timestamps", async () => {
    const backup = await fixture();
    const local = await saveActivity(
      { ...backup.activities[0], name: "MY PLANT" },
      undefined,
      backup.events[0].completedAt,
      target,
    );
    await importBackup(backup, "merge", target);
    expect(await target.activities.count()).toBe(1);
    expect(await target.events.count()).toBe(2);
    expect(
      (await target.events.toArray()).every((e) => e.activityId === local.id),
    ).toBe(true);
    expect((await target.activities.get(local.id))?.name).toBe("MY PLANT");
  });
  it("maps matching custom categories with different IDs", async () => {
    const sourceCategory = await addCategory("Garden", source);
    await saveActivity(
      {
        name: "Rose",
        emoji: "🌹",
        notes: "",
        reminder: null,
        categoryId: sourceCategory.id,
      },
      undefined,
      undefined,
      source,
    );
    const localCategory = await addCategory("Garden", target);
    await importBackup(await exportBackup(source), "merge", target);
    expect(await target.categories.count()).toBe(8);
    expect((await target.activities.toArray())[0].categoryId).toBe(
      localCategory.id,
    );
  });
  it("replaces all data only in explicit replace mode", async () => {
    const backup = await fixture();
    await saveActivity(
      {
        name: "Keep me",
        emoji: "✨",
        categoryId: "home",
        notes: "",
        reminder: null,
      },
      undefined,
      undefined,
      target,
    );
    await importBackup(backup, "merge", target);
    expect(await target.activities.count()).toBe(2);
    await importBackup(backup, "replace", target);
    expect(await target.activities.count()).toBe(1);
    expect((await target.activities.toArray())[0].name).toBe("My plant");
  });
  it("leaves existing data untouched on a rejected import", async () => {
    const backup = await fixture();
    await importBackup(backup, "merge", target);
    const before = await exportBackup(target);
    const invalid = structuredClone(backup);
    invalid.events[0].completedAt = Infinity;
    await expect(importBackup(invalid, "replace", target)).rejects.toThrow();
    const after = await exportBackup(target);
    expect(after.activities).toEqual(before.activities);
    expect(after.events).toEqual(before.events);
  });
});

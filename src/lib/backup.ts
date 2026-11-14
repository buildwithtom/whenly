import type {
  Activity,
  Backup,
  Category,
  CompletionEvent,
  Preferences,
} from "../types";
import { db, DEFAULT_CATEGORIES, DEFAULT_PREFS, type WhenlyDB } from "../db";
import { validPastDate } from "./dates";
const object = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const string = (v: unknown, max = 2000): v is string =>
  typeof v === "string" && v.length <= max;
const id = (v: unknown): v is string => string(v, 128) && v.trim().length > 0;
const stamp = (v: unknown): v is number =>
  typeof v === "number" && validPastDate(v);
const fail = (message: string): never => {
  throw new Error(message);
};
export function validateBackup(raw: unknown): Backup {
  if (!object(raw) || raw.schemaVersion !== 1)
    return fail("This isn’t a supported whenly backup (schema version 1).");
  if (
    !string(raw.exportedAt, 100) ||
    !Number.isFinite(Date.parse(raw.exportedAt))
  )
    return fail("The backup export date is invalid.");
  if (
    !Array.isArray(raw.activities) ||
    !Array.isArray(raw.events) ||
    !Array.isArray(raw.categories)
  )
    return fail("This backup is missing activities, memories, or categories.");
  if (
    raw.activities.length > 10000 ||
    raw.events.length > 200000 ||
    raw.categories.length > 1000
  )
    return fail("This backup is too large to import safely.");
  const unique = (rows: { id: string }[]) =>
    new Set(rows.map((r) => r.id)).size === rows.length;
  const categories: Category[] = raw.categories.map((c) => {
    if (
      !object(c) ||
      !id(c.id) ||
      !string(c.name, 40) ||
      !c.name.trim() ||
      !string(c.color, 30) ||
      !string(c.icon, 40) ||
      typeof c.isDefault !== "boolean"
    )
      return fail("A category in this backup is invalid.");
    return {
      id: c.id,
      name: c.name.trim(),
      color: [
        "sage",
        "peach",
        "rose",
        "lavender",
        "blue",
        "sand",
        "neutral",
      ].includes(c.color)
        ? c.color
        : "sage",
      icon: c.icon,
      isDefault: DEFAULT_CATEGORIES.some((d) => d.id === c.id),
    };
  });
  if (
    !unique(categories) ||
    new Set(categories.map((c) => c.name.toLocaleLowerCase())).size !==
      categories.length
  )
    return fail("This backup has duplicate categories.");
  for (const c of categories) {
    const canonical = DEFAULT_CATEGORIES.find((d) => d.id === c.id);
    if (canonical && canonical.name !== c.name)
      return fail("A built-in category in this backup has been changed.");
  }
  const categoryIds = new Set(categories.map((c) => c.id));
  const activities: Activity[] = raw.activities.map((a) => {
    if (
      !object(a) ||
      !id(a.id) ||
      !string(a.name, 120) ||
      !a.name.trim() ||
      !string(a.emoji, 32) ||
      !a.emoji.trim() ||
      !id(a.categoryId) ||
      !categoryIds.has(a.categoryId) ||
      !string(a.notes) ||
      !stamp(a.createdAt) ||
      !stamp(a.updatedAt) ||
      !(a.archivedAt === null || stamp(a.archivedAt)) ||
      typeof a.order !== "number" ||
      !Number.isFinite(a.order)
    )
      return fail(
        "An activity in this backup is invalid or has a missing category.",
      );
    const reminder = a.reminder;
    if (
      reminder !== null &&
      (!object(reminder) ||
        !Number.isInteger(reminder.amount) ||
        (reminder.amount as number) < 1 ||
        (reminder.amount as number) > 3650 ||
        !["days", "weeks", "months"].includes(reminder.unit as string))
    )
      return fail("An activity has an invalid reminder.");
    return {
      id: a.id,
      name: a.name.trim(),
      emoji: a.emoji,
      categoryId: a.categoryId,
      notes: a.notes,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
      archivedAt: a.archivedAt,
      order: a.order,
      reminder: reminder as Activity["reminder"],
    };
  });
  if (
    !unique(activities) ||
    new Set(activities.map((a) => a.name.toLocaleLowerCase())).size !==
      activities.length
  )
    return fail("This backup has duplicate activities.");
  const activityIds = new Set(activities.map((a) => a.id));
  const events: CompletionEvent[] = raw.events.map((e) => {
    if (
      !object(e) ||
      !id(e.id) ||
      !id(e.activityId) ||
      !activityIds.has(e.activityId) ||
      !stamp(e.completedAt) ||
      !string(e.note) ||
      !stamp(e.createdAt) ||
      !stamp(e.updatedAt)
    )
      return fail(
        "A memory is invalid, dated in the future, or has a missing activity.",
      );
    return {
      id: e.id,
      activityId: e.activityId,
      completedAt: e.completedAt,
      note: e.note,
      createdAt: e.createdAt,
      updatedAt: e.updatedAt,
    };
  });
  if (!unique(events)) return fail("This backup has duplicate memory IDs.");
  const p = raw.preferences;
  if (
    !object(p) ||
    !["light", "dark", "system"].includes(p.theme as string) ||
    !["oldest", "recent", "name", "added", "custom"].includes(
      p.sort as string,
    ) ||
    typeof p.notifications !== "boolean"
  )
    return fail("The backup preferences are invalid.");
  return {
    schemaVersion: 1,
    exportedAt: raw.exportedAt,
    activities,
    events,
    categories,
    preferences: p as Preferences,
  };
}
export async function exportBackup(database = db): Promise<Backup> {
  return database.transaction("r", database.tables, async () => ({
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    activities: await database.activities.toArray(),
    events: await database.events.toArray(),
    categories: await database.categories.toArray(),
    preferences: {
      ...((await database.settings.get("preferences"))?.value || DEFAULT_PREFS),
    },
  }));
}
export async function importBackup(
  input: Backup,
  mode: "merge" | "replace",
  database: WhenlyDB = db,
) {
  const backup = validateBackup(input);
  return database.transaction("rw", database.tables, async () => {
    if (mode === "replace")
      for (const table of database.tables) await table.clear();
    const categoryMap = new Map<string, string>();
    const categories = await database.categories.toArray();
    for (const c of backup.categories) {
      const existing = categories.find(
        (x) =>
          x.id === c.id ||
          x.name.toLocaleLowerCase() === c.name.toLocaleLowerCase(),
      );
      categoryMap.set(c.id, existing?.id || c.id);
      if (!existing) {
        await database.categories.add(c);
        categories.push(c);
      }
    }
    for (const c of DEFAULT_CATEGORIES)
      if (
        !categories.some(
          (x) =>
            x.id === c.id ||
            x.name.toLocaleLowerCase() === c.name.toLocaleLowerCase(),
        )
      )
        await database.categories.add(c);
    const existingActivities = await database.activities.toArray();
    const activityMap = new Map<string, string>();
    let addedActivities = 0,
      addedEvents = 0;
    for (const a of [...backup.activities].sort((a, b) => a.order - b.order)) {
      const existing = existingActivities.find(
        (x) =>
          x.id === a.id ||
          x.name.toLocaleLowerCase() === a.name.toLocaleLowerCase(),
      );
      activityMap.set(a.id, existing?.id || a.id);
      if (!existing) {
        const row = {
          ...a,
          categoryId: categoryMap.get(a.categoryId)!,
          order: existingActivities.reduce(
            (max, a) => Math.max(max, a.order + 1),
            0,
          ),
        };
        await database.activities.add(row);
        existingActivities.push(row);
        addedActivities++;
      }
    }
    const existingEvents = await database.events.toArray();
    const ids = new Set(existingEvents.map((e) => e.id));
    const keys = new Set(
      existingEvents.map((e) => `${e.activityId}:${e.completedAt}`),
    );
    for (const event of backup.events) {
      const activityId = activityMap.get(event.activityId)!;
      const key = `${activityId}:${event.completedAt}`;
      if (ids.has(event.id) || keys.has(key)) continue;
      await database.events.add({ ...event, activityId });
      ids.add(event.id);
      keys.add(key);
      addedEvents++;
    }
    if (mode === "replace")
      await database.settings.put({
        id: "preferences",
        value: { ...backup.preferences, notifications: false },
      });
    return { addedActivities, addedEvents };
  });
}
export function downloadBackup(backup: Backup) {
  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = `whenly-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

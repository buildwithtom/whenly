import Dexie, { type Table } from "dexie";
import type {
  Activity,
  Category,
  CompletionEvent,
  Preferences,
} from "../types";
import { validPastDate } from "../lib/dates";
export const DEFAULT_CATEGORIES: Category[] = [
  { id: "home", name: "Home", color: "sage", icon: "House", isDefault: true },
  {
    id: "health",
    name: "Health & Self-care",
    color: "peach",
    icon: "Heart",
    isDefault: true,
  },
  {
    id: "relationships",
    name: "Relationships",
    color: "rose",
    icon: "Users",
    isDefault: true,
  },
  {
    id: "hobbies",
    name: "Hobbies",
    color: "lavender",
    icon: "Guitar",
    isDefault: true,
  },
  {
    id: "maintenance",
    name: "Maintenance",
    color: "blue",
    icon: "Wrench",
    isDefault: true,
  },
  {
    id: "personal",
    name: "Personal",
    color: "sand",
    icon: "User",
    isDefault: true,
  },
  {
    id: "other",
    name: "Other",
    color: "neutral",
    icon: "Shapes",
    isDefault: true,
  },
];
export const DEFAULT_PREFS: Preferences = {
  theme: "system",
  sort: "oldest",
  notifications: false,
};
export class WhenlyDB extends Dexie {
  activities!: Table<Activity, string>;
  events!: Table<CompletionEvent, string>;
  categories!: Table<Category, string>;
  settings!: Table<{ id: string; value: Preferences }, string>;
  constructor(name = "whenly") {
    super(name);
    this.version(1).stores({
      activities: "id, categoryId, createdAt, archivedAt, order",
      events: "id, activityId, completedAt, [activityId+completedAt]",
      categories: "id, &name",
      settings: "id",
    });
    this.on("populate", (tx) => {
      void tx.table("categories").bulkAdd(DEFAULT_CATEGORIES);
    });
  }
}
export const db = new WhenlyDB();
export function assertName(name: string) {
  if (!name.trim()) throw new Error("Give this activity a name.");
  if (name.trim().length > 120)
    throw new Error("Keep the name to 120 characters or fewer.");
}
export async function saveActivity(
  input: Omit<
    Activity,
    "id" | "createdAt" | "updatedAt" | "archivedAt" | "order"
  >,
  previous?: Activity,
  initialDate?: number,
  database = db,
) {
  assertName(input.name);
  if (!input.emoji.trim() || input.emoji.length > 32)
    throw new Error("Choose an activity emoji.");
  if (input.notes.length > 2000)
    throw new Error("Keep notes to 2,000 characters or fewer.");
  if (initialDate !== undefined && !validPastDate(initialDate))
    throw new Error("Choose a valid date that isn’t in the future.");
  if (
    input.reminder &&
    (!Number.isInteger(input.reminder.amount) ||
      input.reminder.amount < 1 ||
      input.reminder.amount > 3650)
  )
    throw new Error("Choose an interval between 1 and 3,650.");
  return database.transaction(
    "rw",
    database.activities,
    database.events,
    database.categories,
    async () => {
      if (!(await database.categories.get(input.categoryId)))
        throw new Error("Choose an existing category.");
      const names = await database.activities.toArray();
      if (
        names.some(
          (a) =>
            a.id !== previous?.id &&
            a.name.trim().toLocaleLowerCase() ===
              input.name.trim().toLocaleLowerCase(),
        )
      )
        throw new Error(
          "You’re already remembering an activity with that name.",
        );
      const now = Date.now();
      const activity: Activity = {
        ...input,
        name: input.name.trim(),
        id: previous?.id || crypto.randomUUID(),
        createdAt: previous?.createdAt || now,
        updatedAt: now,
        archivedAt: previous?.archivedAt ?? null,
        order:
          previous?.order ??
          names.reduce((max, a) => Math.max(max, a.order + 1), 0),
      };
      await database.activities.put(activity);
      if (!previous && initialDate !== undefined)
        await database.events.add({
          id: crypto.randomUUID(),
          activityId: activity.id,
          completedAt: initialDate,
          note: "",
          createdAt: now,
          updatedAt: now,
        });
      return activity;
    },
  );
}
export async function recordCompletion(
  activityId: string,
  completedAt = Date.now(),
  note = "",
  existingId?: string,
  database = db,
) {
  if (!validPastDate(completedAt))
    throw new Error("Choose a valid date that isn’t in the future.");
  if (note.length > 2000)
    throw new Error("Keep notes to 2,000 characters or fewer.");
  return database.transaction(
    "rw",
    database.events,
    database.activities,
    async () => {
      const activity = await database.activities.get(activityId);
      if (!activity) throw new Error("This activity no longer exists.");
      if (activity.archivedAt)
        throw new Error("Restore this activity before adding a memory.");
      const existing = existingId
        ? await database.events.get(existingId)
        : undefined;
      if (existingId && (!existing || existing.activityId !== activityId))
        throw new Error("This memory no longer exists.");
      const history = await database.events
        .where("activityId")
        .equals(activityId)
        .toArray();
      // This transactional guard also covers simultaneous taps from different tabs.
      const duplicate = history.find(
        (e) =>
          e.id !== existingId && Math.abs(e.completedAt - completedAt) < 2000,
      );
      if (duplicate) {
        if (existingId)
          throw new Error("There’s already a memory at that time.");
        return { event: duplicate, created: false };
      }
      const now = Date.now();
      const event: CompletionEvent = {
        id: existingId || crypto.randomUUID(),
        activityId,
        completedAt,
        note: note.trim(),
        createdAt: existing?.createdAt || now,
        updatedAt: now,
      };
      await database.events.put(event);
      return { event, created: !existingId };
    },
  );
}
export async function deleteActivity(id: string, database = db) {
  await database.transaction(
    "rw",
    database.activities,
    database.events,
    async () => {
      await database.events.where("activityId").equals(id).delete();
      await database.activities.delete(id);
    },
  );
}
export async function addCategory(name: string, database = db) {
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > 40)
    throw new Error("Use a category name between 1 and 40 characters.");
  const existing = await database.categories.toArray();
  if (
    existing.some(
      (c) => c.name.toLocaleLowerCase() === trimmed.toLocaleLowerCase(),
    )
  )
    throw new Error("That category already exists.");
  const category: Category = {
    id: crypto.randomUUID(),
    name: trimmed,
    color: "sage",
    icon: "Shapes",
    isDefault: false,
  };
  await database.categories.add(category);
  return category;
}
export async function deleteCategory(id: string, database = db) {
  await database.transaction(
    "rw",
    database.categories,
    database.activities,
    async () => {
      const category = await database.categories.get(id);
      if (!category || category.isDefault)
        throw new Error("Built-in categories can’t be removed.");
      await database.activities
        .where("categoryId")
        .equals(id)
        .modify({ categoryId: "other", updatedAt: Date.now() });
      await database.categories.delete(id);
    },
  );
}
export async function reorderActivities(
  firstId: string,
  secondId: string,
  database = db,
) {
  await database.transaction("rw", database.activities, async () => {
    const a = await database.activities.get(firstId),
      b = await database.activities.get(secondId);
    if (a && b) {
      await database.activities.update(a.id, { order: b.order });
      await database.activities.update(b.id, { order: a.order });
    }
  });
}
export async function clearData(database = db) {
  await database.transaction("rw", database.tables, async () => {
    for (const table of database.tables) await table.clear();
    await database.categories.bulkAdd(DEFAULT_CATEGORIES);
  });
}

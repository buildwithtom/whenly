export type Reminder = { amount: number; unit: "days" | "weeks" | "months" };
export type Activity = {
  id: string;
  name: string;
  emoji: string;
  categoryId: string;
  notes: string;
  createdAt: number;
  updatedAt: number;
  reminder: Reminder | null;
  archivedAt: number | null;
  order: number;
};
export type CompletionEvent = {
  id: string;
  activityId: string;
  completedAt: number;
  note: string;
  createdAt: number;
  updatedAt: number;
};
export type Category = {
  id: string;
  name: string;
  color: string;
  icon: string;
  isDefault: boolean;
};
export type Sort = "oldest" | "recent" | "name" | "added" | "custom";
export type Preferences = {
  theme: "light" | "dark" | "system";
  sort: Sort;
  notifications: boolean;
};
export type Backup = {
  schemaVersion: 1;
  exportedAt: string;
  activities: Activity[];
  events: CompletionEvent[];
  categories: Category[];
  preferences: Preferences;
};
export type ActivityWithHistory = Activity & {
  events: CompletionEvent[];
  latest: number | null;
};

import type {
  Activity,
  ActivityWithHistory,
  CompletionEvent,
  Sort,
} from "../types";
export function withHistory(
  activities: Activity[],
  events: CompletionEvent[],
): ActivityWithHistory[] {
  const grouped = new Map<string, CompletionEvent[]>();
  for (const event of events) {
    const history = grouped.get(event.activityId);
    if (history) history.push(event);
    else grouped.set(event.activityId, [event]);
  }
  return activities.map((a) => {
    const history = (grouped.get(a.id) || []).sort(
      (a, b) => b.completedAt - a.completedAt,
    );
    return { ...a, events: history, latest: history[0]?.completedAt ?? null };
  });
}
export function filterActivities(
  activities: ActivityWithHistory[],
  search: string,
  category: string,
  sort: Sort,
  archived = false,
) {
  const result = activities.filter(
    (a) =>
      Boolean(a.archivedAt) === archived &&
      (category === "all" || a.categoryId === category) &&
      a.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()),
  );
  return result.sort((a, b) => {
    if (sort === "name") return a.name.localeCompare(b.name);
    if (sort === "added") return b.createdAt - a.createdAt;
    if (sort === "custom")
      return a.order - b.order || a.createdAt - b.createdAt;
    if (a.latest === null && b.latest === null)
      return a.name.localeCompare(b.name);
    if (a.latest === null) return 1;
    if (b.latest === null) return -1;
    return sort === "oldest" ? a.latest - b.latest : b.latest - a.latest;
  });
}
export const SORTS: { value: Sort; label: string }[] = [
  { value: "oldest", label: "Longest time ago" },
  { value: "recent", label: "Most recently recorded" },
  { value: "name", label: "Alphabetical" },
  { value: "added", label: "Recently added" },
  { value: "custom", label: "My custom order" },
];
export const SUGGESTIONS = [
  {
    name: "Changed bedsheets",
    emoji: "🛏️",
    categoryId: "home",
    description: "A fresh start, whenever it happens.",
  },
  {
    name: "Watered my plants",
    emoji: "🪴",
    categoryId: "home",
    description: "A little love for your leafy friends.",
  },
  {
    name: "Called my parents",
    emoji: "☎️",
    categoryId: "relationships",
    description: "Keep the little connections close.",
  },
  {
    name: "Changed toothbrush",
    emoji: "🪥",
    categoryId: "health",
    description: "Small things that look after you.",
  },
  {
    name: "Cleaned my laptop",
    emoji: "💻",
    categoryId: "maintenance",
    description: "A little care for your everyday tools.",
  },
  {
    name: "Cleaned my guitar",
    emoji: "🎸",
    categoryId: "hobbies",
    description: "More time for the things you love.",
  },
];
export const EMOJIS = [
  "✨",
  "🛏️",
  "🪴",
  "☎️",
  "🪥",
  "💻",
  "🎸",
  "🧹",
  "🛁",
  "💧",
  "📚",
  "🚗",
  "✂️",
  "🧘",
  "💊",
  "☕",
  "🐾",
  "🏃",
  "👋",
  "🧺",
  "💌",
  "🌿",
  "🎹",
  "🔧",
];

import { useCallback, useEffect, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { format } from "date-fns";
import {
  Plus,
  Search,
  ArrowUpRight,
  ArrowRight,
  Sparkles,
  LayoutGrid,
  ChartNoAxesColumnIncreasing,
  Settings2,
  ShieldCheck,
  Leaf,
  Sun,
  Moon,
  Sunset,
  Check,
  X,
  WifiOff,
  Archive,
  SlidersHorizontal,
  CircleHelp,
} from "lucide-react";
import {
  db,
  DEFAULT_PREFS,
  deleteActivity,
  recordCompletion,
  reorderActivities,
} from "./db";
import {
  filterActivities,
  SORTS,
  SUGGESTIONS,
  withHistory,
} from "./lib/activities";
import { greeting, isDue } from "./lib/dates";
import { Brand, CategoryIcon, MemoryIllustration } from "./components/Icons";
import { Confirm } from "./components/Modal";
import {
  ActivityForm,
  type ActivitySeed,
} from "./features/activities/ActivityForm";
import { ActivityCard } from "./features/activities/ActivityCard";
import { ActivityDetail } from "./features/activities/ActivityDetail";
import { EventForm } from "./features/history/EventForm";
import { Insights } from "./features/insights/Insights";
import { Settings } from "./features/settings/Settings";
import type {
  Activity,
  ActivityWithHistory,
  CompletionEvent,
  Preferences,
  Sort,
} from "./types";

type Overlay =
  | { type: "add"; seed?: ActivitySeed }
  | { type: "edit"; activity: ActivityWithHistory }
  | { type: "event"; activityId: string; event?: CompletionEvent }
  | { type: "delete-event"; event: CompletionEvent }
  | { type: "delete-activity"; activity: Activity }
  | null;
type Toast = { id: string; message: string; undoId?: string };
function routeFromHash() {
  return window.location.hash.slice(1) || "/";
}
function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
function navigate(path: string) {
  window.location.hash = path;
  window.scrollTo({ top: 0, behavior: "instant" });
}
export default function App() {
  const [route, setRoute] = useState(routeFromHash),
    [overlay, setOverlay] = useState<Overlay>(null),
    [toast, setToast] = useState<Toast | null>(null);
  const [search, setSearch] = useState(""),
    [category, setCategory] = useState("all"),
    [sortOverride, setSortOverride] = useState<Sort | null>(null),
    [archived, setArchived] = useState(false);
  const [now, setNow] = useState(Date.now()),
    [online, setOnline] = useState(navigator.onLine),
    [pending, setPending] = useState<Set<string>>(new Set());
  const locks = useRef(new Set<string>()),
    notified = useRef(new Set<string>()),
    undoLock = useRef(false);
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();
  const data = useLiveQuery(
    async () =>
      db.transaction("r", db.tables, async () => ({
        activities: await db.activities.toArray(),
        events: await db.events.toArray(),
        categories: await db.categories.toArray(),
        preferences:
          (await db.settings.get("preferences"))?.value || DEFAULT_PREFS,
      })),
    [],
  );
  const preferences = data?.preferences || DEFAULT_PREFS;
  const activities = withHistory(data?.activities || [], data?.events || []);
  const categories = data?.categories || [];
  const sort = sortOverride || preferences.sort;
  const active = activities.filter((a) => !a.archivedAt),
    archivedCount = activities.length - active.length;
  const filtered = filterActivities(
    activities,
    search,
    category,
    sort,
    archived,
  );
  const detail = route.startsWith("/activity/")
    ? activities.find((a) => a.id === safeDecode(route.slice(10)))
    : undefined;
  const page =
    route === "/insights"
      ? "insights"
      : route === "/settings"
        ? "settings"
        : "activities";
  const notify = useCallback(
    (message: string, undoId?: string) =>
      setToast({ id: crypto.randomUUID(), message, undoId }),
    [],
  );
  const fail = (e: unknown) =>
    notify(
      `Couldn’t save that. ${e instanceof Error ? e.message : "Please check browser storage and try again."}`,
    );
  useEffect(() => {
    const listener = () => {
      setRoute(routeFromHash());
      setOverlay(null);
      window.scrollTo({ top: 0, behavior: "instant" });
    };
    window.addEventListener("hashchange", listener);
    const timer = setInterval(() => setNow(Date.now()), 30000);
    const status = () => setOnline(navigator.onLine);
    window.addEventListener("online", status);
    window.addEventListener("offline", status);
    return () => {
      window.removeEventListener("hashchange", listener);
      clearInterval(timer);
      window.removeEventListener("online", status);
      window.removeEventListener("offline", status);
    };
  }, []);
  useEffect(() => {
    if (
      data &&
      category !== "all" &&
      !data.categories.some((c) => c.id === category)
    )
      setCategory("all");
  }, [data, category]);
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      document.documentElement.dataset.theme =
        preferences.theme === "system"
          ? media.matches
            ? "dark"
            : "light"
          : preferences.theme;
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [preferences.theme]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), toast.undoId ? 10000 : 6000);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    if (
      !data ||
      !preferences.notifications ||
      typeof Notification === "undefined" ||
      Notification.permission !== "granted"
    )
      return;
    const due = activities.filter(
      (a) => !a.archivedAt && isDue(a.latest, a.reminder, now),
    );
    for (const a of due) {
      const key = `${a.id}:${a.latest}:${format(now, "yyyy-MM-dd")}`;
      if (notified.current.has(key)) continue;
      notified.current.add(key);
      void (async () => {
        try {
          const options = {
            body: `A gentle nudge for ${a.name}. Whenever you’re ready.`,
            icon: `${import.meta.env.BASE_URL}icon-192.png`,
            tag: a.id,
          };
          const registration = await navigator.serviceWorker?.getRegistration();
          if (registration)
            await registration.showNotification(
              "A little reminder from whenly",
              options,
            );
          else new Notification("A little reminder from whenly", options);
        } catch {
          /* In-app reminders remain available when browser alerts fail. */
        }
      })();
    }
  }, [data, now, preferences.notifications]);
  const complete = async (a: Activity) => {
    if (locks.current.has(a.id)) return;
    locks.current.add(a.id);
    setPending(new Set(locks.current));
    try {
      const result = await recordCompletion(a.id);
      setNow(Date.now());
      if (result.created)
        notify(`${a.emoji} A little moment, remembered.`, result.event.id);
    } catch (e) {
      fail(e);
    } finally {
      setTimeout(() => {
        locks.current.delete(a.id);
        setPending(new Set(locks.current));
      }, 1500);
    }
  };
  const undo = async () => {
    if (!toast?.undoId || undoLock.current) return;
    undoLock.current = true;
    try {
      await db.events.delete(toast.undoId);
      notify("That memory has been undone.");
      setNow(Date.now());
    } catch (e) {
      fail(e);
    } finally {
      undoLock.current = false;
    }
  };
  const setPreferences = async (p: Preferences) => {
    await db.settings.put({ id: "preferences", value: p });
    setSortOverride(null);
  };
  const toggleArchive = async (a: Activity) => {
    try {
      await db.activities.update(a.id, {
        archivedAt: a.archivedAt ? null : Date.now(),
        updatedAt: Date.now(),
      });
      notify(
        a.archivedAt
          ? "Back in your little memory bank."
          : "Archived, with all its memories safe.",
      );
    } catch (e) {
      fail(e);
    }
  };
  const move = async (index: number, direction: -1 | 1) => {
    const other = filtered[index + direction];
    if (!other) return;
    try {
      await reorderActivities(filtered[index].id, other.id);
    } catch (e) {
      fail(e);
    }
  };
  const confirmDelete = async () => {
    try {
      if (overlay?.type === "delete-event") {
        await db.events.delete(overlay.event.id);
        notify("Memory removed. Your history is up to date.");
      } else if (overlay?.type === "delete-activity") {
        await deleteActivity(overlay.activity.id);
        navigate("/");
        notify("Activity and its memories removed.");
      }
      setOverlay(null);
    } catch (e) {
      fail(e);
    }
  };
  const selectedCategory = categories.find((c) => c.id === category);
  const openActivity = (id: string) =>
    navigate(`/activity/${encodeURIComponent(id)}`);
  const hour = new Date(now).getHours(),
    GreetingIcon = hour < 12 ? Sun : hour < 17 ? Sunset : Moon;
  return (
    <MotionConfig reducedMotion="user">
      <a
        className="skip-link"
        href="#main-content"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("main-content")?.focus();
        }}
      >
        Skip to content
      </a>
      <header className="site-header">
        <div className="header-inner">
          <a className="brand-link" href="#/" aria-label="whenly home">
            <Brand />
          </a>
          <nav className="main-nav" aria-label="Main navigation">
            {[
              {
                id: "activities",
                label: "My activities",
                Icon: LayoutGrid,
                path: "/",
              },
              {
                id: "insights",
                label: "Insights",
                Icon: ChartNoAxesColumnIncreasing,
                path: "/insights",
              },
              {
                id: "settings",
                label: "Settings",
                Icon: Settings2,
                path: "/settings",
              },
            ].map(({ id, label, Icon, path }) => (
              <a
                href={`#${path}`}
                className={page === id ? "active" : ""}
                aria-current={page === id ? "page" : undefined}
                key={id}
              >
                <Icon size={16} />
                <span>{label}</span>
              </a>
            ))}
          </nav>
          <span className="header-privacy">
            <span className="status-dot" />
            {online
              ? "Your space. Just for you."
              : "Offline. Still here for you."}
          </span>
          <button
            className="mobile-add icon-button"
            aria-label="Add an activity"
            onClick={() => setOverlay({ type: "add" })}
          >
            <Plus size={22} />
          </button>
        </div>
      </header>
      {!online && (
        <div className="connection-banner">
          <WifiOff size={14} /> You’re offline. Your memories are still right
          here.
        </div>
      )}
      {needRefresh && (
        <div className="connection-banner">
          A fresh version of whenly is ready.
          <button
            className="text-button"
            onClick={() => void updateServiceWorker(true)}
          >
            Update app <ArrowRight size={14} />
          </button>
        </div>
      )}
      <main id="main-content" tabIndex={-1} className="main-content">
        {!data ? (
          <div
            className="app-skeleton"
            aria-label="Opening your memories"
            role="status"
          >
            <div />
            <div />
            <div />
          </div>
        ) : detail ? (
          <ActivityDetail
            activity={detail}
            category={categories.find((c) => c.id === detail.categoryId)}
            now={now}
            busy={pending.has(detail.id)}
            onBack={() => navigate("/")}
            onEdit={() => setOverlay({ type: "edit", activity: detail })}
            onComplete={() => void complete(detail)}
            onAddEvent={() =>
              setOverlay({ type: "event", activityId: detail.id })
            }
            onEditEvent={(event) =>
              setOverlay({ type: "event", activityId: detail.id, event })
            }
            onDeleteEvent={(event) =>
              setOverlay({ type: "delete-event", event })
            }
            onArchive={() => void toggleArchive(detail)}
            onDelete={() =>
              setOverlay({ type: "delete-activity", activity: detail })
            }
          />
        ) : route.startsWith("/activity/") ? (
          <div className="inline-empty">
            <CircleHelp size={36} />
            <h1>This little memory isn’t here.</h1>
            <p>It may have been deleted or belong to a different browser.</p>
            <button className="button primary" onClick={() => navigate("/")}>
              Back to my activities
            </button>
          </div>
        ) : page === "settings" ? (
          <Settings
            preferences={preferences}
            onPreferences={setPreferences}
            categories={categories}
            notify={notify}
          />
        ) : page === "insights" ? (
          <Insights
            activities={activities}
            now={now}
            onOpen={openActivity}
            onAdd={() => setOverlay({ type: "add" })}
          />
        ) : (
          <>
            <section className="greeting-section">
              <div>
                <div className="today-label">
                  <GreetingIcon size={16} />
                  {format(now, "EEEE, MMMM d")}
                </div>
                <h1>
                  {greeting(new Date(now))}
                  <span className="greeting-spark">✳</span>
                </h1>
                <p>Life happens. Let’s remember the little things.</p>
              </div>
              <button
                className="button primary add-activity-top"
                onClick={() => setOverlay({ type: "add" })}
              >
                <Plus size={18} /> Add activity
              </button>
            </section>
            {active.length === 0 && !archived ? (
              <>
                <section className="welcome-card">
                  <div className="welcome-copy">
                    <span className="eyebrow">
                      <span className="mini-line" /> A LITTLE LESS TO KEEP IN
                      YOUR HEAD
                    </span>
                    <h2>
                      Remember when.
                      <br />
                      <span>Make room for now.</span>
                    </h2>
                    <p>
                      When did you last do that little thing?
                      <br />
                      Give it a home here. We’ll remember for you.
                    </p>
                    <button
                      className="button primary"
                      onClick={() => setOverlay({ type: "add" })}
                    >
                      <Plus size={18} /> Add your first activity
                    </button>
                    <span className="welcome-reassurance">
                      No streaks. No pressure. Just life.
                    </span>
                  </div>
                  <MemoryIllustration />
                </section>
                <section className="suggestions-section">
                  <div className="section-heading">
                    <div>
                      <span className="eyebrow">A LITTLE INSPIRATION</span>
                      <h2>Start remembering.</h2>
                      <p>
                        Add something you’d like to keep track of. We’ll
                        remember the last time for you.
                      </p>
                    </div>
                    <span className="suggestions-hint">
                      A few ideas to make it yours <span>↙</span>
                    </span>
                  </div>
                  <div className="suggestion-grid">
                    {SUGGESTIONS.map((s) => {
                      const c = categories.find((c) => c.id === s.categoryId);
                      return (
                        <button
                          className="suggestion-card"
                          onClick={() => setOverlay({ type: "add", seed: s })}
                          key={s.name}
                        >
                          <span className={`emoji-box ${c?.color || "sage"}`}>
                            {s.emoji}
                          </span>
                          <div>
                            <strong>{s.name}</strong>
                            <span>{s.description}</span>
                          </div>
                          <Plus size={18} className="suggestion-plus" />
                        </button>
                      );
                    })}
                  </div>
                </section>
                {archivedCount > 0 && (
                  <button
                    className="back-link archived-link"
                    onClick={() => setArchived(true)}
                  >
                    <Archive size={16} /> View {archivedCount} archived{" "}
                    {archivedCount === 1 ? "activity" : "activities"}{" "}
                    <ArrowRight size={16} />
                  </button>
                )}
              </>
            ) : (
              <>
                <section className="memory-note">
                  <span className="note-icon">
                    <Leaf size={20} />
                  </span>
                  <div>
                    <strong>A little more space in your head.</strong>
                    <p>
                      {active.length} {active.length === 1 ? "thing" : "things"}{" "}
                      remembered. More room for everything else.
                    </p>
                  </div>
                  <span className="note-script">All in your own time.</span>
                </section>
                <section className="activities-section">
                  <div className="activities-heading">
                    <div>
                      <h2>
                        {archived ? "Tucked away" : "Your little memory bank"}
                        <span className="count-badge">
                          {archived ? archivedCount : active.length}
                        </span>
                      </h2>
                      <p>
                        {archived
                          ? "Past chapters, with all their memories kept."
                          : "Here’s what you’ve been keeping track of."}
                      </p>
                    </div>
                    <div className="activities-view">
                      <button
                        className={`view-button ${!archived ? "active" : ""}`}
                        onClick={() => {
                          setArchived(false);
                          setCategory("all");
                        }}
                        aria-pressed={!archived}
                      >
                        Activities
                      </button>
                      <button
                        className={`view-button ${archived ? "active" : ""}`}
                        onClick={() => {
                          setArchived(true);
                          setCategory("all");
                        }}
                        aria-pressed={archived}
                      >
                        <Archive size={14} /> Archived
                        {archivedCount ? ` (${archivedCount})` : ""}
                      </button>
                    </div>
                  </div>
                  <div className="activity-toolbar">
                    <div className="search-field">
                      <Search size={17} />
                      <input
                        aria-label="Search activities"
                        placeholder="Find a little thing…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                      {search && (
                        <button
                          className="icon-button"
                          aria-label="Clear search"
                          onClick={() => setSearch("")}
                        >
                          <X size={15} />
                        </button>
                      )}
                    </div>
                    <div className="sort-control">
                      <SlidersHorizontal size={15} />
                      <select
                        aria-label="Sort activities"
                        value={sort}
                        onChange={(e) =>
                          setSortOverride(e.target.value as Sort)
                        }
                      >
                        {SORTS.map((s) => (
                          <option value={s.value} key={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div
                    className="category-filters"
                    role="group"
                    aria-label="Filter by category"
                  >
                    <button
                      className={category === "all" ? "active" : ""}
                      aria-pressed={category === "all"}
                      onClick={() => setCategory("all")}
                    >
                      <LayoutGrid size={14} /> All activities
                    </button>
                    {categories
                      .filter((c) =>
                        activities.some(
                          (a) =>
                            a.categoryId === c.id &&
                            Boolean(a.archivedAt) === archived,
                        ),
                      )
                      .map((c) => (
                        <button
                          className={category === c.id ? "active" : ""}
                          aria-pressed={category === c.id}
                          onClick={() => setCategory(c.id)}
                          key={c.id}
                        >
                          <CategoryIcon name={c.icon} size={14} />
                          {c.name}
                        </button>
                      ))}
                  </div>
                  {filtered.length ? (
                    <div className="activity-grid">
                      {filtered.map((a, index) => (
                        <ActivityCard
                          key={a.id}
                          activity={a}
                          category={categories.find(
                            (c) => c.id === a.categoryId,
                          )}
                          onOpen={() => openActivity(a.id)}
                          onComplete={() => void complete(a)}
                          busy={pending.has(a.id) || Boolean(a.archivedAt)}
                          now={now}
                          custom={sort === "custom" && !archived}
                          onMove={(direction) => void move(index, direction)}
                          first={index === 0}
                          last={index === filtered.length - 1}
                        />
                      ))}
                      {!archived && (
                        <button
                          className="add-card"
                          onClick={() => setOverlay({ type: "add" })}
                        >
                          <span>
                            <Plus size={23} />
                          </span>
                          <strong>Another little thing?</strong>
                          <p>Give it a place to be remembered.</p>
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="results-empty">
                      {archived ? <Archive size={30} /> : <Search size={30} />}
                      <h3>
                        {search
                          ? "Nothing by that name."
                          : archived
                            ? "Nothing tucked away."
                            : `A little room in ${selectedCategory?.name || "this category"}.`}
                      </h3>
                      <p>
                        {search
                          ? "Try another word, or add something new."
                          : archived
                            ? "Archived activities will appear here, with their history kept."
                            : "Add an activity whenever you’re ready."}
                      </p>
                      {(search || category !== "all") && (
                        <button
                          className="button secondary"
                          onClick={() => {
                            setSearch("");
                            setCategory("all");
                          }}
                        >
                          Clear filters
                        </button>
                      )}
                    </div>
                  )}
                  {!archived && active.length > 0 && (
                    <div className="home-reminder">
                      <Sparkles size={16} />
                      <p>
                        One tap when it happens. A little peace of mind in
                        between.
                      </p>
                    </div>
                  )}
                </section>
              </>
            )}
            <section className="philosophy-strip">
              <div className="philosophy-mark">
                <Leaf size={20} />
              </div>
              <div>
                <strong>A memory assistant, with room to breathe.</strong>
                <p>
                  No deadlines to chase. No streaks to break. Just the last
                  time, so you can enjoy this time.
                </p>
              </div>
              <span>Small things. More headspace.</span>
            </section>
          </>
        )}
      </main>
      <footer className="site-footer">
        <div>
          <Brand small />
          <span>Life happens. Keep track.</span>
        </div>
        <span>
          <ShieldCheck size={14} /> Private by nature. Saved on this device.
        </span>
        <button onClick={() => navigate("/settings")}>
          Made for your everyday <ArrowUpRight size={14} />
        </button>
      </footer>
      <AnimatePresence>
        {toast && (
          <motion.div
            className="toast"
            role="status"
            key={toast.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
          >
            <span className="toast-check">
              <Check size={15} />
            </span>
            <span>{toast.message}</span>
            {toast.undoId && (
              <button className="undo-button" onClick={() => void undo()}>
                Undo
              </button>
            )}
            <button
              className="icon-button"
              aria-label="Dismiss message"
              onClick={() => setToast(null)}
            >
              <X size={15} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      {overlay?.type === "add" && (
        <ActivityForm
          seed={overlay.seed}
          categories={categories}
          onClose={() => setOverlay(null)}
          onSaved={() => {
            setOverlay(null);
            setArchived(false);
            setSearch("");
            setCategory("all");
            notify("A little less to keep in your head. Activity added.");
            if (page !== "activities") navigate("/");
          }}
        />
      )}
      {overlay?.type === "edit" && (
        <ActivityForm
          activity={overlay.activity}
          events={overlay.activity.events}
          categories={categories}
          onClose={() => setOverlay(null)}
          onSaved={() => {
            setOverlay(null);
            notify("Your activity, a little more you. Changes saved.");
          }}
        />
      )}
      {overlay?.type === "event" && (
        <EventForm
          activityId={overlay.activityId}
          event={overlay.event}
          onClose={() => setOverlay(null)}
          onSaved={() => {
            setOverlay(null);
            setNow(Date.now());
            notify("A memory, safely tucked away.");
          }}
        />
      )}
      {overlay?.type === "delete-event" && (
        <Confirm
          title="Let this memory go?"
          description="This removes only this completion record and its note. Your activity and other memories will stay."
          onClose={() => setOverlay(null)}
          onConfirm={() => void confirmDelete()}
          action="Delete memory"
        />
      )}
      {overlay?.type === "delete-activity" && (
        <Confirm
          title={`Let “${overlay.activity.name}” go?`}
          description="This permanently deletes this activity and its entire completion history. Archive it instead if you’d like to keep its memories."
          onClose={() => setOverlay(null)}
          onConfirm={() => void confirmDelete()}
          action="Delete activity"
        />
      )}
    </MotionConfig>
  );
}

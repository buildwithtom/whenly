import { Check, ArrowUpRight, ArrowUp, ArrowDown, Bell } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import type { ActivityWithHistory, Category } from "../../types";
import { elapsed, isDue, shortDate } from "../../lib/dates";
export function ActivityCard({
  activity,
  category,
  onOpen,
  onComplete,
  busy,
  custom,
  onMove,
  first,
  last,
  now,
}: {
  activity: ActivityWithHistory;
  category?: Category;
  onOpen: () => void;
  onComplete: () => void;
  busy: boolean;
  custom: boolean;
  onMove: (direction: -1 | 1) => void;
  first: boolean;
  last: boolean;
  now: number;
}) {
  const reduced = useReducedMotion(),
    due = isDue(activity.latest, activity.reminder, now);
  return (
    <motion.article
      layout={!reduced}
      initial={reduced ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`activity-card ${activity.latest !== null && now - activity.latest < 5000 ? "just-recorded" : ""}`}
    >
      <div className="card-top">
        <span
          className={`emoji-box ${category?.color || "sage"}`}
          aria-hidden="true"
        >
          {activity.emoji}
        </span>
        <span className={`category-label ${category?.color || "sage"}`}>
          {category?.name || "Other"}
        </span>
        <button
          className="icon-button card-open"
          aria-label={`Open ${activity.name}`}
          onClick={onOpen}
        >
          <ArrowUpRight size={18} />
        </button>
      </div>
      <button className="card-main" onClick={onOpen}>
        <h3>{activity.name}</h3>
        <p
          className={`elapsed ${activity.latest === null ? "unrecorded" : ""}`}
        >
          {elapsed(activity.latest, now)}
        </p>
        <p className="last-date">
          {activity.latest !== null
            ? `Last done ${shortDate(activity.latest)}`
            : "A new little thing to remember"}
        </p>
      </button>
      <div className="card-bottom">
        {due ? (
          <span className="due-label">
            <Bell size={13} /> A gentle nudge
          </span>
        ) : (
          <span className="memory-count">
            {activity.events.length
              ? `${activity.events.length} ${activity.events.length === 1 ? "memory" : "memories"}`
              : "Whenever you’re ready"}
          </span>
        )}
        <button
          className="record-button"
          onClick={onComplete}
          disabled={busy}
          aria-label={`Just did it: ${activity.name}`}
        >
          <Check size={16} />
          {busy ? "Recorded" : "Just did it"}
        </button>
      </div>
      {custom && (
        <div className="reorder-controls">
          <span>Move activity</span>
          <button
            className="icon-button"
            disabled={first}
            aria-label={`Move ${activity.name} earlier`}
            onClick={() => onMove(-1)}
          >
            <ArrowUp size={16} />
          </button>
          <button
            className="icon-button"
            disabled={last}
            aria-label={`Move ${activity.name} later`}
            onClick={() => onMove(1)}
          >
            <ArrowDown size={16} />
          </button>
        </div>
      )}
    </motion.article>
  );
}

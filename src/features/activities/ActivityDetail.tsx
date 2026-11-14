import {
  ArrowLeft,
  Check,
  Pencil,
  Plus,
  Trash2,
  Archive,
  ArchiveRestore,
  Clock3,
  Bell,
  NotebookPen,
} from "lucide-react";
import { format } from "date-fns";
import type {
  ActivityWithHistory,
  Category,
  CompletionEvent,
} from "../../types";
import {
  elapsed,
  intervals,
  intervalLabel,
  longDate,
  dueAt,
  isDue,
} from "../../lib/dates";
export function ActivityDetail({
  activity,
  category,
  onBack,
  onEdit,
  onComplete,
  onAddEvent,
  onEditEvent,
  onDeleteEvent,
  onArchive,
  onDelete,
  busy,
  now,
}: {
  activity: ActivityWithHistory;
  category?: Category;
  onBack: () => void;
  onEdit: () => void;
  onComplete: () => void;
  onAddEvent: () => void;
  onEditEvent: (event: CompletionEvent) => void;
  onDeleteEvent: (event: CompletionEvent) => void;
  onArchive: () => void;
  onDelete: () => void;
  busy: boolean;
  now: number;
}) {
  const stats = intervals(activity.events),
    due = dueAt(activity.latest, activity.reminder);
  return (
    <div className="detail-page">
      <button className="back-link" onClick={onBack}>
        <ArrowLeft size={17} /> Back to your activities
      </button>
      <section className="detail-hero">
        <div className="detail-heading">
          <span className={`emoji-box large ${category?.color || "sage"}`}>
            {activity.emoji}
          </span>
          <div>
            <span className="eyebrow">
              {category?.name || "Other"}
              {activity.archivedAt ? " · Archived" : ""}
            </span>
            <h1>{activity.name}</h1>
          </div>
          <button className="button secondary" onClick={onEdit}>
            <Pencil size={16} /> Edit activity
          </button>
        </div>
        <div className="detail-record">
          <div>
            <p className="detail-elapsed">{elapsed(activity.latest, now)}</p>
            <p className="muted">
              {activity.latest !== null
                ? `Last completed ${longDate(activity.latest)} at ${format(activity.latest, "h:mm a")}`
                : "Your story starts whenever you’re ready."}
            </p>
          </div>
          {!activity.archivedAt && (
            <button
              className="button primary"
              disabled={busy}
              onClick={onComplete}
            >
              <Check size={18} />
              {busy ? "Recorded" : "Just did it"}
            </button>
          )}
        </div>
      </section>
      <section className="stats-grid" aria-label="Activity statistics">
        {[
          { label: "Memories recorded", value: stats.count },
          { label: "Average interval", value: intervalLabel(stats.average) },
          { label: "Longest interval", value: intervalLabel(stats.longest) },
          { label: "Shortest interval", value: intervalLabel(stats.shortest) },
        ].map((s) => (
          <div className="stat-card" key={s.label}>
            <span>{s.label}</span>
            <strong>{s.value}</strong>
          </div>
        ))}
      </section>
      {stats.count < 2 && (
        <p className="stats-note">
          <Clock3 size={14} /> Intervals will appear once you’ve recorded at
          least two memories.
        </p>
      )}
      <div className="detail-columns">
        <section className="history-section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">YOUR LITTLE TIMELINE</span>
              <h2>A history of showing up.</h2>
            </div>
            {!activity.archivedAt && (
              <button className="button secondary small" onClick={onAddEvent}>
                <Plus size={16} /> Add a past memory
              </button>
            )}
          </div>
          {activity.events.length ? (
            <ol className="timeline">
              {activity.events.map((event) => (
                <li key={event.id}>
                  <span className="timeline-dot" />
                  <div className="timeline-content">
                    <div className="timeline-title">
                      <strong>{longDate(event.completedAt)}</strong>
                      <span>{format(event.completedAt, "h:mm a")}</span>
                    </div>
                    <p>{activity.name}</p>
                    {event.note && <p className="event-note">{event.note}</p>}
                  </div>
                  <div className="timeline-actions">
                    {!activity.archivedAt && (
                      <button
                        className="icon-button"
                        aria-label={`Edit memory from ${longDate(event.completedAt)} at ${format(event.completedAt, "h:mm a")}`}
                        onClick={() => onEditEvent(event)}
                      >
                        <Pencil size={15} />
                      </button>
                    )}
                    <button
                      className="icon-button"
                      aria-label={`Delete memory from ${longDate(event.completedAt)} at ${format(event.completedAt, "h:mm a")}`}
                      onClick={() => onDeleteEvent(event)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <div className="inline-empty">
              <Clock3 size={30} />
              <h3>No memories, yet.</h3>
              <p>Record the next time, or add a moment you remember.</p>
            </div>
          )}
        </section>
        <aside className="detail-aside">
          <div className="aside-note">
            <NotebookPen size={20} />
            <h3>A note to yourself</h3>
            <p>
              {activity.notes ||
                "A place for the little details you don’t want to forget."}
            </p>
            <button className="text-button" onClick={onEdit}>
              {activity.notes ? "Edit note" : "Add a note"} <Pencil size={13} />
            </button>
          </div>
          {activity.reminder && (
            <div className="aside-note">
              <Bell size={20} />
              <h3>A gentle reminder</h3>
              <p>
                Every {activity.reminder.amount} {activity.reminder.unit}.
              </p>
              <p>
                {due
                  ? isDue(activity.latest, activity.reminder, now)
                    ? "Your chosen interval has passed. Whenever you’re ready."
                    : `Next nudge ${longDate(due)}.`
                  : "Record a memory to start your reminder."}
              </p>
              <button className="text-button" onClick={onEdit}>
                Change reminder
              </button>
            </div>
          )}
        </aside>
      </div>
      <div className="detail-footer">
        <button className="text-button" onClick={onArchive}>
          {activity.archivedAt ? (
            <ArchiveRestore size={16} />
          ) : (
            <Archive size={16} />
          )}{" "}
          {activity.archivedAt ? "Restore activity" : "Archive activity"}
        </button>
        <button className="text-button danger-text" onClick={onDelete}>
          <Trash2 size={15} /> Delete activity
        </button>
      </div>
    </div>
  );
}

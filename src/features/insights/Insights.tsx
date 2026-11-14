import {
  Activity as ActivityIcon,
  Bookmark,
  Heart,
  ArrowUpRight,
  Sprout,
  Clock3,
} from "lucide-react";
import { differenceInCalendarDays } from "date-fns";
import type { ActivityWithHistory } from "../../types";
import { elapsed, intervalLabel, intervals } from "../../lib/dates";
export function Insights({
  activities,
  now,
  onOpen,
  onAdd,
}: {
  activities: ActivityWithHistory[];
  now: number;
  onOpen: (id: string) => void;
  onAdd: () => void;
}) {
  const active = activities.filter((a) => !a.archivedAt),
    eventCount = activities.reduce((s, a) => s + a.events.length, 0);
  const frequent = [...active]
    .filter((a) => a.events.length)
    .sort((a, b) => b.events.length - a.events.length)[0];
  const averages = active
    .map((a) => ({ activity: a, stats: intervals(a.events) }))
    .filter((a) => a.stats.average !== null)
    .sort((a, b) => a.stats.average! - b.stats.average!);
  const aWhile = active
    .filter(
      (a) => a.latest !== null && differenceInCalendarDays(now, a.latest) >= 30,
    )
    .sort((a, b) => a.latest! - b.latest!);
  return (
    <div className="insights-page">
      <div className="page-title">
        <span className="eyebrow">THE BIGGER PICTURE</span>
        <h1>A little perspective.</h1>
        <p>Your everyday moments, thoughtfully remembered.</p>
      </div>
      <section className="insight-totals">
        <div>
          <span className="insight-icon sage">
            <Bookmark size={20} />
          </span>
          <strong>{active.length}</strong>
          <span>Activities you’re remembering</span>
        </div>
        <div>
          <span className="insight-icon peach">
            <Heart size={20} />
          </span>
          <strong>{eventCount}</strong>
          <span>Little moments recorded</span>
        </div>
        <div>
          <span className="insight-icon lavender">
            <ActivityIcon size={20} />
          </span>
          <strong>
            {activities.filter((a) => a.events.length >= 2).length}
          </strong>
          <span>Activities with a rhythm</span>
        </div>
      </section>
      {!eventCount ? (
        <section className="insights-empty">
          <Sprout size={38} />
          <h2>Your story is still growing.</h2>
          <p>
            A few recorded moments are all it takes.
            <br />
            Come back when you have a little history to look at.
          </p>
          <button className="button primary" onClick={onAdd}>
            Add an activity <ArrowUpRight size={17} />
          </button>
        </section>
      ) : (
        <div className="insight-panels">
          <section className="insight-panel">
            <span className="eyebrow">A FAMILIAR LITTLE MOMENT</span>
            <h2>Most often remembered</h2>
            {frequent ? (
              <button
                className="frequent-card"
                onClick={() => onOpen(frequent.id)}
              >
                <span className="emoji-box sage">{frequent.emoji}</span>
                <div>
                  <strong>{frequent.name}</strong>
                  <p>
                    {frequent.events.length}{" "}
                    {frequent.events.length === 1 ? "memory" : "memories"}{" "}
                    recorded
                  </p>
                </div>
                <ArrowUpRight size={20} />
              </button>
            ) : (
              <p className="muted">
                Your recorded activities are currently archived.
              </p>
            )}
          </section>
          <section className="insight-panel">
            <span className="eyebrow">AT YOUR OWN PACE</span>
            <h2>Your natural rhythms</h2>
            {averages.length ? (
              <div className="rhythm-list">
                {averages.map(({ activity, stats }) => (
                  <button onClick={() => onOpen(activity.id)} key={activity.id}>
                    <span>
                      {activity.emoji} {activity.name}
                    </span>
                    <strong>{intervalLabel(stats.average)}</strong>
                  </button>
                ))}
              </div>
            ) : (
              <p className="muted">
                Record an activity at least twice to see its average interval.
              </p>
            )}
            <p className="field-help">
              Average calendar days between recorded moments. A reflection,
              never a target.
            </p>
          </section>
          <section className="insight-panel wide-panel">
            <span className="eyebrow">A LITTLE TRIP DOWN MEMORY LANE</span>
            <h2>It’s been a while</h2>
            {aWhile.length ? (
              aWhile.map((a) => (
                <button
                  key={a.id}
                  className="while-row"
                  onClick={() => onOpen(a.id)}
                >
                  <span>
                    {a.emoji} {a.name}
                  </span>
                  <span>
                    {elapsed(a.latest, now)} <ArrowUpRight size={16} />
                  </span>
                </button>
              ))
            ) : (
              <div className="neutral-note">
                <Clock3 size={19} />
                <p>
                  Nothing recorded more than 30 days ago. All in your own time.
                </p>
              </div>
            )}
          </section>
        </div>
      )}
      <p className="page-footnote">
        No streaks. No scores. Just a little more space in your head.
      </p>
    </div>
  );
}

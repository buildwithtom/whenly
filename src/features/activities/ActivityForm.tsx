import { useState, type FormEvent } from "react";
import {
  ChevronDown,
  Plus,
  Check,
  Bell,
  CalendarDays,
  Smile,
} from "lucide-react";
import { Modal } from "../../components/Modal";
import { EMOJIS } from "../../lib/activities";
import { dateInput, suggestedInterval } from "../../lib/dates";
import { addCategory, saveActivity } from "../../db";
import type {
  Activity,
  Category,
  CompletionEvent,
  Reminder,
} from "../../types";
export type ActivitySeed = { name: string; emoji: string; categoryId: string };
export function ActivityForm({
  activity,
  seed,
  categories,
  events = [],
  onClose,
  onSaved,
}: {
  activity?: Activity;
  seed?: ActivitySeed;
  categories: Category[];
  events?: CompletionEvent[];
  onClose: () => void;
  onSaved: (activity: Activity) => void;
}) {
  const [name, setName] = useState(activity?.name || seed?.name || "");
  const [emoji, setEmoji] = useState(activity?.emoji || seed?.emoji || "✨");
  const [category, setCategory] = useState(
    activity?.categoryId || seed?.categoryId || "personal",
  );
  const [notes, setNotes] = useState(activity?.notes || "");
  const [dateMode, setDateMode] = useState<"unknown" | "known">("unknown");
  const [date, setDate] = useState(dateInput());
  const [advanced, setAdvanced] = useState(
    Boolean(activity?.notes || activity?.reminder),
  );
  const [picker, setPicker] = useState(false);
  const [reminder, setReminder] = useState<Reminder | null>(
    activity?.reminder || null,
  );
  const [customCategory, setCustomCategory] = useState(false),
    [categoryName, setCategoryName] = useState("");
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const suggestion = suggestedInterval(events);
  const createCategory = async () => {
    try {
      const c = await addCategory(categoryName);
      setCategory(c.id);
      setCustomCategory(false);
      setCategoryName("");
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const a = await saveActivity(
        { name, emoji, categoryId: category, notes, reminder },
        activity,
        !activity && dateMode === "known"
          ? new Date(date).getTime()
          : undefined,
      );
      onSaved(a);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };
  return (
    <Modal
      title={activity ? "Edit activity" : "A little thing to remember"}
      onClose={onClose}
    >
      <p className="form-intro">
        {activity
          ? "Make a little room for a change."
          : "Big or small, if it matters to you, it belongs here."}
      </p>
      <form onSubmit={submit}>
        <label htmlFor="activity-name">
          Activity name <span className="required-mark">*</span>
        </label>
        <div className="name-field">
          <button
            type="button"
            className="emoji-trigger"
            aria-label="Choose an emoji"
            aria-expanded={picker}
            onClick={() => setPicker(!picker)}
          >
            {emoji}
            <ChevronDown size={13} />
          </button>
          <input
            id="activity-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Changed my bedsheets"
            maxLength={120}
            autoFocus
            required
          />
        </div>
        {picker && (
          <div
            className="emoji-picker"
            role="group"
            aria-label="Activity emoji"
          >
            {EMOJIS.map((em) => (
              <button
                type="button"
                key={em}
                aria-label={`Use ${em}`}
                aria-pressed={emoji === em}
                className={emoji === em ? "selected" : ""}
                onClick={() => {
                  setEmoji(em);
                  setPicker(false);
                }}
              >
                {em}
              </button>
            ))}
          </div>
        )}
        <div className="label-row">
          <label htmlFor="activity-category">Category</label>
          <button
            type="button"
            className="text-button"
            onClick={() => setCustomCategory(!customCategory)}
          >
            <Plus size={14} /> New category
          </button>
        </div>
        <select
          id="activity-category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {customCategory && (
          <div className="inline-create">
            <input
              aria-label="New category name"
              placeholder="Category name"
              value={categoryName}
              maxLength={40}
              onChange={(e) => setCategoryName(e.target.value)}
            />
            <button
              type="button"
              className="button secondary"
              onClick={createCategory}
            >
              Create
            </button>
          </div>
        )}
        {!activity && (
          <>
            <label className="field-heading">
              <CalendarDays size={16} /> When did you last do it?
            </label>
            <div className="segmented">
              <button
                type="button"
                aria-pressed={dateMode === "unknown"}
                className={dateMode === "unknown" ? "active" : ""}
                onClick={() => setDateMode("unknown")}
              >
                I don’t remember
              </button>
              <button
                type="button"
                aria-pressed={dateMode === "known"}
                className={dateMode === "known" ? "active" : ""}
                onClick={() => setDateMode("known")}
              >
                I know when
              </button>
            </div>
            {dateMode === "known" ? (
              <>
                <label className="sr-only" htmlFor="initial-date">
                  Last completed date and time
                </label>
                <input
                  id="initial-date"
                  type="datetime-local"
                  value={date}
                  max={dateInput()}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </>
            ) : (
              <p className="field-help">
                That’s okay. Start fresh, and record it next time.
              </p>
            )}
          </>
        )}
        <button
          type="button"
          className="advanced-toggle"
          aria-expanded={advanced}
          onClick={() => setAdvanced(!advanced)}
        >
          <span>
            <Smile size={16} /> A few more details{" "}
            <span className="optional">optional</span>
          </span>
          <ChevronDown size={16} className={advanced ? "rotated" : ""} />
        </button>
        {advanced && (
          <div className="advanced-fields">
            <label htmlFor="activity-notes">Personal notes</label>
            <textarea
              id="activity-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything you’d like to remember…"
              maxLength={2000}
              rows={3}
            />
            <label htmlFor="reminder-enabled" className="field-heading">
              <Bell size={16} /> A gentle reminder
            </label>
            <select
              id="reminder-enabled"
              value={reminder ? "custom" : "none"}
              onChange={(e) =>
                setReminder(
                  e.target.value === "none"
                    ? null
                    : { amount: 7, unit: "days" },
                )
              }
            >
              <option value="none">No reminder — I’ll go at my own pace</option>
              <option value="custom">Remind me after an interval</option>
            </select>
            {reminder && (
              <div className="reminder-interval">
                <span>Every</span>
                <input
                  aria-label="Reminder interval"
                  type="number"
                  min={1}
                  max={3650}
                  required
                  value={reminder.amount}
                  onChange={(e) =>
                    setReminder({ ...reminder, amount: Number(e.target.value) })
                  }
                />
                <select
                  aria-label="Reminder unit"
                  value={reminder.unit}
                  onChange={(e) =>
                    setReminder({
                      ...reminder,
                      unit: e.target.value as Reminder["unit"],
                    })
                  }
                >
                  <option value="days">days</option>
                  <option value="weeks">weeks</option>
                  <option value="months">months</option>
                </select>
              </div>
            )}
            {suggestion !== null && (
              <button
                type="button"
                className="suggestion-link"
                onClick={() =>
                  setReminder({ amount: suggestion, unit: "days" })
                }
              >
                Use your average of {suggestion} days
              </button>
            )}
            <p className="field-help">
              Reminders appear in whenly. Browser alerts work only while the app
              is open. Suggestions appear after 4 memories.
            </p>
          </div>
        )}
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <div className="form-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="button primary" disabled={busy} type="submit">
            {activity ? <Check size={17} /> : <Plus size={17} />}{" "}
            {busy ? "Saving…" : activity ? "Save changes" : "Add activity"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

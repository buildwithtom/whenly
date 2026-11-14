import { useState, type FormEvent } from "react";
import { Modal } from "../../components/Modal";
import { recordCompletion } from "../../db";
import { dateInput } from "../../lib/dates";
import type { CompletionEvent } from "../../types";
export function EventForm({
  activityId,
  event,
  onClose,
  onSaved,
}: {
  activityId: string;
  event?: CompletionEvent;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [date, setDate] = useState(dateInput(event?.completedAt)),
    [note, setNote] = useState(event?.note || ""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const result = await recordCompletion(
        activityId,
        new Date(date).getTime(),
        note,
        event?.id,
      );
      if (!result.created && !event) {
        setError("There’s already a memory at that time.");
        setBusy(false);
        return;
      }
      onSaved();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };
  return (
    <Modal
      title={event ? "Edit a memory" : "Remember something earlier?"}
      onClose={onClose}
    >
      <p className="form-intro">Every little moment has a place here.</p>
      <form onSubmit={submit}>
        <label htmlFor="event-date">Date and time</label>
        <input
          id="event-date"
          type="datetime-local"
          value={date}
          max={dateInput()}
          onChange={(e) => setDate(e.target.value)}
          required
          autoFocus
        />
        <label htmlFor="event-note">
          A note <span className="optional">optional</span>
        </label>
        <textarea
          id="event-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={2000}
          rows={3}
          placeholder="A little detail to look back on…"
        />
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="button primary" disabled={busy}>
            {busy ? "Saving…" : "Save memory"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

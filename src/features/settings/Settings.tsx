import { useRef, useState } from "react";
import {
  Sun,
  Moon,
  Monitor,
  Download,
  Upload,
  ShieldCheck,
  Bell,
  Trash2,
  Check,
  HardDrive,
  Plus,
  Smartphone,
} from "lucide-react";
import { Confirm, Modal } from "../../components/Modal";
import { SORTS } from "../../lib/activities";
import {
  downloadBackup,
  exportBackup,
  importBackup,
  validateBackup,
} from "../../lib/backup";
import { addCategory, clearData, deleteCategory } from "../../db";
import type { Backup, Category, Preferences } from "../../types";
export function Settings({
  preferences,
  onPreferences,
  categories,
  notify,
}: {
  preferences: Preferences;
  onPreferences: (p: Preferences) => Promise<void>;
  categories: Category[];
  notify: (message: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [backup, setBackup] = useState<Backup | null>(null),
    [mode, setMode] = useState<"merge" | "replace">("merge");
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [confirm, setConfirm] = useState<"clear" | Category | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [permission, setPermission] = useState(
    typeof Notification !== "undefined"
      ? Notification.permission
      : "unsupported",
  );
  const setPrefs = async (p: Partial<Preferences>) => {
    try {
      await onPreferences({ ...preferences, ...p });
    } catch (e) {
      setError(`Couldn’t save preferences. ${(e as Error).message}`);
    }
  };
  const doExport = async () => {
    try {
      downloadBackup(await exportBackup());
      notify("Your memories, safely backed up.");
    } catch {
      setError("Couldn’t export your data. Please try again.");
    }
  };
  const loadFile = async (file?: File) => {
    if (!file) return;
    setError("");
    try {
      if (file.size > 20 * 1024 * 1024)
        throw new Error("Choose a JSON backup smaller than 20 MB.");
      const parsed = JSON.parse(await file.text());
      setBackup(validateBackup(parsed));
      setMode("merge");
    } catch (e) {
      setError(
        e instanceof SyntaxError
          ? "This file isn’t valid JSON. Choose an original whenly backup."
          : (e as Error).message,
      );
    }
    if (fileRef.current) fileRef.current.value = "";
  };
  const doImport = async () => {
    if (!backup || busy) return;
    setBusy(true);
    try {
      const result = await importBackup(backup, mode);
      setBackup(null);
      notify(
        `Imported ${result.addedActivities} activities and ${result.addedEvents} memories.`,
      );
    } catch (e) {
      setError(
        `Import failed. Your data was left unchanged. ${(e as Error).message}`,
      );
    } finally {
      setBusy(false);
    }
  };
  const doConfirm = async () => {
    try {
      if (confirm === "clear") {
        await clearData();
        notify("A fresh start. All personal data has been cleared.");
      } else if (confirm) {
        await deleteCategory(confirm.id);
        notify("Category removed. Its activities are now in Other.");
      }
      setConfirm(null);
    } catch (e) {
      setError((e as Error).message);
      setConfirm(null);
    }
  };
  const requestPermission = async () => {
    try {
      if (typeof Notification === "undefined") {
        setError(
          "This browser doesn’t support notifications. In-app reminders always work.",
        );
        return;
      }
      const state = await Notification.requestPermission();
      setPermission(state);
      await setPrefs({ notifications: state === "granted" });
      if (state === "denied")
        setError(
          "Notifications are blocked in this browser. You can change this in your browser’s site settings.",
        );
    } catch {
      setError(
        "Browser notifications aren’t available here. In-app reminders always work.",
      );
    }
  };
  const createCategory = async () => {
    try {
      await addCategory(categoryName);
      setCategoryName("");
      setError("");
      notify("A new little category, just for you.");
    } catch (e) {
      setError((e as Error).message);
    }
  };
  return (
    <div className="settings-page">
      <div className="page-title">
        <span className="eyebrow">MAKE YOURSELF AT HOME</span>
        <h1>A space that feels like you.</h1>
        <p>A few preferences. Everything at your own pace.</p>
      </div>
      {error && (
        <div className="error-banner" role="alert">
          {error}
          <button className="text-button" onClick={() => setError("")}>
            Dismiss
          </button>
        </div>
      )}
      <section className="settings-section">
        <div className="setting-section-title">
          <Sun size={20} />
          <div>
            <h2>The look & feel</h2>
            <p>A little easier on your eyes.</p>
          </div>
        </div>
        <div className="settings-content">
          <label>Appearance</label>
          <div className="theme-options">
            {[
              { value: "light", label: "Light", Icon: Sun },
              { value: "dark", label: "Dark", Icon: Moon },
              { value: "system", label: "System", Icon: Monitor },
            ].map(({ value, label, Icon }) => (
              <button
                key={value}
                className={preferences.theme === value ? "selected" : ""}
                aria-pressed={preferences.theme === value}
                onClick={() =>
                  setPrefs({ theme: value as Preferences["theme"] })
                }
              >
                <Icon size={20} />
                {label}
                {preferences.theme === value && (
                  <Check size={14} className="theme-check" />
                )}
              </button>
            ))}
          </div>
          <label htmlFor="default-sort">Default activity order</label>
          <select
            id="default-sort"
            value={preferences.sort}
            onChange={(e) =>
              setPrefs({ sort: e.target.value as Preferences["sort"] })
            }
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </section>
      <section className="settings-section">
        <div className="setting-section-title">
          <Bell size={20} />
          <div>
            <h2>A gentle nudge</h2>
            <p>Only when you want one.</p>
          </div>
        </div>
        <div className="settings-content">
          <div className="setting-line">
            <div>
              <strong>Browser notifications</strong>
              <p>
                {permission === "unsupported"
                  ? "Not supported by this browser."
                  : permission === "denied"
                    ? "Blocked in browser settings."
                    : preferences.notifications
                      ? "Enabled while whenly is open."
                      : "Off by default. Always your choice."}
              </p>
            </div>
            {permission === "granted" ? (
              <button
                className={`toggle ${preferences.notifications ? "on" : ""}`}
                role="switch"
                aria-checked={preferences.notifications}
                aria-label="Browser notifications"
                onClick={() =>
                  setPrefs({ notifications: !preferences.notifications })
                }
              >
                <span />
              </button>
            ) : (
              <button
                className="button secondary small"
                disabled={
                  permission === "unsupported" || permission === "denied"
                }
                onClick={requestPermission}
              >
                Enable
              </button>
            )}
          </div>
          <div className="info-note">
            <Bell size={16} />
            <p>
              In-app reminders always work. Browser alerts are checked while
              whenly is open and can’t reliably arrive after you close it. Set
              an interval on each activity to choose when to be nudged.
            </p>
          </div>
        </div>
      </section>
      <section className="settings-section">
        <div className="setting-section-title">
          <HardDrive size={20} />
          <div>
            <h2>Your memories, yours to keep</h2>
            <p>A little backup goes a long way.</p>
          </div>
        </div>
        <div className="settings-content">
          <div className="setting-line">
            <div>
              <strong>Export a backup</strong>
              <p>
                All activities, memories, categories, and preferences as JSON.
              </p>
            </div>
            <button className="button secondary small" onClick={doExport}>
              <Download size={16} /> Export
            </button>
          </div>
          <div className="setting-line">
            <div>
              <strong>Restore your memories</strong>
              <p>Preview a whenly backup before merging or replacing.</p>
            </div>
            <button
              className="button secondary small"
              onClick={() => fileRef.current?.click()}
            >
              <Upload size={16} /> Import
            </button>
            <input
              type="file"
              ref={fileRef}
              accept=".json,application/json"
              aria-label="Import whenly backup"
              hidden
              onChange={(e) => loadFile(e.target.files?.[0])}
            />
          </div>
          <div className="info-note">
            <ShieldCheck size={17} />
            <p>
              Your data stays in this browser on this device. It isn’t synced or
              stored in an account. Clearing site data or changing devices can
              erase it, so export a backup regularly.
            </p>
          </div>
        </div>
      </section>
      <section className="settings-section">
        <div className="setting-section-title">
          <Plus size={20} />
          <div>
            <h2>Your own little categories</h2>
            <p>Organize things in a way that makes sense to you.</p>
          </div>
        </div>
        <div className="settings-content">
          <div className="manage-categories">
            {categories.map((c) => (
              <div key={c.id}>
                <span className={`category-dot ${c.color}`} />
                <span>{c.name}</span>
                {!c.isDefault && (
                  <button
                    className="icon-button"
                    aria-label={`Delete category ${c.name}`}
                    onClick={() => setConfirm(c)}
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            ))}
          </div>
          <form
            className="inline-create"
            onSubmit={(e) => {
              e.preventDefault();
              void createCategory();
            }}
          >
            <input
              aria-label="Custom category name"
              value={categoryName}
              maxLength={40}
              required
              placeholder="A category of your own…"
              onChange={(e) => setCategoryName(e.target.value)}
            />
            <button className="button secondary" type="submit">
              <Plus size={16} /> Add
            </button>
          </form>
        </div>
      </section>
      <section className="settings-section">
        <div className="setting-section-title">
          <Smartphone size={20} />
          <div>
            <h2>Always a little closer</h2>
            <p>Your memory bank, one tap away.</p>
          </div>
        </div>
        <div className="settings-content">
          <strong>Make yourself at home</strong>
          <p className="muted">
            Install whenly from your browser’s menu for an app-like experience.
            On Safari, use Share → Add to Home Screen. Once loaded, your
            memories work offline too.
          </p>
          <p className="field-help">
            Updates appear as a small notice when a new version is ready.
          </p>
        </div>
      </section>
      <section className="settings-section">
        <div className="setting-section-title">
          <Trash2 size={20} />
          <div>
            <h2>A fresh start</h2>
            <p>Sometimes, it’s time to let go.</p>
          </div>
        </div>
        <div className="settings-content">
          <div className="setting-line">
            <div>
              <strong>Clear all data</strong>
              <p>Permanently remove all activities and their history.</p>
            </div>
            <button
              className="button danger-outline small"
              onClick={() => setConfirm("clear")}
            >
              Clear data
            </button>
          </div>
        </div>
      </section>
      <div className="about-card">
        <span className="brand brand-small">
          whenly<span>.</span>
        </span>
        <p>Life happens. Keep track.</p>
        <span>Made for a little more peace of mind. Version 1.0.0</span>
        <p className="field-help">No accounts. No analytics. No pressure.</p>
      </div>
      {backup && (
        <Modal
          title="Welcome your memories back"
          onClose={() => {
            if (!busy) setBackup(null);
          }}
        >
          <p className="form-intro">
            Backup from{" "}
            {new Date(backup.exportedAt).toLocaleDateString(undefined, {
              dateStyle: "long",
            })}
          </p>
          <div className="backup-summary">
            <div>
              <strong>{backup.activities.length}</strong>
              <span>activities</span>
            </div>
            <div>
              <strong>{backup.events.length}</strong>
              <span>memories</span>
            </div>
            <div>
              <strong>{backup.categories.length}</strong>
              <span>categories</span>
            </div>
          </div>
          <label htmlFor="import-mode">How would you like to restore?</label>
          <select
            id="import-mode"
            value={mode}
            onChange={(e) => setMode(e.target.value as "merge" | "replace")}
          >
            <option value="merge">Merge with my existing memories</option>
            <option value="replace">Replace all current data</option>
          </select>
          <p className={mode === "replace" ? "form-error" : "field-help"}>
            {mode === "replace"
              ? "This permanently replaces all existing activities, history, categories, and preferences. Export a backup first if you want to keep them."
              : "Existing activities and memories are kept. Matching IDs, names, and event timestamps prevent duplicates."}
          </p>
          {mode === "replace" && (
            <label className="checkbox-label">
              <input
                type="checkbox"
                required
                id="replace-confirm"
                form="import-form"
              />{" "}
              I understand my current data will be replaced.
            </label>
          )}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <form
            id="import-form"
            onSubmit={(e) => {
              e.preventDefault();
              void doImport();
            }}
          >
            <div className="form-actions">
              <button
                className="button secondary"
                type="button"
                disabled={busy}
                onClick={() => setBackup(null)}
              >
                Cancel
              </button>
              <button
                className={`button ${mode === "replace" ? "danger" : "primary"}`}
                disabled={busy}
              >
                {busy
                  ? "Restoring…"
                  : mode === "replace"
                    ? "Replace all data"
                    : "Merge memories"}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {confirm && (
        <Confirm
          title={
            confirm === "clear"
              ? "Let all your memories go?"
              : `Remove “${confirm.name}”?`
          }
          description={
            confirm === "clear"
              ? "This permanently deletes every activity and its entire history, custom categories, and preferences on this device. This cannot be undone. Export a backup first if you’d like to keep a copy."
              : "Activities in this category will move to Other. Their history will be kept."
          }
          action={confirm === "clear" ? "Clear all data" : "Remove category"}
          onClose={() => setConfirm(null)}
          onConfirm={() => void doConfirm()}
        />
      )}
    </div>
  );
}

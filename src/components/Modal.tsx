import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const previous = useRef(document.activeElement as HTMLElement | null);
  const reduced = useReducedMotion();
  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = old;
      dialog.close();
      if (previous.current?.isConnected) previous.current.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? "modal-wide" : ""}`}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          const r = e.currentTarget.getBoundingClientRect();
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            onClose();
        }
      }}
      onKeyDown={(e) => {
        if (e.key !== "Tab") return;
        const controls = Array.from(
          e.currentTarget.querySelectorAll<HTMLElement>(
            'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]',
          ),
        ).filter((el) => el.getClientRects().length > 0 && el.tabIndex >= 0);
        const first = controls[0],
          last = controls[controls.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }}
      aria-labelledby="modal-title"
    >
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
      >
        <div className="modal-header">
          <h2 id="modal-title">{title}</h2>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </motion.div>
    </dialog>
  );
}
export function Confirm({
  title,
  description,
  onConfirm,
  onClose,
  danger = true,
  action = "Delete",
}: {
  title: string;
  description: string;
  onConfirm: () => void;
  onClose: () => void;
  danger?: boolean;
  action?: string;
}) {
  return (
    <Modal title={title} onClose={onClose}>
      <p className="muted confirm-copy">{description}</p>
      <div className="form-actions">
        <button className="button secondary" onClick={onClose} autoFocus>
          Cancel
        </button>
        <button
          className={`button ${danger ? "danger" : "primary"}`}
          onClick={onConfirm}
        >
          {action}
        </button>
      </div>
    </Modal>
  );
}

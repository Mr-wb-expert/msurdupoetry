import { useEffect } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

type Props = {
  /** The save worked, or worked while a side-step (book cover) failed. */
  failed?: boolean;
  title: string;
  message: string;
  primaryLabel: string;
  onPrimary: () => void;
  /** Shown only when provided — the "stay here" way out of the dialog. */
  secondaryLabel?: string;
  onSecondary?: () => void;
  /** Backdrop click and Escape — dismiss without choosing either button. */
  onDismiss: () => void;
};

/**
 * The save result, as a styled dialog instead of window.alert. The primary
 * button takes the admin to the list they just saved into; the secondary
 * button (when there is one) keeps them on the form.
 */
export default function SaveDialog({
  failed = false,
  title,
  message,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  onDismiss,
}: Props) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onDismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onDismiss]);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-ink-950/40 p-4"
      onClick={onDismiss}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-sm rounded-sm border border-line bg-paper p-6 text-center shadow-cover"
        onClick={(event) => event.stopPropagation()}
      >
        <span
          className={
            failed
              ? "mx-auto grid size-12 place-items-center rounded-full bg-maroon-700/10 text-maroon-700"
              : "mx-auto grid size-12 place-items-center rounded-full bg-teal-700/10 text-teal-700"
          }
        >
          {failed ? (
            <AlertTriangle aria-hidden="true" className="size-6" />
          ) : (
            <CheckCircle2 aria-hidden="true" className="size-6" />
          )}
        </span>
        <h2 className="mt-4 text-lg font-semibold">{title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">{message}</p>
        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            autoFocus
            className="btn btn-primary w-full"
            onClick={onPrimary}
          >
            {primaryLabel}
          </button>
          {secondaryLabel && (
            <button
              type="button"
              className="btn btn-secondary w-full"
              onClick={onSecondary}
            >
              {secondaryLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

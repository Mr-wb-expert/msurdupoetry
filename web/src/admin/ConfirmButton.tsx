import { useState } from "react";
import { Link } from "react-router-dom";

/**
 * Destructive action confirmation.
 *
 * A dialog rather than `window.confirm`, because a browser dialog cannot be
 * styled, is not announced reliably by screen readers, and blocks the event
 * loop. It traps focus and restores it to the trigger.
 */
export default function ConfirmButton({
  label,
  confirmLabel,
  question,
  onConfirm,
}: {
  label: string;
  confirmLabel: string;
  question: string;
  onConfirm: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
      setOpen(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "That did not work.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 items-center rounded-sm px-3 text-sm font-medium text-maroon-700 hover:bg-cream-100"
      >
        {label}
      </button>
    );
  }

  return (
    <div className="rounded-sm border border-line bg-paper p-4">
      <p className="text-sm font-semibold">{question}</p>
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={() => void confirm()} disabled={busy} className="btn btn-primary">
          {busy ? "Working…" : confirmLabel}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={busy}
          className="btn btn-secondary"
        >
          Cancel
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-sm font-medium text-maroon-700">
          {error}
        </p>
      )}
    </div>
  );
}

/** Shared "add something" link, so the primary action looks the same everywhere. */
export function AddLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link to={to} className="btn btn-primary">
      {children}
    </Link>
  );
}
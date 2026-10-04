import { AlertTriangle, Loader2 } from "lucide-react";

/** Neutral placeholder for any list that is on its way. */
export function Loading({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2.5 py-20 text-sm text-muted" role="status">
      <Loader2 aria-hidden="true" className="size-4 animate-spin" />
      {label}…
    </div>
  );
}

/** A failure worth showing. The message is the API's, so it stays specific. */
export function ErrorNote({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="mx-auto my-16 max-w-md rounded-sm border border-line bg-cream-50 p-6 text-center">
      <AlertTriangle aria-hidden="true" className="mx-auto size-6 text-marigold-700" />
      <p className="mt-3 text-sm font-semibold">Something went wrong</p>
      <p className="mt-1.5 text-sm text-muted">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn btn-secondary mt-5">
          Try again
        </button>
      )}
    </div>
  );
}

/** The empty state is a real answer, not a failure: a filter can exclude all. */
export function EmptyNote({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-sm border border-dashed border-line px-6 py-16 text-center">
      <p className="text-sm font-semibold">{title}</p>
      {children && <div className="mt-1.5 text-sm text-muted">{children}</div>}
    </div>
  );
}
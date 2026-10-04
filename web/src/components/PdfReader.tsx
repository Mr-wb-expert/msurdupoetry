import { useEffect, useRef } from "react";
import { ExternalLink, X } from "lucide-react";

/**
 * The reading overlay.
 *
 * A dialog in the strict sense: it traps Tab, closes on Escape, and returns
 * focus to whatever opened it. An iframe holding a whole book is the page's
 * heaviest element, so it is only mounted while the reader is open.
 */
export default function PdfReader({
  title,
  src,
  externalHref,
  onClose,
}: {
  title: string;
  src: string;
  externalHref: string;
  onClose: () => void;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const opener = useRef<Element | null>(null);

  useEffect(() => {
    opener.current = document.activeElement;
    panel.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

      // Focus stays inside the dialog: the page behind it must not be reachable
      // by keyboard while a book is open.
      const focusable = panel.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable || focusable.length === 0) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    // The page behind the overlay must not scroll with the wheel.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      // Focus goes back where it came from, or the next Tab lands nowhere
      // sensible.
      (opener.current as HTMLElement | null)?.focus?.();
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-ink-950/95">
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={`Reading ${title}`}
        tabIndex={-1}
        className="flex h-full flex-col outline-none"
      >
        <div className="flex items-center gap-4 border-b border-white/15 px-4 py-3 text-paper sm:px-6">
          <p className="min-w-0 flex-1 truncate text-sm font-semibold">{title}</p>
          <a
            href={externalHref}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-marigold-300 hover:text-marigold-300/80"
          >
            <ExternalLink aria-hidden="true" className="size-4" />
            <span className="hidden sm:inline">Open in a new tab</span>
            <span className="sm:hidden">Open</span>
          </a>
          <button
            type="button"
            onClick={onClose}
            className="grid size-11 shrink-0 place-items-center rounded-sm border border-white/25 hover:border-white"
          >
            <span className="sr-only">Close the reader</span>
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>

        <iframe
          title={title}
          src={src}
          className="min-h-0 flex-1 border-0 bg-white"
          allow="autoplay"
        />

        <p className="border-t border-white/15 px-4 py-2.5 text-center text-xs text-white/60 sm:px-6">
          If the book does not appear,{" "}
          <a href={externalHref} target="_blank" rel="noreferrer" className="underline">
            open it on Google Drive
          </a>
          . Press <kbd className="font-sans">Esc</kbd> to close.
        </p>
      </div>
    </div>
  );
}
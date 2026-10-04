import { useState } from "react";
import { BookOpen, Check, Copy, Share2 } from "lucide-react";

import { site } from "@/lib/site";
import type { Couplet } from "@/lib/couplets";

/**
 * One couplet as a card: Nastaliq RTL verse, a type badge, the source book,
 * and copy/share actions. Sharing uses the native share sheet where the
 * browser has one and falls back to WhatsApp, which is where this audience
 * passes verses around.
 */
export default function CoupletCard({ couplet }: { couplet: Couplet }) {
  const [copied, setCopied] = useState(false);

  const shareText = `${couplet.couplet} — ${site.author}${
    couplet.bookName ? `, ${couplet.bookName}` : ""
  }`;

  async function copyCouplet() {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard denied — the verse is on screen, the reader can select it.
    }
  }

  async function shareCouplet() {
    if (navigator.share) {
      try {
        await navigator.share({ text: shareText });
        return;
      } catch {
        return; // The sheet was dismissed; do not open a second window.
      }
    }
    window.open(
      `https://wa.me/?text=${encodeURIComponent(shareText)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  return (
    <article className="lift flex h-full w-full flex-col rounded-sm border border-line bg-paper shadow-cover">
      {(couplet.type || couplet.bookName) && (
        <div className="flex items-center justify-between gap-3 px-5 pt-4">
          {couplet.type && (
            <span className="rounded-full border border-line bg-cream-50 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-maroon-700">
              {couplet.type}
            </span>
          )}
          {couplet.bookName && (
            <span className="inline-flex min-w-0 items-center gap-1.5 text-xs text-muted">
              <BookOpen aria-hidden="true" className="size-3.5 shrink-0" />
              <span className="truncate">{couplet.bookName}</span>
            </span>
          )}
        </div>
      )}

      {couplet.title && (
        <h3 className="px-5 pt-4 text-base font-semibold">{couplet.title}</h3>
      )}

      <p dir="rtl" lang="ur" className="urdu-display grow whitespace-pre-line px-5 py-5 text-xl">
        {couplet.couplet}
      </p>

      {couplet.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-5 pb-4">
          {couplet.tags.map((tag) => (
            <span
              key={tag}
              dir="rtl"
              lang="ur"
              className="urdu-display inline-flex items-center justify-center rounded-full border border-line bg-cream-50 px-3 py-1 text-xs leading-none text-muted"
            >
              <span className="sr-only">Refrain: </span>
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-3">
        <span className="text-xs text-muted">— {site.author}</span>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={copyCouplet}
            aria-label="Copy couplet"
            title="Copy"
            className="inline-flex size-9 items-center justify-center rounded-full border border-line text-muted transition-colors hover:border-maroon-700 hover:text-maroon-700"
          >
            {copied ? (
              <Check aria-hidden="true" className="size-4 text-maroon-700" />
            ) : (
              <Copy aria-hidden="true" className="size-4" />
            )}
          </button>
          <button
            type="button"
            onClick={shareCouplet}
            aria-label="Share couplet"
            title="Share"
            className="inline-flex size-9 items-center justify-center rounded-full border border-line text-muted transition-colors hover:border-maroon-700 hover:text-maroon-700"
          >
            <Share2 aria-hidden="true" className="size-4" />
          </button>
        </div>
      </div>
    </article>
  );
}

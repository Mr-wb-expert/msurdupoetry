import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, Copy, Share2 } from "lucide-react";

import { site } from "@/lib/site";
import type { Couplet } from "@/lib/couplets";

/**
 * One verse as a card: title, Nastaliq RTL verse, type badge, and
 * copy/share actions. Sharing uses the native share sheet where the
 * browser has one and falls back to WhatsApp, which is where this audience
 * passes verses around. The card links to /poems/:slug, where the whole
 * poem lives.
 */
export default function CoupletCard({ couplet }: { couplet: Couplet }) {
  const [copied, setCopied] = useState(false);

  // Shers are separated by a blank line — same rule PoemPage reads with.
  const firstSher = couplet.couplet.split(/\n{2,}/)[0] ?? "";

  // A whole poem shares as its first sher plus the link — nobody wants a
  // 60-line WhatsApp message.
  const shareText = `${firstSher} — ${site.author} · ${window.location.origin}${couplet.href}`;

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
      {couplet.type && (
        <div className="px-5 pt-4">
          <span className="rounded-full border border-line bg-cream-50 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-maroon-700">
            {couplet.type}
          </span>
        </div>
      )}

      <Link
        to={couplet.href}
        className="px-5 pt-4 text-base font-semibold hover:text-maroon-700"
      >
        {couplet.title}
      </Link>

      <p dir="rtl" lang="ur" className="urdu-display grow whitespace-pre-line px-5 py-5 text-xl">
        {firstSher}
      </p>

      <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-3">
        <Link to={couplet.href} className="text-xs font-semibold text-maroon-700 hover:underline">
          Read full poem →
        </Link>
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

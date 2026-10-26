import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowRight, Check, Copy, Share2 } from "lucide-react";

import Seo from "@/components/Seo.tsx";
import { ErrorNote, Loading } from "@/components/Feedback.tsx";
import { formatDate, isoDate } from "@/lib/dates";
import { site } from "@/lib/site";
import { poetHref, romanAuthor } from "@/lib/poets";
import { useApi } from "@/lib/useApi.ts";
import { getPoem, getPoet } from "@/lib/api.ts";
import type { Poem } from "@/lib/types";

const CANONICAL_ORIGIN = "https://www.msurdupoetry.com";

/**
 * Poetry.
 *
 * The body is stored as plain text where two consecutive lines are one sher.
 * Rendering it as paragraphs rather than a single blob is what makes the
 * couplets read as couplets.
 */
export default function PoemPage() {
  const { slug = "" } = useParams();
  const poem = useApi(() => getPoem(slug), [slug]);
  const [copied, setCopied] = useState(false);

  // Load poet hub data (bio + related poems) if this verse has a mapped poet
  const poetSlug = poem.data?.author ? poetHref(poem.data.author)?.replace("/poets/", "") : null;
  const poet = useApi(
    () => (poetSlug ? getPoet(poetSlug) : Promise.resolve(null)),
    [poetSlug]
  );

  if (poem.error) return <PoemNotFound />;
  if (poem.loading || !poem.data) {
    // Keep server-rendered <head> tags intact during client hydration.
    // Overwriting document.title with "Loading" causes search engines to index
    // loading screens and tag pages as "Crawled - currently not indexed".
    return (
      <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
        <Loading label="Loading verse" />
      </div>
    );
  }

  const item: Poem = poem.data;
  const authorName = item.author || site.author;
  const authorHref = poetHref(item.author);
  // Mirrors roman_name in api/seo.py — see the title rule below.
  const headAuthor = romanAuthor(item.author) ?? site.author;

  // Mirrors the snippet rule in api/seo.py: quote the opening lines so every
  // poem page's meta description is genuinely unique.
  const lines = (item.body ?? "").split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const suffix = `by ${headAuthor}. Urdu ${(item.type ?? "Poem").toLowerCase()} online.`;
  const budget = Math.max(20, 155 - (item.title + " " + suffix).length);
  const opening = lines.slice(0, 2).join(" ").slice(0, budget);
  const description =
    `“${opening}” ${item.title} ${suffix}${item.book ? ` From the book ${item.book}.` : ""}`;

  // Dates mirror the server's static rendering (api/seo.py)
  const dateStamp = `Published ${formatDate(item.createdAt)}`;
  const lastUpdated =
    item.updatedAt && isoDate(item.updatedAt) !== isoDate(item.createdAt)
      ? ` · Last updated ${formatDate(item.updatedAt)}`
      : "";

  const shareUrl = `${CANONICAL_ORIGIN}/poems/${item.slug}`;
  const shareText = `${item.title}\n${lines.slice(0, 4).join("\n")}\n— ${authorName}\n${shareUrl}`;

  async function copyPoem() {
    try {
      await navigator.clipboard.writeText(`${item.title}\n\n${item.body}\n\n— ${authorName}\n${shareUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard denied
    }
  }

  async function sharePoem() {
    if (navigator.share) {
      try {
        await navigator.share({ title: item.title, text: shareText, url: shareUrl });
        return;
      } catch {
        return;
      }
    }
    window.open(
      `https://wa.me/?text=${encodeURIComponent(shareText)}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  // Filter other poems by the same author to provide internal links
  const relatedPoems = (poet.data?.poems ?? [])
    .filter((p) => p.slug !== item.slug)
    .slice(0, 4);

  return (
    <>
      <Seo
        title={`${item.title} — ${item.type ?? "Poem"} by ${headAuthor}`}
        description={description}
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "CreativeWork",
            name: item.title,
            headline: item.title,
            author: {
              "@type": "Person",
              name: item.author || site.fullName,
              ...(authorHref ? { url: `${CANONICAL_ORIGIN}${authorHref}` } : {}),
            },
            inLanguage: "ur",
            genre: item.type ?? "Ghazal",
            publisher: {
              "@type": "Person",
              name: site.fullName,
              url: `${CANONICAL_ORIGIN}/`,
            },
            datePublished: isoDate(item.createdAt),
            dateModified: isoDate(item.updatedAt ?? item.createdAt),
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: "Verses",
                item: `${CANONICAL_ORIGIN}/poems`,
              },
              {
                "@type": "ListItem",
                position: 2,
                name: item.title,
                item: `${CANONICAL_ORIGIN}/poems/${item.slug}`,
              },
            ],
          },
        ]}
      />

      <article className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:py-20">
        <nav aria-label="Breadcrumb" className="text-sm text-muted">
          <Link to="/poems" className="hover:text-maroon-700">
            Verses
          </Link>
          <span aria-hidden="true"> / </span>
          <span className="text-ink-800">{item.title}</span>
        </nav>

        <header className="mt-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <h1 className="text-3xl sm:text-4xl">{item.title}</h1>
            <p className="mt-3 text-sm text-muted">
              {authorHref ? (
                <Link to={authorHref} className="font-medium text-maroon-700 hover:underline">
                  {authorName}
                </Link>
              ) : (
                authorName
              )}
            </p>
            {item.book && <p className="mt-1 text-sm text-muted">{item.book}</p>}
            <p className="mt-1 text-xs text-muted">
              {dateStamp}
              {lastUpdated}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={copyPoem}
              title="Copy verse"
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-paper px-3 py-1.5 text-xs font-semibold text-muted shadow-sm transition-colors hover:border-maroon-700 hover:text-maroon-700"
            >
              {copied ? (
                <>
                  <Check aria-hidden="true" className="size-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Copied!</span>
                </>
              ) : (
                <>
                  <Copy aria-hidden="true" className="size-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={sharePoem}
              title="Share verse"
              className="inline-flex items-center gap-1.5 rounded-full border border-line bg-paper px-3 py-1.5 text-xs font-semibold text-muted shadow-sm transition-colors hover:border-maroon-700 hover:text-maroon-700"
            >
              <Share2 aria-hidden="true" className="size-3.5" />
              <span>Share</span>
            </button>
          </div>
        </header>

        <div aria-hidden="true" className="rule-accent mt-6" />

        {/* Couplets rendered with Nastaliq */}
        <div lang="ur" className="urdu-poetry mt-10 text-ink-900">
          {item.body.split(/\n{2,}/).map((stanza, index) => (
            <p key={index}>{stanza}</p>
          ))}
        </div>

        {/* Quick action bar */}
        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-line bg-cream-50 p-4">
          <p className="text-xs text-muted">
            Enjoyed this {item.type?.toLowerCase() ?? "verse"}? Share or copy it with friends.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={copyPoem}
              className="btn btn-secondary text-xs"
            >
              <Copy aria-hidden="true" className="size-3.5 mr-1 inline" />
              {copied ? "Copied" : "Copy Full Text"}
            </button>
            <button
              type="button"
              onClick={sharePoem}
              className="btn btn-primary text-xs"
            >
              <Share2 aria-hidden="true" className="size-3.5 mr-1 inline" />
              Share
            </button>
          </div>
        </div>

        {/* Poet Bio Card */}
        {poet.data && (
          <section className="mt-12 rounded-lg border border-line bg-paper p-6 shadow-sm">
            <p className="eyebrow text-xs">About the Poet</p>
            <div className="mt-2 flex items-baseline justify-between">
              <h2 className="text-xl font-serif text-ink-900">
                <Link to={`/poets/${poet.data.slug}`} className="hover:text-maroon-700">
                  {poet.data.name}
                </Link>
              </h2>
              <span lang="ur" dir="rtl" className="urdu-display text-lg text-ink-800">
                {poet.data.urdu}
              </span>
            </div>
            <p lang="ur" dir="rtl" className="urdu-text mt-3 text-sm leading-relaxed text-ink-800">
              {poet.data.bio}
            </p>
            <div className="mt-4 pt-3 border-t border-line flex justify-end">
              <Link
                to={`/poets/${poet.data.slug}`}
                className="inline-flex items-center gap-1 text-xs font-semibold text-maroon-700 hover:underline"
              >
                <span>Read all verses by {poet.data.name} ({poet.data.poemCount})</span>
                <ArrowRight aria-hidden="true" className="size-3.5" />
              </Link>
            </div>
          </section>
        )}

        {/* Related Verses by this Poet */}
        {relatedPoems.length > 0 && (
          <section className="mt-12">
            <h2 className="text-lg font-serif font-semibold text-ink-900">
              More Urdu Poetry by {headAuthor}
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {relatedPoems.map((related) => {
                const previewLine = (related.body ?? "").split("\n").map(l => l.trim()).filter(Boolean)[0] ?? "";
                return (
                  <Link
                    key={related.slug}
                    to={`/poems/${related.slug}`}
                    className="block rounded-lg border border-line bg-paper p-4 transition-colors hover:border-maroon-700 hover:shadow-sm"
                  >
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                      {related.type ?? "Poem"}
                    </span>
                    <h3 className="mt-1 text-sm font-semibold text-ink-900 line-clamp-1">
                      {related.title}
                    </h3>
                    <p lang="ur" dir="rtl" className="urdu-poetry mt-2 text-sm text-ink-800 line-clamp-2">
                      {previewLine}
                    </p>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </article>
    </>
  );
}

function PoemNotFound() {
  return (
    <>
      <Seo title="Poem not found" noIndex />
      <div className="mx-auto max-w-2xl px-4 py-20 sm:px-6">
        <ErrorNote message="That poem is not on this site." />
        <div className="mt-8">
          <Link to="/poems" className="btn btn-secondary">
            All verses
          </Link>
        </div>
      </div>
    </>
  );
}
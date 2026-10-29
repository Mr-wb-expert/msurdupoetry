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
  const suffix =
    `by ${headAuthor}. Urdu ${(item.type ?? "Poem").toLowerCase()} online.` +
    (item.book ? ` From ${item.book}.` : "");
  const budget = Math.max(20, 155 - `“” ${item.title} ${suffix}`.length);
  const opening = lines.slice(0, 2).join(" ").slice(0, budget).trimEnd();
  const description = `“${opening}” ${item.title} ${suffix}`;
  // Mirrors api/seo.py: createdAt is the day the verse was added here, which
  // is a publication date only for the site owner's own poems.
  const ownVerse = !item.author || authorHref === "/poets/mujahid-sajjad";

  // Dates mirror the server's static rendering (api/seo.py)
  const dateStamp = `Published ${formatDate(item.createdAt)}`;
  const lastUpdated =
    item.updatedAt && isoDate(item.updatedAt) !== isoDate(item.createdAt)
      ? ` · Last updated ${formatDate(item.updatedAt)}`
      : "";

  const shareUrl = `${CANONICAL_ORIGIN}/poems/${item.slug}`;
  const shareText = `${item.title}\n${lines.slice(0, 4).join("\n")}\n- ${authorName}\n${shareUrl}`;

  async function copyPoem() {
    try {
      await navigator.clipboard.writeText(`${item.title}\n\n${item.body}\n\n- ${authorName}\n${shareUrl}`);
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
        title={`${item.title} | ${item.type ?? "Poem"} by ${headAuthor}`}
        description={description}
        brand={false}
        lang="ur"
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
              "@id": `${CANONICAL_ORIGIN}/#person`,
              name: site.fullName,
              url: `${CANONICAL_ORIGIN}/`,
            },
            ...(ownVerse ? { datePublished: isoDate(item.createdAt) } : {}),
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

        <header className="mt-8 text-center">
          <span className="inline-block rounded-full border border-line bg-cream-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-maroon-700">
            {item.type ?? "Poem"}
          </span>
          <h1 className="mt-4 text-3xl sm:text-4xl">{item.title}</h1>
          <p className="mt-3 text-base">
            {authorHref ? (
              <Link to={authorHref} className="font-semibold text-maroon-700 hover:underline">
                {authorName}
              </Link>
            ) : (
              <span className="font-semibold text-ink-800">{authorName}</span>
            )}
            {item.book && <span className="text-muted"> · {item.book}</span>}
          </p>
          <p className="mt-1 text-xs text-muted">
            {dateStamp}
            {lastUpdated}
          </p>

          <div className="mt-5 flex items-center justify-center gap-2">
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

        {/* The verse on its own page: framed, centred, ornament above and below. */}
        <div className="relative mt-10 rounded-sm border border-line bg-cream-50 px-5 py-10 shadow-cover sm:px-12 sm:py-14">
          <div aria-hidden="true" className="absolute inset-2 rounded-sm border border-marigold-500/30" />
          <p aria-hidden="true" className="text-center text-xl text-marigold-500">❖</p>
          <div lang="ur" dir="rtl" className="urdu-poetry relative mt-6 text-center text-ink-900">
            {/* pre-line keeps the two misre of each sher on their own lines. */}
            {item.body.split(/\n{2,}/).map((stanza, index) => (
              <p key={index} className="whitespace-pre-line">
                {stanza}
              </p>
            ))}
          </div>
          <p aria-hidden="true" className="mt-6 text-center text-xl text-marigold-500">❖</p>
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

        {/* Roman Urdu, word meanings, explanation — mirrors _poem_extras_html in api/seo.py */}
        {item.roman && (
          <section lang="ur-Latn" className="mt-12">
            <h2 className="text-lg font-serif font-semibold text-ink-900">Roman Urdu</h2>
            <div className="mt-4 space-y-4 text-ink-800 leading-relaxed">
              {item.roman.split(/\n{2,}/).map((stanza, index) => (
                <p key={index} className="whitespace-pre-line">
                  {stanza}
                </p>
              ))}
            </div>
          </section>
        )}

        {parseMeanings(item.meanings).length > 0 && (
          <section className="mt-12">
            <h2 className="text-lg font-serif font-semibold text-ink-900">Word meanings</h2>
            <dl className="mt-4 divide-y divide-line rounded-lg border border-line bg-paper">
              {parseMeanings(item.meanings).map(([word, meaning], index) => (
                <div key={index} className="flex items-baseline justify-between gap-4 px-4 py-2.5">
                  <dt lang="ur" dir="rtl" className="urdu-display text-ink-900">
                    {word}
                  </dt>
                  <dd className="text-right text-sm text-muted">{meaning}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {item.notes && (
          <section className="mt-12">
            <h2 className="text-lg font-serif font-semibold text-ink-900">About this poem</h2>
            <div className="mt-4 space-y-3 leading-relaxed text-ink-800">
              {item.notes.trim().split(/\n{2,}/).map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
          </section>
        )}

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
                // The title is usually the first line, so preview the line
                // after it rather than printing the same words twice.
                const lines = (related.body ?? "")
                  .split("\n")
                  .map((line) => line.trim())
                  .filter(Boolean);
                const previewLine =
                  (lines[0] === related.title.trim() ? lines[1] : lines[0]) ?? "";
                return (
                  <Link
                    key={related.slug}
                    to={`/poems/${related.slug}`}
                    className="lift flex flex-col rounded-sm border border-line bg-paper p-5 shadow-cover transition-colors hover:border-maroon-700"
                  >
                    <span className="self-start rounded-full border border-line bg-cream-50 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-maroon-700">
                      {related.type ?? "Poem"}
                    </span>
                    {/* Nastaliq needs a tall line box: at the sans line height
                        its rising and falling strokes were clipped. */}
                    <h3
                      lang="ur"
                      dir="rtl"
                      className="urdu-display mt-3 truncate py-1 text-xl leading-[2.2] text-ink-900"
                    >
                      {related.title}
                    </h3>
                    {previewLine && (
                      <p
                        lang="ur"
                        dir="rtl"
                        className="urdu-display truncate py-1 text-base leading-[2.2] text-muted"
                      >
                        {previewLine}
                      </p>
                    )}
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

/** "word — meaning" per line -> pairs. Mirrors parse_meanings in api/seo.py. */
function parseMeanings(text: string | null | undefined): [string, string][] {
  return (text ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const separator = line.includes(" — ") ? " — " : " - ";
      const at = line.indexOf(separator);
      return at === -1
        ? [line, ""]
        : [line.slice(0, at).trim(), line.slice(at + separator.length).trim()];
    });
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
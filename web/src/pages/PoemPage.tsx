import { Link, useParams } from "react-router-dom";

import Seo from "@/components/Seo.tsx";
import { ErrorNote, Loading } from "@/components/Feedback.tsx";
import { site } from "@/lib/site";
import { poetHref } from "@/lib/poets";
import { useApi } from "@/lib/useApi.ts";
import { getPoem } from "@/lib/api.ts";
import type { Poem } from "@/lib/types";

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

  if (poem.error) return <PoemNotFound />;
  if (poem.loading || !poem.data) {
    return (
      <>
        <Seo title="Loading" />
        <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
          <Loading label="Loading verse" />
        </div>
      </>
    );
  }

  const item: Poem = poem.data;
  const authorName = item.author || site.author;
  const authorHref = poetHref(item.author);

  // Mirrors the snippet rule in api/seo.py: quote the opening lines so every
  // poem page's meta description is genuinely unique.
  const lines = (item.body ?? "").split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const suffix = `by ${item.author || site.author}. Urdu ${(item.type ?? "Poem").toLowerCase()} online.`;
  const budget = Math.max(20, 155 - (item.title + " " + suffix).length);
  const opening = lines.slice(0, 2).join(" ").slice(0, budget);
  const description =
    `“${opening}” ${item.title} ${suffix}${item.book ? ` From the book ${item.book}.` : ""}`;

  return (
    <>
      {/* Title/description pattern mirrored in api/seo.py. */}
      <Seo
        title={`${item.title} — Urdu ${item.type ?? "Poem"}`}
        description={description}
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "CreativeWork",
            name: item.title,
            author: { "@type": "Person", name: item.author || site.fullName },
            inLanguage: "ur",
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: "Verses",
                item: `${window.location.origin}/poems`,
              },
              {
                "@type": "ListItem",
                position: 2,
                name: item.title,
                item: `${window.location.origin}/poems/${item.slug}`,
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

        <h1 className="mt-6 text-3xl sm:text-4xl">{item.title}</h1>
        <p className="mt-3 text-sm text-muted">
          {authorHref ? (
            <Link to={authorHref} className="hover:text-maroon-700">
              {authorName}
            </Link>
          ) : (
            authorName
          )}
        </p>
        {item.book && <p className="mt-1 text-sm text-muted">{item.book}</p>}

        <div aria-hidden="true" className="rule-accent mt-6" />

        {/* `whitespace-pre-line` keeps the author's line breaks; the .urdu-poetry
            class supplies the Nastaliq metrics. The language attribute is what
            tells a crawler (and a screen reader) this is Urdu, not broken
            English. */}
        <div lang="ur" className="urdu-poetry mt-10 text-ink-900">
          {item.body.split(/\n{2,}/).map((stanza, index) => (
            <p key={index}>{stanza}</p>
          ))}
        </div>
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
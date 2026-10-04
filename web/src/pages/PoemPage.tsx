import { Link, useParams } from "react-router-dom";

import Seo from "@/components/Seo.tsx";
import { ErrorNote } from "@/components/Feedback.tsx";
import { site } from "@/lib/site";
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
  if (poem.loading || !poem.data) return <Seo title="Loading" noIndex />;

  const item: Poem = poem.data;

  return (
    <>
      <Seo
        title={item.title}
        description={`A poem by ${site.author}.`}
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "CreativeWork",
            name: item.title,
            author: { "@type": "Person", name: site.fullName },
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
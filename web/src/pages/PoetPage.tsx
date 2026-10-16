import { Link, useParams } from "react-router-dom";

import Seo from "@/components/Seo.tsx";
import { ErrorNote, Loading } from "@/components/Feedback.tsx";
import CoupletCard from "@/components/CoupletCard.tsx";
import { fromPoem } from "@/lib/couplets";
import { getPoet } from "@/lib/api.ts";
import { useApi } from "@/lib/useApi.ts";

/**
 * One poet's hub: bio plus everything they wrote, carded and linked to each
 * full poem. The bio is the unique Urdu editorial content — without this page
 * a poet is only a name on a mixed feed, which is all the crawler used to see.
 */
export default function PoetPage() {
  const { slug = "" } = useParams();
  const poet = useApi(() => getPoet(slug), [slug]);

  if (poet.error) return <PoetNotFound />;
  if (poet.loading || !poet.data) {
    return (
      <>
        <Seo title="Loading" />
        <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
          <Loading label="Loading poet and verses" />
        </div>
      </>
    );
  }

  const item = poet.data;
  const poetUrl = `${window.location.origin}/poets/${item.slug}`;
  // Mirrors the head rule in api/seo.py: the roman name leads, because that is
  // what the queries look like ("jaun elia poetry", not the Urdu script).
  const description =
    `Read Urdu ghazals, nazms and shayari by ${item.name} — ` +
    "biography and verses, free online, no sign-up.";

  return (
    <>
      <Seo
        title={`${item.name} — Ghazal, Shayari & Poetry`}
        description={description}
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "Person",
            name: `${item.urdu} (${item.name})`,
            url: poetUrl,
            description: item.bio,
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: "Poets",
                item: `${window.location.origin}/poets`,
              },
              {
                "@type": "ListItem",
                position: 2,
                name: item.urdu,
                item: poetUrl,
              },
            ],
          },
        ]}
      />

      <div className="border-b border-line bg-cream-50">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:py-16">
          <nav aria-label="Breadcrumb" className="text-sm text-muted">
            <Link to="/poets" className="hover:text-maroon-700">
              Poets
            </Link>
            <span aria-hidden="true"> / </span>
            <span className="text-ink-800">{item.urdu}</span>
          </nav>

          <div className="text-center sm:text-start">
            <h1 dir="rtl" lang="ur" className="urdu-display mt-6 text-4xl sm:text-5xl">
              {item.urdu}
            </h1>
            <p className="mt-2 text-base font-semibold text-maroon-700">{item.name}</p>
          </div>
          <p dir="rtl" lang="ur" className="urdu-display mt-5 max-w-2xl text-lg leading-8 text-ink-800">
            {item.bio}
          </p>
          <p className="mt-4 text-sm font-semibold uppercase tracking-[0.14em] text-muted">
            {item.poems.length} {item.poems.length === 1 ? "verse" : "verses"} on this site
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        {item.poems.length === 0 ? (
          <Link to="/poems" className="btn btn-secondary">
            Browse all verses
          </Link>
        ) : (
          <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {item.poems.map((poem) => (
              <li key={poem.slug} className="flex">
                <CoupletCard couplet={fromPoem(poem)} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

function PoetNotFound() {
  return (
    <>
      <Seo title="Poet not found" noIndex />
      <div className="mx-auto max-w-2xl px-4 py-20 sm:px-6">
        <ErrorNote message="That poet is not on this site." />
        <div className="mt-8">
          <Link to="/poets" className="btn btn-secondary">
            All poets
          </Link>
        </div>
      </div>
    </>
  );
}
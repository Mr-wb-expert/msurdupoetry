import { Link } from "react-router-dom";

import Seo from "@/components/Seo.tsx";
import { EmptyNote, ErrorNote, Loading } from "@/components/Feedback.tsx";
import { getPoets } from "@/lib/api.ts";
import { useApi } from "@/lib/useApi.ts";

/**
 * The poets index — one card per poet, each linking to their hub page. With
 * the bulk of the verses now belonging to Faiz, Jaun and Mohsin Naqvi, this
 * is how a search engine (and a reader) reaches a single poet's work, which
 * the mixed /poems feed does not provide.
 */
export default function PoetsPage() {
  const poets = useApi(getPoets);

  return (
    <>
      {/* Copy mirrored in api/seo.py. */}
      <Seo
        title="Urdu Poets & Authors — Faiz, Jaun Elia, Mohsin Naqvi"
        description="The poets whose verses live on this site — Faiz Ahmed Faiz, Jaun Elia, Mohsin Naqvi and Mujahid Sajjad. Read their ghazals and nazms in Urdu, free."
      />

      <div className="border-b border-line bg-cream-50">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:py-16">
          <p className="eyebrow">The poets on the site</p>
          <h1 className="mt-3 text-4xl sm:text-5xl">Poets</h1>
          <p className="mt-4 max-w-2xl text-lg text-muted">
            Every poet whose ghazals and nazms are collected here, each with their
            own page and the verses written in their name.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        {poets.loading && !poets.data ? (
          <Loading label="Loading poets" />
        ) : poets.error && !poets.data ? (
          <ErrorNote message={poets.error} onRetry={poets.reload} />
        ) : (poets.data ?? []).length === 0 ? (
          <EmptyNote title="No poets yet">Poets will appear here as they are added.</EmptyNote>
        ) : (
          <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {(poets.data ?? []).map((poet) => (
              <li key={poet.slug} className="flex">
                <Link
                  to={`/poets/${poet.slug}`}
                  className="lift flex w-full flex-col rounded-sm border border-line bg-paper p-6 shadow-cover"
                >
                  <p dir="rtl" lang="ur" className="urdu-display text-2xl">
                    {poet.urdu}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-maroon-700">{poet.name}</p>
                  <p dir="rtl" lang="ur" className="urdu-display mt-3 line-clamp-4 text-sm leading-6 text-ink-800">
                    {poet.bio}
                  </p>
                  <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                    {poet.poemCount} {poet.poemCount === 1 ? "verse" : "verses"}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

import Seo from "@/components/Seo.tsx";
import PageHero from "@/components/PageHero.tsx";
import { EmptyNote, ErrorNote, Loading } from "@/components/Feedback.tsx";
import { getPoets } from "@/lib/api.ts";
import { useApi } from "@/lib/useApi.ts";
import type { Poet } from "@/lib/types";

const OWNER = "mujahid-sajjad";

/**
 * The poets index — one card per poet, each linking to their hub page. With
 * the bulk of the verses belonging to other poets, this is how a search
 * engine (and a reader) reaches a single poet's work, which the mixed
 * /poems feed does not provide. The site author's card leads.
 */
export default function PoetsPage() {
  const poets = useApi(getPoets);

  const ordered = useMemo(
    () =>
      [...(poets.data ?? [])].sort(
        (a, b) => Number(b.slug === OWNER) - Number(a.slug === OWNER) || b.poemCount - a.poemCount,
      ),
    [poets.data],
  );
  const total = ordered.reduce((sum, poet) => sum + poet.poemCount, 0);

  return (
    <>
      {/* Copy mirrored in api/seo.py. */}
      <Seo
        title="Famous Urdu Poets | Iqbal, Ghalib, Faiz, Jaun Elia & More"
        description="Biographies and poetry of famous Urdu poets, Allama Iqbal, Mirza Ghalib, Mir Taqi Mir, Faiz Ahmed Faiz, Ahmed Faraz, Jaun Elia, Parveen Shakir and more."
      />

      <PageHero
        eyebrow="The poets on the site"
        title="Famous Urdu Poets"
        urdu="شعرا"
        watermark="شاعر"
        lead={
          <>
            From Mir and Ghalib to Iqbal, Faiz and Jaun Elia, every poet in the library, each
            with a biography in Urdu and their ghazals and nazms in Urdu text.
            {ordered.length > 0 && (
              <span className="mt-2 block text-sm font-semibold uppercase tracking-[0.14em] text-marigold-700">
                {ordered.length} poets · {total.toLocaleString()} verses
              </span>
            )}
          </>
        }
      />

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12 lg:py-16">
        {poets.loading && !poets.data ? (
          <Loading label="Loading poets" />
        ) : poets.error && !poets.data ? (
          <ErrorNote message={poets.error} onRetry={poets.reload} />
        ) : ordered.length === 0 ? (
          <EmptyNote title="No poets yet">Poets will appear here as they are added.</EmptyNote>
        ) : (
          <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {ordered.map((poet) => (
              <li key={poet.slug} className="flex">
                <PoetCard poet={poet} owner={poet.slug === OWNER} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

function PoetCard({ poet, owner }: { poet: Poet; owner: boolean }) {
  return (
    <Link
      to={`/poets/${poet.slug}`}
      className="lift group flex w-full flex-col rounded-sm border border-line bg-paper p-6 shadow-cover"
    >
      <div className="flex items-center gap-4">
        {/* Monogram: the poet's first letter in Nastaliq. The padding lifts
            the glyph, which sits low in its line box, to the visual centre. */}
        <span
          aria-hidden="true"
          lang="ur"
          className="urdu-display grid size-14 shrink-0 place-items-center rounded-full bg-maroon-700/10 pb-2 text-2xl leading-none text-maroon-700"
        >
          {poet.urdu.trim().charAt(0)}
        </span>
        {/* Both names left-aligned, one above the other: dir="rtl" sits on the
            span so the Urdu shapes correctly without right-aligning the block. */}
        <div className="min-w-0">
          <p className="leading-none">
            <span lang="ur" dir="rtl" className="urdu-display inline-block text-2xl leading-[1.9]">
              {poet.urdu}
            </span>
          </p>
          <p className="mt-1 text-sm font-semibold text-maroon-700">{poet.name}</p>
        </div>
        {owner && (
          <span className="ms-auto self-start rounded-full border border-marigold-500/60 bg-cream-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-marigold-700">
            Site author
          </span>
        )}
      </div>

      <p dir="rtl" lang="ur" className="urdu-display mb-5 mt-4 line-clamp-3 text-sm leading-7 text-ink-800">
        {poet.bio}
      </p>

      <div className="mt-auto flex items-center justify-between border-t border-line pt-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
        <span>
          {poet.poemCount === 0
            ? "Books & biography"
            : `${poet.poemCount} ${poet.poemCount === 1 ? "verse" : "verses"}`}
        </span>
        <ArrowRight
          aria-hidden="true"
          className="size-4 text-maroon-700 transition-transform group-hover:translate-x-1"
        />
      </div>
    </Link>
  );
}

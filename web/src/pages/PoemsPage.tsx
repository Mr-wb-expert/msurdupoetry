import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";

import Seo from "@/components/Seo.tsx";
import PageHero from "@/components/PageHero.tsx";
import { EmptyNote, ErrorNote, Loading } from "@/components/Feedback.tsx";
import CoupletCard from "@/components/CoupletCard.tsx";
import { fromPoem } from "@/lib/couplets";
import { poetHref } from "@/lib/poets";
import { VERSE_TYPES, type VerseType } from "@/lib/types";
import { getPoems, getPoets } from "@/lib/api.ts";
import { useApi } from "@/lib/useApi.ts";

type Filter = "All" | VerseType;

const filterLabels: Record<VerseType, string> = {
  Ghazal: "Ghazals",
  Nazm: "Nazms",
  Poem: "Poems",
};

const filters: { key: Filter; label: string }[] = [
  { key: "All", label: "All" },
  ...VERSE_TYPES.map((type) => ({ key: type, label: filterLabels[type] })),
];

const PAGE_SIZE = 24;

export default function PoemsPage() {
  const [filter, setFilter] = useState<Filter>("All");
  const [poet, setPoet] = useState("all");
  const [query, setQuery] = useState("");
  const [displayLimit, setDisplayLimit] = useState(PAGE_SIZE);
  // The list is whatever the admin has saved — nothing is hardcoded here.
  const added = useApi(getPoems);
  const poets = useApi(getPoets);

  const verses = useMemo(() => (added.data ?? []).map(fromPoem), [added.data]);
  const poetOptions = useMemo(
    () => (poets.data ?? []).filter((p) => p.poemCount > 0).sort((a, b) => b.poemCount - a.poemCount),
    [poets.data],
  );

  const needle = query.trim().toLowerCase();
  const byType = (type: VerseType) => verses.filter((couplet) => couplet.type === type).length;

  const filtered = useMemo(
    () =>
      verses.filter(
        (couplet) =>
          (filter === "All" || couplet.type === filter) &&
          (poet === "all" || poetHref(couplet.author) === `/poets/${poet}`) &&
          (!needle || `${couplet.couplet} ${couplet.title}`.toLowerCase().includes(needle)),
      ),
    [verses, filter, poet, needle],
  );

  const visible = useMemo(() => filtered.slice(0, displayLimit), [filtered, displayLimit]);
  const narrowed = filter !== "All" || poet !== "all" || needle !== "";

  return (
    <>
      {/* Copy mirrored in api/seo.py. */}
      <Seo
        title="Urdu Poetry in Urdu Text | Ghazals, Nazms & Shayari"
        description="2,000+ Urdu ghazals, nazms and shayari by Iqbal, Ghalib, Faiz, Faraz, Jaun Elia and Parveen Shakir in Urdu text, copy, share and read free."
      />

      <PageHero
        eyebrow="The collection"
        title="Urdu Ghazals, Nazms & Shayari"
        urdu="اشعار"
        watermark="غزل"
        lead="The ghazals and nazms of great Urdu poets such as Iqbal, Ghalib, Mir, Faiz, Faraz, Jaun Elia and Parveen Shakir, in Urdu text you can copy and share."
      >
        {/* Nothing to count until the fetch answers — "0 verses" while the
            request is in flight reads like an empty site. */}
        {added.data && (
          <dl className="mx-auto mt-8 grid max-w-md grid-cols-3 divide-x divide-line border-y border-line py-4 text-center sm:mx-0 sm:text-start [&>div]:px-4 [&>div:first-child]:ps-0">
            {(
              [
                ["Verses", verses.length],
                ["Ghazals", byType("Ghazal")],
                ["Nazms", byType("Nazm")],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="flex flex-col-reverse">
                <dt className="mt-1 text-xs uppercase tracking-wider text-muted">{label}</dt>
                <dd className="text-2xl font-bold text-ink-950">{value.toLocaleString()}</dd>
              </div>
            ))}
          </dl>
        )}
      </PageHero>

      {/* Filter bar: type tabs, poet, search. On wide screens it sticks under the header while
          the reader scrolls a long list. */}
      <div className="z-20 border-b border-line bg-paper/95 backdrop-blur lg:sticky lg:top-16">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:px-6 lg:flex-row lg:items-center">
          <div role="tablist" aria-label="Filter by form" className="flex flex-wrap gap-2">
            {filters.map((option) => (
              <button
                key={option.key}
                type="button"
                role="tab"
                aria-selected={filter === option.key}
                onClick={() => {
                  setFilter(option.key);
                  setDisplayLimit(PAGE_SIZE);
                }}
                className={`min-h-9 rounded-full border px-4 text-sm font-semibold transition-colors ${
                  filter === option.key
                    ? "border-maroon-700 bg-maroon-700 text-paper"
                    : "border-line bg-paper text-muted hover:border-ink-900 hover:text-ink-900"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row lg:ms-auto">
            <label htmlFor="couplet-poet" className="sr-only">
              Filter by poet
            </label>
            <select
              id="couplet-poet"
              value={poet}
              onChange={(event) => {
                setPoet(event.target.value);
                setDisplayLimit(PAGE_SIZE);
              }}
              className="field h-10 py-0 text-sm sm:w-52"
            >
              <option value="all">All poets</option>
              {poetOptions.map((option) => (
                <option key={option.slug} value={option.slug}>
                  {option.name} ({option.poemCount})
                </option>
              ))}
            </select>

            <div className="relative sm:w-64">
              <label htmlFor="couplet-search" className="sr-only">
                Search couplets
              </label>
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted"
              />
              <input
                id="couplet-search"
                type="search"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setDisplayLimit(PAGE_SIZE);
                }}
                placeholder="Search couplets"
                className="field h-10 ps-9"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        {added.data && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted" role="status">
              {filtered.length.toLocaleString()} {filtered.length === 1 ? "verse" : "verses"}
              {narrowed ? " match" : ""}
            </p>
            {poet !== "all" && (
              <Link to={`/poets/${poet}`} className="text-sm font-semibold text-maroon-700 hover:underline">
                About this poet →
              </Link>
            )}
          </div>
        )}

        {added.loading && !added.data ? (
          <Loading label="Loading verses" />
        ) : added.error && !added.data ? (
          <ErrorNote message={added.error} onRetry={added.reload} />
        ) : verses.length === 0 ? (
          <EmptyNote title="No verses yet">Verses will appear here as they are added.</EmptyNote>
        ) : visible.length === 0 ? (
          <EmptyNote title={needle ? "No couplets match that" : "No couplets in this selection"}>
            {needle ? "Try a different word." : "Try another filter."}
          </EmptyNote>
        ) : (
          <>
            <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((couplet) => (
                <li key={couplet.id} className="flex">
                  <CoupletCard couplet={couplet} />
                </li>
              ))}
            </ul>

            {visible.length < filtered.length && (
              <div className="mt-12 text-center">
                <button
                  type="button"
                  onClick={() => setDisplayLimit((prev) => prev + PAGE_SIZE)}
                  className="btn btn-secondary px-8"
                >
                  Load more verses ({(filtered.length - visible.length).toLocaleString()} remaining)
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

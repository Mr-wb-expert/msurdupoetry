import { useMemo, useState } from "react";

import Seo from "@/components/Seo.tsx";
import { EmptyNote } from "@/components/Feedback.tsx";
import CoupletCard from "@/components/CoupletCard.tsx";
import { couplets, fromPoem } from "@/lib/couplets";
import { VERSE_TYPES, type VerseType } from "@/lib/types";
import { getPoems } from "@/lib/api.ts";
import { useApi } from "@/lib/useApi.ts";

type Filter = "All" | VerseType;

const filterLabels: Record<VerseType, string> = {
  Ghazal: "Ghazal Verses",
  Nazm: "Nazm Verses",
  Poem: "Poems",
};

const filters: { key: Filter; label: string }[] = [
  { key: "All", label: "All" },
  ...VERSE_TYPES.map((type) => ({ key: type, label: filterLabels[type] })),
];

export default function PoemsPage() {
  const [filter, setFilter] = useState<Filter>("All");
  const [query, setQuery] = useState("");
  // Verses written in the admin join the transcribed ones from the book.
  const added = useApi(getPoems);

  const verses = useMemo(
    () => [...(added.data ?? []).map(fromPoem), ...couplets],
    [added.data],
  );

  const needle = query.trim().toLowerCase();
  const byType = (type: VerseType) => verses.filter((couplet) => couplet.type === type).length;
  const counts = [
    `${verses.length} verses`,
    `${byType("Ghazal")} ghazals`,
    `${byType("Nazm")} nazms`,
    ...(byType("Poem") ? [`${byType("Poem")} poems`] : []),
  ].join(" · ");
  const visible = useMemo(
    () =>
      verses.filter(
        (couplet) =>
          (filter === "All" || couplet.type === filter) &&
          (!needle ||
            `${couplet.couplet} ${couplet.title ?? ""} ${couplet.bookName ?? ""}`
              .toLowerCase()
              .includes(needle)),
      ),
    [verses, filter, needle],
  );

  return (
    <>
      {/* Copy mirrored in api/seo.py. */}
      <Seo
        title="Urdu Poems & Shayari — Ghazals, Nazms"
        description="Read Urdu shayari by Mujahid Sajjad — ghazal and nazm couplets in Urdu, free to read and share."
      />

      <div className="border-b border-line bg-cream-50">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:py-16">
          <p className="eyebrow">In his own words</p>
          <h1 className="mt-3 text-4xl sm:text-5xl">Verses</h1>
          <p className="mt-4 max-w-2xl text-lg text-muted">
            Ghazal and nazm couplets, set in the Nastaliq they were written in.
          </p>
          <p className="mt-3 text-sm text-muted">{counts}</p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <div role="tablist" aria-label="Filter couplets" className="flex flex-wrap gap-2">
              {filters.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  role="tab"
                  aria-selected={filter === option.key}
                  onClick={() => setFilter(option.key)}
                  className={`min-h-10 rounded-full border px-4 text-sm font-semibold transition-colors ${
                    filter === option.key
                      ? "border-ink-900 bg-ink-900 text-paper"
                      : "border-line bg-paper text-muted hover:border-ink-900 hover:text-ink-900"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="w-full sm:ms-auto sm:w-64">
              <label htmlFor="couplet-search" className="sr-only">
                Search couplets
              </label>
              <input
                id="couplet-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search couplets"
                className="field"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        {verses.length === 0 ? (
          <EmptyNote title="No verses yet">
            Verses will appear here as they are added.
          </EmptyNote>
        ) : visible.length === 0 ? (
          <EmptyNote title={needle ? "No couplets match that" : "No couplets in this selection"}>
            {needle ? "Try a different word." : "Try another filter."}
          </EmptyNote>
        ) : (
          <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((couplet) => (
              <li key={couplet.id} className="flex">
                <CoupletCard couplet={couplet} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

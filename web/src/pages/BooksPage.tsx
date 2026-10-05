import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, X } from "lucide-react";

import Seo from "@/components/Seo.tsx";
import BookGrid from "@/components/BookGrid.tsx";
import { EmptyNote, ErrorNote, Loading } from "@/components/Feedback.tsx";
import { filterBooks, sortBooks, sortLabels, type SortKey } from "@/lib/books";
import { CATEGORIES, categoryLabels, type BookCategory } from "@/lib/types";
import { useApi } from "@/lib/useApi.ts";
import { getBooks } from "@/lib/api.ts";

type CategoryFilter = BookCategory | "all";

export default function BooksPage() {
  const [params, setParams] = useSearchParams();
  const library = useApi(getBooks);

  // The query lives in the URL so a search can be linked to and the back
  // button walks out of it.
  const query = params.get("q") ?? "";
  const category = (params.get("category") as CategoryFilter | null) ?? "all";
  const sort = (params.get("sort") as SortKey | null) ?? "featured";

  const [draft, setDraft] = useState(query);

  const update = (next: Record<string, string | null>) => {
    const merged = new URLSearchParams(params);
    for (const [key, value] of Object.entries(next)) {
      if (value === null || value === "" || value === "all" || value === "featured") {
        merged.delete(key);
      } else {
        merged.set(key, value);
      }
    }
    setParams(merged, { replace: true });
  };

  const visible = useMemo(() => {
    const filtered = filterBooks(library.data ?? [], { query, category });
    return sortBooks(filtered, sort);
  }, [library.data, query, category, sort]);

  const filtering = query.trim() !== "" || category !== "all";

  // "Poetry, Criticism, and Literature" — what this library actually holds.
  const presentLabels = Array.from(
    new Set((library.data ?? []).map((book) => categoryLabels[book.category])),
  );
  const categoryList =
    presentLabels.length > 1
      ? `${presentLabels.slice(0, -1).join(", ")}, and ${presentLabels[presentLabels.length - 1]}`
      : (presentLabels[0] ?? "");

  return (
    <>
      {/* Copy mirrored in api/seo.py. */}
      <Seo
        title="Urdu Poetry Books & Criticism"
        description="Every book by Mujahid Sajjad — poetry, criticism and essays. Read online or download the PDF free."
      />

      <div className="border-b border-line bg-cream-50">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:py-16">
          <p className="eyebrow">The library</p>
          <h1 className="mt-3 text-4xl sm:text-5xl">Books</h1>
          <p className="mt-4 max-w-2xl text-lg text-muted">
            {library.data
              ? `${library.data.length} ${library.data.length === 1 ? "book" : "books"} — ${categoryList} — free to read in the browser and to download as a PDF. No account, no payment.`
              : "Every book is free to read in the browser and to download as a PDF. No account, no payment."}
          </p>

          {/* Search. The only wide field on the page, so it reads as the
              primary action. */}
          <form
            role="search"
            className="mt-8 max-w-xl"
            onSubmit={(event) => {
              event.preventDefault();
              update({ q: draft });
            }}
          >
            <label htmlFor="catalogue-search" className="sr-only">
              Search by title, author or description
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted"
                />
                <input
                  id="catalogue-search"
                  type="search"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder="Search by title, author or description"
                  className="field ps-9"
                />
              </div>
              <button type="submit" className="btn btn-primary">
                Search
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        {/* Filter and sort bar. Mobile stacks the two groups so Sort is not
            left floating on a row of its own; sm+ keeps one line. */}
        <div className="flex flex-col gap-4 border-b border-line pb-5 sm:flex-row sm:items-center sm:gap-x-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">
              Category
            </span>
            {(["all", ...CATEGORIES] as CategoryFilter[]).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={category === value}
                onClick={() => update({ category: value })}
                className={`min-h-9 rounded-full px-3.5 text-sm font-medium transition-colors ${
                  category === value
                    ? "bg-maroon-700 text-paper"
                    : "border border-line text-ink-800 hover:border-ink-900 hover:text-ink-900"
                }`}
              >
                {value === "all" ? "All" : categoryLabels[value]}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 sm:ms-auto">
            <label htmlFor="sort" className="text-xs font-semibold uppercase tracking-wider text-muted">
              Sort
            </label>
            <select
              id="sort"
              value={sort}
              onChange={(event) => update({ sort: event.target.value })}
              className="field h-9 w-auto py-0 text-sm"
            >
              {(Object.keys(sortLabels) as SortKey[]).map((key) => (
                <option key={key} value={key}>
                  {sortLabels[key]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Result count and a way out of a filter that matched nothing. */}
        <div className="flex items-center justify-between gap-4 py-5">
          <p className="text-sm text-muted" role="status">
            {library.loading
              ? "Loading…"
              : `${visible.length} ${visible.length === 1 ? "book" : "books"}${
                  filtering ? " match your filters" : ""
                }`}
          </p>
          {filtering && (
            <button
              type="button"
              onClick={() => setParams(new URLSearchParams(), { replace: true })}
              className="inline-flex min-h-9 items-center gap-1.5 text-sm font-semibold text-maroon-700 hover:text-maroon-800"
            >
              <X aria-hidden="true" className="size-4" />
              Clear filters
            </button>
          )}
        </div>

        {library.loading && <Loading label="Loading the library" />}
        {library.error && <ErrorNote message={library.error} onRetry={library.reload} />}
        {library.data && visible.length === 0 && (
          <EmptyNote title="No books match that">
            Try a different word, or clear the filters to see everything.
          </EmptyNote>
        )}
        {visible.length > 0 && <BookGrid books={visible} />}
      </div>
    </>
  );
}
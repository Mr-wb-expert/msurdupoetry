import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, Feather, Film, Plus } from "lucide-react";

import { ErrorNote } from "@/components/Feedback.tsx";
import { useApi } from "@/lib/useApi.ts";
import { getBooks, getPoems, getVideos } from "@/lib/api.ts";
import { categoryLabels } from "@/lib/types.ts";

const PREVIEW = 5;

// Never let a missing timestamp white-screen the panel.
const formatDate = (iso?: string) => {
  if (!iso) return "";
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? iso.slice(0, 10) : parsed.toLocaleDateString();
};

export default function AdminDashboard() {
  const books = useApi(getBooks);
  const poems = useApi(getPoems);
  const videos = useApi(getVideos);

  const bookList = books.data ?? [];
  // Books carry no timestamp — the API's own sortOrder is their order. Poems do.
  const poemList = [...(poems.data ?? [])].sort((a, b) =>
    (b.createdAt ?? "").localeCompare(a.createdAt ?? ""),
  );

  const stats = [
    { to: "/admin/books", label: "Books", value: bookList.length, icon: BookOpen, loading: books.loading },
    { to: "/admin/poems", label: "Verses", value: poemList.length, icon: Feather, loading: poems.loading },
    { to: "/admin/videos", label: "Videos", value: (videos.data ?? []).length, icon: Film, loading: videos.loading },
  ];

  const failed = [books, poems, videos].find((state) => state.error);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl">Dashboard</h1>
          <p className="mt-2 text-sm text-muted">
            Everything on the public site comes from these lists.
          </p>
        </div>
        {/* One horizontal row on phones: equal thirds, icons/padding trimmed
            so the nowrap labels fit; back to the plain right-aligned row at sm. */}
        <div className="grid grid-cols-3 gap-2 sm:flex sm:justify-end sm:gap-3">
          <Link to="/admin/books/new" className="btn btn-primary px-2 sm:px-5">
            <Plus aria-hidden="true" className="hidden size-4 sm:block" />
            New book
          </Link>
          <Link to="/admin/poems/new" className="btn btn-secondary px-2 sm:px-5">
            <Plus aria-hidden="true" className="hidden size-4 sm:block" />
            New verse
          </Link>
          <Link to="/" className="btn btn-secondary px-2 sm:px-5">
            <ArrowRight aria-hidden="true" className="hidden size-4 sm:block" />
            View site
          </Link>
        </div>
      </div>

      {failed?.error && (
        <div className="mt-6">
          <ErrorNote message={failed.error} onRetry={failed.reload} />
        </div>
      )}

      <ul className="mt-8 grid gap-5 sm:grid-cols-3">
        {stats.map((stat) => (
          <li key={stat.to}>
            <Link
              to={stat.to}
              className="lift flex items-center justify-between rounded-sm border border-line bg-paper p-6"
            >
              <div>
                <p className="text-4xl font-semibold">{stat.loading ? "—" : stat.value}</p>
                <p className="mt-1 text-sm text-muted">{stat.label}</p>
              </div>
              <stat.icon aria-hidden="true" className="size-6 text-marigold-600" />
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <Panel title="In the library" to="/admin/books" count={bookList.length}>
          {books.loading && <p className="text-sm text-muted">Loading…</p>}
          {bookList.length === 0 && !books.loading && (
            <p className="text-sm text-muted">No books yet.</p>
          )}
          <ul className="divide-y divide-line">
            {bookList.slice(0, PREVIEW).map((book) => (
              <li key={book.slug}>
                <Link
                  to={`/admin/books/${book.slug}`}
                  className="flex items-center justify-between gap-3 py-2.5 hover:text-maroon-700"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{book.title}</span>
                    <span className="text-xs text-muted">{categoryLabels[book.category]}</span>
                  </span>
                  <ArrowRight aria-hidden="true" className="size-4 shrink-0 text-muted" />
                </Link>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Latest verses" to="/admin/poems" count={poemList.length}>
          {poems.loading && <p className="text-sm text-muted">Loading…</p>}
          {poemList.length === 0 && !poems.loading && (
            <p className="text-sm text-muted">No verses yet.</p>
          )}
          <ul className="divide-y divide-line">
            {poemList.slice(0, PREVIEW).map((poem) => (
              <li key={poem.slug}>
                <Link
                  to={`/admin/poems/${poem.slug}`}
                  className="flex items-center justify-between gap-3 py-2.5 hover:text-maroon-700"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{poem.title}</span>
                    <span className="text-xs text-muted">{formatDate(poem.createdAt)}</span>
                  </span>
                  <ArrowRight aria-hidden="true" className="size-4 shrink-0 text-muted" />
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}

/** One bordered panel with a heading and a count. */
function Panel({
  title,
  to,
  count,
  children,
}: {
  title: string;
  to: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section className="lift rounded-sm border border-line bg-paper p-5 shadow-cover">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-marigold-700">
          {title}
        </h2>
        <Link to={to} className="text-sm font-semibold text-maroon-700 hover:text-maroon-800">
          View all ({count}) →
        </Link>
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

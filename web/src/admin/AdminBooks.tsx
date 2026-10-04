import { Link } from "react-router-dom";
import { Plus } from "lucide-react";

import { EmptyNote, ErrorNote, Loading } from "@/components/Feedback.tsx";
import ConfirmButton from "./ConfirmButton.tsx";
import { deleteBook } from "@/lib/api.ts";
import { useApi } from "@/lib/useApi.ts";
import { getBooks } from "@/lib/api.ts";
import { categoryLabels, type Book } from "@/lib/types";

export default function AdminBooks() {
  const books = useApi(getBooks);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl">Books</h1>
          <p className="mt-2 text-sm text-muted">
            Order is the display order on the homepage. Slugs are already public URLs — changing one
            breaks the old link.
          </p>
        </div>
        <Link to="/admin/books/new" className="btn btn-primary">
          <Plus aria-hidden="true" className="size-4" />
          New book
        </Link>
      </div>

      {books.loading && <Loading label="Loading books" />}
      {books.error && <ErrorNote message={books.error} onRetry={books.reload} />}
      {books.data && books.data.length === 0 && (
        <div className="mt-8">
          <EmptyNote title="No books yet">Add the first one to fill the library.</EmptyNote>
        </div>
      )}

      {books.data && books.data.length > 0 && (
        <div className="mt-8 space-y-3">
          {books.data.map((book: Book) => (
            <div key={book.slug} className="lift rounded-sm border border-line bg-paper p-4 shadow-cover">
              <div className="flex flex-wrap items-start gap-4">
                <div className="w-16 shrink-0 overflow-hidden rounded-sm">
                  {book.coverImage ? (
                    <img
                      src={book.coverImage}
                      alt=""
                      width={64}
                      height={85}
                      className="aspect-[3/4] w-full object-cover"
                    />
                  ) : (
                    <div className="grid aspect-[3/4] w-full place-items-center bg-ink-800 text-[0.55rem] font-semibold text-paper/70">
                      No cover
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-marigold-700">
                    {categoryLabels[book.category]}
                  </p>
                  <h2 className="mt-1 text-base font-semibold">{book.title}</h2>
                  <p className="mt-1 text-sm text-muted">
                    {book.author || "No author set"} · {book.publishedYear ?? "No year"} · order{" "}
                    {book.sortOrder}
                  </p>
                  <p className="mt-1 break-all font-mono text-xs text-muted">/books/{book.slug}</p>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <Link
                    to={`/admin/books/${book.slug}`}
                    className="inline-flex min-h-11 items-center rounded-sm px-3 text-sm font-medium text-ink-800 hover:bg-cream-100"
                  >
                    Edit
                  </Link>
                  <ConfirmButton
                    label="Delete"
                    confirmLabel="Delete permanently"
                    question={`Delete “${book.title}”? Its reviews go with it, and the public page stops working.`}
                    onConfirm={async () => {
                      await deleteBook(book.slug);
                      books.reload();
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
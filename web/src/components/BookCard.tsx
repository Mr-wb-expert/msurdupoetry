import { Link } from "react-router-dom";
import { Download } from "lucide-react";

import BookCover from "./BookCover.tsx";
import { downloadUrl } from "@/lib/books";
import { categoryLabels, type Book } from "@/lib/types";

/**
 * One product card in the catalogue grid.
 *
 * The store card a reader expects — cover, title, author, category, and a
 * free-download action — with no price and no cart, because nothing here is
 * for sale.
 */
export default function BookCard({ book }: { book: Book }) {
  return (
    <article className="lift group flex h-full flex-col rounded-sm border border-line bg-paper p-4 shadow-cover">
      <Link
        to={`/books/${book.slug}`}
        className="block overflow-hidden rounded-sm bg-cream-100 shadow-cover"
      >
        {book.coverImage ? (
          <img
            src={book.coverImage}
            alt={`Cover of ${book.title}`}
            loading="lazy"
            width={300}
            height={400}
            className="aspect-[3/4] w-full object-cover"
          />
        ) : (
          <BookCover book={book} />
        )}
      </Link>

      <div className="mt-3 flex flex-1 flex-col">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-marigold-700">
          {categoryLabels[book.category]}
          {book.publishedYear && ` · ${book.publishedYear}`}
        </p>

        {/* A fixed two-line slot keeps titles on a shared baseline: a
            one-line title does not pull its author up past its neighbours. */}
        <h3 className="mt-1.5 min-h-[2.75em] line-clamp-2 text-base font-semibold leading-snug">
          <Link to={`/books/${book.slug}`} className="hover:text-maroon-700">
            {book.title}
          </Link>
        </h3>

        {/* One reserved line even when a book has no author, so the rows below
            it start at the same height on every card. */}
        <p className="mt-1 min-h-4 text-xs text-muted">{book.author}</p>

        {book.pdfUrl && (
          <a
            href={downloadUrl(book)}
            target="_blank"
            rel="noreferrer"
            // mt-auto pins the action to the card floor, so links line up
            // across a row even when titles wrap to different heights.
            className="mt-auto inline-flex min-h-11 items-center gap-1.5 self-start pt-3 text-sm font-semibold text-maroon-700 hover:text-maroon-800"
          >
            <Download aria-hidden="true" className="size-4" />
            Free PDF
            <span className="sr-only">of {book.title}</span>
          </a>
        )}
      </div>
    </article>
  );
}
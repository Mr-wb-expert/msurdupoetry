import { categoryLabels, type Book } from "@/lib/types";

/**
 * The typographic cover.
 *
 * Used when a book has no artwork yet. It is a designed object rather than a
 * grey placeholder box: a shelf of books should look like a shelf of books
 * even before the scans arrive.
 */
export default function BookCover({ book, className = "" }: { book: Book; className?: string }) {
  return (
    <div
      className={`relative flex aspect-[3/4] w-full flex-col justify-between overflow-hidden rounded-sm p-4 text-paper ${className}`}
      style={{
        // Two dark tones per category, so a grid of covers reads as a set of
        // distinct spines rather than one repeated card.
        background:
          book.category === "poetry"
            ? "linear-gradient(150deg, #6f1a26, #2b0d12)"
            : book.category === "criticism"
              ? "linear-gradient(150deg, #0b524f, #06211f)"
              : book.category === "essays"
                ? "linear-gradient(150deg, #423f38, #1b1a17)"
                : book.category === "research"
                  ? "linear-gradient(150deg, #2c4d7e, #101f38)"
                  : "linear-gradient(150deg, #5d584c, #241f18)",
      }}
    >
      <span aria-hidden="true" className="absolute inset-y-0 start-2 w-px bg-white/15" />

      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
        {categoryLabels[book.category]}
      </p>

      <div>
        <p className="text-balance text-sm font-semibold leading-snug">{book.title}</p>
        {book.author && <p className="mt-1.5 text-xs text-white/70">{book.author}</p>}
      </div>
    </div>
  );
}
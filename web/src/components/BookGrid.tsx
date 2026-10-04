import BookCard from "./BookCard.tsx";
import type { Book } from "@/lib/types";

/**
 * The catalogue grid. Fixed column counts rather than auto-fill, so a cover
 * never lands at a width that crops its title.
 */
export default function BookGrid({ books }: { books: Book[] }) {
  return (
    <ul className="grid grid-cols-2 gap-x-5 gap-y-9 sm:grid-cols-3 lg:grid-cols-4">
      {books.map((book) => (
        <li key={book.slug}>
          <BookCard book={book} />
        </li>
      ))}
    </ul>
  );
}
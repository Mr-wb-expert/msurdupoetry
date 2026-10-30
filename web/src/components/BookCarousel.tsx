import BookCard from "@/components/BookCard.tsx";
import Carousel from "@/components/Carousel.tsx";
import type { Book } from "@/lib/types";

/** The home shelf: swipe-only (no timer), one book per screen on phones. */
export default function BookCarousel({ books }: { books: Book[] }) {
  return (
    <Carousel
      items={books}
      getKey={(book) => book.slug}
      label="Books"
      renderItem={(book) => (
        // Phones: the full card, sized so the cover inside it (card minus its
        // 1rem padding and border each side) matches the 19rem featured cover.
        <div className="mx-auto w-full max-sm:max-w-[calc(19rem+2rem+2px)]">
          <BookCard book={book} />
        </div>
      )}
    />
  );
}

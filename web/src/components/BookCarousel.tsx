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
        // Phones: the same width as the featured cover (19rem), centred.
        <div className="mx-auto w-full max-sm:max-w-[19rem]">
          <BookCard book={book} bareOnPhone />
        </div>
      )}
    />
  );
}

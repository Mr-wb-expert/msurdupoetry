import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, Download, Languages, Quote } from "lucide-react";

import Seo from "@/components/Seo.tsx";
import SectionHeading from "@/components/SectionHeading.tsx";
import BookCover from "@/components/BookCover.tsx";
import BookCard from "@/components/BookCard.tsx";
import CoupletCard from "@/components/CoupletCard.tsx";
import { EmptyNote, ErrorNote, Loading } from "@/components/Feedback.tsx";
import { site } from "@/lib/site";
import { useApi } from "@/lib/useApi.ts";
import { getBooks, getPoems, getReviews, getVideos } from "@/lib/api.ts";
import { fromPoem } from "@/lib/couplets";
import { youtubeId } from "@/lib/videos";
import { categoryLabels, type Book, type Review } from "@/lib/types";

export default function HomePage() {
  const library = useApi(getBooks);
  const reviews = useApi(() => getReviews(6));
  const poems = useApi(getPoems);
  const videos = useApi(getVideos);

  const books = library.data ?? [];
  const verseCount = poems.data?.length ?? 0;

  // Three random verses per visit: reshuffled on the next page load, stable
  // while the visitor stays (Fisher-Yates, then the first three).
  const poetryPreview = useMemo(() => {
    const pool = (poems.data ?? []).map(fromPoem);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const a = pool[i]!;
      pool[i] = pool[j]!;
      pool[j] = a;
    }
    return pool.slice(0, 3);
  }, [poems.data]);
  // Newest first, so a book just added in the admin becomes the featured one
  // (the section under the hero) without anyone touching the sort order.
  const recent = [...books].sort((a, b) =>
    (b.createdAt ?? "").localeCompare(a.createdAt ?? ""),
  );
  const featured: Book | undefined = recent[0];
  // The shelf shows at most three, always a single row. "See all" takes the
  // reader to the full catalogue, which is where the rest live.
  const shelf = recent.slice(0, 3);

  // The newest video with a usable link. The section under the verses stays
  // hidden when there is none — the home page shows no empty state.
  const latestVideo = (videos.data ?? []).flatMap((video) => {
    const id = youtubeId(video.url);
    return id ? [{ ...video, id }] : [];
  })[0];

  // Same catalogue facts as the detail page, so the two views agree.
  const featuredFacts = featured
    ? ([
        { label: "Author", value: featured.author },
        { label: "Category", value: categoryLabels[featured.category] },
        featured.publishedYear && {
          label: "Published",
          value: String(featured.publishedYear),
        },
        featured.pages && { label: "Pages", value: String(featured.pages) },
        featured.publication && { label: "Publication", value: featured.publication },
        { label: "Price", value: "Free" },
      ].filter(Boolean) as { label: string; value: string }[])
    : [];

  const [openReview, setOpenReview] = useState<Review | null>(null);

  return (
    <>
      {/* Titles/descriptions mirror api/seo.py — change both, or the
          pre-hydration head and the settled one disagree. */}
      <Seo
        title="Urdu Poetry & Shayari, Free Books Online"
        description="Read the Urdu poetry of Mujahid Sajjad, Urdu poet and Associate Professor at Govt. Graduate College Burewala. Free ghazals, nazms and books online."
        jsonLd={{
          "@context": "https://schema.org",
          // Person lives in index.html — repeating it here would put two
          // Person nodes in the document after hydration.
          "@graph": [
            {
              "@type": "WebSite",
              name: site.author,
              description: site.description,
              inLanguage: ["ur", "en"],
            },
          ],
        }}
      />

      {/* Hero: the author and the promise of the site, side by side. */}
      <section className="border-b border-line bg-cream-50">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:py-24">
          <div className="flex flex-col items-center text-center lg:items-start lg:text-start">
            <p className="eyebrow">Books, free to read</p>
            <h1 className="mt-4 text-5xl leading-[1.05] sm:text-6xl">
              Urdu Poetry &amp; Shayari by Syed Mujahid Sajjad
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted">{site.description}</p>

            <div className="mt-8 flex flex-wrap justify-center gap-3 lg:justify-start">
              <Link to="/books" className="btn btn-primary">
                Browse the library
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
              {featured && (
                <Link to={`/books/${featured.slug}`} className="btn btn-secondary">
                  <BookOpen aria-hidden="true" className="size-4" />
                  Read the latest
                </Link>
              )}
            </div>

            <dl className="mt-10 flex flex-wrap justify-center gap-x-10 gap-y-4 border-t border-line pt-6 lg:justify-start">
              <div>
                <dt className="text-xs uppercase tracking-wider text-muted">Books</dt>
                <dd className="text-lg font-semibold">
                  {books.length ? `${books.length} · Free Access` : "Free Access"}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-muted">Verses</dt>
                <dd className="text-lg font-semibold">
                  {verseCount ? `${verseCount} · Free to read` : "Free to read"}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-muted">Reading</dt>
                <dd className="text-lg font-semibold">Online + Download</dd>
              </div>
            </dl>
          </div>

          <figure className="mx-auto w-full max-w-sm">
            <img
              src={site.portrait}
              alt={`${site.fullName}, ${site.title}`}
              width={640}
              height={800}
              fetchPriority="high"
              decoding="async"
              className="aspect-[4/5] w-full rounded-sm object-cover shadow-cover"
            />
            <figcaption className="mt-3 text-center">
              <span className="block text-sm font-semibold">{site.fullName}</span>
              <span className="block text-xs text-muted">{site.title}</span>
            </figcaption>
          </figure>
        </div>
      </section>

      {/* How the library works: three promises the site keeps. */}
      <section className="border-b border-line">
        <ul className="mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:px-6 sm:grid-cols-3">
          {[
            {
              icon: BookOpen,
              title: "Read online",
              text: "Open the full book in the browser no download needed.",
            },
            {
              icon: Download,
              title: "Download free",
              text: "Every book as a PDF. No account, no payment.",
            },
            {
              icon: Languages,
              title: "The Art of Nastaliq",
              text: "Experience original Urdu verse crafted in traditional Nastaliq script, untamed and untranslated.",
            },
          ].map((entry) => (
            <li
              key={entry.title}
              className="lift rounded-sm border border-line border-t-2 border-t-marigold-500 bg-paper p-5 shadow-cover"
            >
              <span className="grid size-10 place-items-center rounded-full bg-maroon-700/10 text-maroon-700">
                <entry.icon aria-hidden="true" className="size-5" />
              </span>
              <p className="mt-3.5 text-base font-semibold">{entry.title}</p>
              <p className="mt-1.5 text-sm text-muted">{entry.text}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Featured book, laid out like its own detail page: cover and actions
          on the left, catalogue facts on the right. */}
      {library.loading && <Loading label="Loading the library" />}
      {featured && (
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
          <div className="grid gap-10 lg:grid-cols-[300px_1fr]">
            <div>
              <Link
                to={`/books/${featured.slug}`}
                className="lift relative block overflow-hidden rounded-sm shadow-cover"
              >
                <span className="absolute start-0 top-3 z-10 bg-maroon-700 px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-paper shadow-sm">
                  Recent Published
                </span>
                {featured.coverImage ? (
                  <img
                    src={featured.coverImage}
                    alt={`Cover of ${featured.title}`}
                    width={300}
                    height={400}
                    className="aspect-[3/4] w-full object-cover"
                  />
                ) : (
                  <BookCover book={featured} />
                )}
              </Link>

              <div className="mt-5 space-y-2">
                <Link to={`/books/${featured.slug}`} className="btn btn-primary w-full">
                  <BookOpen aria-hidden="true" className="size-4" />
                  Read online
                </Link>
              </div>
            </div>

            <div>
              <div className="text-center sm:text-start">
                <p className="eyebrow">{categoryLabels[featured.category]}</p>
                <h2 className="mt-3 text-3xl sm:text-4xl">{featured.title}</h2>
                {featured.author && <p className="mt-2 text-muted">{featured.author}</p>}
              </div>

              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-800">
                {featured.description}
              </p>

              <dl className="mt-9 grid gap-x-8 gap-y-4 border-t border-line pt-6 sm:grid-cols-2">
                {featuredFacts.map((fact) => (
                  <div key={fact.label} className="flex justify-between gap-4 border-b border-line pb-2">
                    <dt className="text-sm text-muted">{fact.label}</dt>
                    <dd className="text-sm font-semibold">{fact.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>
      )}

      {/* The shelf: three books, one tidy row, with the full catalogue a click
          away. Hidden when there is only the featured book, which would just
          repeat it directly below itself. */}
      {books.length > 1 && (
        <section className="border-t border-line bg-cream-50">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
            <SectionHeading
              size="lg"
              eyebrow="The library"
              title="Books"
              lead="Explore the literary works of Mujahid Sajjad."
              action={
                <Link
                  to="/books"
                  className="text-sm font-semibold text-maroon-700 hover:text-maroon-800"
                >
                  See all →
                </Link>
              }
            />
            <ul className="mt-8 grid grid-cols-1 gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
              {shelf.map((book) => (
                <li key={book.slug}>
                  <BookCard book={book} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Verses preview — three from the collection. */}
      {verseCount > 0 && (
        <section className="border-t border-line">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
            <SectionHeading
              eyebrow="From his own words"
              title="Verses"
              lead="Couplets from the collection, free to read and share."
              action={
                <Link to="/poems" className="text-sm font-semibold text-maroon-700 hover:text-maroon-800">
                  Read more →
                </Link>
              }
            />
            <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {poetryPreview.map((couplet) => (
                <li key={couplet.id} className="flex">
                  <CoupletCard couplet={couplet} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* The newest video, when there is one. */}
      {latestVideo && (
        <section className="border-t border-line bg-cream-50">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
            <SectionHeading
              eyebrow="Watch"
              title="Latest video"
              action={
                <Link
                  to="/videos"
                  className="text-sm font-semibold text-maroon-700 hover:text-maroon-800"
                >
                  All videos →
                </Link>
              }
            />
            <figure className="mx-auto mt-8 max-w-4xl">
              <div className="aspect-video overflow-hidden rounded-sm bg-ink-950">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${latestVideo.id}`}
                  title={latestVideo.description || "YouTube video"}
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="h-full w-full"
                />
              </div>
              <figcaption className="mt-3 text-center text-sm text-muted">
                {latestVideo.description}
              </figcaption>
            </figure>
          </div>
        </section>
      )}

      {/* Reader reviews. */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
        <SectionHeading
          eyebrow="From readers"
          title="What people say"
          action={
            <Link to="/books" className="text-sm font-semibold text-maroon-700 hover:text-maroon-800">
              Read a book →
            </Link>
          }
        />

        {reviews.loading && <Loading label="Loading reviews" />}
        {reviews.error && <ErrorNote message={reviews.error} onRetry={reviews.reload} />}
        {reviews.data && reviews.data.length === 0 && (
          <div className="mt-8">
            <EmptyNote title="No reviews yet">
              Be the first — every book page has a review form.
            </EmptyNote>
          </div>
        )}

        <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {(reviews.data ?? []).map((review: Review) => {
            const isLong = (review.body || "").length > 130;
            return (
              <li
                key={review.id}
                className="lift flex flex-col justify-between rounded-sm border border-line bg-paper p-5 shadow-cover transition-colors hover:border-maroon-700/30"
              >
                <div>
                  <Quote aria-hidden="true" className="size-5 text-marigold-500" />
                  <div
                    onClick={() => isLong && setOpenReview(review)}
                    className={isLong ? "cursor-pointer group" : ""}
                    title={isLong ? "Click to read full review" : undefined}
                  >
                    <p className="mt-3 line-clamp-4 whitespace-pre-line text-sm leading-relaxed text-ink-800">
                      {review.body}
                    </p>
                    {isLong && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenReview(review);
                        }}
                        className="mt-2 text-xs font-semibold text-maroon-700 hover:underline inline-block"
                      >
                        Read more →
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-5 border-t border-line/60 pt-3">
                  <p className="text-xs font-semibold text-ink-950">{review.name}</p>
                  <Link
                    to={`/books/${review.bookSlug}`}
                    className="mt-0.5 block text-xs text-muted hover:text-maroon-700"
                  >
                    on {review.bookTitle}
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Full review modal dialog */}
      {openReview && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-ink-950/40 p-4"
          onClick={() => setOpenReview(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Review by ${openReview.name}`}
            className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-sm border border-line bg-paper p-6 shadow-cover"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div>
                <p className="text-base font-semibold text-ink-950">{openReview.name}</p>
                <Link
                  to={`/books/${openReview.bookSlug}`}
                  className="text-xs text-muted hover:text-maroon-700"
                  onClick={() => setOpenReview(null)}
                >
                  on {openReview.bookTitle}
                </Link>
              </div>
              <button
                type="button"
                onClick={() => setOpenReview(null)}
                className="text-muted hover:text-ink-900 text-lg font-bold px-2"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-ink-800">
              {openReview.body}
            </p>
            <button
              type="button"
              autoFocus
              className="btn btn-secondary mt-6 w-full"
              onClick={() => setOpenReview(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {library.error && (
        <div className="mx-auto max-w-2xl px-4 pb-16 sm:px-6">
          <ErrorNote message={library.error} onRetry={library.reload} />
        </div>
      )}
    </>
  );
}

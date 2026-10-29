import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Building2,
  CalendarDays,
  Download,
  FileText,
  Languages,
  PenLine,
  Quote,
  Tag,
  type LucideIcon,
} from "lucide-react";

import Seo from "@/components/Seo.tsx";
import FaqSection from "@/components/FaqSection.tsx";
import SectionHeading from "@/components/SectionHeading.tsx";
import BookCover from "@/components/BookCover.tsx";
import BookCarousel from "@/components/BookCarousel.tsx";
import Carousel from "@/components/Carousel.tsx";
import CoupletCard from "@/components/CoupletCard.tsx";
import { EmptyNote, ErrorNote, Loading } from "@/components/Feedback.tsx";
import { site } from "@/lib/site";
import { poetHref } from "@/lib/poets";
import { useApi } from "@/lib/useApi.ts";
import { getBooks, getPoems, getPoets, getReviews, getVideos } from "@/lib/api.ts";
import { fromPoem } from "@/lib/couplets";
import { youtubeId } from "@/lib/videos";
import { categoryLabels, type Book, type Review } from "@/lib/types";

// Mirrors HOME_LEAD and HOME_FAQ in api/seo.py, word for word: the site is
// a library of many poets, curated by Mujahid Sajjad — not his work alone.
const HOME_LEAD =
  "A free library of Urdu poetry: the ghazals, nazms and shayari of Allama Iqbal, Mirza Ghalib, Faiz Ahmed Faiz, Jaun Elia, Ahmed Faraz, Parveen Shakir and more, in Urdu text you can copy, with the books of Prof. Syed Mujahid Sajjad, who curates it.";

const HOME_FAQ = [
  {
    q: "Which Urdu poets can I read here?",
    a: "The library holds ghazals, nazms and shayari by more than 25 poets, among them Allama Iqbal, Mirza Ghalib, Mir Taqi Mir, Faiz Ahmed Faiz, Ahmed Faraz, Jaun Elia, Parveen Shakir, Nasir Kazmi and Mohsin Naqvi. Each poet has a page with a biography and their verses.",
  },
  {
    q: "Is the poetry in Urdu text I can copy?",
    a: "Yes. Every ghazal and nazm is typed Urdu text in Nastaliq, not an image, so you can copy a couplet or share it on WhatsApp straight from the page, free, with no account.",
  },
  {
    q: "Who runs this library?",
    a: "Prof. Syed Mujahid Sajjad, an Urdu poet and Associate Professor of English at Govt. Graduate College Burewala. Alongside the classic poets, the library carries his own books, poetry, criticism and essays.",
  },
  {
    q: "Can I download Urdu poetry books as PDF?",
    a: "Yes. Every book in the library is free to read online and free to download as a PDF from its own page, no sign-up and no payment.",
  },
];

// One icon per catalogue fact on the featured book.
const FACT_ICONS: Record<string, LucideIcon> = {
  Author: PenLine,
  Category: Tag,
  Published: CalendarDays,
  Pages: FileText,
  Publication: Building2,
  Price: BadgeCheck,
};

export default function HomePage() {
  const library = useApi(getBooks);
  const reviews = useApi(() => getReviews(100, true));
  const poems = useApi(getPoems);
  const videos = useApi(getVideos);

  const poets = useApi(getPoets);
  // The site owner leads, then the poets with the most verses here.
  const topPoets = useMemo(
    () =>
      [...(poets.data ?? [])]
        .sort(
          (a, b) =>
            Number(b.slug === "mujahid-sajjad") - Number(a.slug === "mujahid-sajjad") ||
            b.poemCount - a.poemCount,
        )
        .slice(0, 8),
    [poets.data],
  );

  const books = library.data ?? [];
  const verseCount = poems.data?.length ?? 0;
  const reviewsList = reviews.data ?? [];

  // Nine random verses per visit: reshuffled on the next page load, stable
  // while the visitor stays (Fisher-Yates, then the first nine).
  const poetryPreview = useMemo(() => {
    const pool = (poems.data ?? []).map(fromPoem);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const a = pool[i]!;
      pool[i] = pool[j]!;
      pool[j] = a;
    }
    return pool.slice(0, 9);
  }, [poems.data]);
  // Newest first, so a book just added in the admin becomes the featured one
  // (the section under the hero) without anyone touching the sort order.
  const recent = [...books].sort((a, b) =>
    (b.createdAt ?? "").localeCompare(a.createdAt ?? ""),
  );
  const featured: Book | undefined = recent[0];
  // The shelf is a swipeable carousel of the newest twelve. "See all" takes the
  // reader to the full catalogue, which is where the rest live.
  // Skips recent[0]: it is the featured book just above the shelf.
  const shelf = recent.slice(1, 13);

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
        title="Urdu Poetry & Shayari | Iqbal, Ghalib, Faiz, Jaun Elia | Mujahid Sajjad"
        description="Urdu poetry, shayari, ghazals and nazms of Iqbal, Ghalib, Faiz, Ahmed Faraz, Jaun Elia and Parveen Shakir in Urdu text, free to read, copy and share."
        jsonLd={{
          "@context": "https://schema.org",
          // Person lives in index.html — repeating it here would put two
          // Person nodes in the document after hydration.
          "@graph": [
            {
              "@type": "WebSite",
              name: site.author,
              description: HOME_LEAD,
              inLanguage: ["ur", "en"],
            },
            {
              "@type": "FAQPage",
              mainEntity: HOME_FAQ.map(({ q, a }) => ({
                "@type": "Question",
                name: q,
                acceptedAnswer: { "@type": "Answer", text: a },
              })),
            },
          ],
        }}
      />

      {/* Hero: the author and the promise of the site, side by side. */}
      <section className="relative overflow-hidden border-b border-line bg-cream-50">
        {/* A faint Nastaliq watermark — decoration only, so hidden from readers. */}
        <span
          aria-hidden="true"
          lang="ur"
          className="urdu-display pointer-events-none absolute -end-10 -top-6 select-none text-[11rem] leading-none text-maroon-700/[0.04] max-lg:hidden"
        >
          شاعری
        </span>
        {/* items-start, not center: centring the text against the taller
            portrait pushed the heading far below the header. */}
        <div className="relative mx-auto grid max-w-6xl items-start gap-12 px-4 pb-14 pt-12 sm:px-6 lg:grid-cols-[1.2fr_1fr] lg:pb-16 lg:pt-16">
          <div className="flex flex-col items-center text-center lg:items-start lg:text-start">
            <p className="eyebrow">Free Urdu poetry library</p>
            <div aria-hidden="true" className="rule-accent mt-3" />
            <h1 className="mt-5 text-[2rem] leading-[1.1] sm:text-5xl lg:text-6xl">
              Urdu Poetry &amp; Shayari: Ghazals, Nazms and Books
            </h1>
            <p className="mt-4">
              <span lang="ur" dir="rtl" className="urdu-display text-2xl text-maroon-700 sm:text-3xl">
                اردو شاعری کی آن لائن لائبریری
              </span>
            </p>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">{HOME_LEAD}</p>

            <div className="mt-8 flex flex-wrap justify-center gap-3 lg:justify-start">
              <Link to="/books" className="btn btn-primary">
                Browse the library
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
              <Link to="/poems" className="btn btn-secondary">
                <Quote aria-hidden="true" className="size-4" />
                Read verses
              </Link>
            </div>

            {/* Numbers first, label under: reads at a glance on a phone. */}
            <dl className="mt-10 grid w-full max-w-md grid-cols-3 divide-x divide-line border-y border-line py-5 text-center lg:text-start [&>div]:px-4 [&>div:first-child]:ps-0">
              <div className="flex flex-col-reverse">
                <dt className="mt-1 text-xs uppercase tracking-wider text-muted">Free books</dt>
                <dd className="text-2xl font-bold text-ink-950 sm:text-3xl">{books.length || "…"}</dd>
              </div>
              <div className="flex flex-col-reverse">
                <dt className="mt-1 text-xs uppercase tracking-wider text-muted">Verses</dt>
                <dd className="text-2xl font-bold text-ink-950 sm:text-3xl">
                  {verseCount ? verseCount.toLocaleString() : "…"}
                </dd>
              </div>
              <div className="flex flex-col-reverse">
                <dt className="mt-1 text-xs uppercase tracking-wider text-muted">Always free</dt>
                <dd className="text-2xl font-bold text-ink-950 sm:text-3xl">₨0</dd>
              </div>
            </dl>
          </div>

          <figure className="relative mx-auto w-full max-w-[15rem] sm:max-w-sm">
            {/* Offset frame behind the portrait, like a mounted print. */}
            <div
              aria-hidden="true"
              className="absolute inset-0 translate-x-4 translate-y-4 rounded-sm border-2 border-marigold-500/70"
            />
            <img
              src={site.portrait}
              alt={`${site.fullName}, ${site.title}`}
              width={640}
              height={800}
              fetchPriority="high"
              decoding="async"
              className="relative aspect-[4/5] w-full rounded-sm object-cover shadow-cover"
            />
            <figcaption className="relative -mt-8 ms-auto me-[-0.5rem] w-fit max-w-[85%] rounded-sm bg-maroon-700 px-4 py-3 text-paper shadow-cover sm:me-[-1.5rem]">
              <span className="block text-sm font-semibold">{site.fullName}</span>
              <span className="block text-xs text-cream-100">{site.title}</span>
            </figcaption>
          </figure>
        </div>
      </section>

      {/* How the library works: three promises the site keeps. */}
      <section className="border-b border-line bg-cream-50">
        <ul className="mx-auto grid max-w-6xl gap-5 px-4 py-10 sm:grid-cols-3 sm:px-6">
          {[
            {
              icon: BookOpen,
              title: "Read online",
              text: "Open the full book in the browser, no download needed.",
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
              className="lift flex items-start gap-4 rounded-sm border border-line border-t-2 border-t-marigold-500 bg-paper p-5 shadow-cover"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-sm bg-maroon-700 text-paper">
                <entry.icon aria-hidden="true" className="size-5" />
              </span>
              <div>
                <p className="text-base font-semibold">{entry.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted">{entry.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Verses first after the hero: the library is poetry before it is books. */}
      {verseCount > 0 && (
        <section className="border-t border-line">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:py-20">
            {/* Random picks from the whole library, so mostly other poets'
                verse — the old "From his own words" eyebrow misattributed them. */}
            <SectionHeading
              eyebrow="From the library"
              title="Urdu Ghazals & Nazms"
              lead="A few couplets picked at random on every visit, free to read and share."
              action={
                <Link to="/poems" className="text-sm font-semibold text-maroon-700 hover:text-maroon-800">
                  Read more →
                </Link>
              }
            />
            <Carousel
              items={poetryPreview}
              getKey={(couplet) => couplet.id}
              label="Verses"
              autoPlayMs={3000}
              renderItem={(couplet) => <CoupletCard couplet={couplet} />}
            />
          </div>
        </section>
      )}

      {/* Poets: every hub one tap from the home page, the site owner first. */}
      {topPoets.length > 0 && (
        <section className="border-t border-line bg-maroon-700 text-paper">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:py-20">
            <div className="flex flex-wrap items-end justify-between gap-4 text-center max-sm:justify-center sm:text-start">
              <div className="w-full max-w-2xl sm:w-auto">
                <p className="eyebrow eyebrow-light">The poets</p>
                <h2 className="mt-3 text-2xl text-paper sm:text-3xl">Read by poet</h2>
                <p className="mt-3 text-cream-100">
                  Ghazals and nazms of the masters of Urdu poetry, each with a biography.
                </p>
              </div>
              <Link to="/poets" className="text-sm font-semibold text-marigold-300 hover:text-paper">
                All poets →
              </Link>
            </div>
            <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {topPoets.map((poet) => (
                <li key={poet.slug}>
                  <Link
                    to={`/poets/${poet.slug}`}
                    className="flex h-full flex-col rounded-sm border border-paper/15 bg-paper/5 p-4 transition-colors hover:border-marigold-300 hover:bg-paper/10"
                  >
                    <span lang="ur" dir="rtl" className="urdu-display text-xl text-paper">
                      {poet.urdu}
                    </span>
                    <span className="mt-2 text-sm font-semibold">{poet.name}</span>
                    <span className="mt-0.5 text-xs text-cream-200">
                      {poet.slug === "mujahid-sajjad"
                        ? "Books & biography"
                        : `${poet.poemCount} verses`}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Featured book, laid out like its own detail page: cover and actions
          on the left, catalogue facts on the right. */}
      {library.loading && <Loading label="Loading the library" />}
      {featured && (
        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:py-20">
          <div className="grid items-start gap-10 lg:grid-cols-[300px_1fr] lg:gap-16">
            <div className="mx-auto w-full max-w-[19rem] sm:max-w-[18rem] lg:max-w-none">
              <div className="relative">
                {/* Offset frame behind the cover, like the book page. */}
                <div
                  aria-hidden="true"
                  className="absolute inset-0 translate-x-3 translate-y-3 rounded-sm border-2 border-marigold-500/70"
                />
                <Link
                  to={`/books/${featured.slug}`}
                  className="lift relative block overflow-hidden rounded-sm shadow-cover"
                >
                  {/* The tag lives on the cover itself, like a sticker on the book. */}
                  <span className="absolute start-0 top-3 z-10 bg-maroon-700 px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-paper shadow-sm">
                    Newest book
                  </span>
                  {featured.coverImage ? (
                    <img
                      src={featured.coverImage}
                      alt={`Cover of ${featured.title}`}
                      width={380}
                      height={507}
                      className="aspect-[3/4] w-full object-cover"
                    />
                  ) : (
                    <BookCover book={featured} />
                  )}
                </Link>
              </div>

              <Link to={`/books/${featured.slug}`} className="btn btn-primary mt-8 w-full">
                <BookOpen aria-hidden="true" className="size-4" />
                Read online
              </Link>
            </div>

            <div>
              <div className="text-center sm:text-start">
                <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
                  <span className="rounded-full border border-line bg-cream-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-marigold-700">
                    {categoryLabels[featured.category]}
                  </span>
                </div>
                <h2 className="mt-4 text-3xl sm:text-4xl">{featured.title}</h2>
                {featured.author && (
                  <p className="mt-2 text-muted">
                    by{" "}
                    {poetHref(featured.author) ? (
                      <Link
                        to={poetHref(featured.author)!}
                        className="font-semibold text-maroon-700 hover:underline"
                      >
                        {featured.author}
                      </Link>
                    ) : (
                      <span className="font-semibold text-ink-800">{featured.author}</span>
                    )}
                  </p>
                )}
              </div>

              {/* Four lines on phones, then a way to the full text; the whole
                  description from sm: up. */}
              <p className="mt-6 line-clamp-4 max-w-2xl text-base leading-relaxed text-ink-800 sm:line-clamp-none sm:text-lg">
                {featured.description}
              </p>
              <Link
                to={`/books/${featured.slug}`}
                className="mt-2 inline-block text-sm font-semibold text-maroon-700 hover:underline sm:hidden"
              >
                Continue reading →
              </Link>

              <dl className="mt-8 grid max-w-2xl grid-cols-2 gap-3">
                {featuredFacts.map((fact) => {
                  const Icon = FACT_ICONS[fact.label] ?? BookOpen;
                  return (
                    <div
                      key={fact.label}
                      className="flex items-start gap-3 rounded-sm border border-line bg-cream-50 p-4"
                    >
                      <Icon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-marigold-700" />
                      <div className="min-w-0">
                        <dt className="text-xs uppercase tracking-wider text-muted">{fact.label}</dt>
                        <dd className="mt-0.5 break-words text-sm font-semibold text-ink-900">
                          {fact.value}
                        </dd>
                      </div>
                    </div>
                  );
                })}
              </dl>
            </div>
          </div>
        </section>
      )}

      {/* The shelf: a swipeable row (one book per screen on phones), with the
          full catalogue a click away. Hidden when there is only the featured book, which would just
          repeat it directly below itself. */}
      {books.length > 1 && (
        <section className="border-t border-line bg-cream-50">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:py-20">
            <SectionHeading
              size="lg"
              eyebrow="The library"
              title="Books"
              lead="Poetry, criticism and essays, free to read online and to download as PDF."
              action={
                <Link
                  to="/books"
                  className="text-sm font-semibold text-maroon-700 hover:text-maroon-800"
                >
                  See all →
                </Link>
              }
            />
            <BookCarousel books={shelf} />
          </div>
        </section>
      )}

      {/* The newest video, when there is one. */}
      {latestVideo && (
        <section className="border-t border-line">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:py-20">
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
      <section className="border-t border-line bg-cream-50">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:py-20">
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
              Be the first: every book page has a review form.
            </EmptyNote>
          </div>
        )}

        {reviewsList.length > 0 && (
          <Carousel
            items={reviewsList}
            getKey={(review) => review.id}
            label="Reader reviews"
            autoPlayMs={3000}
            renderItem={(review) => {
              const isLong = (review.body || "").length > 130;
              return (
                <article className="lift relative flex w-full flex-col overflow-hidden rounded-sm border border-line border-t-2 border-t-marigold-500 bg-paper p-6 shadow-cover">
                  {/* A large faint quote mark: decoration, hidden from readers. */}
                  <Quote
                    aria-hidden="true"
                    className="pointer-events-none absolute -end-2 -top-2 size-20 rotate-180 text-maroon-700/[0.06]"
                  />
                  <Quote aria-hidden="true" className="size-6 fill-current text-marigold-500" />

                  {/* dir="auto": a review written in Urdu reads right to left,
                      an English one left to right, from its own first letter. */}
                  <blockquote className="relative mt-3 flex-1">
                    <p
                      dir="auto"
                      className="line-clamp-5 whitespace-pre-line text-start text-[0.95rem] leading-[2] text-ink-800"
                    >
                      {review.body}
                    </p>
                    {isLong && (
                      <button
                        type="button"
                        onClick={() => setOpenReview(review)}
                        className="mt-2 text-xs font-semibold text-maroon-700 hover:underline"
                      >
                        Read full review →
                      </button>
                    )}
                  </blockquote>

                  <footer className="relative mt-5 flex items-center gap-3 border-t border-line pt-4">
                    <span
                      aria-hidden="true"
                      className="grid size-10 shrink-0 place-items-center rounded-full bg-maroon-700 text-sm font-bold uppercase text-paper"
                    >
                      {review.name.trim().charAt(0) || "?"}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink-950">{review.name}</p>
                      <Link
                        to={`/books/${review.bookSlug}`}
                        className="mt-0.5 flex items-center gap-1 text-xs text-muted hover:text-maroon-700"
                      >
                        <BookOpen aria-hidden="true" className="size-3.5 shrink-0" />
                        <span className="truncate">on {review.bookTitle}</span>
                      </Link>
                    </div>
                  </footer>
                </article>
              );
            }}
          />
        )}
      </div>
      </section>

      {/* What the library is, as questions — mirrored in api/seo.py (HOME_FAQ)
          and in this page's FAQPage schema. */}
      <FaqSection
        faqs={HOME_FAQ}
        title="Questions about the library"
        className="border-t border-line"
      />

      {/* Closing call to action: the last thing before the footer, so a
          reader who scrolled this far gets one clear next step. */}
      <section className="px-4 pb-16 pt-4 sm:px-6 lg:pb-20">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-sm bg-maroon-700 px-6 py-12 text-center text-paper shadow-cover sm:px-12 lg:py-16">
          <span
            aria-hidden="true"
            lang="ur"
            className="urdu-display pointer-events-none absolute -bottom-10 -start-6 select-none text-[9rem] leading-none text-paper/[0.06] max-sm:hidden"
          >
            غزل
          </span>
          <span
            aria-hidden="true"
            lang="ur"
            className="urdu-display pointer-events-none absolute -end-6 -top-10 select-none text-[9rem] leading-none text-paper/[0.06] max-sm:hidden"
          >
            نظم
          </span>
          <div className="relative">
            <p className="eyebrow eyebrow-light">Start reading</p>
            <h2 className="mx-auto mt-3 max-w-2xl text-3xl text-paper sm:text-4xl">
              Find your next favourite sher
            </h2>
            <p className="mt-3">
              <span lang="ur" dir="rtl" className="urdu-display text-xl text-marigold-300">
                اردو شاعری، مفت اور ہمیشہ کے لیے
              </span>
            </p>
            <p className="mx-auto mt-4 max-w-xl text-cream-100">
              {verseCount ? `${verseCount.toLocaleString()} ghazals and nazms` : "Ghazals and nazms"} by
              the great Urdu poets, and every book free to read and download. No sign-up, no payment.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link to="/poems" className="btn bg-paper text-maroon-700 hover:bg-cream-100">
                <Quote aria-hidden="true" className="size-4" />
                Read verses
              </Link>
              <Link to="/poets" className="btn border border-cream-300 text-paper hover:bg-maroon-800">
                Browse poets
              </Link>
              <Link to="/books" className="btn border border-cream-300 text-paper hover:bg-maroon-800">
                <Download aria-hidden="true" className="size-4" />
                Free books
              </Link>
            </div>
          </div>
        </div>
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
            <p className="mt-4 py-1 whitespace-pre-line text-sm leading-[2.2] text-ink-800">
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

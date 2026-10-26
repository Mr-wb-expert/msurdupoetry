import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { BookOpen, Download } from "lucide-react";

import Seo from "@/components/Seo.tsx";
import SectionHeading from "@/components/SectionHeading.tsx";
import BookCard from "@/components/BookCard.tsx";
import BookCover from "@/components/BookCover.tsx";
import PdfReader from "@/components/PdfReader.tsx";
import ReviewForm from "@/components/ReviewForm.tsx";
import ReviewList from "@/components/ReviewList.tsx";
import { Loading } from "@/components/Feedback.tsx";
import NotFoundPage from "./NotFoundPage.tsx";
import { downloadUrl, embedUrl, externalReadUrl, relatedBooks } from "@/lib/books";
import { formatDate, isoDate } from "@/lib/dates";
import { site } from "@/lib/site";
import { useApi } from "@/lib/useApi.ts";
import { getBook, getBooks, getReviewsForBook } from "@/lib/api.ts";
import { BOOK_KIND, categoryLabels } from "@/lib/types";

export default function BookPage() {
  const { slug = "" } = useParams();
  const book = useApi(() => getBook(slug), [slug]);
  const library = useApi(getBooks);
  const reviews = useApi(() => getReviewsForBook(slug, true), [slug]);
  const [reading, setReading] = useState(false);

  if (book.error) return <NotFoundPage />;
  if (book.loading || !book.data) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
        <Loading label="Loading book details" />
      </div>
    );
  }

  const item = book.data;
  const related = relatedBooks(item, library.data ?? []);
  // Last admin edit. The visible Last updated row and the schema's
  // dateModified both read it — published year only tells a reader when a
  // book came out, not whether this page's text is current.
  const modified = item.updatedAt ?? item.createdAt;

  const facts = [
    { label: "Author", value: item.author },
    { label: "Category", value: categoryLabels[item.category] },
    item.publishedYear && { label: "Published", value: String(item.publishedYear) },
    item.pages && { label: "Pages", value: String(item.pages) },
    item.publication && { label: "Publication", value: item.publication },
    { label: "Price", value: "Free" },
    modified && { label: "Last updated", value: formatDate(modified) },
  ].filter(Boolean) as { label: string; value: string }[];

  // Mirrors book_faq() in api/seo.py — the FAQPage schema below and these
  // visible questions must be the same words, question for question.
  const faq = [
    {
      q: `Is ${item.title} free?`,
      a: `Yes. ${item.title} is free to read in the browser on this page and free to download as a PDF — there is no account, no subscription and no payment at any point. The Read online and Download buttons at the top of the page open it.`,
    },
    {
      q: `Who wrote ${item.title}?`,
      a: `${item.author || site.fullName} wrote ${item.title}${item.publishedYear ? `, published in ${item.publishedYear}` : ""}. It sits in this site's free digital library of Urdu poetry, criticism and essays — read it online or download the PDF, no account needed.`,
    },
    {
      q: `What is ${item.title} about?`,
      a:
        item.description.trim() ||
        `${item.title} by ${item.author || site.fullName} — free to read online on this page and to download as a PDF.`,
    },
  ];

  return (
    <>
      {/* Title pattern mirrored in api/seo.py. */}
      <Seo
        title={`${item.title} — ${BOOK_KIND[item.category]}`}
        description={
          item.description.trim().slice(0, 300) ||
          `Read ${item.title} by ${site.fullName} — free online and as a PDF.`
        }
        image={item.coverImage}
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "Book",
            name: item.title,
            author: { "@type": "Person", name: item.author || site.fullName },
            inLanguage: ["ur", "en"],
            bookFormat: "https://schema.org/Pdf",
            isAccessibleForFree: true,
            ...(item.coverImage && { image: item.coverImage }),
            ...(item.publishedYear && { datePublished: String(item.publishedYear) }),
            ...(modified && { dateModified: isoDate(modified) }),
            ...(item.pages && { numberOfPages: item.pages }),
            offers: { "@type": "Offer", price: "0", priceCurrency: "PKR" },
          },
          // The same three questions the page answers in visible text — see
          // the FAQ section below; api/seo.py emits the same node for
          // crawlers that skip JavaScript.
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faq.map((entry) => ({
              "@type": "Question",
              name: entry.q,
              acceptedAnswer: { "@type": "Answer", text: entry.a },
            })),
          },
          // Mirrors the breadcrumb under it, which is what turns the trail
          // into a rich result instead of plain blue links.
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: "Books",
                item: `${window.location.origin}/books`,
              },
              {
                "@type": "ListItem",
                position: 2,
                name: item.title,
                item: `${window.location.origin}/books/${item.slug}`,
              },
            ],
          },
        ]}
      />

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
        <nav aria-label="Breadcrumb" className="text-sm text-muted">
          <Link to="/books" className="hover:text-maroon-700">
            Books
          </Link>
          <span aria-hidden="true"> / </span>
          <span className="text-ink-800">{item.title}</span>
        </nav>

        <div className="mt-8 grid gap-10 lg:grid-cols-[300px_1fr]">
          <div>
            <div className="overflow-hidden rounded-sm shadow-cover">
              {item.coverImage ? (
                <img
                  src={item.coverImage}
                  alt={`Cover of ${item.title}`}
                  width={300}
                  height={400}
                  className="aspect-[3/4] w-full object-cover"
                />
              ) : (
                <BookCover book={item} />
              )}
            </div>

            {item.pdfUrl && (
              <div className="mt-5 space-y-2">
                <button type="button" onClick={() => setReading(true)} className="btn btn-primary w-full">
                  <BookOpen aria-hidden="true" className="size-4" />
                  Read online
                </button>
                <a href={downloadUrl(item)} target="_blank" rel="noreferrer" className="btn btn-secondary w-full">
                  <Download aria-hidden="true" className="size-4" />
                  Download PDF
                </a>
              </div>
            )}
          </div>

          <div>
            <p className="eyebrow">{categoryLabels[item.category]}</p>
            <h1 className="mt-3 text-3xl sm:text-4xl">{item.title}</h1>
            {item.author && <p className="mt-2 text-muted">{item.author}</p>}

            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-800">{item.description}</p>

            <dl className="mt-9 grid gap-x-8 gap-y-4 border-t border-line pt-6 sm:grid-cols-2">
              {facts.map((fact) => (
                <div key={fact.label} className="flex justify-between gap-4 border-b border-line pb-2">
                  <dt className="text-sm text-muted">{fact.label}</dt>
                  <dd className="text-sm font-semibold">{fact.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>

      {/* The three questions a book page answers. The strings mirror
          book_faq() in api/seo.py, which renders the same three for
          crawlers that skip JavaScript. */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <SectionHeading eyebrow="FAQ" title="Common questions" />
        <div className="mt-8 divide-y divide-line border-y border-line">
          {faq.map((entry) => (
            <div
              key={entry.q}
              className="grid gap-2 py-5 sm:grid-cols-[minmax(0,22rem)_1fr] sm:gap-8"
            >
              <h3 className="text-base font-semibold">{entry.q}</h3>
              <p className="text-sm leading-relaxed text-muted">{entry.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Reviews and the form that adds to them. */}
      <section className="border-t border-line bg-cream-50">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <SectionHeading
            eyebrow="Readers"
            title="Reviews"
            action={
              reviews.data && reviews.data.length > 0 ? (
                <span className="text-sm text-muted">
                  {reviews.data.length} {reviews.data.length === 1 ? "review" : "reviews"}
                </span>
              ) : undefined
            }
          />
          <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_360px]">
            {/* Order only: on phones the form comes first and the list (empty
                or not) sits under it; at lg the columns are as before. */}
            <div className="order-2 lg:order-1">
              <ReviewList
                reviews={reviews.data ?? []}
                loading={reviews.loading}
                error={reviews.error}
                onRetry={reviews.reload}
              />
            </div>
            <div className="order-1 lg:order-2">
              <ReviewForm
                bookSlug={item.slug}
                bookTitle={item.title}
                onSubmitted={reviews.reload}
              />
            </div>
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <SectionHeading eyebrow="Keep reading" title="Also in the library" />
          <ul className="mt-8 grid grid-cols-2 gap-x-5 gap-y-9 sm:grid-cols-3 lg:grid-cols-4">
            {related.map((other) => (
              <li key={other.slug}>
                <BookCard book={other} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {reading && item.pdfUrl && (
        <PdfReader
          title={item.title}
          src={embedUrl(item)}
          externalHref={externalReadUrl(item)}
          onClose={() => setReading(false)}
        />
      )}
    </>
  );
}
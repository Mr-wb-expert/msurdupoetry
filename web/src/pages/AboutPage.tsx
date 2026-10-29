import { Feather, GraduationCap, ScrollText } from "lucide-react";

import Seo from "@/components/Seo.tsx";
import FaqSection from "@/components/FaqSection.tsx";
import SectionHeading from "@/components/SectionHeading.tsx";
import BookCard from "@/components/BookCard.tsx";
import { site } from "@/lib/site";
import { useApi } from "@/lib/useApi.ts";
import { getBooks } from "@/lib/api.ts";
import { Link } from "react-router-dom";

// Mirrors FAQ in api/seo.py — the schema and the visible copy must be
// identical, so both live here in the same words. Answers run 40-60 words:
// long enough for an engine to lift one whole, short enough to stay one
// answer, and every claim in them is a fact the library already states.
const faq = [
  {
    q: "Who is Mujahid Sajjad?",
    a: "Syed Mujahid Sajjad is an Urdu poet and writer, and Associate Professor of English at Govt. Graduate College Burewala, Government of the Punjab. He writes ghazals and nazms in Urdu and teaches English; his collection Magar Manzar Nahi Mera and Ghazala Anjum's critical study of his poetry both live in this site's free library.",
  },
  {
    q: "Where can I read Magar Manzar Nahi Mera online?",
    a: "The whole book is free on this site, open it in the browser from its Books page, or download the PDF from the same page. It is a collection of ghazals and nazms published in 2026, and reading it needs no account, no sign-up and no payment.",
  },
  {
    q: "Are the books free to download?",
    a: "Yes. Every book in the library, poetry, criticism and essays, is free to read online and free to download as a PDF. There is no account, no subscription and no payment at any point; each book page carries its own download link.",
  },
  {
    q: "Who wrote the criticism of his poetry?",
    a: "Ghazala Anjum wrote it. Her critical study, An Article on the Poetry of Mujahid Sajjad, is kept in the library alongside the collection, a reading of the poems' images, plainspoken idiom and the balance they hold between observation and feeling.",
  },
  {
    q: "What languages does he write in?",
    a: "He writes poetry in Urdu, ghazals, nazms and essays, and teaches English as Associate Professor at Govt. Graduate College Burewala, Government of the Punjab. English is the language of his classroom; Urdu is the language of his verse, free to read here.",
  },
];

const faqGraph = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faq.map(({ q, a }) => ({
    "@type": "Question",
    name: q,
    acceptedAnswer: { "@type": "Answer", text: a },
  })),
};

export default function AboutPage() {
  const library = useApi(getBooks);
  const books = library.data ?? [];

  const facts = [
    { label: "Writes in", value: "Urdu" },
    { label: "Teaches", value: "English" },
    { label: "Books", value: books.length > 0 ? `${books.length} · Free to read` : "Free to read" },
  ];

  return (
    <>
      {/* Copy mirrored in api/seo.py (PAGE_COPY + FAQ). */}
      <Seo
        title="Urdu Poet at GGC Burewala"
        description={`${site.fullName} is an Urdu poet and writer, and Associate Professor of English at ${site.affiliation}.`}
        jsonLd={faqGraph}
      />

      {/* Portrait left, story right — the mirror of the home hero. */}
      <section className="border-b border-line bg-cream-50">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[320px_1fr] lg:gap-16 lg:py-20">
          <figure className="mx-auto w-full max-w-xs lg:max-w-none">
            <div className="relative">
              {/* Offset frame behind the portrait — same as the home hero. */}
              <div
                aria-hidden="true"
                className="absolute inset-0 translate-x-3 translate-y-3 rounded-sm border-2 border-marigold-500/70"
              />
              <img
                src={site.portrait}
                alt={`${site.fullName}, ${site.title}`}
                width={640}
                height={800}
                className="relative aspect-[4/5] w-full rounded-sm object-cover shadow-cover"
              />
            </div>
            <figcaption className="mt-6 text-center lg:text-start">
              <span className="block text-sm font-semibold text-ink-900">{site.fullName}</span>
              <span lang="ur" dir="rtl" className="urdu-display mt-1 inline-block text-lg text-maroon-700">
                سید مجاہد سجاد
              </span>
            </figcaption>
          </figure>

          <div>
            <div className="text-center sm:text-start">
              <p className="eyebrow">About</p>
              <h1 className="mt-3 text-3xl sm:text-5xl">{site.fullName}</h1>
              <p className="mt-4 text-lg text-muted">{site.title}</p>
              {/* The entity question, asked plainly — AI answers lift a
                  question-shaped heading far more readily than a paragraph.
                  Mirrored in api/seo.py's static body. */}
              <h2 className="mt-6 text-2xl font-semibold">Who is Mujahid Sajjad?</h2>
            </div>
            <p className="mt-6 max-w-2xl leading-relaxed text-ink-800">
              {site.author} writes in Urdu. His poetry is built from observation rather than
              abstraction the street, the classroom, the people passing through and his criticism
              reads that work closely and without decoration. He teaches English at{" "}
              {site.affiliation}.
            </p>
            <p className="mt-4 max-w-2xl leading-relaxed text-ink-800">
              The collection <span className="font-medium text-ink-900">Magar Manzar Nahi Mera</span>{" "}
              gathers those ghazals and nazms between two covers, and Ghazala Anjum's critical
              study of the work accompanies it in the library. Both are free here in full,
              read online, or download the PDF, alongside essays and contributed writing from
              across his years of teaching.
            </p>

            <dl className="mt-8 grid gap-x-8 gap-y-4 border-t border-line pt-6 sm:grid-cols-2">
              {facts.map((fact) => (
                <div key={fact.label}>
                  <dt className="text-sm text-muted">{fact.label}</dt>
                  <dd className="text-sm font-semibold">{fact.value}</dd>
                </div>
              ))}
              <div>
                <dt className="text-sm text-muted">Institution</dt>
                <dd className="text-sm font-semibold">{site.affiliation}</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <SectionHeading eyebrow="In his work" title="Poetry, criticism and teaching" />
        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          <div className="lift rounded-sm border border-line border-t-2 border-t-marigold-500 bg-paper p-6 shadow-cover">
            <span className="grid size-10 place-items-center rounded-sm bg-maroon-700 text-paper">
              <Feather aria-hidden="true" className="size-5" />
            </span>
            <h3 className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-marigold-700">
              Poetry
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Ghazals and nazms in Urdu, free to read on this site and in the PDF of{" "}
              <span className="font-medium text-ink-800">Magar Manzar Nahi Mera</span>.
            </p>
          </div>
          <div className="lift rounded-sm border border-line border-t-2 border-t-marigold-500 bg-paper p-6 shadow-cover">
            <span className="grid size-10 place-items-center rounded-sm bg-maroon-700 text-paper">
              <ScrollText aria-hidden="true" className="size-5" />
            </span>
            <h3 className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-marigold-700">
              Criticism
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              A critical study by Ghazala Anjum accompanies the collection in the library.
            </p>
          </div>
          <div className="lift rounded-sm border border-line border-t-2 border-t-marigold-500 bg-paper p-6 shadow-cover">
            <span className="grid size-10 place-items-center rounded-sm bg-maroon-700 text-paper">
              <GraduationCap aria-hidden="true" className="size-5" />
            </span>
            <h3 className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-marigold-700">
              Teaching
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Associate Professor of English at {site.affiliation}.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <SectionHeading
          eyebrow="Bibliography"
          title="Publications"
          action={
            <Link to="/books" className="text-sm font-semibold text-maroon-700 hover:text-maroon-800">
              Read them free →
            </Link>
          }
        />

        {library.error ? (
          <p className="mt-8 text-sm text-muted">The bibliography could not be loaded.</p>
        ) : library.loading ? (
          <p className="mt-8 text-sm text-muted">Loading the bibliography…</p>
        ) : (
          <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {books.slice(0, 3).map((book) => (
              <BookCard key={book.slug} book={book} />
            ))}
          </div>
        )}
      </section>

      <FaqSection
        faqs={faq}
        title="About Mujahid Sajjad"
        lead="Who he is, what he writes and how to read his books. Can't find your question? Ask us on WhatsApp."
        className="border-t border-line bg-cream-50"
      />
    </>
  );
}

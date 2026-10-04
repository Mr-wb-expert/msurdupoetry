import Seo from "@/components/Seo.tsx";
import SectionHeading from "@/components/SectionHeading.tsx";
import BookCard from "@/components/BookCard.tsx";
import { site } from "@/lib/site";
import { useApi } from "@/lib/useApi.ts";
import { getBooks } from "@/lib/api.ts";
import { Link } from "react-router-dom";

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
      <Seo
        title="About"
        description={`${site.fullName} is an Urdu poet and writer, and Associate Professor of English at ${site.affiliation}.`}
        image={site.portrait}
      />

      {/* Portrait left, story right — the mirror of the home hero. */}
      <section className="border-b border-line bg-cream-50">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[320px_1fr] lg:gap-16 lg:py-20">
          <figure className="mx-auto w-full max-w-xs lg:max-w-none">
            <img
              src={site.portrait}
              alt={`${site.fullName}, ${site.title}`}
              width={640}
              height={800}
              className="aspect-[4/5] w-full rounded-sm object-cover shadow-cover"
            />
            <figcaption className="mt-3 text-sm font-semibold text-muted">
              {site.fullName} · {site.author}
            </figcaption>
          </figure>

          <div>
            <p className="eyebrow">About</p>
            <h1 className="mt-3 text-4xl sm:text-5xl">{site.fullName}</h1>
            <p className="mt-4 text-lg text-muted">{site.title}</p>
            <p className="mt-6 max-w-2xl leading-relaxed text-ink-800">
              {site.author} writes in Urdu. His poetry is built from observation rather than
              abstraction the street, the classroom, the people passing through and his criticism
              reads that work closely and without decoration. He teaches English at{" "}
              {site.affiliation}.
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
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="lift rounded-sm border border-line bg-paper p-4 shadow-cover">
            <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-marigold-700">
              Poetry
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Ghazals and nazms in Urdu — free to read on this site and in the PDF of{" "}
              <span className="font-medium text-ink-800">Magar Manzar Nahi Mera</span>.
            </p>
          </div>
          <div className="lift rounded-sm border border-line bg-paper p-4 shadow-cover">
            <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-marigold-700">
              Criticism
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              A critical study by Ghazala Anjum accompanies the collection in the library.
            </p>
          </div>
          <div className="lift rounded-sm border border-line bg-paper p-4 shadow-cover">
            <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-marigold-700">
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
            {books.map((book) => (
              <BookCard key={book.slug} book={book} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

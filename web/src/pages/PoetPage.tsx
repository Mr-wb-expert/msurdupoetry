import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { BookOpen, Feather } from "lucide-react";

import Seo from "@/components/Seo.tsx";
import { ErrorNote, Loading } from "@/components/Feedback.tsx";
import CoupletCard from "@/components/CoupletCard.tsx";
import { fromPoem } from "@/lib/couplets";
import { VERSE_TYPES, type VerseType } from "@/lib/types";
import BookCarousel from "@/components/BookCarousel.tsx";
import { poetHref } from "@/lib/poets";
import { getBooks, getPoet } from "@/lib/api.ts";
import { useApi } from "@/lib/useApi.ts";

/**
 * One poet's hub: bio plus everything they wrote, carded and linked to each
 * full poem. The bio is the unique Urdu editorial content — without this page
 * a poet is only a name on a mixed feed, which is all the crawler used to see.
 */
const CANONICAL_ORIGIN = "https://www.msurdupoetry.com";
const OWNER = "mujahid-sajjad";
// Spellings people really search under — mirrors ALSO_KNOWN_AS in api/seo.py.
// Shown once, visibly, under the name; never a hidden keyword list.
const ALSO_KNOWN_AS: Record<string, string> = {
  "ahmed-faraz": "Ahmad Faraz",
  "faiz-ahmed-faiz": "Faiz Ahmad Faiz",
  "jaun-elia": "John Elia, Jon Elia",
  "mirza-ghalib": "Mirza Galib, Mirza Asadullah Khan Ghalib",
  "mir-taqi-mir": "Meer Taqi Meer",
  "allama-iqbal": "Muhammad Iqbal, Iqbal",
  "jigar-moradabadi": "Jigar Muradabadi",
  "n-m-rashid": "Noon Meem Rashid, N. M. Rashed",
  "altaf-hussain-hali": "Maulana Hali, Khwaja Altaf Hussain Hali",
  "parveen-shakir": "Parvin Shakir",
  "razzaq-shahid": "Razzaq Shah, Dr. Razzaq Shahid",
};
// Iqbal alone has 300+ verses: render a page at a time, not every card at once.
const PAGE_SIZE = 24;

export default function PoetPage() {
  const { slug = "" } = useParams();
  const poet = useApi(() => getPoet(slug), [slug]);
  // The poet's books in the library, matched through the same author aliases
  // that link a book to this page. Mirrors _poet_body in api/seo.py.
  const library = useApi(getBooks);
  const books = useMemo(
    () => (library.data ?? []).filter((book) => poetHref(book.author) === `/poets/${slug}`),
    [library.data, slug],
  );
  const [form, setForm] = useState<"All" | VerseType>("All");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const poems = poet.data?.poems;
  const forms = useMemo(
    () => VERSE_TYPES.filter((type) => (poems ?? []).some((poem) => poem.type === type)),
    [poems],
  );
  const shown = useMemo(
    () => (poems ?? []).filter((poem) => form === "All" || poem.type === form),
    [poems, form],
  );

  if (poet.error) return <PoetNotFound />;
  if (poet.loading || !poet.data) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
        <Loading label="Loading poet and verses" />
      </div>
    );
  }

  const item = poet.data;
  const poetUrl = `${CANONICAL_ORIGIN}/poets/${item.slug}`;
  // Mirrors the head rule in api/seo.py: the roman name leads, because that is
  // what the queries look like ("jaun elia poetry", not the Urdu script).
  const also = ALSO_KNOWN_AS[item.slug];
  const count = item.poems.length;
  // Urdu poets get the "<poet> poetry in urdu" title; a writer in another
  // language (a Punjabi author) gets one that promises his books instead.
  const language = item.language || "Urdu";
  const title =
    language === "Urdu"
      ? `${item.name} Poetry in Urdu | Ghazals, Shayari & Biography`
      : `${item.name} | ${language} Poetry, Books & Biography`;
  const description =
    (language === "Urdu"
      ? `Read ${item.name} poetry in Urdu text` +
        (count ? `, ${count} ghazals, nazms and shayari` : "") +
        " with a biography. Free to read, copy and share."
      : `${item.name}: ${language} writer and educator. Read his ${language} books free online and as PDF, with a biography in Urdu.`) +
    (also ? ` Also spelled ${also}.` : "");

  return (
    <>
      <Seo
        title={title}
        description={description}
        brand={false}
        lang="ur"
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "Person",
            name: `${item.urdu} (${item.name})`,
            url: poetUrl,
            description: item.bio,
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: "Poets",
                item: `${CANONICAL_ORIGIN}/poets`,
              },
              {
                "@type": "ListItem",
                position: 2,
                name: item.urdu,
                item: poetUrl,
              },
            ],
          },
        ]}
      />

      <section className="relative overflow-hidden border-b border-line bg-cream-50">
        <span
          aria-hidden="true"
          lang="ur"
          className="urdu-display pointer-events-none absolute -end-6 -top-10 select-none text-[11rem] leading-none text-maroon-700/[0.05] max-lg:hidden"
        >
          {item.urdu.trim().charAt(0)}
        </span>
        <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12 lg:py-16">
          <nav aria-label="Breadcrumb" className="text-sm text-muted max-sm:text-center">
            <Link to="/poets" className="hover:text-maroon-700">
              Poets
            </Link>
            <span aria-hidden="true"> / </span>
            <span className="text-ink-800">{item.urdu}</span>
          </nav>

          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_300px] lg:items-start">
            <div className="text-center sm:text-start">
              <p className="eyebrow">{item.slug === OWNER ? "Site author" : "Poet"}</p>
              <div aria-hidden="true" className="rule-accent mx-auto mt-3 sm:mx-0" />
              <h1 dir="rtl" lang="ur" className="urdu-display mt-5 text-4xl sm:text-start sm:text-5xl">
                {item.urdu}
              </h1>
              <p className="mt-2 text-lg font-semibold text-maroon-700">
                {item.name}: Poetry in {language}
              </p>
              {also && <p className="mt-1 text-sm text-muted">Also spelled {also}</p>}
              <p
                dir="rtl"
                lang="ur"
                className="urdu-display mt-6 max-w-2xl rounded-sm border-e-4 border-marigold-500 bg-paper p-5 text-start text-lg leading-9 text-ink-800 shadow-cover"
              >
                {item.bio}
              </p>
            </div>

            <aside className="rounded-sm border border-line bg-paper p-6 shadow-cover">
              {/* A poet with books but no verses here counts books, not zeros. */}
              <dl className="grid grid-cols-3 gap-2 text-center">
                {(item.poems.length === 0 && books.length > 0
                  ? ([
                      ["Books", books.length],
                      ["Language", language],
                      ["PDF", "Free"],
                    ] as const)
                  : ([
                      ["Verses", item.poems.length],
                      ["Ghazals", item.poems.filter((poem) => poem.type === "Ghazal").length],
                      ["Nazms", item.poems.filter((poem) => poem.type === "Nazm").length],
                    ] as const)
                ).map(([label, value]) => (
                  <div key={label} className="flex flex-col-reverse">
                    <dt className="mt-1 text-xs uppercase tracking-wider text-muted">{label}</dt>
                    <dd className={`font-bold text-ink-950 ${typeof value === "number" ? "text-2xl" : "text-base leading-8"}`}>
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
              <div className="mt-5 grid gap-2 border-t border-line pt-5">
                {item.slug === OWNER ? (
                  <>
                    <Link to="/books" className="btn btn-primary w-full">
                      <BookOpen aria-hidden="true" className="size-4" />
                      Read his books free
                    </Link>
                    <Link to="/about" className="btn btn-secondary w-full">
                      Biography &amp; FAQ
                    </Link>
                  </>
                ) : (
                  <Link to="/poets" className="btn btn-secondary w-full">
                    <Feather aria-hidden="true" className="size-4" />
                    More poets
                  </Link>
                )}
              </div>
            </aside>
          </div>
        </div>
      </section>

      {books.length > 0 && (
        <section className="border-b border-line">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
            <h2 className="text-2xl">
              {item.name} books{" "}
              <span className="text-base font-normal text-muted">({books.length})</span>
            </h2>
            <p className="mt-2 text-sm text-muted">
              Free to read online and to download as PDF.
            </p>
            <BookCarousel books={books} />
          </div>
        </section>
      )}

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        {item.poems.length === 0 && books.length > 0 ? null : item.poems.length === 0 ? (
          <div className="rounded-sm border border-dashed border-line bg-cream-50 p-8 text-center">
            <p className="text-muted">No verses by {item.name} on the site yet.</p>
            <Link to="/poems" className="btn btn-secondary mt-5">
              Browse all verses
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
              <h2 className="text-2xl">{item.name} Ghazals, Nazms &amp; Shayari</h2>
              {forms.length > 1 && (
                <div role="tablist" aria-label="Filter by form" className="flex flex-wrap gap-2">
                  {(["All", ...forms] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      role="tab"
                      aria-selected={form === option}
                      onClick={() => {
                        setForm(option);
                        setLimit(PAGE_SIZE);
                      }}
                      className={`min-h-9 rounded-full border px-4 text-sm font-semibold transition-colors ${
                        form === option
                          ? "border-maroon-700 bg-maroon-700 text-paper"
                          : "border-line bg-paper text-muted hover:border-ink-900 hover:text-ink-900"
                      }`}
                    >
                      {option === "All" ? "All" : `${option}s`}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {shown.slice(0, limit).map((poem) => (
                <li key={poem.slug} className="flex">
                  <CoupletCard couplet={fromPoem(poem)} />
                </li>
              ))}
            </ul>
            {limit < shown.length && (
              <div className="mt-12 text-center">
                <button
                  type="button"
                  onClick={() => setLimit((prev) => prev + PAGE_SIZE)}
                  className="btn btn-secondary px-8"
                >
                  Load more ({shown.length - limit} remaining)
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

function PoetNotFound() {
  return (
    <>
      <Seo title="Poet not found" noIndex />
      <div className="mx-auto max-w-2xl px-4 py-20 sm:px-6">
        <ErrorNote message="That poet is not on this site." />
        <div className="mt-8">
          <Link to="/poets" className="btn btn-secondary">
            All poets
          </Link>
        </div>
      </div>
    </>
  );
}
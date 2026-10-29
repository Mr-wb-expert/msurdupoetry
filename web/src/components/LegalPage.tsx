import { Link } from "react-router-dom";
import { Mail, MessageCircle, type LucideIcon } from "lucide-react";

import { site } from "@/lib/site";

export type LegalSection = { id: string; title: string; body: React.ReactNode };
export type LegalHighlight = { icon: LucideIcon; title: string; text: string };

/**
 * Shared frame for the Privacy Policy and Terms pages: a hero band in the
 * About/Contact style, three at-a-glance points, then numbered sections with
 * a sticky contents list on wide screens. The static copy for crawlers lives
 * in api/seo.py (_legal_body) and follows the same headings.
 */
export default function LegalPage({
  eyebrow,
  title,
  urdu,
  lead,
  updated,
  highlights,
  sections,
}: {
  eyebrow: string;
  title: string;
  urdu: string;
  lead: string;
  updated: string;
  highlights: LegalHighlight[];
  sections: LegalSection[];
}) {
  return (
    <>
      <section className="border-b border-line bg-cream-50">
        <div className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6 sm:text-start lg:py-20">
          <p className="eyebrow">{eyebrow}</p>
          <div aria-hidden="true" className="rule-accent mx-auto mt-3 sm:mx-0" />
          <h1 className="mt-4 text-3xl sm:text-5xl">{title}</h1>
          <p className="mt-3">
            <span lang="ur" dir="rtl" className="urdu-display text-2xl text-maroon-700">
              {urdu}
            </span>
          </p>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-muted sm:mx-0">{lead}</p>
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-marigold-700">
            Last updated · {updated}
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-16">
        {/* At a glance */}
        <ul className="grid gap-6 sm:grid-cols-3">
          {highlights.map(({ icon: Icon, title: heading, text }) => (
            <li key={heading} className="rounded-sm border border-line bg-paper p-6 shadow-cover">
              <span className="grid size-10 place-items-center rounded-sm bg-maroon-700 text-paper">
                <Icon aria-hidden="true" className="size-5" />
              </span>
              <h2 className="mt-4 text-base font-semibold">{heading}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{text}</p>
            </li>
          ))}
        </ul>

        <div className="mt-16 grid gap-12 lg:grid-cols-[220px_1fr] lg:gap-16">
          <nav aria-label="On this page" className="lg:sticky lg:top-24 lg:self-start">
            <p className="eyebrow">On this page</p>
            <ol className="mt-4 space-y-2 border-s border-line ps-4 text-sm">
              {sections.map((section, index) => (
                <li key={section.id}>
                  <a href={`#${section.id}`} className="text-ink-800 hover:text-maroon-700">
                    <span className="me-2 font-semibold text-marigold-700">{index + 1}.</span>
                    {section.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div className="max-w-3xl">
            {sections.map((section, index) => (
              <section
                key={section.id}
                id={section.id}
                className="scroll-mt-24 border-t border-line py-8 first:border-t-0 first:pt-0"
              >
                <h2 className="flex items-baseline gap-3 text-xl sm:text-2xl">
                  <span className="text-base font-semibold text-marigold-700">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {section.title}
                </h2>
                <div className="mt-4 space-y-4 leading-relaxed text-ink-800">{section.body}</div>
              </section>
            ))}

            <aside className="mt-8 rounded-sm bg-maroon-700 px-6 py-8 text-paper sm:px-8">
              <h2 className="text-xl text-paper">Questions about this page?</h2>
              <p className="mt-2 text-sm leading-relaxed text-cream-100">
                Write to us in Urdu or English.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <a
                  href="mailto:mujahidsajjad113@gmail.com"
                  className="btn bg-paper text-maroon-700 hover:bg-cream-100"
                >
                  <Mail aria-hidden="true" className="size-4" />
                  Email us
                </a>
                <a
                  href={site.whatsapp}
                  target="_blank"
                  rel="noreferrer"
                  className="btn border border-cream-300 text-paper hover:bg-maroon-800"
                >
                  <MessageCircle aria-hidden="true" className="size-4" />
                  WhatsApp
                </a>
                <Link to="/contact" className="btn text-cream-100 underline-offset-4 hover:underline">
                  All contact details
                </Link>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </>
  );
}

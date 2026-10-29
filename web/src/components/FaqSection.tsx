import { Link } from "react-router-dom";
import { MessageCircle, Plus } from "lucide-react";

import { site } from "@/lib/site";

export type Faq = { q: string; a: string };

/**
 * FAQ as an accordion: a short intro on the left, the questions on the right.
 * Built on <details>/<summary>, so every answer stays in the page text for
 * crawlers and AI readers (the FAQPage schema must match visible text), and
 * opening one needs no JavaScript. The first answer starts open.
 */
export default function FaqSection({
  faqs,
  title = "Frequently asked questions",
  lead = "Quick answers about the library. Can't find yours? Ask us on WhatsApp.",
  className = "",
}: {
  faqs: Faq[];
  title?: string;
  lead?: string;
  className?: string;
}) {
  return (
    <section className={className}>
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[minmax(0,20rem)_1fr] lg:gap-16 lg:py-20">
        <div className="text-center lg:sticky lg:top-24 lg:self-start lg:text-start">
          <p className="eyebrow">FAQ</p>
          <div aria-hidden="true" className="rule-accent mx-auto mt-3 lg:mx-0" />
          <h2 className="mt-4 text-2xl sm:text-3xl">{title}</h2>
          <p className="mt-3">
            <span lang="ur" dir="rtl" className="urdu-display text-xl text-maroon-700">
              عام سوالات
            </span>
          </p>
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-muted lg:mx-0">{lead}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3 lg:justify-start">
            <a href={site.whatsapp} target="_blank" rel="noreferrer" className="btn btn-primary">
              <MessageCircle aria-hidden="true" className="size-4" />
              Ask a question
            </a>
            <Link to="/contact" className="btn btn-secondary">
              Contact
            </Link>
          </div>
        </div>

        <div className="space-y-3">
          {faqs.map(({ q, a }, index) => (
            <details
              key={q}
              open={index === 0}
              className="group rounded-sm border border-line bg-paper shadow-cover transition-colors open:border-maroon-700/40"
            >
              <summary className="flex cursor-pointer list-none items-center gap-4 p-5 [&::-webkit-details-marker]:hidden">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-cream-100 text-xs font-bold text-maroon-700 group-open:bg-maroon-700 group-open:text-paper">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="flex-1 text-base font-semibold text-ink-900">{q}</h3>
                <Plus
                  aria-hidden="true"
                  className="size-5 shrink-0 text-maroon-700 transition-transform duration-200 group-open:rotate-45"
                />
              </summary>
              <p className="border-t border-line px-5 pb-5 pt-4 text-sm leading-relaxed text-muted sm:ps-[4.25rem]">
                {a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

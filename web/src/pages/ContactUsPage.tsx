import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, Check, Copy, Mail, MapPin, MessageCircle, PenLine, Mic } from "lucide-react";

import Seo from "@/components/Seo.tsx";
import { site } from "@/lib/site";

// Mirrored in api/seo.py (PAGE_COPY["contact"], CONTACT_EMAIL, _legal_body).
const EMAIL = "mujahidsajjad113@gmail.com";
const ADDRESS = ["Department of English", "Govt. Graduate College Burewala", "Government of the Punjab"];

const REASONS = [
  {
    icon: BookOpen,
    title: "A book or its PDF",
    text: "Can't open a book, or looking for one that isn't in the library yet.",
  },
  {
    icon: PenLine,
    title: "A correction to a verse",
    text: "A misprinted word, a wrong poet or a missing couplet, send the page link.",
  },
  {
    icon: Mic,
    title: "Mushaira, recitation or interview",
    text: "Invitations, recordings and requests to feature the poetry.",
  },
] as const;

export default function ContactUsPage() {
  const [copied, setCopied] = useState(false);

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(EMAIL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard denied — the mailto link still works.
    }
  }

  return (
    <>
      <Seo
        title="Contact Us"
        description="Get in touch with Prof. Mujahid Sajjad's digital library, WhatsApp, email and correspondence address."
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "ContactPage",
          name: "Contact Us",
          url: "https://www.msurdupoetry.com/contact",
        }}
      />

      {/* Hero: the two ways to reach us, one tap away. */}
      <section className="border-b border-line bg-cream-50">
        <div className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6 sm:text-start lg:py-20">
          <p className="eyebrow">Get in touch</p>
          <div aria-hidden="true" className="rule-accent mx-auto mt-3 sm:mx-0" />
          <h1 className="mt-4 text-3xl sm:text-5xl">Contact Us</h1>
          {/* dir sits on the span: on the <p>, text-start would flip it to the right. */}
          <p className="mt-3">
            <span lang="ur" dir="rtl" className="urdu-display text-2xl text-maroon-700">
              رابطہ کریں
            </span>
          </p>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-muted sm:mx-0">
            Questions about the books, the verses or {site.fullName}&apos;s work are welcome. Write
            in Urdu or English.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3 sm:justify-start">
            <a href={site.whatsapp} target="_blank" rel="noreferrer" className="btn btn-primary">
              <MessageCircle aria-hidden="true" className="size-4" />
              Message on WhatsApp
            </a>
            <a href={`mailto:${EMAIL}`} className="btn btn-secondary">
              <Mail aria-hidden="true" className="size-4" />
              Send an email
            </a>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:py-20">
        {/* Channels */}
        <div className="grid gap-6 md:grid-cols-3">
          <article className="lift flex flex-col rounded-sm border border-line bg-paper p-6 shadow-cover">
            <span className="grid size-11 place-items-center rounded-sm bg-maroon-700 text-paper">
              <MessageCircle aria-hidden="true" className="size-5" />
            </span>
            <h2 className="mt-5 text-lg font-semibold">WhatsApp</h2>
            <p className="mt-1 text-sm text-muted">The simplest way to ask for a book PDF.</p>
            <a
              href={site.whatsapp}
              target="_blank"
              rel="noreferrer"
              className="mt-auto inline-flex items-center gap-1.5 pt-5 text-base font-semibold text-maroon-700 hover:text-maroon-800"
            >
              {site.whatsappNumber}
              <ArrowRight aria-hidden="true" className="size-4" />
            </a>
          </article>

          <article className="lift flex flex-col rounded-sm border border-line bg-paper p-6 shadow-cover">
            <span className="grid size-11 place-items-center rounded-sm bg-maroon-700 text-paper">
              <Mail aria-hidden="true" className="size-5" />
            </span>
            <h2 className="mt-5 text-lg font-semibold">Email</h2>
            <p className="mt-1 text-sm text-muted">For longer letters, corrections and invitations.</p>
            <div className="mt-auto flex flex-wrap items-center gap-2 pt-5">
              <a
                href={`mailto:${EMAIL}`}
                className="break-all text-base font-semibold text-maroon-700 hover:text-maroon-800"
              >
                {EMAIL}
              </a>
              <button
                type="button"
                onClick={copyEmail}
                aria-label={copied ? "Email address copied" : "Copy email address"}
                className="inline-flex items-center gap-1 rounded-full border border-line px-2.5 py-1 text-xs font-semibold text-muted transition-colors hover:border-maroon-700 hover:text-maroon-700"
              >
                {copied ? (
                  <Check aria-hidden="true" className="size-3.5" />
                ) : (
                  <Copy aria-hidden="true" className="size-3.5" />
                )}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </article>

          <article className="lift flex flex-col rounded-sm border border-line bg-paper p-6 shadow-cover">
            <span className="grid size-11 place-items-center rounded-sm bg-maroon-700 text-paper">
              <MapPin aria-hidden="true" className="size-5" />
            </span>
            <h2 className="mt-5 text-lg font-semibold">Correspondence address</h2>
            <p className="mt-1 text-sm text-muted">For post addressed to {site.fullName}.</p>
            <address className="mt-auto pt-5 text-sm not-italic leading-relaxed text-ink-800">
              {ADDRESS.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </address>
          </article>
        </div>

        {/* What people write about */}
        <section className="mt-20">
          <p className="eyebrow">How we can help</p>
          <div aria-hidden="true" className="rule-accent mt-3" />
          <h2 className="mt-3 text-2xl sm:text-3xl">What to write to us about</h2>
          <ul className="mt-8 grid gap-6 sm:grid-cols-3">
            {REASONS.map(({ icon: Icon, title, text }) => (
              <li key={title} className="border-t-2 border-marigold-500 pt-5">
                <Icon aria-hidden="true" className="size-5 text-marigold-700" />
                <h3 className="mt-3 text-base font-semibold">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{text}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* While you wait */}
        <section className="mt-20 rounded-sm bg-maroon-700 px-6 py-10 text-paper sm:px-10">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="max-w-xl">
              <h2 className="text-2xl text-paper">Everything in the library is free</h2>
              <p className="mt-2 text-sm leading-relaxed text-cream-100">
                Every book can be read online or downloaded as a PDF, no account, no payment.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link to="/books" className="btn bg-paper text-maroon-700 hover:bg-cream-100">
                Browse books
              </Link>
              <Link
                to="/poets/mujahid-sajjad"
                className="btn border border-cream-300 text-paper hover:bg-maroon-800"
              >
                Read his poetry
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

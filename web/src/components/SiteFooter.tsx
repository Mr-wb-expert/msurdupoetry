import { Link } from "react-router-dom";
import { Mail, MessageCircle } from "lucide-react";

import { navLinks, site } from "@/lib/site";

const EMAIL = "mujahidsajjad113@gmail.com";

export default function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-12 border-t border-line bg-cream-50 sm:mt-20">
      {/* Phones: brand on top, Explore and Legal side by side, contact on one
          row. lg: four columns on one row. Both keep the footer short. */}
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-x-6 gap-y-6 px-4 py-8 sm:px-6 sm:py-10 lg:grid-cols-[1.4fr_1fr_0.9fr_1fr] lg:gap-10">
        <div className="col-span-2 lg:col-span-1">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-sm bg-maroon-700 text-xs font-bold text-paper">
              MS
            </span>
            <span className="font-bold">{site.fullName}</span>
          </div>
          <p className="mt-3 hidden max-w-xs text-sm text-muted sm:block">
            {site.title}, {site.affiliation}.
          </p>
          <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-marigold-700">
            Free to read · Urdu first
          </p>
        </div>

        <nav aria-label="Footer">
          <h2 className="eyebrow">Explore</h2>
          <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-0.5">
            {navLinks.map((link) => (
              <li key={link.to}>
                <Link to={link.to} className="inline-block py-1 text-sm text-ink-800 hover:text-maroon-700">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Legal">
          <h2 className="eyebrow">Legal</h2>
          <ul className="mt-3 space-y-0.5">
            <li>
              <Link to="/privacy" className="inline-block py-1 text-sm text-ink-800 hover:text-maroon-700">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link to="/terms" className="inline-block py-1 text-sm text-ink-800 hover:text-maroon-700">
                Terms &amp; Conditions
              </Link>
            </li>
            <li>
              <Link to="/contact" className="inline-block py-1 text-sm text-ink-800 hover:text-maroon-700">
                Contact Us
              </Link>
            </li>
          </ul>
        </nav>

        <div className="col-span-2 lg:col-span-1">
          <h2 className="eyebrow">Get in touch</h2>
          <ul className="mt-3 flex flex-wrap gap-x-5 lg:block lg:space-y-0.5">
            <li>
              <a
                href={site.whatsapp}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 py-1 text-sm text-ink-800 hover:text-maroon-700"
              >
                <MessageCircle aria-hidden="true" className="size-4" />
                {site.whatsappNumber}
              </a>
            </li>
            <li>
              <a
                href={`mailto:${EMAIL}`}
                className="inline-flex items-center gap-2 break-all py-1 text-sm text-ink-800 hover:text-maroon-700"
              >
                <Mail aria-hidden="true" className="size-4 shrink-0" />
                {EMAIL}
              </a>
            </li>
          </ul>
          <p className="mt-3 hidden text-xs text-muted sm:block">
            Every book is free to read online and to download as a PDF.
          </p>
        </div>
      </div>

      <div className="border-t border-line">
        {/* End padding on phones keeps the line clear of the floating WhatsApp
            button in the corner, without an empty band below it. */}
        <p className="mx-auto max-w-6xl py-4 pe-20 ps-4 text-xs text-muted sm:px-6">
          © {year} {site.fullName}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

import { Link } from "react-router-dom";
import { MessageCircle } from "lucide-react";

import { navLinks, site } from "@/lib/site";

export default function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-20 border-t border-line bg-cream-50">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="grid size-10 place-items-center rounded-sm bg-maroon-700 text-sm font-bold text-paper">
              MS
            </span>
            <span className="font-bold">{site.fullName}</span>
          </div>
          <p className="mt-4 max-w-sm text-sm text-muted">{site.title}</p>
          <p className="mt-2 max-w-sm text-sm text-muted">{site.affiliation}</p>
          <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-marigold-700">
            Free to read · Urdu first
          </p>
        </div>

        <nav aria-label="Footer">
          <h2 className="eyebrow">Explore</h2>
          <ul className="mt-4 space-y-2">
            {navLinks.map((link) => (
              <li key={link.to}>
                <Link to={link.to} className="text-sm text-ink-800 hover:text-maroon-700">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="eyebrow">Get in touch</h2>
          <a
            href={site.whatsapp}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex items-center gap-2 text-sm text-ink-800 hover:text-maroon-700"
          >
            <MessageCircle aria-hidden="true" className="size-4" />
            {site.whatsappNumber}
          </a>
          <p className="mt-4 text-sm text-muted">
            Every book on this site is free to read online and to download as a PDF.
          </p>
        </div>
      </div>

      <div className="border-t border-line">
        <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-muted sm:px-6">
          © {year} {site.fullName}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
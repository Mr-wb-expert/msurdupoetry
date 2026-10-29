import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { Menu, Search, X } from "lucide-react";

import { navLinks, site } from "@/lib/site";

export default function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const { pathname, search } = useLocation();

  // A mobile menu left open behind a page change would cover the new page.
  useEffect(() => setOpen(false), [pathname, search]);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
        <Link to="/" className="flex min-w-0 items-center gap-2.5">
          <span className="grid size-10 shrink-0 place-items-center rounded-sm bg-maroon-700 text-sm font-bold text-paper">
            MS
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-sm font-bold">{site.author}</span>
            <span className="hidden text-xs tracking-wide text-muted sm:block">
              Urdu Poet &amp; Writer
            </span>
          </span>
        </Link>

        <nav aria-label="Main" className="hidden flex-1 items-center justify-center gap-1 md:flex">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === "/"}
              className={({ isActive }) =>
                `rounded-sm px-3 py-2 text-sm font-medium transition-colors ${
                  isActive ? "bg-cream-100 text-maroon-700" : "text-ink-800 hover:bg-cream-50"
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        {/* Search and the admin sign-in sit together on the right, so the
            tab row can stay centred in whatever space the logo leaves. The
            sign-in is desktop-only — on mobile it lives in the opened menu. */}
        <div className="ms-auto flex items-center gap-1">
          {/* The search field is the way into the library from anywhere, so it
              sits in the bar rather than only on the catalogue page — desktop
              only, since the mobile bar has room for the logo and menu alone. */}
          <form
            action="/books"
            role="search"
            className="hidden items-center md:flex"
            onSubmit={(event) => {
              event.preventDefault();
              const trimmed = query.trim();
              navigate(trimmed ? `/books?q=${encodeURIComponent(trimmed)}` : "/books");
            }}
          >
            <label htmlFor="site-search" className="sr-only">
              Search books
            </label>
            <div className="relative">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted"
              />
              <input
                id="site-search"
                name="q"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search books"
                className="h-10 w-36 rounded-sm border border-line bg-white ps-8 pe-2 text-sm sm:w-48"
              />
            </div>
          </form>

          <NavLink
            to="/admin"
            className="hidden rounded-sm bg-maroon-700 px-3 py-2 text-sm font-medium text-paper transition-colors hover:bg-maroon-800 md:block"
          >
            Login
          </NavLink>
        </div>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls="mobile-nav"
          className="grid size-10 place-items-center rounded-sm border border-line md:hidden"
        >
          <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
          {open ? <X aria-hidden="true" className="size-5" /> : <Menu aria-hidden="true" className="size-5" />}
        </button>
      </div>

      {open && (
        <nav
          id="mobile-nav"
          aria-label="Main"
          className="max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-line bg-paper shadow-cover md:hidden"
        >
          <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6">
            {/* The desktop bar's search, which phones had no way to reach. */}
            <form
              role="search"
              onSubmit={(event) => {
                event.preventDefault();
                const trimmed = query.trim();
                navigate(trimmed ? `/books?q=${encodeURIComponent(trimmed)}` : "/books");
              }}
            >
              <label htmlFor="mobile-search" className="sr-only">
                Search books
              </label>
              <div className="relative">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted"
                />
                <input
                  id="mobile-search"
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search books"
                  className="field ps-9"
                />
              </div>
            </form>

            {/* Two columns: seven links fit without scrolling on a phone. */}
            <ul className="mt-3 grid grid-cols-2 gap-1">
              {[...navLinks, { to: "/contact", label: "Contact" }].map((link) => (
                <li key={link.to}>
                  <NavLink
                    to={link.to}
                    end={link.to === "/"}
                    className={({ isActive }) =>
                      `flex min-h-11 items-center rounded-sm px-3 text-base font-medium ${
                        isActive ? "bg-cream-100 text-maroon-700" : "text-ink-800 active:bg-cream-50"
                      }`
                    }
                  >
                    {link.label}
                  </NavLink>
                </li>
              ))}
            </ul>

            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-line pt-3">
              <a
                href={site.whatsapp}
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary w-full"
              >
                WhatsApp
              </a>
              <NavLink to="/admin" className="btn btn-primary w-full">
                Login
              </NavLink>
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}
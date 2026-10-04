import { useEffect, useState } from "react";
import { Link, NavLink, Route, Routes, useLocation } from "react-router-dom";
import { BookOpen, Feather, Film, LayoutDashboard, LogOut, Menu, X } from "lucide-react";

import Seo from "@/components/Seo.tsx";
import AdminLogin from "./AdminLogin.tsx";
import AdminDashboard from "./AdminDashboard.tsx";
import AdminBooks from "./AdminBooks.tsx";
import AdminBookForm from "./AdminBookForm.tsx";
import AdminPoems from "./AdminPoems.tsx";
import AdminPoemForm from "./AdminPoemForm.tsx";
import AdminVideos from "./AdminVideos.tsx";
import AdminVideoForm from "./AdminVideoForm.tsx";
import { useAuth } from "./useAuth.ts";

const tabs = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/books", label: "Books", icon: BookOpen },
  { to: "/admin/poems", label: "Verse", icon: Feather },
  { to: "/admin/videos", label: "Videos", icon: Film },
];

export default function AdminRoutes() {
  const { session, checking, signIn, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();

  // A drawer left open behind a page change would cover the new page.
  useEffect(() => setMenuOpen(false), [pathname]);

  // Nothing is decided until the cookie has been read, otherwise a refresh
  // flashes the login screen at an admin who is still signed in.
  if (checking) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-muted">Checking session…</div>
    );
  }

  // The login form replaces the whole panel rather than living at its own
  // route. A redirect to /admin/login would bounce straight back here while
  // signed out, because every /admin path is handled by this component.
  if (!session)
    return (
      <>
        <Seo title="Admin" noIndex />
        <AdminLogin signIn={signIn} />
      </>
    );

  return (
    <div className="min-h-screen bg-cream-50">
      <Seo title="Admin" noIndex />
      <header className="border-b border-line bg-paper">
        <div className="mx-auto flex max-w-6xl items-center gap-x-6 px-4 py-3 sm:px-6">
          <Link to="/admin" className="flex flex-1 items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-sm bg-maroon-700 text-xs font-bold text-paper">
              MS
            </span>
            <span className="text-sm font-bold">Admin</span>
          </Link>

          {/* Tabs and sign-out live inline on desktop; on mobile both move
              into the drawer so the bar keeps to logo + menu button. */}
          <nav aria-label="Admin" className="hidden flex-wrap justify-center gap-1 md:flex">
            {tabs.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.end}
                className={({ isActive }) =>
                  `inline-flex min-h-10 items-center gap-1.5 rounded-sm px-3 text-sm font-medium transition-colors ${
                    isActive ? "bg-cream-100 text-maroon-700" : "text-ink-800 hover:bg-cream-50"
                  }`
                }
              >
                <tab.icon aria-hidden="true" className="size-4" />
                {tab.label}
              </NavLink>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <button
              type="button"
              onClick={() => void signOut()}
              className="btn btn-primary"
            >
              <LogOut aria-hidden="true" className="size-4" />
              Sign out
            </button>
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen((value) => !value)}
            aria-expanded={menuOpen}
            aria-controls="admin-nav"
            className="grid size-10 shrink-0 place-items-center rounded-sm border border-line md:hidden"
          >
            <span className="sr-only">{menuOpen ? "Close menu" : "Open menu"}</span>
            {menuOpen ? (
              <X aria-hidden="true" className="size-5" />
            ) : (
              <Menu aria-hidden="true" className="size-5" />
            )}
          </button>
        </div>

        {menuOpen && (
          <nav id="admin-nav" aria-label="Admin" className="border-t border-line bg-paper md:hidden">
            <ul className="mx-auto max-w-6xl px-4 py-2 sm:px-6">
              {tabs.map((tab) => (
                <li key={tab.to}>
                  <NavLink
                    to={tab.to}
                    end={tab.end}
                    className={({ isActive }) =>
                      `flex min-h-11 items-center gap-2.5 rounded-sm px-3 text-sm font-medium ${
                        isActive ? "bg-cream-100 text-maroon-700" : "text-ink-800"
                      }`
                    }
                  >
                    <tab.icon aria-hidden="true" className="size-4" />
                    {tab.label}
                  </NavLink>
                </li>
              ))}
              <li className="mt-2 border-t border-line pt-2">
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="flex w-full min-h-11 items-center justify-center gap-2 rounded-sm bg-maroon-700 px-3 text-sm font-medium text-paper transition-colors hover:bg-maroon-800"
                >
                  <LogOut aria-hidden="true" className="size-4" />
                  Sign out
                </button>
              </li>
            </ul>
          </nav>
        )}
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 md:py-10">
        <Routes>
          <Route index element={<AdminDashboard />} />
          <Route path="books" element={<AdminBooks />} />
          <Route path="books/new" element={<AdminBookForm />} />
          <Route path="books/:slug" element={<AdminBookForm />} />
          <Route path="poems" element={<AdminPoems />} />
          <Route path="poems/new" element={<AdminPoemForm />} />
          <Route path="poems/:slug" element={<AdminPoemForm />} />
          <Route path="videos" element={<AdminVideos />} />
          <Route path="videos/new" element={<AdminVideoForm />} />
          <Route path="videos/:id" element={<AdminVideoForm />} />
          <Route path="*" element={<AdminDashboard />} />
        </Routes>
      </main>
    </div>
  );
}
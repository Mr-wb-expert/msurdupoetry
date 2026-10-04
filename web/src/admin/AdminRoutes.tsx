import { Link, NavLink, Route, Routes } from "react-router-dom";
import { BookOpen, Feather, Film, LayoutDashboard, LogOut } from "lucide-react";

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
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 sm:px-6">
          <Link to="/admin" className="flex flex-1 items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-sm bg-maroon-700 text-xs font-bold text-paper">
              MS
            </span>
            <span className="text-sm font-bold">Admin</span>
          </Link>

          <nav aria-label="Admin" className="flex flex-wrap justify-center gap-1">
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

          <div className="flex flex-1 items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => void signOut()}
              className="btn btn-primary"
            >
              <LogOut aria-hidden="true" className="size-4" />
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
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
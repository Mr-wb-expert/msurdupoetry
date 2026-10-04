import { Suspense, lazy, useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";

import SiteHeader from "./components/SiteHeader.tsx";
import SiteFooter from "./components/SiteFooter.tsx";
import ScrollToTop from "./components/ScrollToTop.tsx";
import WhatsAppButton from "./components/WhatsAppButton.tsx";
import HomePage from "./pages/HomePage.tsx";
import BooksPage from "./pages/BooksPage.tsx";
import BookPage from "./pages/BookPage.tsx";
import PoemsPage from "./pages/PoemsPage.tsx";
import PoemPage from "./pages/PoemPage.tsx";
import AboutPage from "./pages/AboutPage.tsx";
import VideosPage from "./pages/VideosPage.tsx";
import NotFoundPage from "./pages/NotFoundPage.tsx";

// The admin bundle is a separate download that no visitor ever needs.
const AdminRoutes = lazy(() => import("./admin/AdminRoutes.tsx"));

export default function App() {
  const { pathname } = useLocation();
  const isAdmin = pathname.startsWith("/admin");

  useEffect(() => {
    // The document title is set per page by <Seo>; this is the fallback for
    // the first paint, before any page has mounted.
    if (!isAdmin) document.title = "Mujahid Sajjad — Urdu Poet & Writer";
  }, [isAdmin]);

  // The admin panel has its own chrome and must never inherit the public
  // header and footer. The splat matters: without a parent <Route> behind
  // AdminRoutes, its own relative paths ("books", "poems") would resolve
  // against "/" and every /admin/* URL would fall through to the wildcard.
  if (isAdmin) {
    return (
      <Suspense fallback={<div className="p-10 text-center text-sm text-muted">Loading…</div>}>
        <Routes>
          <Route path="/admin/*" element={<AdminRoutes />} />
        </Routes>
      </Suspense>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-50 focus:rounded-sm focus:bg-ink-900 focus:px-4 focus:py-2 focus:text-sm focus:text-paper"
      >
        Skip to content
      </a>
      <SiteHeader />
      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/books" element={<BooksPage />} />
            <Route path="/books/:slug" element={<BookPage />} />
            <Route path="/poems" element={<PoemsPage />} />
            <Route path="/poems/:slug" element={<PoemPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/videos" element={<VideosPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </main>
      <SiteFooter />
      <ScrollToTop />
      <WhatsAppButton />
    </div>
  );
}
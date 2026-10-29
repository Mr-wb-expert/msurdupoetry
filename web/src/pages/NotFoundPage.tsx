import { Link } from "react-router-dom";
import { BookOpen, Feather, Home } from "lucide-react";

import Seo from "@/components/Seo.tsx";

export default function NotFoundPage() {
  return (
    <>
      <Seo title="Page not found" noIndex />
      <section className="relative overflow-hidden bg-cream-50">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 select-none text-center text-[12rem] font-bold leading-none text-maroon-700/[0.05] sm:text-[18rem]"
        >
          404
        </span>
        <div className="relative mx-auto max-w-2xl px-4 py-24 text-center sm:px-6 lg:py-32">
          <p className="eyebrow">Page not found</p>
          <div aria-hidden="true" className="rule-accent mx-auto mt-3" />
          <h1 className="mt-5 text-3xl sm:text-5xl">This page does not exist</h1>
          <p className="mt-3">
            <span lang="ur" dir="rtl" className="urdu-display text-2xl text-maroon-700">
              یہ صفحہ موجود نہیں
            </span>
          </p>
          <p className="mt-5 text-muted">
            The link may be old, or the address may have a typo in it. These will take you
            somewhere worth reading:
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/" className="btn btn-primary">
              <Home aria-hidden="true" className="size-4" />
              Homepage
            </Link>
            <Link to="/books" className="btn btn-secondary">
              <BookOpen aria-hidden="true" className="size-4" />
              Books
            </Link>
            <Link to="/poems" className="btn btn-secondary">
              <Feather aria-hidden="true" className="size-4" />
              Verses
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

import { Link } from "react-router-dom";

import Seo from "@/components/Seo.tsx";

export default function NotFoundPage() {
  return (
    <>
      <Seo title="Page not found" noIndex />
      <div className="mx-auto max-w-2xl px-4 py-24 text-center sm:px-6">
        <p className="eyebrow">404</p>
        <h1 className="mt-4 text-4xl sm:text-5xl">This page does not exist</h1>
        <p className="mt-4 text-muted">
          The link may be old, or the address may have a typo in it.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/" className="btn btn-primary">
            Go to the homepage
          </Link>
          <Link to="/books" className="btn btn-secondary">
            Browse the books
          </Link>
        </div>
      </div>
    </>
  );
}
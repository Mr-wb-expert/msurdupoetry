import { useEffect, useRef, useState } from "react";

import { ErrorNote, EmptyNote, Loading } from "./Feedback.tsx";
import type { Review } from "@/lib/types";

export default function ReviewList({
  reviews,
  loading,
  error,
  onRetry,
}: {
  reviews: Review[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  // The full text of the review opened in the dialog, if any.
  const [openReview, setOpenReview] = useState<Review | null>(null);
  // Reviews whose clamped card is cutting text off — only those get a
  // "read full" button. Measured once per review list, not per keystroke.
  const [truncated, setTruncated] = useState<Set<Review["id"]>>(new Set());
  const bodyRefs = useRef(new Map<Review["id"], HTMLParagraphElement>());

  useEffect(() => {
    const next = new Set<Review["id"]>();
    for (const [id, el] of bodyRefs.current) {
      if (el && el.scrollHeight > el.clientHeight + 1) next.add(id);
    }
    setTruncated(next);
  }, [reviews]);

  useEffect(() => {
    if (!openReview) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenReview(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openReview]);

  if (loading) return <Loading label="Loading reviews" />;
  if (error) return <ErrorNote message={error} onRetry={onRetry} />;
  if (reviews.length === 0) {
    return (
      <EmptyNote title="No reviews for this book yet">
        Use the form on this page — your review appears right away.
      </EmptyNote>
    );
  }

  return (
    <>
      <ul className="space-y-4">
        {reviews.map((review) => (
          <li key={review.id} className="lift rounded-sm border border-line bg-paper p-5 shadow-cover">
            <p className="text-sm font-semibold">{review.name}</p>
            {/* Fixed card height: long reviews clamp to three lines and the
                full text moves to the dialog below. */}
            <p
              ref={(el) => {
                if (el) bodyRefs.current.set(review.id, el);
                else bodyRefs.current.delete(review.id);
              }}
              className="mt-2 line-clamp-3 whitespace-pre-line text-sm leading-relaxed text-ink-800"
            >
              {review.body}
            </p>
            {truncated.has(review.id) && (
              <button
                type="button"
                onClick={() => setOpenReview(review)}
                className="mt-2 text-sm font-medium text-maroon-700 hover:underline"
              >
                Read full review
              </button>
            )}
          </li>
        ))}
      </ul>

      {openReview && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-ink-950/40 p-4"
          onClick={() => setOpenReview(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Review by ${openReview.name}`}
            className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-sm border border-line bg-paper p-6 shadow-cover"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="text-sm font-semibold">{openReview.name}</p>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink-800">
              {openReview.body}
            </p>
            <button
              type="button"
              autoFocus
              className="btn btn-secondary mt-5 w-full"
              onClick={() => setOpenReview(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}

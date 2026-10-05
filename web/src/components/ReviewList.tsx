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
    <ul className="space-y-4">
      {reviews.map((review) => (
        <li key={review.id} className="lift rounded-sm border border-line bg-paper p-5 shadow-cover">
          <p className="text-sm font-semibold">{review.name}</p>
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-800">
            {review.body}
          </p>
        </li>
      ))}
    </ul>
  );
}
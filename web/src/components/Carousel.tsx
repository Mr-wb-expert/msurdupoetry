import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * A swipeable row: one item per screen on phones, two on tablets, three on
 * desktop. Native horizontal scrolling with snap points does the swiping, so
 * it follows the finger like any phone carousel; the arrows and dots move it
 * an item at a time.
 *
 * `autoPlayMs` advances it on a timer and loops back to the start. The timer
 * pauses while the reader hovers, focuses or touches the row, and never runs
 * for readers who asked for reduced motion.
 */
export default function Carousel<T>({
  items,
  getKey,
  renderItem,
  label,
  autoPlayMs,
}: {
  items: T[];
  getKey: (item: T) => string | number;
  renderItem: (item: T) => React.ReactNode;
  label: string;
  autoPlayMs?: number;
}) {
  const trackRef = useRef<HTMLUListElement>(null);
  const [active, setActive] = useState(0);
  const [edges, setEdges] = useState({ start: true, end: items.length <= 1 });
  const [paused, setPaused] = useState(false);

  // Which item is nearest the start edge, and whether either end is reached.
  const sync = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const first = el.firstElementChild as HTMLElement | null;
    const step = first ? first.offsetWidth + 20 : el.clientWidth;
    setActive(Math.round(el.scrollLeft / step));
    setEdges({
      start: el.scrollLeft <= 1,
      end: el.scrollLeft >= el.scrollWidth - el.clientWidth - 1,
    });
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    sync();
    el.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    return () => {
      el.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
    };
  }, [sync, items.length]);

  const goTo = useCallback((index: number) => {
    const el = trackRef.current;
    const card = el?.children[index] as HTMLElement | undefined;
    if (el && card) el.scrollTo({ left: card.offsetLeft - el.offsetLeft, behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (!autoPlayMs || paused || items.length <= 1) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => {
      const el = trackRef.current;
      if (!el) return;
      const atEnd = el.scrollLeft >= el.scrollWidth - el.clientWidth - 1;
      if (atEnd) {
        el.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        const first = el.firstElementChild as HTMLElement | null;
        const step = first ? first.offsetWidth + 20 : el.clientWidth;
        el.scrollBy({ left: step, behavior: "smooth" });
      }
    }, autoPlayMs);
    return () => window.clearInterval(timer);
  }, [autoPlayMs, paused, items.length]);

  const pause = () => setPaused(true);
  const resume = () => setPaused(false);

  return (
    <div className="mt-8">
      <ul
        ref={trackRef}
        aria-label={label}
        onMouseEnter={pause}
        onMouseLeave={resume}
        onFocus={pause}
        onBlur={resume}
        onTouchStart={pause}
        onTouchEnd={() => window.setTimeout(resume, 4000)}
        className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-px-4 px-4 pb-2 sm:mx-0 sm:scroll-px-0 sm:px-0"
      >
        {items.map((item, index) => (
          <li
            key={getKey(item)}
            aria-label={`${index + 1} of ${items.length}`}
            className="flex w-full shrink-0 snap-start sm:w-[calc(50%-10px)] lg:w-[calc(33.333%-14px)]"
          >
            {renderItem(item)}
          </li>
        ))}
      </ul>

      {items.length > 1 && (
        <div className="mt-6 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => goTo(Math.max(0, active - 1))}
            disabled={edges.start}
            aria-label="Previous"
            className="grid size-11 place-items-center rounded-full border border-line bg-paper text-ink-800 shadow-sm transition-colors hover:border-maroon-700 hover:text-maroon-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft aria-hidden="true" className="size-5" />
          </button>

          {/* Dots: one per item, the current one stretched. */}
          <div className="flex max-w-[60%] flex-wrap justify-center gap-1.5">
            {items.map((item, index) => (
              <button
                key={getKey(item)}
                type="button"
                onClick={() => goTo(index)}
                aria-label={`Go to item ${index + 1}`}
                aria-current={index === active}
                className={`h-2 rounded-full transition-all ${
                  index === active ? "w-6 bg-maroon-700" : "w-2 bg-line hover:bg-cream-300"
                }`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => goTo(Math.min(items.length - 1, active + 1))}
            disabled={edges.end}
            aria-label="Next"
            className="grid size-11 place-items-center rounded-full border border-line bg-paper text-ink-800 shadow-sm transition-colors hover:border-maroon-700 hover:text-maroon-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronRight aria-hidden="true" className="size-5" />
          </button>
        </div>
      )}
    </div>
  );
}

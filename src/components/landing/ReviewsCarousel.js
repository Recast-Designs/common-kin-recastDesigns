"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Stars from "./Stars";

function formatReviewDate(value) {
  if (!value) return "";
  const d = typeof value.toDate === "function" ? value.toDate() : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function Arrow({ direction }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {direction === "left" ? <path d="M15 5l-7 7 7 7" /> : <path d="M9 5l7 7-7 7" />}
    </svg>
  );
}

// Horizontally scrolling review cards: arrow buttons, swipe/trackpad,
// mouse drag, and the keyboard arrows once the row is focused.
export default function ReviewsCarousel({ reviews, rating, reviewCount }) {
  const trackRef = useRef(null);
  const drag = useRef(null);
  const [edges, setEdges] = useState({ atStart: true, atEnd: false });
  const [dragging, setDragging] = useState(false);

  const measure = useCallback(() => {
    const t = trackRef.current;
    if (!t) return;
    const atStart = t.scrollLeft <= 2;
    const atEnd = t.scrollLeft + t.clientWidth >= t.scrollWidth - 2;
    setEdges((prev) =>
      prev.atStart === atStart && prev.atEnd === atEnd ? prev : { atStart, atEnd }
    );
  }, []);

  useEffect(() => {
    const t = trackRef.current;
    if (!t) return undefined;
    const raf = requestAnimationFrame(measure);
    t.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(raf);
      t.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, [measure, reviews.length]);

  function step(direction) {
    const t = trackRef.current;
    if (!t) return;
    const card = t.querySelector("[data-review-card]");
    const gap = parseFloat(getComputedStyle(t).columnGap) || 0;
    const amount = card ? card.offsetWidth + gap : t.clientWidth * 0.8;
    t.scrollBy({ left: direction * amount, behavior: "smooth" });
  }

  // Click-and-drag with a mouse (touch and trackpads scroll natively)
  function onPointerDown(e) {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    drag.current = { x: e.clientX, left: trackRef.current.scrollLeft, moved: false };
  }
  function onPointerMove(e) {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    if (!d.moved && Math.abs(dx) > 4) {
      d.moved = true;
      setDragging(true);
      trackRef.current.setPointerCapture?.(e.pointerId);
    }
    if (d.moved) trackRef.current.scrollLeft = d.left - dx;
  }
  function endDrag(e) {
    const d = drag.current;
    drag.current = null;
    if (!d?.moved) return;
    trackRef.current.releasePointerCapture?.(e.pointerId);
    setDragging(false);
  }

  if (!reviews.length) return null;

  const count = reviewCount || reviews.length;

  return (
    <section id="reviews" className="ckl-section ckl-reviews" aria-label="Customer reviews">
      <div className="ckl-reviews__head">
        <div className="flex flex-col gap-2">
          <h2 className="ckl-display ckl-h3">Reviews</h2>
          <div className="flex items-center gap-2">
            <Stars value={rating || 5} />
            <span className="ckl-meta">
              {rating ? `${Number(rating).toFixed(1)} · ` : ""}
              {count} Review{count === 1 ? "" : "s"}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="ckl-arrow"
            onClick={() => step(-1)}
            disabled={edges.atStart}
            aria-label="Previous reviews"
          >
            <Arrow direction="left" />
          </button>
          <button
            type="button"
            className="ckl-arrow"
            onClick={() => step(1)}
            disabled={edges.atEnd}
            aria-label="Next reviews"
          >
            <Arrow direction="right" />
          </button>
        </div>
      </div>

      <div
        ref={trackRef}
        className={`ckl-reviews__track ${dragging ? "is-dragging" : ""}`}
        tabIndex={0}
        role="region"
        aria-label="Reviews — scroll sideways for more"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={endDrag}
      >
        {reviews.map((review, i) => {
          const date = formatReviewDate(review.date || review.createdAt);
          const meta = [review.location, date].filter(Boolean).join(" · ");
          return (
            <article key={review.id || `${review.name}-${i}`} className="ckl-review" data-review-card>
              <p className="ckl-review__text">
                <span aria-hidden="true">“</span>
                {review.text}
                <span aria-hidden="true">”</span>
              </p>
              <div className="flex flex-col gap-3">
                <p className="ckl-display ckl-h3">{review.name || "Verified buyer"}</p>
                <div className="flex items-center gap-2">
                  <Stars value={review.rating ?? 5} />
                  {meta && <span className="ckl-meta">{meta}</span>}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

"use client";

import { useEffect, useRef } from "react";

export const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));

// Height of the sticky site header (set as --ckl-header-h in globals.css)
export function headerOffset() {
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--ckl-header-h");
  return parseFloat(raw) || 0;
}

// 0 → 1 while scrolling through a tall wrapper whose child is `position: sticky`.
// 0 = wrapper top reaches the header, 1 = wrapper bottom reaches the viewport bottom.
export function pinnedProgress(el) {
  const rect = el.getBoundingClientRect();
  const top = headerOffset();
  const distance = rect.height - (window.innerHeight - top);
  if (distance <= 1) {
    // Not tall enough to pin — fall back to "passing through the viewport"
    return clamp((window.innerHeight - rect.top) / (window.innerHeight + rect.height));
  }
  return clamp((top - rect.top) / distance);
}

// Like pinnedProgress, for a wrapper whose sticky `.ckl-pin__stage` may be
// taller than the screen (the desktop layout sizes the stage to its content
// so the Figma spacing above and below is kept). Runs 0 → 1 over exactly the
// scroll distance during which the stage stays pinned.
export function stickyProgress(el) {
  const stage = el.querySelector(".ckl-pin__stage");
  if (!stage) return pinnedProgress(el);
  const rect = el.getBoundingClientRect();
  const top = headerOffset();
  const distance = rect.height - Math.max(stage.offsetHeight, window.innerHeight - top);
  if (distance <= 1) return pinnedProgress(el);
  return clamp((top - rect.top) / distance);
}

// Calls `onFrame(element)` every animation frame while `ref` is on (or near)
// the screen. If onFrame returns true it keeps running for one more frame even
// off-screen (used to let eased values settle).
export function useScrollFrame(ref, onFrame) {
  const callback = useRef(onFrame);

  useEffect(() => {
    callback.current = onFrame;
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    let raf = 0;
    let visible = false;

    const loop = () => {
      const busy = callback.current(el);
      raf = visible || busy ? requestAnimationFrame(loop) : 0;
    };
    const start = () => {
      if (!raf) raf = requestAnimationFrame(loop);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible) start();
      },
      { rootMargin: "300px 0px" }
    );
    observer.observe(el);

    // Resizes change progress too
    window.addEventListener("resize", start);
    start();

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", start);
      cancelAnimationFrame(raf);
    };
  }, [ref]);
}

"use client";

import { useRef } from "react";
import { clamp, headerOffset, useScrollFrame } from "./scroll";

// ============================================================
// PARALLAX HELPERS
// Everything here is driven by the same rAF loop as the rest of the landing
// page (useScrollFrame), so it only runs while the element is on screen.
// Values are eased towards their target every frame (lerp) — that soft
// follow is what makes the motion feel weighted instead of glued to the
// scrollbar. Reduced-motion users get the static layout.
// ============================================================

export function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
export const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);

// Where an element sits in the visible area (under the sticky header):
//  1 = its centre is just below the screen, 0 = centred, -1 = just above
export function viewportOffset(el) {
  const rect = el.getBoundingClientRect();
  const top = headerOffset();
  const visible = window.innerHeight - top;
  const viewCenter = top + visible / 2;
  const center = rect.top + rect.height / 2;
  const range = visible / 2 + rect.height / 2;
  return clamp((center - viewCenter) / range, -1, 1);
}

// Eases a scroll-derived number towards `getTarget(el)` and hands the
// current value to `apply(el, value)`. `apply(el, null)` = reduced motion,
// reset to the static layout.
//   initial: "target" jumps straight to the first target (no swoop on load),
//            or a number to animate from (e.g. 0 for an entrance).
export function useSmoothScroll(ref, getTarget, apply, { ease = 0.12, initial = "target" } = {}) {
  const current = useRef(null);
  const fns = useRef({ getTarget, apply });
  fns.current = { getTarget, apply };

  useScrollFrame(ref, (el) => {
    if (prefersReducedMotion()) {
      if (current.current !== null) {
        current.current = null;
        fns.current.apply(el, null);
      }
      return false;
    }

    const target = fns.current.getTarget(el);
    let value = current.current;
    if (value === null) value = initial === "target" ? target : initial;
    value += (target - value) * ease;
    if (Math.abs(target - value) < 0.0004) value = target;

    current.current = value;
    fns.current.apply(el, value);
    return value !== target; // keep animating until it settles
  });
}

// ============================================================
// <ParallaxImage>
//   variant="frame" (default) — photo drifts inside a cropped frame and
//                                settles from a slight zoom as it arrives
//   variant="float"            — the whole image floats slower than the
//                                page (for cut-outs with a drop shadow)
// ============================================================
const FRAME_SCALE = 1.16; // crop that gives the photo room to move
const FRAME_ZOOM_IN = 0.12; // extra zoom while the frame is entering
const FRAME_TRAVEL = 7; // % of the frame height, each way
const FLOAT_TRAVEL = 0.07; // fraction of the screen height, each way
const FLOAT_TRAVEL_MAX = 80; // px

export default function ParallaxImage({
  src,
  alt = "",
  className = "",
  imgClassName = "",
  variant = "frame",
  loading = "lazy",
  ...imgProps
}) {
  const ref = useRef(null);

  useSmoothScroll(
    ref,
    (el) => viewportOffset(el),
    (el, t) => {
      if (variant === "float") {
        if (t === null) {
          el.style.removeProperty("--ckl-float-y");
          return;
        }
        const travel = Math.min(FLOAT_TRAVEL_MAX, window.innerHeight * FLOAT_TRAVEL);
        el.style.setProperty("--ckl-float-y", `${(-t * travel).toFixed(2)}px`);
        return;
      }

      if (t === null) {
        el.style.removeProperty("--ckl-px-y");
        el.style.removeProperty("--ckl-px-s");
        return;
      }
      // Photo moves against the scroll (slower than its frame)…
      el.style.setProperty("--ckl-px-y", `${(-t * FRAME_TRAVEL).toFixed(3)}%`);
      // …and eases out of a gentle zoom while the frame comes up the screen
      const entering = easeOutCubic(clamp(t));
      el.style.setProperty("--ckl-px-s", (FRAME_SCALE + entering * FRAME_ZOOM_IN).toFixed(4));
    }
  );

  if (variant === "float") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        ref={ref}
        src={src}
        alt={alt}
        loading={loading}
        className={`ckl-float ${className}`.trim()}
        {...imgProps}
      />
    );
  }

  return (
    <div ref={ref} className={`ckl-px ${className}`.trim()}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        loading={loading}
        className={`ckl-px__img ${imgClassName}`.trim()}
        {...imgProps}
      />
    </div>
  );
}

// Hero photo: untouched at the top of the page, then slowly zooms and sinks
// behind the fold as the gallery scrolls away. Sets --ckl-hero-p (0 → 1).
export function useHeroParallax(ref) {
  useSmoothScroll(
    ref,
    (el) => {
      const rect = el.getBoundingClientRect();
      return clamp((headerOffset() - rect.top) / Math.max(1, rect.height));
    },
    (el, p) => {
      if (p === null) el.style.removeProperty("--ckl-hero-p");
      else el.style.setProperty("--ckl-hero-p", p.toFixed(4));
    },
    { ease: 0.14 }
  );
}

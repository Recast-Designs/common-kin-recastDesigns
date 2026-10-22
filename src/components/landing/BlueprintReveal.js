"use client";

import { useRef } from "react";
import { clamp, headerOffset, useScrollFrame } from "./scroll";

// How much scrolling the reveal takes, as a fraction of the screen height.
// It runs while the drawing scrolls into view and is 100% clear by the time
// it reaches the middle of the screen (or the section pins, if that's first).
// Lower = faster. 0.23 = 40% less scrolling than the previous 0.38.
const REVEAL_LENGTH = 0.23;

// The blueprint starts hidden behind a radial shadow with only a soft glow at
// its centre. As you scroll, a clear circle grows from the centre outwards
// until the whole drawing is sharp. Scrolling back up reverses it.
export default function BlueprintReveal({ src, alt }) {
  const boxRef = useRef(null);

  useScrollFrame(boxRef, (box) => {
    const rect = box.getBoundingClientRect();
    const vh = window.innerHeight;
    const top = headerOffset();

    const center = rect.top + rect.height / 2;

    // Finish when the centre reaches mid-screen, or when the section pins
    // (whichever happens first) so there's never a long scroll while pinned
    const middle = top + (vh - top) / 2;
    const stage = box.closest(".ckl-pin__stage");
    const pinnedCenter = stage ? top + (center - stage.getBoundingClientRect().top) : middle;
    const end = Math.max(middle, pinnedCenter);
    const start = end + vh * REVEAL_LENGTH;

    const raw = clamp((start - center) / (start - end));
    const p = raw * raw * (3 - 2 * raw); // smoothstep

    const half = Math.hypot(rect.width, rect.height) / 2; // centre → corner
    const feather = Math.max(60, half * 0.45);

    box.style.setProperty("--ckl-r", `${(p * half).toFixed(1)}px`);
    box.style.setProperty("--ckl-f", `${feather.toFixed(1)}px`);
    box.style.setProperty("--ckl-p", p.toFixed(4));
    return false;
  });

  return (
    <div ref={boxRef} className="ckl-reveal">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" aria-hidden="true" className="ckl-reveal__blur" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="ckl-reveal__sharp" />
      <div className="ckl-reveal__shadow" aria-hidden="true" />
    </div>
  );
}

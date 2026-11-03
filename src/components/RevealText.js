"use client";

import { Children, Fragment, useEffect, useRef } from "react";
import { clamp, useScrollFrame } from "./landing/scroll";
import { easeOutQuart, prefersReducedMotion } from "./landing/parallax";

// ============================================================
// <RevealText> — heading animation used across the whole site
// Wrap the text inside any heading:  <h2 className="…"><RevealText>Title</RevealText></h2>
//
// 1. Scroll reveal: the letters rise out of an invisible baseline one after
//    another, left to right, with a slight tilt that straightens as they
//    land. Driven by scroll (softly eased), so it reverses when you scroll
//    back up. Even a fast scroll plays it over at least MIN_DURATION.
// 2. Once landed, a light sheen glides across the letters every few
//    seconds (and faster on hover).
//
// Screen readers get the plain text; the animated letters are hidden from
// them. Reduced-motion users see the static heading.
// ============================================================

const STAGGER = 0.5; // share of the reveal spent fanning out left → right
const EASE = 0.08; // follow speed (lower = softer, slower settle)
const MIN_DURATION = 1300; // ms
// Letters start this far below their resting place (% of their height) —
// far enough to be fully hidden below the word mask, descenders included
const RISE = 180;
const REVEAL_DISTANCE = 0.25; // fully landed once the heading is this far (× screen height) into view

// Plain text of the children, or null if they contain elements
function textOf(children) {
  let text = "";
  for (const child of Children.toArray(children)) {
    if (typeof child === "string" || typeof child === "number") text += String(child);
    else return null;
  }
  return text;
}

export default function RevealText({ children }) {
  const text = textOf(children);
  const ref = useRef(null);
  const progress = useRef(0);
  const applied = useRef(-1);
  const lastTime = useRef(0);

  // New text (e.g. a different title) → play the reveal again
  useEffect(() => {
    progress.current = 0;
    applied.current = -1;
    lastTime.current = 0;
    ref.current?.classList.remove("is-landed");
  }, [text]);

  useScrollFrame(ref, (el) => {
    if (prefersReducedMotion()) {
      el.classList.add("is-landed", "is-static");
      return false;
    }
    el.classList.remove("is-static");

    const vh = window.innerHeight;
    const rect = el.getBoundingClientRect();
    const doc = document.documentElement;
    const atEnd = window.scrollY + vh >= doc.scrollHeight - 2;
    let target = clamp((vh - rect.top) / (vh * REVEAL_DISTANCE));
    if (atEnd && rect.top < vh) target = 1; // near the page end it can't scroll further

    const now = performance.now();
    const dt = lastTime.current ? Math.min(64, now - lastTime.current) : 16;
    lastTime.current = now;
    const maxStep = dt / MIN_DURATION;
    const step = (target - progress.current) * EASE;
    let p = progress.current + Math.max(-maxStep, Math.min(maxStep, step));
    if (Math.abs(target - p) < 0.0005) p = target;
    progress.current = p;
    if (p === target) lastTime.current = 0;

    if (p !== applied.current) {
      applied.current = p;
      const chars = el.getElementsByClassName("ckl-rt__char");
      const last = Math.max(1, chars.length - 1);
      for (let i = 0; i < chars.length; i += 1) {
        const delay = (i / last) * STAGGER;
        const local = clamp((p - delay) / (1 - STAGGER));
        const e = easeOutQuart(local);
        chars[i].style.transform = `translate3d(0, ${((1 - e) * RISE).toFixed(2)}%, 0) rotate(${((1 - e) * 7).toFixed(2)}deg)`;
        chars[i].style.opacity = clamp(local * 2.2).toFixed(3);
      }
    }

    if (p >= 0.999) el.classList.add("is-landed");
    else if (p < 0.97) el.classList.remove("is-landed");

    return p !== target;
  });

  // Anything that isn't plain text is shown as-is
  if (text === null) return <>{children}</>;

  let index = 0;
  return (
    <span ref={ref} className="ckl-rt">
      <span className="ckl-rt__sr">{text}</span>
      <span aria-hidden="true">
        {text.split("\n").map((line, li) => (
          <Fragment key={li}>
            {li > 0 && "\n"}
            {line.split(" ").map((word, wi) => (
              <Fragment key={wi}>
                {wi > 0 && " "}
                {word && (
                  <span className="ckl-rt__word">
                    {Array.from(word).map((ch, ci) => {
                      const i = index;
                      index += 1;
                      return (
                        <span key={ci} className="ckl-rt__char" style={{ "--i": i }}>
                          {ch}
                        </span>
                      );
                    })}
                  </span>
                )}
              </Fragment>
            ))}
          </Fragment>
        ))}
      </span>
    </span>
  );
}

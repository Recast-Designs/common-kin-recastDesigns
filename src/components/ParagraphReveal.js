"use client";

import { useEffect } from "react";

// ============================================================
// <ParagraphReveal /> — every paragraph on the site fades in
// Paragraphs start at opacity 0 and slowly fade to 1 (after a short delay)
// each time they scroll into view — scrolling down or back up. Once a
// paragraph has left the screen completely it quietly resets, so the fade
// plays again the next time you reach it. Paragraphs that arrive together
// are staggered top to bottom. Rendered once, in page.js.
//
// Timing lives in globals.css ("PARAGRAPH FADE-IN").
// Not faded: footer column titles and other subheadings written as <p>
// (they use the heading animation), and form messages (errors / notices),
// which should appear right away.
// Reduced-motion users see everything immediately.
// ============================================================

const READY = "ckl-p-ready"; // paragraphs hidden until they're revealed
const LIVE = "ckl-p-live"; // the observers below are running
const SKIP = ".ckl-footer__title, .text-red-600, .text-emerald-700, .ckl-error";
const MAX_STAGGER = 5; // data-ckl-in="0" … "5" (delays in globals.css)

// Runs before the first paint (like the theme script) so paragraphs never
// flash in and out. If the app's JavaScript fails to start, a timer shows
// them anyway.
const GATE_SCRIPT = `(function(){try{if(window.matchMedia("(prefers-reduced-motion: reduce)").matches)return;var d=document.documentElement;d.classList.add("${READY}");setTimeout(function(){if(!d.classList.contains("${LIVE}"))d.classList.remove("${READY}");},4000);}catch(e){}})();`;

export default function ParagraphReveal() {
  useEffect(() => {
    const root = document.documentElement;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce || typeof IntersectionObserver === "undefined") {
      root.classList.remove(READY);
      return undefined;
    }
    root.classList.add(READY, LIVE);

    const tracked = new WeakSet();

    // Fade in: once the paragraph is 15% up from the bottom of the screen
    // (or as soon as it comes down from the top when scrolling up)
    const enter = new IntersectionObserver(
      (entries) => {
        entries
          .filter((entry) => entry.isIntersecting && !entry.target.hasAttribute("data-ckl-in"))
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
          .forEach((entry, i) => {
            entry.target.setAttribute("data-ckl-in", String(Math.min(i, MAX_STAGGER)));
          });
      },
      { rootMargin: "0px 0px -15% 0px" }
    );

    // Reset: only when the paragraph is completely off screen, so you never
    // see it fade out — it's simply ready to fade in again next time
    const exit = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) entry.target.removeAttribute("data-ckl-in");
      });
    });

    const scan = () => {
      document.querySelectorAll("p").forEach((p) => {
        if (tracked.has(p) || p.matches(SKIP)) return;
        tracked.add(p);
        // Subheadings written as <p> use the heading animation instead
        if (p.querySelector(".ckl-rt")) {
          p.setAttribute("data-ckl-in", "skip");
          return;
        }
        enter.observe(p);
        exit.observe(p);
      });
    };

    // Pick up paragraphs added later (route changes, cart drawer, FAQ…)
    let queued = 0;
    const mo = new MutationObserver(() => {
      if (!queued) {
        queued = requestAnimationFrame(() => {
          queued = 0;
          scan();
        });
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });
    scan();

    return () => {
      enter.disconnect();
      exit.disconnect();
      mo.disconnect();
      cancelAnimationFrame(queued);
      root.classList.remove(READY, LIVE);
    };
  }, []);

  return <script dangerouslySetInnerHTML={{ __html: GATE_SCRIPT }} />;
}

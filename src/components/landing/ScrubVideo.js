"use client";

import { useEffect, useRef, useState } from "react";
import { clamp, pinnedProgress, useScrollFrame } from "./scroll";

// A muted video whose playhead follows the scroll position of `trackRef`.
// Scrolling down moves it forward, scrolling up plays it backwards.
//
// Loading:
//   - `poster` (the first frame as a small image) shows instantly, so the
//     section is never blank while the video downloads.
//   - The video streams straight from its URL (no waiting for the whole file);
//     scrubbing works as soon as the first part has arrived.
//   - `deferUntilNear` waits to download until the video is ~1.5 screens
//     away, so videos further down don't compete with the first one.
//   - The files in /public/videos are encoded with a keyframe every 4 frames,
//     which keeps them small while seeking stays fast in both directions —
//     re-encode new videos the same way (see README-COMMON-KIN.md).
export default function ScrubVideo({
  src,
  poster,
  trackRef,
  progress = pinnedProgress,
  range = [0, 1],
  className = "",
  label,
  deferUntilNear = false,
}) {
  const videoRef = useRef(null);
  const state = useRef({ shown: 0, ready: false });
  const [near, setNear] = useState(!deferUntilNear);

  useEffect(() => {
    if (near) return undefined;
    const el = videoRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setNear(true);
      return undefined;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setNear(true);
          observer.disconnect();
        }
      },
      { rootMargin: "150% 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [near]);

  function handleMetadata() {
    const video = videoRef.current;
    if (!video) return;
    state.current.ready = true;
    // iOS Safari only paints seeked frames after the video has played once
    const attempt = video.play();
    if (attempt && typeof attempt.then === "function") {
      attempt.then(() => video.pause()).catch(() => {});
    }
  }

  useScrollFrame(trackRef, (el) => {
    const video = videoRef.current;
    const s = state.current;
    if (!video || !s.ready || !Number.isFinite(video.duration)) return false;

    const [from, to] = range;
    const p = clamp((progress(el) - from) / (to - from));
    const target = p * Math.max(0, video.duration - 0.05);

    // Ease towards the target so fast scrolling still looks smooth
    s.shown += (target - s.shown) * 0.25;
    if (Math.abs(target - s.shown) < 0.004) s.shown = target;

    if (!video.paused) video.pause();
    if (!video.seeking && Math.abs(video.currentTime - s.shown) > 0.01) {
      video.currentTime = s.shown;
    }
    return Math.abs(target - s.shown) > 0.004;
  });

  return (
    <video
      ref={videoRef}
      src={(near && src) || undefined}
      poster={poster || undefined}
      className={className}
      muted
      playsInline
      preload={near ? "auto" : "none"}
      disablePictureInPicture
      disableRemotePlayback
      aria-label={label}
      onLoadedMetadata={handleMetadata}
    />
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { clamp, pinnedProgress, useScrollFrame } from "./scroll";

// An animated GIF whose current frame follows the scroll position of `trackRef`,
// the GIF counterpart of <ScrubVideo>. Scrolling down moves it forward,
// scrolling up plays it backwards. Same props as ScrubVideo.
//
// How it works:
//   - A small Web Worker streams the GIF, indexes its frames as the bytes
//     arrive and decodes only the frame that is asked for. Scrubbing starts as
//     soon as the first frames have downloaded — no waiting for the whole file,
//     and the page never holds hundreds of decoded frames in memory.
//   - The decoded frame is painted onto a <canvas>, which takes the same
//     classes (and object-fit rules) the <video> used.
//   - While the file is still downloading, the frame count is estimated from
//     the file size, so the timing doesn't stretch as frames arrive.
//   - Frames must be self-contained (After Effects / Photoshop export with
//     "restore to background" disposal, as Comp_1_1.gif is), so any frame can
//     be drawn on its own in both scroll directions.
//   - If a worker can't be created or the file fails to load, it falls back to
//     a plain <img> of the GIF (plays on its own, not scroll-linked).

const WORKER_SOURCE = `
"use strict";
let buf = new Uint8Array(0);
let len = 0;
let pos = 0;
let header = false;
let ended = false;
let complete = false;
let expected = 0;
let W = 0;
let H = 0;
let gct = null;
let gce = null;
const frames = [];
let indices = null;
const spare = [];

function grow(min) {
  if (buf.length >= min) return;
  const next = new Uint8Array(Math.max(min, buf.length * 2, 1 << 20));
  next.set(buf.subarray(0, len));
  buf = next;
}

function append(chunk) {
  grow(len + chunk.length);
  buf.set(chunk, len);
  len += chunk.length;
}

// Returns the position after a chain of data sub-blocks, or -1 if incomplete
function skipBlocks(p) {
  for (;;) {
    if (p >= len) return -1;
    const n = buf[p];
    p += n + 1;
    if (n === 0) return p;
  }
}

function parse() {
  if (!header) {
    if (len < 13) return;
    if (buf[0] !== 0x47 || buf[1] !== 0x49 || buf[2] !== 0x46) throw new Error("Not a GIF file");
    W = buf[6] | (buf[7] << 8);
    H = buf[8] | (buf[9] << 8);
    const flags = buf[10];
    let p = 13;
    if (flags & 0x80) {
      const size = 3 * (2 << (flags & 7));
      if (len < p + size) return;
      gct = buf.slice(p, p + size);
      p += size;
    }
    pos = p;
    header = true;
    postMessage({ type: "meta", width: W, height: H });
  }

  while (!ended && pos < len) {
    const b = buf[pos];
    if (b === 0x3b) {
      ended = true;
      break;
    }
    if (b === 0x21) {
      if (pos + 2 >= len) return;
      const end = skipBlocks(pos + 2);
      if (end < 0) return;
      if (buf[pos + 1] === 0xf9 && buf[pos + 2] >= 4) {
        const packed = buf[pos + 3];
        gce = { disposal: (packed >> 2) & 7, transparent: packed & 1 ? buf[pos + 6] : -1 };
      }
      pos = end;
      continue;
    }
    if (b === 0x2c) {
      if (pos + 10 > len) return;
      const x = buf[pos + 1] | (buf[pos + 2] << 8);
      const y = buf[pos + 3] | (buf[pos + 4] << 8);
      const w = buf[pos + 5] | (buf[pos + 6] << 8);
      const h = buf[pos + 7] | (buf[pos + 8] << 8);
      const flags = buf[pos + 9];
      let p = pos + 10;
      let palette = gct;
      if (flags & 0x80) {
        const size = 3 * (2 << (flags & 7));
        if (len < p + size) return;
        palette = buf.slice(p, p + size);
        p += size;
      }
      if (p >= len) return;
      const end = skipBlocks(p + 1);
      if (end < 0) return;
      frames.push({
        x, y, w, h,
        interlaced: (flags & 0x40) !== 0,
        palette,
        transparent: gce ? gce.transparent : -1,
        disposal: gce ? gce.disposal : 0,
        data: p,
      });
      gce = null;
      pos = end;
      continue;
    }
    ended = true; // unknown block — stop here
  }
}

// GIF LZW decoder: writes \`length\` palette indices into \`out\`
function lzw(p, out, length) {
  const minCodeSize = buf[p++];
  const clearCode = 1 << minCodeSize;
  const eoiCode = clearCode + 1;
  let nextCode = eoiCode + 1;
  let codeSize = minCodeSize + 1;
  let codeMask = (1 << codeSize) - 1;
  let shift = 0;
  let cur = 0;
  let op = 0;
  let blockLeft = buf[p++];
  const table = lzw.table || (lzw.table = new Int32Array(4096));
  let prev = -1;

  for (;;) {
    while (shift < 16) {
      if (blockLeft === 0) break;
      cur |= buf[p++] << shift;
      shift += 8;
      if (blockLeft === 1) blockLeft = buf[p++];
      else blockLeft--;
    }
    if (shift < codeSize) break;
    const code = cur & codeMask;
    cur >>= codeSize;
    shift -= codeSize;

    if (code === clearCode) {
      nextCode = eoiCode + 1;
      codeSize = minCodeSize + 1;
      codeMask = (1 << codeSize) - 1;
      prev = -1;
      continue;
    }
    if (code === eoiCode) break;

    const chaseCode = code < nextCode ? code : prev;
    if (chaseCode < 0) break; // corrupt stream
    let chaseLength = 0;
    let chase = chaseCode;
    while (chase > clearCode) {
      chase = table[chase] >> 8;
      chaseLength++;
    }
    const k = chase;
    const opEnd = op + chaseLength + (chaseCode !== code ? 1 : 0);
    if (opEnd > length) break; // longer than the frame — stop
    out[op++] = k;
    op += chaseLength;
    let b = op;
    if (chaseCode !== code) out[op++] = k;
    chase = chaseCode;
    while (chaseLength--) {
      chase = table[chase];
      out[--b] = chase & 0xff;
      chase >>= 8;
    }
    if (prev >= 0 && nextCode < 4096) {
      table[nextCode++] = (prev << 8) | k;
      if (nextCode >= codeMask + 1 && codeSize < 12) {
        codeSize++;
        codeMask = (codeMask << 1) | 1;
      }
    }
    prev = code;
  }
  // Pad a short frame with the transparent/first colour instead of garbage
  if (op < length) out.fill(0, op, length);
}

const lut = new Uint32Array(256);

function render(index) {
  const f = frames[index];
  const n = f.w * f.h;
  if (!indices || indices.length < n) indices = new Uint8Array(n);
  lzw(f.data, indices, n);

  let buffer = null;
  while (spare.length) {
    const candidate = spare.pop();
    if (candidate.byteLength === n * 4) {
      buffer = candidate;
      break;
    }
  }
  if (!buffer) buffer = new ArrayBuffer(n * 4);

  // Palette → RGBA (little-endian ABGR words)
  const pal = f.palette;
  for (let c = 0; c < 256; c++) {
    const q = c * 3;
    lut[c] = pal && q + 2 < pal.length
      ? (0xff000000 | (pal[q + 2] << 16) | (pal[q + 1] << 8) | pal[q]) >>> 0
      : 0xff000000;
  }
  if (f.transparent >= 0) lut[f.transparent] = 0;

  const px = new Uint32Array(buffer);
  if (!f.interlaced) {
    for (let i = 0; i < n; i++) px[i] = lut[indices[i]];
  } else {
    // Interlaced rows arrive in 4 passes: 0,8,16…  4,12…  2,6…  1,3,5…
    const passes = [[0, 8], [4, 8], [2, 4], [1, 2]];
    let src = 0;
    for (const [start, step] of passes) {
      for (let row = start; row < f.h; row += step) {
        const dst = row * f.w;
        for (let col = 0; col < f.w; col++) px[dst + col] = lut[indices[src++]];
      }
    }
  }

  postMessage(
    { type: "frame", index, x: f.x, y: f.y, w: f.w, h: f.h, buffer },
    [buffer]
  );
}

function report() {
  postMessage({ type: "progress", count: frames.length, complete, received: len, expected });
}

async function load(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("HTTP " + res.status);
    expected = Number(res.headers.get("content-length")) || 0;
    if (expected) grow(expected);
    let reported = 0;
    if (res.body && typeof res.body.getReader === "function") {
      const reader = res.body.getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        append(value);
        parse();
        if (frames.length !== reported) {
          reported = frames.length;
          report();
        }
      }
    } else {
      append(new Uint8Array(await res.arrayBuffer()));
      parse();
    }
    complete = true;
    if (!frames.length) throw new Error("GIF has no frames");
    if (frames.some((f) => f.disposal !== 2)) {
      postMessage({
        type: "warning",
        message: "Some GIF frames are not self-contained (disposal ≠ restore to background); scrubbing may show partial frames.",
      });
    }
    report();
  } catch (err) {
    postMessage({ type: "error", message: String((err && err.message) || err) });
  }
}

onmessage = (e) => {
  const msg = e.data;
  if (msg.type === "load") load(msg.url);
  else if (msg.type === "frame") {
    if (!frames.length) return;
    try {
      render(Math.min(frames.length - 1, Math.max(0, msg.index | 0)));
    } catch (err) {
      postMessage({ type: "error", message: String((err && err.message) || err) });
    }
  } else if (msg.type === "recycle" && msg.buffer) {
    if (spare.length < 2) spare.push(msg.buffer);
  }
};
`;

function freshState() {
  return {
    worker: null,
    width: 0,
    height: 0,
    count: 0,
    complete: false,
    received: 0,
    expected: 0,
    shown: 0,
    drawn: -1,
    pending: null,
  };
}

export default function ScrubGif({
  src,
  poster,
  trackRef,
  progress = pinnedProgress,
  range = [0, 1],
  className = "",
  label,
  deferUntilNear = false,
  // The GIF is a large file, so it starts downloading a little earlier than a video
  nearMargin = "300% 0px",
}) {
  const canvasRef = useRef(null);
  const state = useRef(freshState());
  const [near, setNear] = useState(!deferUntilNear);
  const [failed, setFailed] = useState(false);

  // Wait until the section is close before downloading
  useEffect(() => {
    if (near) return undefined;
    const el = canvasRef.current;
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
      { rootMargin: nearMargin }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [near, nearMargin]);

  // Start the decoder worker
  useEffect(() => {
    if (!near || !src) return undefined;
    if (typeof Worker === "undefined" || typeof Blob === "undefined") {
      setFailed(true);
      return undefined;
    }

    let worker;
    let workerUrl;
    try {
      workerUrl = URL.createObjectURL(new Blob([WORKER_SOURCE], { type: "text/javascript" }));
      worker = new Worker(workerUrl);
    } catch {
      if (workerUrl) URL.revokeObjectURL(workerUrl);
      setFailed(true);
      return undefined;
    }

    const s = (state.current = freshState());
    s.worker = worker;

    worker.onmessage = (e) => {
      const msg = e.data;
      const canvas = canvasRef.current;
      if (msg.type === "meta") {
        s.width = msg.width;
        s.height = msg.height;
        if (canvas) {
          canvas.width = msg.width;
          canvas.height = msg.height;
          if (poster) {
            const img = new Image();
            img.onload = () => {
              if (s.drawn < 0 && canvasRef.current) {
                canvasRef.current
                  .getContext("2d")
                  ?.drawImage(img, 0, 0, s.width, s.height);
              }
            };
            img.src = poster;
          }
        }
      } else if (msg.type === "progress") {
        s.count = msg.count;
        s.complete = msg.complete;
        s.received = msg.received;
        s.expected = msg.expected;
      } else if (msg.type === "frame") {
        s.pending = null;
        const ctx = canvas?.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.putImageData(
            new ImageData(new Uint8ClampedArray(msg.buffer), msg.w, msg.h),
            msg.x,
            msg.y
          );
          s.drawn = msg.index;
        }
        // Hand the pixel buffer back so the worker can reuse it
        worker.postMessage({ type: "recycle", buffer: msg.buffer }, [msg.buffer]);
      } else if (msg.type === "warning") {
        console.warn(`[ScrubGif] ${msg.message}`);
      } else if (msg.type === "error") {
        console.warn(`[ScrubGif] ${msg.message} — falling back to <img>`);
        setFailed(true);
      }
    };
    worker.onerror = () => setFailed(true);

    // Worker lives at a blob: URL, so it needs an absolute address
    worker.postMessage({ type: "load", url: new URL(src, window.location.href).href });

    return () => {
      worker.terminate();
      URL.revokeObjectURL(workerUrl);
      if (state.current.worker === worker) state.current = freshState();
    };
  }, [near, src, poster]);

  useScrollFrame(trackRef, (el) => {
    const s = state.current;
    if (!s.worker || s.count === 0) return false;

    // Exact frame count once downloaded; until then, estimate from the file size
    let total = s.count;
    if (!s.complete && s.expected > 0 && s.received > 0) {
      total = Math.max(s.count, Math.round((s.count * s.expected) / s.received));
    }

    const [from, to] = range;
    const p = clamp((progress(el) - from) / Math.max(0.0001, to - from));
    const target = p * Math.max(0, total - 1);

    // Ease towards the target so fast scrolling still looks smooth
    s.shown += (target - s.shown) * 0.25;
    if (Math.abs(target - s.shown) < 0.5) s.shown = target;

    // Only frames that have arrived can be shown
    const wanted = Math.min(s.count - 1, Math.max(0, Math.round(s.shown)));
    if (wanted !== s.drawn && s.pending === null) {
      s.pending = wanted;
      s.worker.postMessage({ type: "frame", index: wanted });
    }
    return s.pending !== null || Math.abs(target - s.shown) >= 0.5;
  });

  if (failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={label || ""} className={className} />
    );
  }

  return <canvas ref={canvasRef} className={className} role="img" aria-label={label} />;
}
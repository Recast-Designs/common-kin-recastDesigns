// ============================================================
// DEFAULT LANDING CONTENT
// Copy and media taken from the Figma file. Every value can be
// overridden from the Firestore product document — see the
// `landing` field described in README-COMMON-KIN.md.
// ============================================================

export const DEFAULT_PRODUCT_IMAGE = "/images/incense-holder.webp";

const ALIGN_COPY =
  "align to something you want to accomplish, relaxation time, meditation, or a task ahead of you. light your incense, and immerse in what’s ahead.";

export const DEFAULT_DESCRIPTION =
  "A sculptural incense holder for your daily pause. Carefully handcrafted in Seattle, with a folded form that holds the ritual beautifully.";

export const DEFAULT_SAFETY_NOTE =
  "Burn incense in a well ventilated space, on a stable surface. Never leave burning incense unattended.";

export const DEFAULT_SPECS = [
  { label: "Wood", value: "Solid Swedish Oak Wood" },
  { label: "Metal", value: "Polished Aluminum Sheet Holder" },
  { label: "Origin", value: "Seattle, Washington" },
];

export const DEFAULT_LANDING = {
  // Scroll-scrubbed videos (served from /public/videos)
  scrollVideo: "/videos/up_down.mp4",
  smokeVideo: "/videos/second.mp4",
  // First frame of each video, shown instantly while the video loads
  scrollVideoPoster: "/images/up_down-poster.webp",
  smokeVideoPoster: "/images/second-poster.webp",

  // "Designed to last" — section with the up/down video
  intro: {
    title: "Designed\nto last",
    text: ALIGN_COPY,
  },

  // Sections beside the smoke video
  stories: [
    { title: "Serenity", text: ALIGN_COPY, images: [] },
    {
      title: "Meditative",
      text: ALIGN_COPY,
      images: [
        { src: "/images/meditative-1.webp", alt: "Incense holder on a low wooden table" },
        { src: "/images/meditative-2.webp", alt: "Incense holder on a sunlit shelf" },
      ],
    },
    {
      title: "Human",
      text: ALIGN_COPY,
      images: [{ src: "/images/human.webp", alt: "Brass incense holder on a bedside table" }],
    },
  ],

  // "Oregon Beginning"
  origin: {
    title: "Oregon\nBeginning",
    text: ALIGN_COPY,
    image: "/images/oregon-beginning-cropped.png",
    imageAlt: "Common Kin box beside a flower vase",
  },

  // Last section — blueprint with the radial reveal
  blueprint: {
    title: "Designed\nto last",
    text: ALIGN_COPY,
    image: "/images/blueprint.webp",
    imageAlt: "Technical drawing of the incense burner and tray",
  },
};

// Shallow-merge the Firestore `landing` object over the defaults,
// one section at a time, so a partial override keeps the rest.
export function resolveLanding(landing) {
  const src = landing && typeof landing === "object" ? landing : {};
  return {
    scrollVideo: src.scrollVideo || DEFAULT_LANDING.scrollVideo,
    smokeVideo: src.smokeVideo || DEFAULT_LANDING.smokeVideo,
    // A custom video from Firestore gets its own poster (or none), never the default one
    scrollVideoPoster: src.scrollVideo
      ? src.scrollVideoPoster || null
      : DEFAULT_LANDING.scrollVideoPoster,
    smokeVideoPoster: src.smokeVideo
      ? src.smokeVideoPoster || null
      : DEFAULT_LANDING.smokeVideoPoster,
    intro: { ...DEFAULT_LANDING.intro, ...(src.intro || {}) },
    stories:
      Array.isArray(src.stories) && src.stories.length > 0
        ? src.stories.map((s) => ({ images: [], ...s }))
        : DEFAULT_LANDING.stories,
    origin: { ...DEFAULT_LANDING.origin, ...(src.origin || {}) },
    blueprint: { ...DEFAULT_LANDING.blueprint, ...(src.blueprint || {}) },
  };
}

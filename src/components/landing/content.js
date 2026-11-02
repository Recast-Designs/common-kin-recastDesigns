// ============================================================
// DEFAULT LANDING CONTENT
// Copy and media taken from the Figma file (third column, "The Fold"
// layout). Every value can be overridden from the Firestore product
// document — see the `landing` field described in README-COMMON-KIN.md.
// Product title, description and reviews come from the Firestore
// product itself; the values here are only fallbacks.
// ============================================================

export const DEFAULT_PRODUCT_TITLE = "The Fold Incense Holder";

export const DEFAULT_PRODUCT_IMAGE = "/images/incense-holder.webp";

export const DEFAULT_DESCRIPTION =
  "Individually crafted and reduced to two essential elements, the fold incense holder creates an intentionally elevated essential to enjoy anywhere you call home.";

export const DEFAULT_SAFETY_NOTE =
  "Burn incense in a well ventilated space, on a stable surface. Never leave burning incense unattended.";

export const DEFAULT_SPECS = [
  { label: "Wood", value: "North American White Ash Wood" },
  { label: "Metal", value: "Polished, Folded, Aluminum" },
  { label: "Origin", value: "Seattle, Washington" },
];

export const DEFAULT_LANDING = {
  // Scroll-scrubbed media (served from /public/videos).
  // The smoke section uses the GIF animation (public/videos/second.gif),
  // scrubbed frame by frame by ScrubGif.
  scrollVideo: "/videos/up_down.mp4",
  smokeVideo: "/videos/second.gif",
  // First frame of each video, shown instantly while the video loads.
  // The GIF needs no poster: its first frame is drawn as soon as the
  // first bytes arrive (the old second-poster.webp no longer matches it).
  scrollVideoPoster: "/images/up_down-poster.webp",
  smokeVideoPoster: null,

  // "Elevated Simplicity" — section with the up/down video
  intro: {
    title: "Elevated\nSimplicity",
    text: "true design lies in what you strip away. Crafted from a solid block of milled ash and a single sheet of folded aluminum, this holder reduces a daily ritual to its purest form.",
  },

  // Sections beside the smoke animation — it burns down across all three
  // and finishes at the end of "Ritualistic"
  stories: [
    {
      title: "Intentional",
      text: "the piece is designed around a singular mantra: everyday rituals deserve everyday beauty. Pairing a raw, organic wood with engineered metal, The Fold strikes a deliberate balance between natural warmth and industrial precision.",
      images: [],
    },
    {
      title: "Enduring",
      text: "common materials like wood and metal patina and wear in a way that makes the object uniquely yours. the ash may fall, the stick may burn, but honest materials last the test of time.",
      images: [
        { src: "/images/meditative-1.webp", alt: "Incense holder on a low wooden table" },
        { src: "/images/meditative-2.webp", alt: "Incense holder on a sunlit shelf" },
      ],
    },
    {
      title: "Ritualistic",
      text: "The line of ash serves as a fragile artifact of the last hour. It is your visual proof of taking a moment to pause. When you are ready for the next pause, simply tilt the aluminum tray, release the ash, and transform The Fold back into an empty vessel, ready to hold the next moment.",
      images: [{ src: "/images/human.webp", alt: "Brass incense holder on a bedside table" }],
    },
  ],

  // "Handcrafted to Order"
  origin: {
    title: "Handcrafted\nto Order",
    text: "Every Fold holder is handmade and born in Seattle, where we source the wood and partner with local craftsmen. Each wood block is sanded, stained, and personally packed by us to ensure the final piece feels deeply intentional. The result is a common object built for you, by human hands.",
    image: "/images/oregon-beginning-cropped.png",
    imageAlt: "Common Kin box beside a flower vase",
  },

  // Last section — blueprint with the radial reveal
  blueprint: {
    title: "Considered\nby Design",
    text: "A study in form, function, and material. Each line serves a purpose, bringing together two simple materials to create an object designed to hold space for a moment of pause.",
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

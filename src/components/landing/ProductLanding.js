"use client";

import { useRef, useState } from "react";
import { useStore } from "@/lib/store";
import ScrubVideo from "./ScrubVideo";
import BlueprintReveal from "./BlueprintReveal";
import ReviewsCarousel from "./ReviewsCarousel";
import Stars from "./Stars";
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_PRODUCT_IMAGE,
  DEFAULT_SAFETY_NOTE,
  DEFAULT_SPECS,
  resolveLanding,
} from "./content";

const CURRENCY = process.env.NEXT_PUBLIC_CURRENCY || "USD";

// "$62" for whole amounts, "$62.50" otherwise
function money(amount) {
  const value = Number(amount || 0);
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: CURRENCY,
      minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${value} ${CURRENCY}`;
  }
}

// Price with the currency code after it, as in the design ("$62 USD")
function moneyWithCode(amount) {
  const text = money(amount);
  return text.includes(CURRENCY) ? text : `${text} ${CURRENCY}`;
}

// Firestore `specs` may be an array of { label, value } or a plain map
function normalizeSpecs(specs) {
  if (Array.isArray(specs)) return specs.filter((s) => s && s.label);
  if (specs && typeof specs === "object") {
    return Object.entries(specs).map(([label, value]) => ({ label, value }));
  }
  return DEFAULT_SPECS;
}

function BagIcon({ className = "h-5 w-5" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 8h14l-1 12H6L5 8z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" strokeLinecap="round" />
    </svg>
  );
}

function scrollToReviews() {
  document.getElementById("reviews")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

// ============================================================
// VARIANTS (colours / finishes)
// Preferred Firestore shape — one map per colour:
//   variants: [
//     { name: "Aluminum on Oak", price: 62, image: "https://…", available: true },
//     { name: "Brass on Maple",  price: 95, image: "https://…", available: false },
//   ]
//   name       shown under the card and saved on the cart line
//   price      price for this colour (falls back to the product `price`)
//   image      photo shown on the colour card
//   heroImage  optional — big photo shown on the left when this colour is picked
//   available  false → card is greyed/blurred with a red "Sold Out", not selectable
// Older products without `variants` still work from colors / colorPrices /
// colorImages / soldOutColors.
// ============================================================
function normalizeVariants(product) {
  const basePrice = Number(product.price ?? 0);

  if (Array.isArray(product.variants) && product.variants.length > 0) {
    return product.variants
      .filter((v) => v && (v.name || v.color))
      .map((v) => ({
        name: String(v.name || v.color),
        price: Number(v.price ?? basePrice),
        image: v.image || null,
        heroImage: v.heroImage || null,
        available: v.available !== false,
      }));
  }

  const colors = Array.isArray(product.colors) ? product.colors : [];
  const soldOut = new Set(Array.isArray(product.soldOutColors) ? product.soldOutColors : []);
  return colors.map((c) => ({
    name: String(c),
    price: Number(product.colorPrices?.[c] ?? basePrice),
    image: product.colorImages?.[c] || null,
    heroImage: product.colorImages?.[c] || null,
    available: !soldOut.has(c),
  }));
}

// ============================================================
// HERO — gallery + buy panel
// ============================================================
function BuyPanel({ product, reviews }) {
  const { addToCart, setCartOpen } = useStore();

  const title = product.title || "Common Kin Incense Holder";
  const images =
    Array.isArray(product.images) && product.images.length > 0
      ? product.images.filter((img) => img?.src)
      : [{ src: DEFAULT_PRODUCT_IMAGE, alt: title }];

  const variants = normalizeVariants(product);
  const firstAvailable = variants.find((v) => v.available) ?? variants[0] ?? null;

  const [color, setColor] = useState(firstAvailable?.name ?? null);
  const [incense, setIncense] = useState(product.incenseOptions?.[0] ?? null);
  const [activeImage, setActiveImage] = useState(0);
  const [added, setAdded] = useState(false);

  // Keep the selection valid if the document changes while the page is open
  const selected =
    variants.find((v) => v.name === color && v.available) || firstAvailable || null;
  const selectedName = selected?.name ?? null;

  const priceOf = (v) => Number(v?.price ?? product.price ?? 0);
  const cardImageOf = (v) => v?.image || images[0]?.src || DEFAULT_PRODUCT_IMAGE;

  const rating = Number(product.rating || 0);
  const reviewCount = Number(product.reviewCount || 0) || reviews.length;
  const specs = normalizeSpecs(product.specs);
  const allSoldOut = variants.length > 0 && variants.every((v) => !v.available);
  const isSoldOut = product.soldOut === true || allSoldOut || (selected !== null && !selected.available);
  const mainImage =
    selected?.heroImage && activeImage === 0
      ? { src: selected.heroImage, alt: `${title} — ${selected.name}` }
      : images[activeImage] || images[0];

  function handleAddToCart() {
    if (isSoldOut) return;
    // Same addToCart as before — the selected colour's price and image are
    // passed through the product object so the cart shows the right line item.
    addToCart(
      {
        ...product,
        title,
        price: priceOf(selected),
        images: [{ src: cardImageOf(selected), alt: title }, ...images],
      },
      selectedName,
      incense
    );
    setAdded(true);
    setCartOpen(true);
    setTimeout(() => setAdded(false), 1800);
  }

  return (
    <section className="ckl-hero" aria-label={title}>
      {/* Gallery */}
      <div className="ckl-hero__gallery">
        {mainImage?.src && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={mainImage.src}
            alt={mainImage.alt || title}
            className="ckl-hero__image"
            fetchPriority="high"
          />
        )}
        {images.length > 1 && (
          <div className="ckl-hero__thumbs">
            {images.map((img, i) => (
              <button
                key={`${img.src}-${i}`}
                type="button"
                onClick={() => setActiveImage(i)}
                aria-label={`Show image ${i + 1}`}
                aria-pressed={activeImage === i}
                className={`ckl-thumb ${activeImage === i ? "is-active" : ""}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.src} alt="" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Buy panel */}
      <div className="ckl-hero__panel">
        <div className="ckl-hero__panel-inner">
          <div className="flex flex-col gap-3">
            <h1 className="ckl-display ckl-h3">{title}</h1>
            <p className="ckl-display ckl-price">{moneyWithCode(priceOf(selected))}</p>
            {(rating > 0 || reviewCount > 0) && (
              <div className="flex items-center gap-2">
                <Stars value={rating || 5} />
                {reviewCount > 0 && (
                  <button type="button" onClick={scrollToReviews} className="ckl-meta ckl-link">
                    {reviewCount}
                    {product.reviewCountPlus ? "+" : ""} Review{reviewCount === 1 ? "" : "s"}
                  </button>
                )}
              </div>
            )}
          </div>

          <p className="ckl-lead">{product.description || DEFAULT_DESCRIPTION}</p>

          {variants.length > 0 && (
            <div className="ckl-variants" role="radiogroup" aria-label="Finish">
              {variants.map((v) => {
                const soldOut = !v.available;
                const isSelected = v.name === selectedName && !soldOut;
                return (
                  <button
                    key={v.name}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    aria-disabled={soldOut}
                    aria-label={`${v.name}, ${money(priceOf(v))}${soldOut ? ", sold out" : ""}`}
                    onClick={() => {
                      if (soldOut) return;
                      setColor(v.name);
                      setActiveImage(0);
                    }}
                    className={`ckl-variant ${isSelected ? "is-selected" : ""} ${soldOut ? "is-sold-out" : ""}`}
                  >
                    <span className="ckl-variant__card">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={cardImageOf(v)}
                        alt=""
                        className={v.image ? "" : "is-tray-crop"}
                      />
                      {soldOut && <span className="ckl-variant__sold">Sold Out</span>}
                    </span>
                    <span className="ckl-variant__row">
                      <span className="ckl-variant__name">{v.name}</span>
                      <span className="ckl-display ckl-variant__price">{money(priceOf(v))}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {product.incenseOptions?.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="ckl-small">Incense</p>
              <div className="flex flex-wrap gap-2">
                {product.incenseOptions.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setIncense(opt)}
                    aria-pressed={incense === opt}
                    className={`ckl-chip ${incense === opt ? "is-selected" : ""}`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {specs.length > 0 && (
            <dl className="ckl-specs">
              {specs.map((s) => (
                <div key={s.label} className="ckl-specs__row">
                  <dt>{s.label}</dt>
                  <dd>{s.value}</dd>
                </div>
              ))}
            </dl>
          )}

          <p className="ckl-small">{product.safetyNote || DEFAULT_SAFETY_NOTE}</p>

          <button
            type="button"
            onClick={handleAddToCart}
            disabled={isSoldOut}
            className="ckl-cta"
          >
            <span>{isSoldOut ? "Sold Out" : added ? "Added" : "Add To Cart"}</span>
            <BagIcon className="ckl-cta__icon" />
          </button>
        </div>
      </div>
    </section>
  );
}

function HeroPlaceholder({ message, isError }) {
  return (
    <section className="ckl-hero" aria-busy={!message}>
      <div className="ckl-hero__gallery">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={DEFAULT_PRODUCT_IMAGE} alt="" className="ckl-hero__image" />
      </div>
      <div className="ckl-hero__panel">
        <div className="ckl-hero__panel-inner">
          {message ? (
            <p className={`ckl-lead ${isError ? "ckl-error" : ""}`}>{message}</p>
          ) : (
            <div className="flex flex-col gap-4" aria-label="Loading product">
              <span className="ckl-skeleton" style={{ width: "70%", height: 30 }} />
              <span className="ckl-skeleton" style={{ width: 90, height: 20 }} />
              <span className="ckl-skeleton" style={{ width: "100%", height: 76 }} />
              <span className="ckl-skeleton" style={{ width: "100%", height: 55 }} />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// ============================================================
// "DESIGNED TO LAST" — up/down video scrubbed by scroll
// ============================================================
function IntroSection({ intro, video, poster }) {
  const trackRef = useRef(null);
  return (
    <section ref={trackRef} className="ckl-pin ckl-pin--intro">
      <div className="ckl-pin__stage ckl-intro">
        <div className="ckl-intro__video">
          <ScrubVideo
            src={video}
            poster={poster}
            trackRef={trackRef}
            className="ckl-video ckl-video--mirror"
            label="The incense holder lifting off and settling back down"
          />
        </div>
        <div className="ckl-intro__copy">
          <h2 className="ckl-display ckl-h1">{intro.title}</h2>
          <p className="ckl-copy">{intro.text}</p>
        </div>
      </div>
    </section>
  );
}

// ============================================================
// SERENITY / MEDITATIVE / HUMAN — smoke video pinned on the left
// The video plays through in the first 60% of the section (40% less
// scrolling than before), then holds its last frame. Lower = faster.
// ============================================================
const SMOKE_VIDEO_END = 0.6;
function StoriesSection({ stories, video, poster }) {
  const trackRef = useRef(null);
  return (
    <section ref={trackRef} className="ckl-stories">
      <div className="ckl-stories__media">
        <div className="ckl-stories__sticky">
          <ScrubVideo
            src={video}
            poster={poster}
            trackRef={trackRef}
            range={[0, SMOKE_VIDEO_END]}
            deferUntilNear
            className="ckl-video ckl-video--portrait"
            label="Smoke rising from the incense holder"
          />
        </div>
      </div>
      <div className="ckl-stories__list">
        {stories.map((story, i) => {
          const images = (story.images || []).filter((img) => img?.src).slice(0, 2);
          return (
            <article key={`${story.title}-${i}`} className="ckl-story">
              {images.length > 0 && (
                <div className={`ckl-story__images ckl-story__images--${images.length}`}>
                  {images.map((img, j) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={`${img.src}-${j}`} src={img.src} alt={img.alt || ""} loading="lazy" />
                  ))}
                </div>
              )}
              <h2 className="ckl-display ckl-h1 ckl-right">{story.title}</h2>
              <p className="ckl-copy ckl-right">{story.text}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

// ============================================================
// OREGON BEGINNING
// ============================================================
function OriginSection({ origin }) {
  return (
    <section className="ckl-section ckl-origin">
      {origin.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={origin.image} alt={origin.imageAlt || ""} loading="lazy" className="ckl-origin__image" />
      )}
      <div className="ckl-origin__copy">
        <h2 className="ckl-display ckl-h1 ckl-right">{origin.title}</h2>
        <p className="ckl-copy ckl-right">{origin.text}</p>
      </div>
    </section>
  );
}

// ============================================================
// LAST SECTION — blueprint with the radial reveal
// ============================================================
function BlueprintSection({ blueprint }) {
  return (
    <section className="ckl-pin ckl-pin--blueprint">
      <div className="ckl-pin__stage ckl-blueprint">
        <div className="ckl-blueprint__copy">
          <h2 className="ckl-display ckl-h1">{blueprint.title}</h2>
          <p className="ckl-copy">{blueprint.text}</p>
        </div>
        <div className="ckl-blueprint__art">
          <BlueprintReveal src={blueprint.image} alt={blueprint.imageAlt || ""} />
        </div>
      </div>
    </section>
  );
}

// ============================================================
// PAGE
// ============================================================
export default function ProductLanding({ product, loading, error }) {
  const landing = resolveLanding(product?.landing);
  const reviews = Array.isArray(product?.reviews)
    ? product.reviews.filter((r) => r && r.text)
    : [];

  return (
    <main className="ckl-landing">
      {product ? (
        <BuyPanel key={product.id} product={product} reviews={reviews} />
      ) : (
        <HeroPlaceholder
          message={
            loading
              ? null
              : error || "This product isn't available right now. Please check back soon."
          }
          isError={Boolean(error)}
        />
      )}

      <IntroSection
        intro={landing.intro}
        video={landing.scrollVideo}
        poster={landing.scrollVideoPoster}
      />
      <StoriesSection
        stories={landing.stories}
        video={landing.smokeVideo}
        poster={landing.smokeVideoPoster}
      />
      <ReviewsCarousel
        reviews={reviews}
        rating={Number(product?.rating || 0)}
        reviewCount={Number(product?.reviewCount || 0)}
      />
      <OriginSection origin={landing.origin} />
      <BlueprintSection blueprint={landing.blueprint} />
    </main>
  );
}

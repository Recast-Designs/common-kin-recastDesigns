"use client";

import { useEffect, useMemo, useState } from "react";
import { db } from "@/lib/firebase";
import { StoreContext, useStore } from "@/lib/store";
import ProductLanding from "@/components/landing/ProductLanding";
import {
  addDoc,
  collection,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
/* STRIPE (disabled until online payment launches) — imports
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
*/

// ============================================================
// STORE CONFIG
// ============================================================
const SITE_NAME = "Common Kin";
const CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_CONTACT_EMAIL || "hello@commonkin.com";
const INSTAGRAM_URL =
  process.env.NEXT_PUBLIC_INSTAGRAM_URL || "https://www.instagram.com/commonkin";

// Must match CURRENCY in the cloud function
const CURRENCY = process.env.NEXT_PUBLIC_CURRENCY || "USD";

// Orders at or above this subtotal ship free (keep in sync with the cloud function)
const FREE_SHIPPING_THRESHOLD = Number(
  process.env.NEXT_PUBLIC_FREE_SHIPPING_THRESHOLD || 100
);

// ============================================================
// STRIPE CONFIG — no hard-coded keys
// Online payment is switched off for now: checkout shows "Online payment
// coming soon". To turn it back on, set ONLINE_PAYMENTS_ENABLED to true and
// remove the /* STRIPE ... */ comment markers in this file.
// ============================================================
const ONLINE_PAYMENTS_ENABLED = false;

/* STRIPE (disabled until online payment launches) — config
// Publishable key only. The SECRET key lives in the cloud function, never here.
const STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const FUNCTIONS_REGION =
  process.env.NEXT_PUBLIC_FUNCTIONS_REGION || "europe-west1";

// URL of the deployed `payments` cloud function. Uses the env var if set,
// otherwise it's built from the projectId in your Firebase config.
function getPaymentsUrl() {
  if (process.env.NEXT_PUBLIC_PAYMENTS_FUNCTION_URL) {
    return process.env.NEXT_PUBLIC_PAYMENTS_FUNCTION_URL;
  }
  const projectId = db?.app?.options?.projectId;
  return projectId
    ? `https://${FUNCTIONS_REGION}-${projectId}.cloudfunctions.net/payments`
    : null;
}

// Created once and reused so Stripe.js isn't reloaded on re-render
let stripePromise = null;
function getStripe() {
  if (!STRIPE_PUBLISHABLE_KEY) return null;
  if (!stripePromise) stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);
  return stripePromise;
}

function stripeAppearance(isDark) {
  return isDark
    ? {
        theme: "night",
        variables: {
          colorPrimary: "#fafafa",
          colorBackground: "#18181b",
          colorText: "#e4e4e7",
          borderRadius: "6px",
        },
      }
    : {
        theme: "stripe",
        variables: {
          colorPrimary: "#000000",
          colorText: "#27272a",
          borderRadius: "6px",
        },
      };
}
*/

const COUNTRIES = [
  "Egypt",
  "United Arab Emirates",
  "Jordan",
  "United States",
  "United Kingdom",
  "Other",
];

const PAGES = [
  "home",
  "shop",
  "product",
  "search",
  "account",
  "contact",
  "trade",
  "about",
  "faq",
  "returns",
  "shipping",
  "terms",
  "privacy",
  "checkout",
];

const EMPTY_ORDER = {
  email: "",
  fullName: "",
  phone: "",
  address: "",
  apartment: "",
  city: "",
  state: "",
  zip: "",
  country: "",
  notes: "",
};

const CART_STORAGE_KEY = "commonkin-cart";
const THEME_STORAGE_KEY = "commonkin-theme";

const INPUT_CLASS =
  "rounded-md border border-zinc-300 bg-white px-3 py-3 text-sm outline-none focus:border-black";

// ============================================================
// LIGHT / DARK MODE
// The light design uses the original classes unchanged. When `ck-dark` is on
// <html>, the rules below remap those same classes to a dark palette — no
// Tailwind config or layout changes needed.
// ============================================================
const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");var d=t?t==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.toggle("ck-dark",d);}catch(e){}})();`;

const THEME_CSS = String.raw`
html:not(.ck-dark){color-scheme:light}
html:not(.ck-dark) body{background:#fff}
html.ck-dark{color-scheme:dark}
html.ck-dark body{background:#09090b}
.ck-dark .bg-white{background-color:#09090b}
.ck-dark .bg-zinc-50,.ck-dark .bg-zinc-100{background-color:#18181b}
.ck-dark .bg-black{background-color:#fafafa}
.ck-dark .hover\:bg-zinc-800:hover{background-color:#d4d4d8}
.ck-dark .text-white{color:#09090b}
.ck-dark .text-black{color:#fafafa}
.ck-dark .text-zinc-800{color:#e4e4e7}
.ck-dark .text-zinc-700{color:#d4d4d8}
.ck-dark .text-zinc-600,.ck-dark .text-zinc-500{color:#a1a1aa}
.ck-dark .text-zinc-400{color:#71717a}
.ck-dark .hover\:text-black:hover{color:#fff}
.ck-dark .text-red-600{color:#f87171}
.ck-dark .text-emerald-700{color:#34d399}
.ck-dark .border-zinc-200,.ck-dark .lg\:border-zinc-200{border-color:#27272a}
.ck-dark .border-zinc-300{border-color:#3f3f46}
.ck-dark .border-black{border-color:#fafafa}
.ck-dark .hover\:border-black:hover,.ck-dark .focus\:border-black:focus{border-color:#fafafa}
.ck-dark .divide-zinc-200>*{border-color:#27272a}
.ck-dark .ring-zinc-200{--tw-ring-color:#27272a}
.ck-dark .ring-black{--tw-ring-color:#fafafa}
.ck-dark .hover\:ring-zinc-300:hover{--tw-ring-color:#52525b}
.ck-dark .fill-black{fill:#fafafa}
.ck-dark .fill-zinc-300{fill:#3f3f46}
.ck-dark .bg-zinc-500{background-color:#a1a1aa}
.ck-dark .ck-specs{background:#fff;border-radius:6px}
`;

// ============================================================
// HELPERS
// ============================================================
function formatPrice(n) {
  return `${Number(n || 0).toFixed(2)} ${CURRENCY}`;
}

// `null` = not known until the payment step
function shippingLabel(amount) {
  if (amount === null || amount === undefined) {
    // STRIPE: the payments cloud function calculates shipping; while online
    // payment is off it's confirmed with the customer instead.
    return ONLINE_PAYMENTS_ENABLED ? "Calculated at next step" : "To be confirmed";
  }
  return Number(amount) === 0 ? "Free" : formatPrice(amount);
}

function toDate(value) {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// "#/shop/seating?q=x" -> { page: "shop", param: "seating", query: "q=x" }
function parseHash(hash) {
  const raw = (hash || "").replace(/^#\/?/, "");
  const [pathPart, queryPart = ""] = raw.split("?");
  const segments = pathPart.split("/").filter(Boolean).map(decodeURIComponent);
  const page = segments[0] || "home";
  return {
    page: PAGES.includes(page) ? page : "notfound",
    param: segments[1] || null,
    query: queryPart,
  };
}

function authClient() {
  return getAuth(db.app);
}

/* STRIPE (disabled until online payment launches) — payments cloud function
// POST { action, ...payload } to the payments cloud function
async function callPaymentsApi(action, payload) {
  const url = getPaymentsUrl();
  if (!url) throw new Error("Payments are not available right now.");
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...payload }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Payment service is unavailable.");
  }
  return data;
}
*/

// ============================================================
// SMALL UI PIECES
// ============================================================
function ThemeToggle() {
  const { isDark, toggleTheme } = useStore();
  const label = isDark ? "Switch to light mode" : "Switch to dark mode";
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className="-mr-2 flex h-8 w-8 items-center justify-center rounded-full text-zinc-700 hover:text-black"
    >
      {isDark ? (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}

function HelpSection() {
  return (
    <section className="flex w-full flex-col items-center gap-4 bg-zinc-50 px-6 py-16 text-center sm:px-10">
      <h2 className="text-xl font-medium tracking-tight text-black">
        Have questions? We&apos;re here to help.
      </h2>
      <p className="max-w-md text-sm text-zinc-600">
        Talk to a real person about sizing, materials, or building your
        practice.
      </p>
      <a
        href="#/contact"
        className="rounded-full border border-zinc-300 bg-white px-5 py-2.5 text-sm text-zinc-700 hover:border-black"
      >
        Chat with Live Concierge
      </a>
    </section>
  );
}

// ============================================================
// HEADER / FOOTER / CART DRAWER
// Header and footer follow the Figma design. The cart drawer is unchanged.
// ============================================================
function Header() {
  const { cartCount, setCartOpen } = useStore();

  return (
    <header className="ckl-header">
      <a href="#/" className="ckl-header__logo" aria-label={`${SITE_NAME} home`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/common-kin-wordmark.svg" alt={SITE_NAME} />
      </a>
      <div className="ckl-header__actions">
        <a href="#/account" aria-label="Account" title="Account" className="ckl-icon-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <circle cx="12" cy="8.5" r="3.75" />
            <path d="M4.75 20c.9-3.6 3.85-5.5 7.25-5.5s6.35 1.9 7.25 5.5" strokeLinecap="round" />
          </svg>
        </a>
        <button
          type="button"
          aria-label={`Cart, ${cartCount} items`}
          title="Cart"
          onClick={() => setCartOpen(true)}
          className="ckl-icon-btn"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 8h14l-1 12H6L5 8z" />
            <path d="M9 8V6a3 3 0 0 1 6 0v2" strokeLinecap="round" />
          </svg>
          {cartCount > 0 && <span className="ckl-badge">{cartCount}</span>}
        </button>
      </div>
    </header>
  );
}

function Footer() {
  const columns = [
    {
      title: "About",
      links: [
        { href: "#/about", label: `About ${SITE_NAME}` },
        { href: INSTAGRAM_URL, label: "Instagram", external: true },
      ],
    },
    {
      title: "Trade",
      links: [
        { href: "#/trade/hospitality", label: "Hospitality and Studio" },
        { href: "#/trade/retail", label: "Retail Partners" },
        { href: "#/trade/gifting", label: "Corporate Gifting" },
      ],
    },
    {
      title: "Support",
      links: [
        { href: "#/faq", label: "FAQ" },
        { href: "#/returns", label: "Returns" },
        { href: "#/contact", label: "Contact us" },
        { href: `mailto:${CONTACT_EMAIL}`, label: CONTACT_EMAIL },
      ],
    },
    {
      title: "Terms",
      links: [
        { href: "#/terms", label: "Terms of Service" },
        { href: "#/privacy", label: "Privacy Policy" },
        { href: "#/shipping", label: "Shipping Policy" },
      ],
    },
  ];

  return (
    <footer className="ckl-footer">
      <div className="ckl-footer__panel">
        <div className="ckl-footer__grid">
          {columns.map((col) => (
            <div key={col.title} className="ckl-footer__col">
              <p className="ckl-footer__title">{col.title}</p>
              {col.links.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  {...(link.external
                    ? { target: "_blank", rel: "noopener noreferrer" }
                    : {})}
                  className="ckl-footer__link"
                >
                  {link.label}
                </a>
              ))}
            </div>
          ))}
        </div>
        <p className="ckl-footer__legal">
          © {new Date().getFullYear()} {SITE_NAME}. All rights reserved.
        </p>
      </div>
      <a href="#/" className="ckl-footer__wordmark" aria-label={`${SITE_NAME} home`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/common-kin-wordmark.svg" alt={SITE_NAME} />
      </a>
    </footer>
  );
}

function CartDrawer() {
  const { cart, cartTotal, cartOpen, setCartOpen, updateQty, removeItem, navigate } =
    useStore();

  useEffect(() => {
    if (!cartOpen) return;
    const onKey = (e) => e.key === "Escape" && setCartOpen(false);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [cartOpen, setCartOpen]);

  if (!cartOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        aria-label="Close cart"
        onClick={() => setCartOpen(false)}
        className="absolute inset-0 bg-black/40"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Your cart"
        className="relative flex h-full w-full max-w-md flex-col bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-5">
          <h2 className="text-base font-medium text-black">Your Cart</h2>
          <button
            onClick={() => setCartOpen(false)}
            aria-label="Close"
            className="text-zinc-500 hover:text-black"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-20 text-center">
              <p className="text-sm text-zinc-500">Your cart is empty.</p>
              <a
                href="#/shop"
                onClick={() => setCartOpen(false)}
                className="rounded-full border border-zinc-300 px-5 py-2 text-sm text-zinc-700 hover:border-black"
              >
                Continue shopping
              </a>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {cart.map((item) => (
                <div key={item.id} className="flex gap-4">
                  <a
                    href={`#/product/${encodeURIComponent(item.productId)}`}
                    className="h-20 w-20 flex-shrink-0 overflow-hidden bg-zinc-50"
                  >
                    {item.image && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.image}
                        alt={item.title}
                        className="h-full w-full object-cover"
                      />
                    )}
                  </a>
                  <div className="flex flex-1 flex-col gap-1">
                    <div className="flex items-start justify-between gap-3">
                      <a
                        href={`#/product/${encodeURIComponent(item.productId)}`}
                        className="text-sm font-medium text-black hover:underline"
                      >
                        {item.title}
                      </a>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-xs text-zinc-400 hover:text-black"
                      >
                        Remove
                      </button>
                    </div>
                    <p className="text-xs text-zinc-500">
                      {[item.color, item.incense].filter(Boolean).join(" · ")}
                    </p>
                    <div className="mt-1 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQty(item.id, -1)}
                          aria-label="Decrease quantity"
                          className="flex h-6 w-6 items-center justify-center rounded-full border border-zinc-300 text-xs hover:border-black"
                        >
                          −
                        </button>
                        <span className="text-sm">{item.qty}</span>
                        <button
                          onClick={() => updateQty(item.id, 1)}
                          aria-label="Increase quantity"
                          className="flex h-6 w-6 items-center justify-center rounded-full border border-zinc-300 text-xs hover:border-black"
                        >
                          +
                        </button>
                      </div>
                      <p className="text-sm text-zinc-700">
                        {formatPrice(item.price * item.qty)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {cart.length > 0 && (
          <div className="border-t border-zinc-200 px-6 py-5">
            <div className="flex flex-col gap-3">
              <div className="flex justify-between text-sm font-medium text-black">
                <span>Subtotal</span>
                <span>{formatPrice(cartTotal)}</span>
              </div>
              <button
                onClick={() => navigate("/checkout")}
                className="flex h-12 w-full items-center justify-center rounded-full bg-black text-sm font-medium text-white hover:bg-zinc-800"
              >
                Proceed to checkout
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// SINGLE PRODUCT PAGE
// The site shows one product from the Firestore `products` collection:
//   1. the doc whose id is NEXT_PUBLIC_PRODUCT_ID (if set), otherwise
//   2. the first doc with `featured: true`, otherwise
//   3. the first doc in the collection.
// ============================================================
const FEATURED_PRODUCT_ID = process.env.NEXT_PUBLIC_PRODUCT_ID || "";

function LandingView() {
  const { products, productsLoading, productsError } = useStore();
  const product =
    (FEATURED_PRODUCT_ID && products.find((p) => p.id === FEATURED_PRODUCT_ID)) ||
    products.find((p) => p.featured === true) ||
    products[0] ||
    null;

  return (
    <ProductLanding
      product={product}
      loading={productsLoading}
      error={productsError}
    />
  );
}

// ============================================================
// PAGES
// ============================================================
// ---------------- Account (Firebase Auth) ----------------
const AUTH_ERRORS = {
  "auth/invalid-credential": "Email or password is incorrect.",
  "auth/wrong-password": "Email or password is incorrect.",
  "auth/user-not-found": "No account found with that email.",
  "auth/email-already-in-use": "An account with this email already exists. Try signing in.",
  "auth/weak-password": "Please use a password with at least 6 characters.",
  "auth/invalid-email": "Please enter a valid email address.",
  "auth/too-many-requests": "Too many attempts. Please wait a moment and try again.",
};

function OrderHistory({ email }) {
  const [state, setState] = useState({ loading: true, orders: [], error: "" });

  useEffect(() => {
    let active = true;
    getDocs(query(collection(db, "orders"), where("customer.email", "==", email)))
      .then((snap) => {
        if (!active) return;
        const orders = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort(
            (a, b) =>
              (toDate(b.createdAt)?.getTime() || 0) -
              (toDate(a.createdAt)?.getTime() || 0)
          );
        setState({ loading: false, orders, error: "" });
      })
      .catch((err) => {
        console.error("Failed to load orders:", err);
        if (active) {
          setState({ loading: false, orders: [], error: "We couldn't load your orders right now." });
        }
      });
    return () => {
      active = false;
    };
  }, [email]);

  if (state.loading) return <p className="text-sm text-zinc-500">Loading orders…</p>;
  if (state.error) return <p className="text-sm text-red-600">{state.error}</p>;
  if (state.orders.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-md bg-zinc-50 p-4 text-sm text-zinc-600">
        <p>You haven&apos;t placed any orders yet.</p>
        <a
          href="#/shop"
          className="rounded-full border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:border-black"
        >
          Start shopping
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col divide-y divide-zinc-200 rounded-md border border-zinc-300 text-sm">
      {state.orders.map((o) => {
        const date = toDate(o.createdAt);
        const status = o.paymentStatus || o.status || "pending";
        const count = (o.items || []).reduce((n, i) => n + (i.qty || 0), 0);
        return (
          <div key={o.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
            <div className="flex flex-col">
              <span className="text-black">#{o.id.slice(0, 8).toUpperCase()}</span>
              <span className="text-xs text-zinc-500">
                {date ? date.toLocaleDateString() : "—"} · {count} item{count === 1 ? "" : "s"}
              </span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-black">{formatPrice(o.total)}</span>
              <span className="text-xs capitalize text-zinc-500">
                {String(status).replace(/_/g, " ")}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AccountView() {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [mode, setMode] = useState("signin"); // signin | signup | reset
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(authClient(), (u) => {
      setUser(u);
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  function switchMode(next) {
    setMode(next);
    setError("");
    setNotice("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setNotice("");
    if (!form.email || (mode !== "reset" && !form.password)) {
      setError("Please fill in all required fields.");
      return;
    }
    setBusy(true);
    const auth = authClient();
    try {
      if (mode === "signin") {
        await signInWithEmailAndPassword(auth, form.email, form.password);
      } else if (mode === "signup") {
        const cred = await createUserWithEmailAndPassword(auth, form.email, form.password);
        if (form.name) {
          await updateProfile(cred.user, { displayName: form.name });
          setUser({ ...cred.user, displayName: form.name, email: cred.user.email });
        }
      } else {
        await sendPasswordResetEmail(auth, form.email);
        setNotice("If an account exists for that email, a reset link is on its way.");
      }
      setForm((prev) => ({ ...prev, password: "" }));
    } catch (err) {
      setError(AUTH_ERRORS[err?.code] || "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!authReady) {
    return (
      <main className="px-6 py-24 text-center text-sm text-zinc-500 sm:px-10">
        Loading your account…
      </main>
    );
  }

  if (user) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-6 py-12 sm:px-10 lg:py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Account</p>
            <h1 className="text-2xl font-medium tracking-tight text-black">
              Welcome{user.displayName ? `, ${user.displayName}` : ""}
            </h1>
            <p className="text-sm text-zinc-600">{user.email}</p>
          </div>
          <button
            onClick={() => signOut(authClient())}
            className="rounded-full border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:border-black"
          >
            Sign out
          </button>
        </div>

        <section className="flex flex-col gap-4">
          <h2 className="text-base font-medium text-black">Order history</h2>
          <OrderHistory email={user.email} />
        </section>

        <section className="flex flex-col gap-2 rounded-md bg-zinc-50 p-4 text-sm text-zinc-600">
          <p className="font-medium text-black">Need help with an order?</p>
          <p>
            Our concierge can help with delivery, returns and exchanges.{" "}
            <a href="#/contact" className="underline hover:text-black">
              Contact us
            </a>{" "}
            or read our{" "}
            <a href="#/returns" className="underline hover:text-black">
              returns policy
            </a>
            .
          </p>
        </section>
      </main>
    );
  }

  const titles = { signin: "Sign in", signup: "Create an account", reset: "Reset your password" };

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-8 px-6 py-12 sm:px-10 lg:py-16">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-medium tracking-tight text-black">{titles[mode]}</h1>
        <p className="text-sm text-zinc-600">
          {mode === "reset"
            ? "Enter your email and we'll send you a link to set a new password."
            : "Track your orders and check out faster."}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>
        {mode === "signup" && (
          <input
            type="text"
            autoComplete="name"
            placeholder="Full name (optional)"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={INPUT_CLASS}
          />
        )}
        <input
          type="email"
          autoComplete="email"
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className={INPUT_CLASS}
        />
        {mode !== "reset" && (
          <input
            type="password"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            placeholder="Password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className={INPUT_CLASS}
          />
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
        {notice && <p className="text-sm font-medium text-emerald-700">{notice}</p>}

        <button
          type="submit"
          disabled={busy}
          className="mt-2 flex h-12 w-full items-center justify-center rounded-md bg-black text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {busy
            ? "Please wait…"
            : mode === "signin"
              ? "Sign in"
              : mode === "signup"
                ? "Create account"
                : "Send reset link"}
        </button>
      </form>

      <div className="flex flex-col gap-2 text-sm text-zinc-600">
        {mode === "signin" ? (
          <>
            <button onClick={() => switchMode("reset")} className="w-fit underline hover:text-black">
              Forgot your password?
            </button>
            <p>
              New to {SITE_NAME}?{" "}
              <button onClick={() => switchMode("signup")} className="underline hover:text-black">
                Create an account
              </button>
            </p>
          </>
        ) : (
          <p>
            Already have an account?{" "}
            <button onClick={() => switchMode("signin")} className="underline hover:text-black">
              Sign in
            </button>
          </p>
        )}
      </div>
    </main>
  );
}

// ---------------- Contact (saves to Firestore `messages`) ----------------
const CONTACT_TOPICS = [
  "Product question",
  "Sizing & materials",
  "An existing order",
  "Returns & exchanges",
  "Something else",
];
const EMPTY_CONTACT = {
  name: "",
  email: "",
  topic: CONTACT_TOPICS[0],
  orderNumber: "",
  message: "",
};

function ContactView() {
  const [form, setForm] = useState(EMPTY_CONTACT);
  const [status, setStatus] = useState("idle"); // idle | sending | sent
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      setError("Please fill in your name, email and message.");
      return;
    }
    if (!EMAIL_PATTERN.test(form.email)) {
      setError("Please enter a valid email address.");
      return;
    }
    setError("");
    setStatus("sending");
    try {
      await addDoc(collection(db, "messages"), {
        ...form,
        status: "new",
        createdAt: serverTimestamp(),
      });
      setStatus("sent");
      setForm(EMPTY_CONTACT);
    } catch (err) {
      console.error("Failed to send message:", err);
      setError(`We couldn't send your message. Please email us at ${CONTACT_EMAIL}.`);
      setStatus("idle");
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-12 sm:px-10 lg:flex-row lg:gap-16 lg:py-16">
      <div className="flex flex-1 flex-col gap-8">
        <div className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Live Concierge</p>
          <h1 className="text-2xl font-medium tracking-tight text-black">
            Talk to a real person
          </h1>
          <p className="max-w-lg text-sm leading-6 text-zinc-600">
            Questions about sizing, materials, an order, or building your
            practice? Send us a note and a member of our team will get back to
            you, usually within one business day.
          </p>
        </div>

        {status === "sent" ? (
          <div className="flex flex-col items-start gap-3 rounded-md bg-zinc-50 p-6">
            <p className="text-sm font-medium text-emerald-700">Message sent</p>
            <p className="text-sm text-zinc-600">
              Thanks for reaching out. We&apos;ll reply by email soon.
            </p>
            <button
              onClick={() => setStatus("idle")}
              className="rounded-full border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:border-black"
            >
              Send another message
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input type="text" autoComplete="name" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={INPUT_CLASS} />
              <input type="email" autoComplete="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={INPUT_CLASS} />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <select aria-label="Topic" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} className={`${INPUT_CLASS} text-zinc-700`}>
                {CONTACT_TOPICS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <input type="text" placeholder="Order number (optional)" value={form.orderNumber} onChange={(e) => setForm({ ...form, orderNumber: e.target.value })} className={INPUT_CLASS} />
            </div>
            <textarea rows={5} placeholder="How can we help?" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className={INPUT_CLASS} />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={status === "sending"}
              className="flex h-12 w-full items-center justify-center rounded-md bg-black text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 sm:w-fit sm:px-8"
            >
              {status === "sending" ? "Sending…" : "Send message"}
            </button>
          </form>
        )}
      </div>

      <aside className="flex w-full flex-col gap-4 lg:max-w-sm">
        <div className="flex flex-col gap-2 rounded-md bg-zinc-50 p-4 text-sm">
          <p className="font-medium text-black">Email</p>
          <a href={`mailto:${CONTACT_EMAIL}`} className="break-all text-zinc-600 hover:text-black">
            {CONTACT_EMAIL}
          </a>
        </div>
        <div className="flex flex-col gap-2 rounded-md bg-zinc-50 p-4 text-sm">
          <p className="font-medium text-black">Quick answers</p>
          <a href="#/faq" className="text-zinc-600 hover:text-black">Frequently asked questions</a>
          <a href="#/shipping" className="text-zinc-600 hover:text-black">Shipping policy</a>
          <a href="#/returns" className="text-zinc-600 hover:text-black">Returns &amp; exchanges</a>
          <a href="#/account" className="text-zinc-600 hover:text-black">Your orders</a>
        </div>
        <div className="flex flex-col gap-2 rounded-md bg-zinc-50 p-4 text-sm">
          <p className="font-medium text-black">Trade &amp; wholesale</p>
          <a href="#/trade" className="text-zinc-600 hover:text-black">
            Studios, retailers and corporate gifting →
          </a>
        </div>
      </aside>
    </main>
  );
}

// ---------------- Text pages ----------------
function InfoPage({ eyebrow, title, intro, updated, children }) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-6 py-12 sm:px-10 lg:py-16">
      <div className="flex flex-col gap-3">
        {eyebrow && <p className="text-xs uppercase tracking-wide text-zinc-500">{eyebrow}</p>}
        <h1 className="text-2xl font-medium tracking-tight text-black">{title}</h1>
        {intro && <p className="text-sm leading-6 text-zinc-600">{intro}</p>}
        {updated && <p className="text-xs text-zinc-400">Last updated {updated}</p>}
      </div>
      <div className="flex flex-col gap-8">{children}</div>
    </main>
  );
}

function InfoSection({ id, title, children }) {
  return (
    <section id={id} className="flex scroll-mt-6 flex-col gap-3 border-t border-zinc-200 pt-8">
      {title && <h2 className="text-base font-medium text-black">{title}</h2>}
      <div className="flex flex-col gap-3 text-sm leading-6 text-zinc-600">{children}</div>
    </section>
  );
}

function Bullets({ items }) {
  return (
    <ul className="flex flex-col gap-1">
      {items.map((item) => (
        <li key={item}>· {item}</li>
      ))}
    </ul>
  );
}

function TextLink({ href, children }) {
  return (
    <a href={href} className="underline hover:text-black">
      {children}
    </a>
  );
}

// ---------------- Trade (saves to Firestore `tradeInquiries`) ----------------
const TRADE_TYPES = [
  { value: "hospitality", label: "Hospitality and Studio" },
  { value: "retail", label: "Retail Partners" },
  { value: "gifting", label: "Corporate Gifting" },
];
const EMPTY_TRADE = {
  type: "hospitality",
  name: "",
  company: "",
  email: "",
  phone: "",
  quantity: "",
  message: "",
};

function TradeView({ section }) {
  const [form, setForm] = useState({
    ...EMPTY_TRADE,
    type: TRADE_TYPES.some((t) => t.value === section) ? section : "hospitality",
  });
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  // Deep links like #/trade/retail scroll to that section
  useEffect(() => {
    if (!section) return;
    const el = document.getElementById(`trade-${section}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [section]);

  function selectType(type) {
    setForm((prev) => ({ ...prev, type }));
    setStatus("idle");
    document.getElementById("trade-inquire")?.scrollIntoView({ behavior: "smooth" });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name || !form.company || !form.email || !form.message) {
      setError("Please fill in your name, company, email and a short message.");
      return;
    }
    if (!EMAIL_PATTERN.test(form.email)) {
      setError("Please enter a valid email address.");
      return;
    }
    setError("");
    setStatus("sending");
    try {
      await addDoc(collection(db, "tradeInquiries"), {
        ...form,
        status: "new",
        createdAt: serverTimestamp(),
      });
      setStatus("sent");
      setForm(EMPTY_TRADE);
    } catch (err) {
      console.error("Failed to send inquiry:", err);
      setError(`We couldn't send your inquiry. Please email us at ${CONTACT_EMAIL}.`);
      setStatus("idle");
    }
  }

  const outlinePill =
    "w-fit rounded-full border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:border-black";

  return (
    <InfoPage
      eyebrow="Trade"
      title={`${SITE_NAME} for business`}
      intro="We work with studios, hotels, shops and teams who want to bring a calmer practice to the people they serve. Trade pricing, custom colors and volume shipping are available."
    >
      <InfoSection id="trade-hospitality" title="Hospitality and Studio">
        <p>
          Outfit yoga and meditation studios, retreats, spas and hotels with
          cushions made for daily, heavy use.
        </p>
        <Bullets
          items={[
            "Tiered pricing for studio quantities",
            "Durable, easy-care covers in consistent colorways",
            "Replacement covers and fill available separately",
          ]}
        />
        <button onClick={() => selectType("hospitality")} className={outlinePill}>
          Enquire for your studio
        </button>
      </InfoSection>

      <InfoSection id="trade-retail" title="Retail Partners">
        <p>
          Stock {SITE_NAME} in your shop. We support independent retailers with
          wholesale pricing and product imagery.
        </p>
        <Bullets
          items={[
            "Wholesale pricing with a low opening order",
            "Product photography and descriptions for your listings",
            "Reliable restocks across the region",
          ]}
        />
        <button onClick={() => selectType("retail")} className={outlinePill}>
          Become a retail partner
        </button>
      </InfoSection>

      <InfoSection id="trade-gifting" title="Corporate Gifting">
        <p>
          Thoughtful gifts for teams, clients and events — from single incense
          sets to full practice kits.
        </p>
        <Bullets
          items={[
            "Curated gift sets at any budget",
            "Gift notes and delivery to multiple addresses",
            "Volume discounts for larger orders",
          ]}
        />
        <button onClick={() => selectType("gifting")} className={outlinePill}>
          Plan a gifting order
        </button>
      </InfoSection>

      <InfoSection id="trade-inquire" title="Send an inquiry">
        {status === "sent" ? (
          <div className="flex flex-col items-start gap-3 rounded-md bg-zinc-50 p-6">
            <p className="text-sm font-medium text-emerald-700">Inquiry received</p>
            <p>Thank you. Our trade team will be in touch with pricing and next steps.</p>
            <button onClick={() => setStatus("idle")} className={outlinePill}>
              Send another inquiry
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>
            <select aria-label="Inquiry type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={`${INPUT_CLASS} text-zinc-700`}>
              {TRADE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input type="text" autoComplete="name" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={INPUT_CLASS} />
              <input type="text" autoComplete="organization" placeholder="Company / studio" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className={INPUT_CLASS} />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input type="email" autoComplete="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={INPUT_CLASS} />
              <input type="tel" autoComplete="tel" placeholder="Phone (optional)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={INPUT_CLASS} />
            </div>
            <input type="text" placeholder="Estimated quantity (optional)" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className={INPUT_CLASS} />
            <textarea rows={4} placeholder="Tell us about your space or project" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className={INPUT_CLASS} />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={status === "sending"}
              className="flex h-12 w-full items-center justify-center rounded-md bg-black text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 sm:w-fit sm:px-8"
            >
              {status === "sending" ? "Sending…" : "Send inquiry"}
            </button>
          </form>
        )}
      </InfoSection>
    </InfoPage>
  );
}

function AboutView() {
  return (
    <>
      <InfoPage
        eyebrow="About"
        title={`About ${SITE_NAME}`}
        intro={`${SITE_NAME} makes simple, well-made things for sitting still: cushions that support a long sit, incense that marks the start of practice, and objects that turn a corner of your home into a place to return to.`}
      >
        <InfoSection title="Why we started">
          <p>
            A daily practice is easier to keep when the space for it feels
            intentional. We design every piece to be comfortable, durable and
            quiet enough to disappear into the background — so the practice can
            take the foreground.
          </p>
        </InfoSection>
        <InfoSection title="How we make things">
          <p>
            We choose natural, long-lasting materials, keep our designs simple
            so they age well, and offer replacement parts wherever we can so
            your cushion lasts for years rather than seasons.
          </p>
        </InfoSection>
        <InfoSection title="Who we work with">
          <p>
            Alongside individual customers, we supply studios, retreats, shops
            and teams. <TextLink href="#/trade">Learn about trade</TextLink>.
          </p>
        </InfoSection>
        <InfoSection title="Follow along">
          <p>
            See how people set up their practice spaces on{" "}
            <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="underline hover:text-black">
              Instagram
            </a>
            .
          </p>
          <a
            href="#/shop"
            className="mt-2 flex h-12 w-fit items-center justify-center rounded-full bg-black px-6 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Shop the collection
          </a>
        </InfoSection>
      </InfoPage>
      <HelpSection />
    </>
  );
}

const FAQS = [
  {
    group: "Orders",
    items: [
      {
        q: "How do I know my order went through?",
        a: "You'll see a confirmation page with your order number as soon as payment is complete. If you have an account, the order also appears under Account → Order history.",
      },
      {
        q: "Can I change or cancel my order?",
        a: "Contact us as soon as possible with your order number. If your order hasn't shipped yet, we'll do our best to update or cancel it.",
      },
      {
        q: "Which payment methods do you accept?",
        // STRIPE: original answer — "We accept major credit and debit cards through our secure payment provider, Stripe. Card details are never stored on our servers."
        a: `Online card payment is coming soon. Until then, place your order at checkout and send it to us by email (${CONTACT_EMAIL}) — we'll confirm it and arrange payment with you.`,
      },
    ],
  },
  {
    group: "Shipping",
    items: [
      {
        q: "How long does delivery take?",
        a: "In-stock items usually ship within 1–2 business days. Delivery times after that depend on your destination. We're currently experiencing slightly longer fulfillment times.",
      },
      {
        q: "Do you offer free shipping?",
        a: `Yes — standard shipping is free on orders of ${formatPrice(FREE_SHIPPING_THRESHOLD)} or more. Any shipping charge is shown before you pay.`,
      },
      {
        q: "Where do you ship?",
        a: "We ship to Egypt, the United Arab Emirates, Jordan, the United States and the United Kingdom. For other destinations, choose “Other” at checkout or contact us first.",
      },
    ],
  },
  {
    group: "Products",
    items: [
      {
        q: "Which cushion is right for me?",
        a: "It depends on how you sit and for how long. Our concierge can recommend a size and fill based on your height and practice — just send us a message.",
      },
      {
        q: "How do I care for my cushion?",
        a: "Each product lists its care instructions under the “Usage & Care” tab on its page.",
      },
    ],
  },
  {
    group: "Returns",
    items: [
      {
        q: "What is your return policy?",
        a: "You can return unused items in their original condition within 30 days of delivery. See our returns policy for the full details.",
      },
    ],
  },
];

function FaqView() {
  return (
    <>
      <InfoPage
        eyebrow="Support"
        title="Frequently asked questions"
        intro="Can't find what you're looking for? Our concierge is happy to help."
      >
        {FAQS.map((group) => (
          <section key={group.group} className="flex flex-col gap-2 border-t border-zinc-200 pt-8">
            <h2 className="mb-2 text-base font-medium text-black">{group.group}</h2>
            {group.items.map((item) => (
              <details key={item.q} className="group rounded-md border border-zinc-200 px-4 py-3 text-sm">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-black">
                  {item.q}
                  <span className="text-zinc-500 transition group-open:rotate-45" aria-hidden="true">
                    +
                  </span>
                </summary>
                <p className="mt-3 leading-6 text-zinc-600">{item.a}</p>
              </details>
            ))}
          </section>
        ))}
        <div className="flex flex-wrap gap-3">
          <a
            href="#/contact"
            className="flex h-12 items-center justify-center rounded-full bg-black px-6 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Contact us
          </a>
          <a
            href="#/returns"
            className="flex h-12 items-center rounded-full border border-zinc-300 px-6 text-sm text-zinc-700 hover:border-black"
          >
            Returns policy
          </a>
        </div>
      </InfoPage>
      <HelpSection />
    </>
  );
}

function ReturnsView() {
  return (
    <InfoPage
      eyebrow="Support"
      title="Returns & exchanges"
      intro="If something isn't right, we'll make it right. You have 30 days from delivery to return or exchange eligible items."
      updated="September 2026"
    >
      <InfoSection title="What can be returned">
        <Bullets
          items={[
            "Unused items in their original condition and packaging",
            "Returns requested within 30 days of delivery",
            "Opened incense and other consumables can't be returned for hygiene reasons",
          ]}
        />
      </InfoSection>
      <InfoSection title="How to start a return">
        <p>
          <TextLink href="#/contact">Contact us</TextLink> or email{" "}
          <TextLink href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</TextLink>{" "}
          with your order number and the items you&apos;d like to return. We&apos;ll
          reply with return instructions.
        </p>
      </InfoSection>
      <InfoSection title="Refunds">
        <p>
          Once we receive and inspect your return, we&apos;ll refund the original
          payment method. Your bank may take several business days to show the
          refund. Original shipping charges are non-refundable.
        </p>
      </InfoSection>
      <InfoSection title="Damaged or incorrect items">
        <p>
          If your order arrives damaged or isn&apos;t what you ordered, contact us
          within 7 days of delivery with a photo and we&apos;ll send a replacement
          or refund at no cost to you.
        </p>
      </InfoSection>
    </InfoPage>
  );
}

function ShippingView() {
  return (
    <InfoPage
      eyebrow="Terms"
      title="Shipping policy"
      intro="Everything you need to know about how and when your order arrives."
      updated="September 2026"
    >
      <InfoSection title="Processing time">
        <p>
          In-stock orders usually ship within 1–2 business days. We&apos;re
          currently experiencing slightly longer fulfillment times and will
          email you if your order is delayed.
        </p>
      </InfoSection>
      <InfoSection title="Shipping costs">
        <p>
          Standard shipping is free on orders of{" "}
          {formatPrice(FREE_SHIPPING_THRESHOLD)} or more. For smaller orders, the
          shipping charge is calculated at checkout and always shown before you
          pay.
        </p>
      </InfoSection>
      <InfoSection title="Where we ship">
        <Bullets items={COUNTRIES.filter((c) => c !== "Other")} />
        <p>
          Shipping somewhere else? Select “Other” at checkout or{" "}
          <TextLink href="#/contact">contact us</TextLink> before ordering.
        </p>
      </InfoSection>
      <InfoSection title="Duties and taxes">
        <p>
          International orders may be subject to import duties or taxes set by
          the destination country. These are the recipient&apos;s responsibility.
        </p>
      </InfoSection>
      <InfoSection title="Tracking">
        <p>
          Once your order ships we&apos;ll email you tracking details. Signed-in
          customers can also see their orders under{" "}
          <TextLink href="#/account">Account</TextLink>.
        </p>
      </InfoSection>
    </InfoPage>
  );
}

function TermsView() {
  return (
    <InfoPage
      eyebrow="Terms"
      title="Terms of service"
      intro={`These terms apply to your use of the ${SITE_NAME} website and any purchase you make from us.`}
      updated="September 2026"
    >
      <InfoSection title="Orders">
        <p>
          Placing an order is an offer to buy. We accept it when payment is
          confirmed. We may cancel an order and refund you in full if an item is
          unavailable or was listed with an obvious pricing error.
        </p>
      </InfoSection>
      <InfoSection title="Prices and payment">
        {/* STRIPE: original text — "Prices are shown in {CURRENCY}. Payments are
            processed securely by Stripe; we never store your full card details." */}
        <p>
          Prices are shown in {CURRENCY}. Online card payment is coming soon;
          until then we confirm each order and arrange payment with you directly.
        </p>
      </InfoSection>
      <InfoSection title="Shipping and returns">
        <p>
          Delivery is covered by our{" "}
          <TextLink href="#/shipping">shipping policy</TextLink> and returns by
          our <TextLink href="#/returns">returns policy</TextLink>.
        </p>
      </InfoSection>
      <InfoSection title="Accounts">
        <p>
          You&apos;re responsible for keeping your account password secure and
          for activity on your account.
        </p>
      </InfoSection>
      <InfoSection title="Content">
        <p>
          All text, images and designs on this site belong to {SITE_NAME} and
          may not be reused without permission.
        </p>
      </InfoSection>
      <InfoSection title="Changes and contact">
        <p>
          We may update these terms from time to time; the date above shows the
          latest version. Questions? Email{" "}
          <TextLink href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</TextLink>.
        </p>
      </InfoSection>
    </InfoPage>
  );
}

function PrivacyView() {
  return (
    <InfoPage
      eyebrow="Terms"
      title="Privacy policy"
      intro={`This policy explains what information ${SITE_NAME} collects and how we use it.`}
      updated="September 2026"
    >
      <InfoSection title="What we collect">
        <Bullets
          items={[
            "Contact and delivery details you enter at checkout (name, email, phone, address)",
            "Order details (items, amounts, order status)",
            "Account details if you create an account (email and name)",
            "Messages and inquiries you send us through our forms",
          ]}
        />
        {/* STRIPE: original text — "Card payments are handled by Stripe. We don't
            receive or store your full card number." */}
        <p>
          Online card payment is coming soon. We don&apos;t collect or store card
          numbers on this site.
        </p>
      </InfoSection>
      <InfoSection title="How we use it">
        <Bullets
          items={[
            "To process, ship and support your orders",
            "To reply to your messages and inquiries",
            "To prevent fraud and keep the site secure",
          ]}
        />
      </InfoSection>
      <InfoSection title="Where it's stored">
        <p>
          Order, account and message data is stored with Google Firebase. Your
          cart and light/dark mode choice are saved only in your own browser.
        </p>
      </InfoSection>
      <InfoSection title="Your choices">
        <p>
          You can ask us to access, correct or delete your personal information
          at any time by emailing{" "}
          <TextLink href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</TextLink>.
        </p>
      </InfoSection>
    </InfoPage>
  );
}

function NotFoundView() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-col items-center gap-4 px-6 py-24 text-center sm:px-10">
      <p className="text-xs uppercase tracking-wide text-zinc-500">404</p>
      <h1 className="text-2xl font-medium tracking-tight text-black">
        We couldn&apos;t find that page
      </h1>
      <p className="text-sm text-zinc-600">
        The link may be broken or the page may have moved.
      </p>
      <div className="mt-2 flex flex-wrap justify-center gap-3">
        <a
          href="#/shop"
          className="flex h-12 items-center justify-center rounded-full bg-black px-6 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Shop all
        </a>
        <a
          href="#/contact"
          className="flex h-12 items-center rounded-full border border-zinc-300 px-6 text-sm text-zinc-700 hover:border-black"
        >
          Contact us
        </a>
      </div>
    </main>
  );
}

// ============================================================
// CHECKOUT
// ============================================================
/* STRIPE (disabled until online payment launches) — payment form
// Stripe payment form — must render inside <Elements>
function StripePaymentForm({ total, customer, onSuccess, onBack }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isPaying, setIsPaying] = useState(false);
  const [payError, setPayError] = useState("");
  const [isReady, setIsReady] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsPaying(true);
    setPayError("");

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        // Only used when a redirect is needed (e.g. 3D Secure)
        return_url: `${window.location.origin}${window.location.pathname}`,
        payment_method_data: {
          billing_details: {
            name: customer.fullName,
            email: customer.email,
            phone: customer.phone,
          },
        },
      },
      redirect: "if_required",
    });

    if (error) {
      setPayError(error.message || "Payment failed. Please try again.");
      setIsPaying(false);
      return;
    }

    if (
      paymentIntent &&
      (paymentIntent.status === "succeeded" ||
        paymentIntent.status === "processing")
    ) {
      await onSuccess(paymentIntent);
    } else {
      setPayError("Payment was not completed. Please try again.");
    }
    setIsPaying(false);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <PaymentElement
        onReady={() => setIsReady(true)}
        options={{ layout: "tabs" }}
      />

      {payError && <p className="text-sm text-red-600">{payError}</p>}

      <div className="flex flex-col gap-3 border-t border-zinc-200 pt-6 sm:flex-row-reverse">
        <button
          type="submit"
          disabled={!stripe || !elements || !isReady || isPaying}
          className="flex h-12 flex-1 items-center justify-center rounded-md bg-black text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {isPaying ? "Processing payment..." : `Pay ${formatPrice(total)}`}
        </button>
        <button
          type="button"
          onClick={onBack}
          disabled={isPaying}
          className="flex h-12 items-center justify-center rounded-md border border-zinc-300 px-6 text-sm text-zinc-700 hover:border-black disabled:opacity-50"
        >
          Return to information
        </button>
      </div>
    </form>
  );
}
*/

// Shown in the checkout's payment step while online payment is switched off.
// Lets the customer send the order by email with everything pre-filled.
function PaymentComingSoon({ cart, customer, subtotal, shipping, total, onBack }) {
  const lines = cart.map((item) => {
    const options = [item.color, item.incense].filter(Boolean).join(", ");
    return `• ${item.title}${options ? ` (${options})` : ""} × ${item.qty} — ${formatPrice(item.price * item.qty)}`;
  });
  const address = [
    customer.address,
    customer.apartment,
    customer.city,
    customer.state,
    customer.zip,
    customer.country,
  ]
    .filter(Boolean)
    .join(", ");

  const body = [
    "Hello, I'd like to place this order:",
    "",
    ...lines,
    "",
    `Subtotal: ${formatPrice(subtotal)}`,
    `Shipping: ${shippingLabel(shipping)}`,
    `Total: ${formatPrice(total)}`,
    "",
    `Name: ${customer.fullName}`,
    `Phone: ${customer.phone}`,
    `Email: ${customer.email}`,
    `Ship to: ${address}`,
    customer.notes ? `Notes: ${customer.notes}` : "",
  ]
    .filter((line, i, all) => line !== "" || all[i - 1] !== "")
    .join("\n");

  const mailto = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
    `Order request — ${customer.fullName || SITE_NAME}`
  )}&body=${encodeURIComponent(body)}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 rounded-md border border-zinc-300 bg-zinc-50 p-5 text-sm">
        <span className="w-fit rounded-full bg-black px-3 py-1 text-xs font-medium text-white">
          Coming soon
        </span>
        <p className="text-base font-medium text-black">Online payment is coming soon</p>
        <p className="leading-6 text-zinc-600">
          We&apos;re setting up secure card payments. To order now, send us your
          order by email — it&apos;s already filled in with your items and
          delivery details. We&apos;ll confirm availability and arrange payment
          with you.
        </p>
      </div>

      <div className="flex flex-col gap-3 border-t border-zinc-200 pt-6 sm:flex-row-reverse">
        <a
          href={mailto}
          className="flex h-12 flex-1 items-center justify-center rounded-md bg-black text-sm font-medium text-white hover:bg-zinc-800"
        >
          Email us your order
        </a>
        <button
          type="button"
          onClick={onBack}
          className="flex h-12 items-center justify-center rounded-md border border-zinc-300 px-6 text-sm text-zinc-700 hover:border-black"
        >
          Return to information
        </button>
      </div>

      <p className="text-xs text-zinc-500">
        Prefer to talk? Write to{" "}
        <a href={`mailto:${CONTACT_EMAIL}`} className="underline hover:text-black">
          {CONTACT_EMAIL}
        </a>{" "}
        or{" "}
        <a href="#/contact" className="underline hover:text-black">
          contact us
        </a>
        .
      </p>
    </div>
  );
}

function CheckoutView() {
  const { cart, cartReady, cartTotal, setCartOpen, navigate } = useStore();
  // STRIPE: also needs `setCart` and `isDark` from useStore() when re-enabled

  // ---- Step: "checkout" | "payment" | "confirmed" ----
  const [view, setView] = useState("checkout");
  const [order, setOrder] = useState(EMPTY_ORDER);
  const [orderError, setOrderError] = useState("");
  /* STRIPE (disabled until online payment launches) — order confirmation state
  const [confirmedOrder, setConfirmedOrder] = useState(null);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  */
  const confirmedOrder = null;
  const isSubmittingOrder = false;

/* STRIPE (disabled until online payment launches) — checkout session state
  // ---- Stripe checkout session (returned by the cloud function) ----
  // { orderId, clientSecret, paymentIntentId, subtotal, shipping, total }
  const [checkoutSession, setCheckoutSession] = useState(null);
  // Order created but not paid yet — reused if the customer edits and resubmits
  const [pendingOrderId, setPendingOrderId] = useState(null);
  const [isConfirmingRedirect, setIsConfirmingRedirect] = useState(false);
*/
  const checkoutSession = null;

  // Before the cloud function responds, shipping is free above the threshold
  // and otherwise calculated at the payment step.
  const estimatedShipping = cartTotal >= FREE_SHIPPING_THRESHOLD ? 0 : null;

  // ---- Prefill contact details for signed-in customers ----
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(authClient(), (user) => {
      if (!user) return;
      setOrder((prev) => ({
        ...prev,
        email: prev.email || user.email || "",
        fullName: prev.fullName || user.displayName || "",
      }));
    });
    return () => unsubscribe();
  }, []);

/* STRIPE (disabled until online payment launches) — 3D Secure redirect handling
  // ---- Handle return from a Stripe redirect (e.g. 3D Secure) ----
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentIntentId = params.get("payment_intent");
    const clientSecret = params.get("payment_intent_client_secret");
    if (!paymentIntentId || !clientSecret) return;

    // Clean the URL so a refresh doesn't re-run this
    window.history.replaceState({}, "", `${window.location.pathname}#/checkout`);
    setIsConfirmingRedirect(true);

    callPaymentsApi("confirm-payment", { paymentIntentId, clientSecret })
      .then((data) => {
        if (data.status === "succeeded" || data.status === "processing") {
          finalizeConfirmedOrder(data);
        } else {
          // Payment failed or was abandoned — restore cart + form from the order
          restoreCheckoutFromOrder(data.order);
          setOrderError("Your payment was not completed. Please try again.");
          setView("checkout");
        }
      })
      .catch((err) => {
        console.error("Failed to confirm payment:", err);
        setOrderError(
          `We couldn't verify your payment. If you were charged, please contact us at ${CONTACT_EMAIL}.`
        );
        setView("checkout");
      })
      .finally(() => setIsConfirmingRedirect(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
*/

  function handleOrderChange(field, value) {
    setOrder((prev) => ({ ...prev, [field]: value }));
  }

  function returnToCart() {
    navigate("/");
    setCartOpen(true);
  }

/* STRIPE (disabled until online payment launches) — restore / confirm order helpers
  function restoreCheckoutFromOrder(serverOrder) {
    if (!serverOrder) return;
    setPendingOrderId(serverOrder.id);
    setCart(
      (serverOrder.items || []).map((item, i) => ({
        id: `${item.productId}-${item.color}-${item.incense}-${i}`,
        productId: item.productId,
        title: item.title,
        image: item.image || null,
        color: item.color,
        incense: item.incense,
        price: item.price,
        qty: item.qty,
      }))
    );
    setOrder({ ...EMPTY_ORDER, ...(serverOrder.customer || {}) });
    setCheckoutSession(null);
  }

  function finalizeConfirmedOrder(data) {
    setConfirmedOrder({
      id: data.order.id,
      items: data.order.items || [],
      subtotal: data.order.subtotal,
      shipping: data.order.shipping,
      total: data.order.total,
      customer: data.order.customer,
      paymentStatus: data.status,
    });
    setCart([]);
    setCheckoutSession(null);
    setPendingOrderId(null);
    setOrderError("");
    setView("confirmed");
    window.scrollTo(0, 0);
  }
*/

  // Step 1: validate the form. While online payment is off this goes straight
  // to the "coming soon" payment step; with Stripe on, the cloud function
  // creates the order and PaymentIntent (prices are recalculated server-side).
  async function handleContinueToPayment(e) {
    e.preventDefault();

    if (
      !order.fullName ||
      !order.email ||
      !order.phone ||
      !order.address ||
      !order.city ||
      !order.country
    ) {
      setOrderError("Please fill in all required fields.");
      return;
    }
    if (!EMAIL_PATTERN.test(order.email)) {
      setOrderError("Please enter a valid email address.");
      return;
    }
    if (cart.length === 0) {
      setOrderError("Your cart is empty.");
      return;
    }
    if (!ONLINE_PAYMENTS_ENABLED) {
      setOrderError("");
      setView("payment");
      window.scrollTo(0, 0);
      return;
    }

    /* STRIPE (disabled until online payment launches) — create order + PaymentIntent
    if (!STRIPE_PUBLISHABLE_KEY) {
      setOrderError(
        `Online payment is temporarily unavailable. Please contact us at ${CONTACT_EMAIL} to complete your order.`
      );
      return;
    }

    setOrderError("");
    setIsSubmittingOrder(true);

    try {
      const data = await callPaymentsApi("create-payment-intent", {
        orderId: pendingOrderId,
        items: cart.map((item) => ({
          productId: item.productId,
          color: item.color,
          incense: item.incense,
          qty: item.qty,
        })),
        customer: {
          fullName: order.fullName,
          email: order.email,
          phone: order.phone,
          address: order.address,
          apartment: order.apartment,
          city: order.city,
          state: order.state,
          zip: order.zip,
          country: order.country,
          notes: order.notes,
        },
      });

      setPendingOrderId(data.orderId);
      setCheckoutSession({
        orderId: data.orderId,
        clientSecret: data.clientSecret,
        paymentIntentId: data.paymentIntentId,
        subtotal: data.subtotal,
        shipping: data.shipping,
        total: data.total,
      });
      setView("payment");
      window.scrollTo(0, 0);
    } catch (err) {
      console.error("Failed to start payment:", err);
      setOrderError(
        err.message || "Something went wrong starting your payment. Please try again."
      );
    } finally {
      setIsSubmittingOrder(false);
    }
    */
  }

/* STRIPE (disabled until online payment launches) — payment success + redirect screen
  // Step 2: after Stripe confirms the payment in-page
  async function handlePaymentSuccess(paymentIntent) {
    try {
      const data = await callPaymentsApi("confirm-payment", {
        paymentIntentId: paymentIntent.id,
        clientSecret: checkoutSession.clientSecret,
      });
      finalizeConfirmedOrder(data);
    } catch (err) {
      // The payment went through; the webhook will still update the order.
      console.error("Payment confirmed but order sync failed:", err);
      finalizeConfirmedOrder({
        status: paymentIntent.status,
        order: {
          id: checkoutSession.orderId,
          items: cart,
          subtotal: checkoutSession.subtotal,
          shipping: checkoutSession.shipping,
          total: checkoutSession.total,
          customer: order,
        },
      });
    }
  }

  // CONFIRMING REDIRECT — shown briefly after 3D Secure etc.
  if (isConfirmingRedirect) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white font-sans text-sm text-zinc-500">
        Confirming your payment…
      </div>
    );
  }
*/

  const displayItems =
    view === "confirmed" ? confirmedOrder?.items || [] : cart;
  const displaySubtotal =
    view === "confirmed"
      ? confirmedOrder?.subtotal || 0
      : view === "payment"
        ? checkoutSession?.subtotal ?? cartTotal
        : cartTotal;
  const displayShipping =
    view === "confirmed"
      ? confirmedOrder?.shipping || 0
      : view === "payment"
        ? checkoutSession?.shipping ?? estimatedShipping
        : estimatedShipping;
  const displayTotal =
    view === "confirmed"
      ? confirmedOrder?.total || 0
      : view === "payment"
        ? checkoutSession?.total ?? displaySubtotal + (displayShipping || 0)
        : displaySubtotal + (displayShipping || 0);

  const cartIsEmpty = view === "checkout" && cartReady && cart.length === 0;

  const stepClass = (active) => (active ? "text-black" : "");

  return (
    <div className="min-h-screen bg-white font-sans text-zinc-800">
      {/* Top bar */}
      <div className="flex w-full items-center justify-between gap-4 border-b border-zinc-200 px-6 py-4 sm:px-10">
        <a href="#/" className="text-lg font-semibold tracking-tight text-black">
          {SITE_NAME}
        </a>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            {view !== "confirmed" ? (
              <button onClick={returnToCart} className="hover:text-black hover:underline">
                Cart
              </button>
            ) : (
              <span>Cart</span>
            )}
            <span>›</span>
            {view === "payment" ? (
              <button onClick={() => setView("checkout")} className="hover:text-black hover:underline">
                Information
              </button>
            ) : (
              <span className={stepClass(view === "checkout")}>Information</span>
            )}
            <span>›</span>
            <span className={stepClass(view === "payment")}>Payment</span>
            <span>›</span>
            <span className={stepClass(view === "confirmed")}>Complete</span>
          </div>
          <ThemeToggle />
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-6xl flex-col-reverse lg:flex-row">
        {/* Left column — form / payment / confirmation */}
        <div className="flex w-full flex-col gap-8 px-6 py-10 sm:px-10 lg:w-1/2 lg:border-r lg:border-zinc-200 lg:py-14 lg:pr-14">
          {cartIsEmpty && (
            <div className="flex flex-col items-start gap-4">
              <h1 className="text-2xl font-medium tracking-tight text-black">
                Your cart is empty
              </h1>
              {orderError && <p className="text-sm text-red-600">{orderError}</p>}
              <p className="text-sm text-zinc-600">Add something to your cart to check out.</p>
              <a
                href="#/shop"
                className="flex h-12 w-full items-center justify-center rounded-md bg-black text-sm font-medium text-white hover:bg-zinc-800 sm:w-fit sm:px-8"
              >
                Continue shopping
              </a>
            </div>
          )}

          {view === "checkout" && !cartIsEmpty && (
            <form
              id="checkout-form"
              onSubmit={handleContinueToPayment}
              className="flex flex-col gap-8"
              noValidate
            >
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-medium text-black">Contact</h2>
                  <a href="#/account" className="text-xs text-zinc-600 underline hover:text-black">
                    Sign in
                  </a>
                </div>
                <input
                  type="email"
                  autoComplete="email"
                  placeholder="Email"
                  value={order.email}
                  onChange={(e) => handleOrderChange("email", e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>

              <div className="flex flex-col gap-3">
                <h2 className="text-base font-medium text-black">Delivery</h2>
                <select
                  aria-label="Country/Region"
                  value={order.country}
                  onChange={(e) => handleOrderChange("country", e.target.value)}
                  className={`${INPUT_CLASS} text-zinc-700`}
                >
                  <option value="">Country/Region</option>
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  autoComplete="name"
                  placeholder="Full name"
                  value={order.fullName}
                  onChange={(e) => handleOrderChange("fullName", e.target.value)}
                  className={INPUT_CLASS}
                />

                <input
                  type="text"
                  autoComplete="address-line1"
                  placeholder="Address"
                  value={order.address}
                  onChange={(e) => handleOrderChange("address", e.target.value)}
                  className={INPUT_CLASS}
                />

                <input
                  type="text"
                  autoComplete="address-line2"
                  placeholder="Apartment, suite, etc. (optional)"
                  value={order.apartment}
                  onChange={(e) => handleOrderChange("apartment", e.target.value)}
                  className={INPUT_CLASS}
                />

                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    autoComplete="address-level2"
                    placeholder="City"
                    value={order.city}
                    onChange={(e) => handleOrderChange("city", e.target.value)}
                    className={INPUT_CLASS}
                  />
                  <input
                    type="text"
                    autoComplete="address-level1"
                    placeholder="State / Governorate"
                    value={order.state}
                    onChange={(e) => handleOrderChange("state", e.target.value)}
                    className={INPUT_CLASS}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    autoComplete="postal-code"
                    placeholder="Postal code (optional)"
                    value={order.zip}
                    onChange={(e) => handleOrderChange("zip", e.target.value)}
                    className={INPUT_CLASS}
                  />
                  <input
                    type="tel"
                    autoComplete="tel"
                    placeholder="Phone"
                    value={order.phone}
                    onChange={(e) => handleOrderChange("phone", e.target.value)}
                    className={INPUT_CLASS}
                  />
                </div>

                <textarea
                  placeholder="Order notes (optional)"
                  value={order.notes}
                  onChange={(e) => handleOrderChange("notes", e.target.value)}
                  rows={3}
                  className={INPUT_CLASS}
                />
              </div>

              <div className="flex flex-col gap-3">
                <h2 className="text-base font-medium text-black">Shipping method</h2>
                <div className="flex items-center justify-between rounded-md border border-black bg-zinc-50 px-4 py-3 text-sm">
                  <span>Standard Shipping</span>
                  <span className="font-medium text-black">
                    {shippingLabel(estimatedShipping)}
                  </span>
                </div>
                <a href="#/shipping" className="w-fit text-xs text-zinc-500 underline hover:text-black">
                  Shipping policy
                </a>
              </div>

              {orderError && <p className="text-sm text-red-600">{orderError}</p>}

              <div className="flex flex-col gap-3 border-t border-zinc-200 pt-6 sm:flex-row-reverse">
                <button
                  type="submit"
                  form="checkout-form"
                  disabled={isSubmittingOrder}
                  className="flex h-12 flex-1 items-center justify-center rounded-md bg-black text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
                >
                  {isSubmittingOrder ? "Preparing payment..." : "Continue to payment"}
                </button>
                <button
                  type="button"
                  onClick={returnToCart}
                  disabled={isSubmittingOrder}
                  className="flex h-12 items-center justify-center rounded-md border border-zinc-300 px-6 text-sm text-zinc-700 hover:border-black disabled:opacity-50"
                >
                  Return to cart
                </button>
              </div>
            </form>
          )}

          {view === "payment" && (
            <div className="flex flex-col gap-8">
              {/* Review block */}
              <div className="flex flex-col divide-y divide-zinc-200 rounded-md border border-zinc-300 text-sm">
                <div className="flex items-start gap-4 px-4 py-3">
                  <span className="w-20 flex-shrink-0 text-zinc-500">Contact</span>
                  <span className="flex-1 break-all text-black">{order.email}</span>
                  <button
                    onClick={() => setView("checkout")}
                    className="text-xs text-zinc-600 underline hover:text-black"
                  >
                    Change
                  </button>
                </div>
                <div className="flex items-start gap-4 px-4 py-3">
                  <span className="w-20 flex-shrink-0 text-zinc-500">Ship to</span>
                  <span className="flex-1 text-black">
                    {[
                      order.address,
                      order.apartment,
                      order.city,
                      order.state,
                      order.zip,
                      order.country,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </span>
                  <button
                    onClick={() => setView("checkout")}
                    className="text-xs text-zinc-600 underline hover:text-black"
                  >
                    Change
                  </button>
                </div>
                <div className="flex items-start gap-4 px-4 py-3">
                  <span className="w-20 flex-shrink-0 text-zinc-500">Method</span>
                  <span className="flex-1 text-black">
                    Standard Shipping · {shippingLabel(checkoutSession?.shipping ?? estimatedShipping)}
                  </span>
                </div>
              </div>

              {/* Stripe Payment Element */}
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <h2 className="text-base font-medium text-black">Payment</h2>
                  {ONLINE_PAYMENTS_ENABLED && (
                    <p className="text-xs text-zinc-500">
                      All transactions are secure and encrypted.
                    </p>
                  )}
                </div>
                {/* STRIPE (disabled until online payment launches) — Payment Element
                <Elements
                  key={checkoutSession.clientSecret}
                  stripe={getStripe()}
                  options={{
                    clientSecret: checkoutSession.clientSecret,
                    appearance: stripeAppearance(isDark),
                  }}
                >
                  <StripePaymentForm
                    total={checkoutSession.total}
                    customer={order}
                    onSuccess={handlePaymentSuccess}
                    onBack={() => setView("checkout")}
                  />
                </Elements>
                */}
                <PaymentComingSoon
                  cart={cart}
                  customer={order}
                  subtotal={displaySubtotal}
                  shipping={displayShipping}
                  total={displayTotal}
                  onBack={() => setView("checkout")}
                />
              </div>
            </div>
          )}

          {view === "confirmed" && confirmedOrder && (
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium text-emerald-700">
                  {confirmedOrder.paymentStatus === "processing"
                    ? "Order received — payment processing"
                    : "Order confirmed"}
                </p>
                <h1 className="text-2xl font-medium tracking-tight text-black">
                  Thank you, {confirmedOrder.customer?.fullName}
                </h1>
                <p className="text-sm text-zinc-500">
                  Confirmation #{String(confirmedOrder.id).slice(0, 8).toUpperCase()}
                </p>
              </div>

              <div className="flex flex-col gap-2 rounded-md bg-zinc-50 p-4 text-sm">
                <p className="font-medium text-black">Contact information</p>
                <p className="text-zinc-600">{confirmedOrder.customer?.email}</p>
                <p className="text-zinc-600">{confirmedOrder.customer?.phone}</p>
              </div>

              <div className="flex flex-col gap-2 rounded-md bg-zinc-50 p-4 text-sm">
                <p className="font-medium text-black">Shipping address</p>
                <p className="text-zinc-600">
                  {confirmedOrder.customer?.address}
                  {confirmedOrder.customer?.apartment
                    ? `, ${confirmedOrder.customer.apartment}`
                    : ""}
                </p>
                <p className="text-zinc-600">
                  {[confirmedOrder.customer?.city, confirmedOrder.customer?.state]
                    .filter(Boolean)
                    .join(", ")}{" "}
                  {confirmedOrder.customer?.zip}
                </p>
                <p className="text-zinc-600">{confirmedOrder.customer?.country}</p>
              </div>

              <div className="flex flex-col gap-2 rounded-md bg-zinc-50 p-4 text-sm">
                <p className="font-medium text-black">Shipping method</p>
                <p className="text-zinc-600">
                  Standard Shipping · {shippingLabel(confirmedOrder.shipping || 0)}
                </p>
              </div>

              <div className="flex flex-col gap-2 rounded-md bg-zinc-50 p-4 text-sm">
                <p className="font-medium text-black">Payment</p>
                <p className="text-zinc-600">
                  Card ·{" "}
                  {confirmedOrder.paymentStatus === "processing" ? "Processing" : "Paid"}{" "}
                  · {formatPrice(confirmedOrder.total)}
                </p>
              </div>

              <p className="text-sm text-zinc-600">
                Questions about your order?{" "}
                <a href="#/contact" className="underline hover:text-black">
                  Contact us
                </a>{" "}
                and include your confirmation number.
              </p>

              <a
                href="#/shop"
                className="flex h-12 w-full items-center justify-center rounded-md bg-black text-sm font-medium text-white hover:bg-zinc-800 sm:w-fit sm:px-8"
              >
                Continue shopping
              </a>
            </div>
          )}
        </div>

        {/* Right column — sticky order summary */}
        <div className="flex w-full flex-col gap-6 bg-zinc-50 px-6 py-10 sm:px-10 lg:w-1/2 lg:py-14 lg:pl-14">
          <div className="flex flex-col gap-5 lg:sticky lg:top-10">
            <div className="flex flex-col gap-4">
              {displayItems.map((item, i) => (
                <div key={item.id || `${item.productId}-${i}`} className="flex items-center gap-4">
                  <div className="relative h-16 w-16 flex-shrink-0 rounded-md bg-white ring-1 ring-zinc-200">
                    <div className="h-full w-full overflow-hidden rounded-md">
                      {item.image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.image}
                          alt={item.title}
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>
                    <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-zinc-500 text-[10px] font-medium text-white">
                      {item.qty}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col">
                    <p className="text-sm text-black">{item.title}</p>
                    <p className="text-xs text-zinc-500">
                      {[item.color, item.incense].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <p className="text-sm text-zinc-700">
                    {formatPrice(item.price * item.qty)}
                  </p>
                </div>
              ))}
              {displayItems.length === 0 && (
                <p className="text-sm text-zinc-500">No items yet.</p>
              )}
            </div>

            <div className="flex flex-col gap-2 border-t border-zinc-200 pt-4 text-sm">
              <div className="flex justify-between text-zinc-600">
                <span>Subtotal</span>
                <span>{formatPrice(displaySubtotal)}</span>
              </div>
              <div className="flex justify-between text-zinc-600">
                <span>Shipping</span>
                <span>{shippingLabel(displayShipping)}</span>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-zinc-200 pt-4">
              <span className="text-base font-medium text-black">Total</span>
              <span className="text-lg font-medium text-black">
                {formatPrice(displayTotal)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MAIN PAGE — state, routing, theme
// ============================================================
export default function Home() {
  // ---- Product data (from Firestore) ----
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState("");

  // ---- Cart (persisted in localStorage) ----
  const [cart, setCart] = useState([]);
  const [cartReady, setCartReady] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  // ---- Route from the URL hash, e.g. #/shop/seating ----
  const [route, setRoute] = useState({ page: "home", param: null, query: "" });

  // ---- Theme ----
  const [isDark, setIsDark] = useState(false);

  // Load products from Firestore (live updates)
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "products"),
      (snap) => {
        setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setProductsLoading(false);
        setProductsError("");
      },
      (err) => {
        console.error("Failed to load products:", err);
        setProductsError("Couldn't load products. Please try again later.");
        setProductsLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // Restore the saved cart
  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY) || "[]");
      if (Array.isArray(saved)) setCart(saved);
    } catch {
      // storage unavailable — start empty
    }
    setCartReady(true);
  }, []);

  // Save the cart whenever it changes
  useEffect(() => {
    if (!cartReady) return;
    try {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // ignore
    }
  }, [cart, cartReady]);

  // Theme: read what the inline script applied, follow the OS until the user picks
  useEffect(() => {
    const root = document.documentElement;
    setIsDark(root.classList.contains("ck-dark"));
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e) => {
      let saved = null;
      try {
        saved = window.localStorage.getItem(THEME_STORAGE_KEY);
      } catch {}
      if (saved) return;
      root.classList.toggle("ck-dark", e.matches);
      setIsDark(e.matches);
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  // Hash routing: every link is a real <a href="#/...">, so back/forward,
  // refresh and opening in a new tab all work.
  useEffect(() => {
    // STRIPE: returning from a 3D Secure redirect opens checkout
    const returningFromStripe =
      ONLINE_PAYMENTS_ENABLED &&
      new URLSearchParams(window.location.search).has("payment_intent");
    setRoute(
      returningFromStripe
        ? { page: "checkout", param: null, query: "" }
        : parseHash(window.location.hash)
    );

    function onHashChange() {
      setRoute(parseHash(window.location.hash));
      setCartOpen(false);
      window.scrollTo(0, 0);
    }
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const store = useMemo(() => {
    function navigate(path) {
      const target = `#${path.startsWith("/") ? path : `/${path}`}`;
      setCartOpen(false);
      if (window.location.hash === target) {
        setRoute(parseHash(target));
        window.scrollTo(0, 0);
      } else {
        window.location.hash = target;
      }
    }

    function toggleTheme() {
      const next = !document.documentElement.classList.contains("ck-dark");
      document.documentElement.classList.toggle("ck-dark", next);
      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, next ? "dark" : "light");
      } catch {}
      setIsDark(next);
    }

    function addToCart(product, color, incense) {
      setCart((prev) => {
        const existingIndex = prev.findIndex(
          (item) =>
            item.productId === product.id &&
            item.color === color &&
            item.incense === incense
        );
        if (existingIndex !== -1) {
          const next = [...prev];
          next[existingIndex] = {
            ...next[existingIndex],
            qty: next[existingIndex].qty + 1,
          };
          return next;
        }
        return [
          ...prev,
          {
            id: `${product.id}-${color}-${incense}-${Date.now()}`,
            productId: product.id,
            title: product.title,
            image: product.images?.[0]?.src || null,
            color,
            incense,
            price: product.price,
            qty: 1,
          },
        ];
      });
    }

    function updateQty(id, delta) {
      setCart((prev) =>
        prev
          .map((item) => (item.id === id ? { ...item, qty: item.qty + delta } : item))
          .filter((item) => item.qty > 0)
      );
    }

    function removeItem(id) {
      setCart((prev) => prev.filter((item) => item.id !== id));
    }

    return {
      products,
      productsLoading,
      productsError,
      cart,
      cartReady,
      cartCount: cart.reduce((sum, item) => sum + item.qty, 0),
      cartTotal: cart.reduce((sum, item) => sum + item.qty * item.price, 0),
      cartOpen,
      setCart,
      setCartOpen,
      addToCart,
      updateQty,
      removeItem,
      route,
      navigate,
      isDark,
      toggleTheme,
    };
  }, [products, productsLoading, productsError, cart, cartReady, cartOpen, route, isDark]);

  const isLandingPage = ["home", "shop", "product", "search"].includes(route.page);

  function renderPage() {
    switch (route.page) {
      // One product only — the old shop / product / search links
      // (e.g. "Continue shopping" in the cart) all open the product page.
      case "home":
      case "shop":
      case "product":
      case "search":
        return <LandingView />;
      case "account":
        return <AccountView />;
      case "contact":
        return <ContactView />;
      case "trade":
        return <TradeView key={route.param || "trade"} section={route.param} />;
      case "about":
        return <AboutView />;
      case "faq":
        return <FaqView />;
      case "returns":
        return <ReturnsView />;
      case "shipping":
        return <ShippingView />;
      case "terms":
        return <TermsView />;
      case "privacy":
        return <PrivacyView />;
      default:
        return <NotFoundView />;
    }
  }

  return (
    <StoreContext.Provider value={store}>
      {/* Applies the saved/system theme before first paint, then styles for dark mode */}
      <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      <style dangerouslySetInnerHTML={{ __html: THEME_CSS }} />

      {route.page === "checkout" ? (
        <CheckoutView />
      ) : (
        <div
          className={
            isLandingPage
              ? "ckl-site flex min-h-screen flex-1 flex-col"
              : "ckl-site-info flex min-h-screen flex-1 flex-col bg-white font-sans text-zinc-800"
          }
        >
          <Header />
          {renderPage()}
          <Footer />
          <CartDrawer />
        </div>
      )}
    </StoreContext.Provider>
  );
}
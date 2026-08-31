"use client";

import { useState } from "react";

const PRODUCT = {
  title: "Block Incense Holder",
  price: 88,
};

const PRODUCT_IMAGES = [
  {
    src: "https://walden.us/cdn/shop/files/Block_Incense_Holder_Side_View_887686d6-224e-4b6f-b85a-4cc829871fa2.png?v=1770751560&width=1946",
    alt: "Block Incense Holder — side view",
  },
  {
    src: "https://walden.us/cdn/shop/files/Block_Incense_Holder_RawMetal_34_Stick_V002_EDIT-pichi.jpg?v=1770751560&width=1946",
    alt: "Block Incense Holder — raw metal, 3/4 view with stick",
  },
  {
    src: "https://walden.us/cdn/shop/files/Block_Incense_Holder_RawMetal_TopView_Stick_V002_Edit-pichi.jpg?v=1770751560&width=1946",
    alt: "Block Incense Holder — raw metal, top view",
  },
  {
    src: "https://walden.us/cdn/shop/files/Block_Incense_Holder_RawMetal_SideTiltedView_Stick_V002_EDIT-pichi.jpg?v=1770751560&width=1946",
    alt: "Block Incense Holder — raw metal, tilted side view",
  },
  {
    src: "https://walden.us/cdn/shop/files/Block_Incense_Holder_Blue_SideView_Stick_V002_EDIT-pichi.jpg?v=1770751560&width=1946",
    alt: "Block Incense Holder — blue, side view",
  },
  {
    src: "https://walden.us/cdn/shop/files/Block_Incense_Holder_Blue_34_Stick_V002_EDIT-pichi.jpg?v=1770751560&width=1946",
    alt: "Block Incense Holder — blue, 3/4 view",
  },
  {
    src: "https://walden.us/cdn/shop/files/Block_Incense_Holder_Blue_TopView_Stick_V002_Edit-pichi.jpg?v=1770751560&width=1946",
    alt: "Block Incense Holder — blue, top view",
  },
  {
    src: "https://walden.us/cdn/shop/files/Block_Incense_Holder_Black_SideView_Stick_V002_EDIT-pichi.jpg?v=1770751560&width=1946",
    alt: "Block Incense Holder — black, side view",
  },
  {
    src: "https://walden.us/cdn/shop/files/Block_Incense_Holder_Black_34_Stick_V002_EDIT-pichi.jpg?v=1770751560&width=1946",
    alt: "Block Incense Holder — black, 3/4 view",
  },
  {
    src: "https://walden.us/cdn/shop/files/Block_Incense_Holder_Black_TopView_Stick_V002_Edit-pichi.jpg?v=1770751560&width=1946",
    alt: "Block Incense Holder — black, top view",
  },
  {
    src: "https://walden.us/cdn/shop/files/Block_Incense_Holder_Black_SideTiltedView_Stick_V002_EDIT-pichi.jpg?v=1770751560&width=1946",
    alt: "Block Incense Holder — black, tilted side view",
  },
];

const COLORS = ["Raw", "Blue", "Black"];
const INCENSE_OPTIONS = ["Only Holder", "Hinoki", "Sandalwood"];

const TABS = [
  {
    label: "Description",
    content: (
      <div className="flex flex-col gap-4">
        <p>
          A sculptural incense holder composed of two intersecting forms. One
          supports the incense while the other cantilevers to catch falling
          ash. Minimal in design and crafted from aluminum, it serves as both
          a functional tool and a refined object within any space.
        </p>
        <p>Incense packs come with 50 sticks.</p>
        <hr className="border-zinc-200" />
        <ul className="flex flex-col gap-1">
          <li>· Dual function: holds incense and collects ash</li>
          <li>· Sculptural form with intersecting geometry</li>
          <li>· Solid aluminum with a smooth, brushed finish</li>
          <li>· Designed for balance and longevity</li>
          <li>· Resistant to heat and ash residue</li>
        </ul>
      </div>
    ),
  },
  {
    label: "Specs",
    content: (
      <div className="flex flex-col gap-4">
        <div className="relative w-full aspect-[3/2]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://walden.us/cdn/shop/files/Block_Incense_Holder_Dimensions.png?v=1758211663&width=3000"
            alt="Block Incense Holder dimensions"
            className="h-full w-full object-contain"
          />
        </div>
      </div>
    ),
  },
  {
    label: "Usage & Care",
    content: (
      <div className="flex flex-col gap-4">
        <ul className="flex flex-col gap-1">
          <li>· Insert incense into the upright block to burn</li>
          <li>· Allow falling ash to collect on the cantilevered form</li>
          <li>· Wipe with a soft cloth after use to remove residue</li>
        </ul>
        <hr className="border-zinc-200" />
        <p className="font-medium text-black">Care Instructions</p>
        <ul className="flex flex-col gap-1">
          <li>· Clean with a dry or slightly damp cloth</li>
          <li>· Avoid abrasive cleaners to preserve the finish</li>
          <li>· Store in a cool, dry place when not in use</li>
        </ul>
      </div>
    ),
  },
];

function Star({ filled }) {
  return (
    <svg
      viewBox="0 0 20 20"
      className={`h-4 w-4 ${filled ? "fill-black" : "fill-zinc-300"}`}
    >
      <path d="M10 1.5l2.6 5.27 5.82.85-4.21 4.1 1 5.8L10 14.9l-5.21 2.62 1-5.8-4.21-4.1 5.82-.85L10 1.5z" />
    </svg>
  );
}

function formatUSD(n) {
  return `$${n.toFixed(2)} USD`;
}

export default function Home() {
  const [activeImage, setActiveImage] = useState(0);
  const [color, setColor] = useState("Raw");
  const [incense, setIncense] = useState("Only Holder");
  const [activeTab, setActiveTab] = useState(0);
  const [added, setAdded] = useState(false);

  // Cart: each line item is { id, color, incense, price, qty }
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);

  // Checkout flow: "cart" | "checkout" | "confirmed"
  const [checkoutStep, setCheckoutStep] = useState("cart");
  const [order, setOrder] = useState({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    country: "",
    notes: "",
  });
  const [orderError, setOrderError] = useState("");
  const [confirmedOrder, setConfirmedOrder] = useState(null);

  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);
  const cartTotal = cart.reduce((sum, item) => sum + item.qty * item.price, 0);

  function handleAddToCart() {
    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.color === color && item.incense === incense
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
          id: `${color}-${incense}-${Date.now()}`,
          color,
          incense,
          price: PRODUCT.price,
          qty: 1,
        },
      ];
    });
    setAdded(true);
    setCartOpen(true);
    setCheckoutStep("cart");
    setTimeout(() => setAdded(false), 1800);
  }

  function updateQty(id, delta) {
    setCart((prev) =>
      prev
        .map((item) =>
          item.id === id ? { ...item, qty: item.qty + delta } : item
        )
        .filter((item) => item.qty > 0)
    );
  }

  function removeItem(id) {
    setCart((prev) => prev.filter((item) => item.id !== id));
  }

  function handleOrderChange(field, value) {
    setOrder((prev) => ({ ...prev, [field]: value }));
  }

  function handlePlaceOrder(e) {
    e.preventDefault();
    if (!order.fullName || !order.email || !order.phone || !order.address) {
      setOrderError(
        "Please fill in your name, email, phone number, and shipping address."
      );
      return;
    }
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(order.email)) {
      setOrderError("Please enter a valid email address.");
      return;
    }
    setOrderError("");
    setConfirmedOrder({
      items: cart,
      total: cartTotal,
      customer: order,
    });
    setCheckoutStep("confirmed");
    setCart([]);
  }

  function openCart() {
    setCartOpen(true);
  }

  function closeCartPanel() {
    setCartOpen(false);
  }

  return (
    <div className="flex flex-col flex-1 bg-white font-sans text-zinc-800">
      {/* Announcement bar */}
      <div className="w-full bg-zinc-100 py-2 text-center text-xs tracking-wide text-zinc-600">
        We&apos;re experiencing slightly longer fulfillment times. Contact us
        via live chat any time.
      </div>

      {/* Header */}
      <header className="flex w-full items-center justify-between border-b border-zinc-200 px-6 py-5 sm:px-10">
        <div className="flex items-center gap-8">
          <span className="text-lg font-semibold tracking-tight text-black">
            Commmon Kin
          </span>
          <nav className="hidden gap-6 text-sm text-zinc-700 md:flex">
            <a href="#" className="hover:text-black">
              Shop
            </a>
            <a href="#" className="hover:text-black">
              Seating
            </a>
            <a href="#" className="hover:text-black">
              Aroma
            </a>
            <a href="#" className="hover:text-black">
              Home
            </a>
            <a href="#" className="hover:text-black">
              Body
            </a>
          </nav>
        </div>
        <div className="flex items-center gap-5 text-sm text-zinc-700">
          <button aria-label="Search" className="hover:text-black">
            Search
          </button>
          <button aria-label="Account" className="hover:text-black">
            Account
          </button>
          <button
            aria-label="Cart"
            onClick={openCart}
            className="relative hover:text-black"
          >
            Cart ({cartCount})
          </button>
        </div>
      </header>

      {/* Main product section */}
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-10 sm:px-10 lg:flex-row lg:gap-16 lg:py-16">
        {/* Gallery */}
        <div className="flex flex-1 flex-col gap-4">
          <div className="relative aspect-square w-full overflow-hidden bg-zinc-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={PRODUCT_IMAGES[activeImage].src}
              alt={PRODUCT_IMAGES[activeImage].alt}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="grid grid-cols-5 gap-2 sm:grid-cols-6">
            {PRODUCT_IMAGES.map((img, i) => (
              <button
                key={img.src}
                onClick={() => setActiveImage(i)}
                className={`relative aspect-square overflow-hidden bg-zinc-50 ring-1 transition ${
                  activeImage === i
                    ? "ring-black"
                    : "ring-transparent hover:ring-zinc-300"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.src}
                  alt={img.alt}
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>

        {/* Product info */}
        <div className="flex w-full flex-col gap-6 lg:max-w-md">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-medium tracking-tight text-black">
              {PRODUCT.title}
            </h1>
            <p className="text-lg text-zinc-700">{formatUSD(PRODUCT.price)}</p>
            <div className="flex items-center gap-2 text-sm text-zinc-600">
              <div className="flex items-center gap-0.5">
                {[0, 1, 2, 3].map((i) => (
                  <Star key={i} filled />
                ))}
                <Star filled={false} />
              </div>
              <span>4.3</span>
              <span className="text-zinc-400">·</span>
              <span>24 Reviews</span>
            </div>
          </div>

          {/* Color selector */}
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-black">Color — {color}</p>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`rounded-full border px-4 py-2 text-sm transition ${
                    color === c
                      ? "border-black bg-black text-white"
                      : "border-zinc-300 text-zinc-700 hover:border-black"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Incense selector */}
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium text-black">Incense</p>
            <div className="flex flex-wrap gap-2">
              {INCENSE_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  onClick={() => setIncense(opt)}
                  className={`rounded-full border px-4 py-2 text-sm transition ${
                    incense === opt
                      ? "border-black bg-black text-white"
                      : "border-zinc-300 text-zinc-700 hover:border-black"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Add to cart */}
          <button
            onClick={handleAddToCart}
            className="mt-2 flex h-12 w-full items-center justify-center rounded-full bg-black text-sm font-medium text-white transition-colors hover:bg-zinc-800"
          >
            {added ? "Added" : "Add to cart"}
          </button>

          <div className="flex flex-col gap-1 text-xs text-zinc-500">
            <p>In stock. Ships in 1-2 days.</p>
            <p>30-Day Returns · Free Shipping Over $100</p>
          </div>

          <div className="flex items-center justify-center gap-3 border-y border-zinc-200 py-4 text-xs text-zinc-500">
            <span>10,000+ customers meditate with Common Kin</span>
          </div>

          {/* Tabs */}
          <div className="flex flex-col gap-4">
            <div className="flex gap-6 border-b border-zinc-200 text-sm">
              {TABS.map((tab, i) => (
                <button
                  key={tab.label}
                  onClick={() => setActiveTab(i)}
                  className={`-mb-px border-b-2 pb-3 transition ${
                    activeTab === i
                      ? "border-black text-black"
                      : "border-transparent text-zinc-500 hover:text-black"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="text-sm leading-6 text-zinc-600">
              {TABS[activeTab].content}
            </div>
          </div>

          <div className="flex flex-col gap-2 border-t border-zinc-200 pt-4 text-sm">
            <p className="text-zinc-600">Questions? Chat with our live concierge.</p>
            <button className="w-fit rounded-full border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:border-black">
              Chat with Live Concierge
            </button>
          </div>
        </div>
      </main>

      {/* See it in use */}
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-16 sm:px-10">
        <h2 className="text-xl font-medium tracking-tight text-black">
          See it in use
        </h2>
        <p className="max-w-xl text-sm leading-6 text-zinc-600">
          The Block incense holder brings clarity to ritual through
          simplicity of form. Both sculptural and practical, it frames the
          act of lighting incense as a quiet, intentional gesture.
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="relative aspect-[4/3] w-full overflow-hidden bg-zinc-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://cdn.sanity.io/images/mftqc7s7/production/98b46502bcc9678d2e6dd47214976efaec2aff36-4096x2731.png?w=2000&fm=webp&q=75"
              alt="Block Incense Holder lifestyle shot"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="relative aspect-[4/3] w-full overflow-hidden bg-zinc-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://cdn.sanity.io/images/mftqc7s7/production/0a95699eff32f43a01a8c4a2bd7fd2df1682f8f5-4096x2731.png?w=2000&fm=webp&q=75"
              alt="Block Incense Holder lifestyle shot detail"
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* Help section */}
      <section className="flex w-full flex-col items-center gap-4 bg-zinc-50 px-6 py-16 text-center sm:px-10">
        <h2 className="text-xl font-medium tracking-tight text-black">
          Have questions? We&apos;re here to help.
        </h2>
        <p className="max-w-md text-sm text-zinc-600">
          Talk to a real person about sizing, materials, or building your
          practice.
        </p>
        <button className="rounded-full border border-zinc-300 bg-white px-5 py-2.5 text-sm text-zinc-700 hover:border-black">
          Chat with Live Concierge
        </button>
      </section>

      {/* Footer */}
      <footer className="mt-auto w-full border-t border-zinc-200 px-6 py-12 sm:px-10">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-8 text-sm text-zinc-600 sm:grid-cols-4">
          <div className="flex flex-col gap-2">
            <p className="font-medium text-black">About</p>
            <a href="#" className="hover:text-black">
              About Common Kin
            </a>
            <a href="#" className="hover:text-black">
              Instagram
            </a>
          </div>
          <div className="flex flex-col gap-2">
            <p className="font-medium text-black">Trade</p>
            <a href="#" className="hover:text-black">
              Hospitality and Studio
            </a>
            <a href="#" className="hover:text-black">
              Retail Partners
            </a>
            <a href="#" className="hover:text-black">
              Corporate Gifting
            </a>
          </div>
          <div className="flex flex-col gap-2">
            <p className="font-medium text-black">Support</p>
            <a href="#" className="hover:text-black">
              FAQ
            </a>
            <a href="#" className="hover:text-black">
              Returns
            </a>
            <a href="mailto:hello@walden.us" className="hover:text-black">
              hello@walden.us
            </a>
          </div>
          <div className="flex flex-col gap-2">
            <p className="font-medium text-black">Terms</p>
            <a href="#" className="hover:text-black">
              Terms of Service
            </a>
            <a href="#" className="hover:text-black">
              Privacy Policy
            </a>
            <a href="#" className="hover:text-black">
              Shipping Policy
            </a>
          </div>
        </div>
        <p className="mx-auto mt-10 w-full max-w-6xl text-xs text-zinc-400">
          © 2026 Common-Kin. All rights reserved.
        </p>
      </footer>

      {/* Cart / Checkout drawer */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <button
            aria-label="Close cart"
            onClick={closeCartPanel}
            className="absolute inset-0 bg-black/40"
          />

          {/* Panel */}
          <div className="relative flex h-full w-full max-w-md flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-5">
              <h2 className="text-base font-medium text-black">
                {checkoutStep === "cart" && "Your Cart"}
                {checkoutStep === "checkout" && "Checkout"}
                {checkoutStep === "confirmed" && "Order Confirmed"}
              </h2>
              <button
                onClick={closeCartPanel}
                aria-label="Close"
                className="text-zinc-500 hover:text-black"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              {/* Cart step */}
              {checkoutStep === "cart" && (
                <>
                  {cart.length === 0 ? (
                    <div className="flex flex-col items-center gap-4 py-20 text-center">
                      <p className="text-sm text-zinc-500">
                        Your cart is empty.
                      </p>
                      <button
                        onClick={closeCartPanel}
                        className="rounded-full border border-zinc-300 px-5 py-2 text-sm text-zinc-700 hover:border-black"
                      >
                        Continue shopping
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-6">
                      {cart.map((item) => (
                        <div key={item.id} className="flex gap-4">
                          <div className="h-20 w-20 flex-shrink-0 overflow-hidden bg-zinc-50">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={PRODUCT_IMAGES[0].src}
                              alt={PRODUCT.title}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <div className="flex flex-1 flex-col gap-1">
                            <div className="flex items-start justify-between">
                              <p className="text-sm font-medium text-black">
                                {PRODUCT.title}
                              </p>
                              <button
                                onClick={() => removeItem(item.id)}
                                className="text-xs text-zinc-400 hover:text-black"
                              >
                                Remove
                              </button>
                            </div>
                            <p className="text-xs text-zinc-500">
                              {item.color} · {item.incense}
                            </p>
                            <div className="mt-1 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => updateQty(item.id, -1)}
                                  className="flex h-6 w-6 items-center justify-center rounded-full border border-zinc-300 text-xs hover:border-black"
                                >
                                  −
                                </button>
                                <span className="text-sm">{item.qty}</span>
                                <button
                                  onClick={() => updateQty(item.id, 1)}
                                  className="flex h-6 w-6 items-center justify-center rounded-full border border-zinc-300 text-xs hover:border-black"
                                >
                                  +
                                </button>
                              </div>
                              <p className="text-sm text-zinc-700">
                                {formatUSD(item.price * item.qty)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* Checkout step */}
              {checkoutStep === "checkout" && (
                <form
                  id="checkout-form"
                  onSubmit={handlePlaceOrder}
                  className="flex flex-col gap-4"
                >
                  <div className="flex flex-col gap-3 rounded-md bg-zinc-50 p-4">
                    {cart.map((item) => (
                      <div
                        key={item.id}
                        className="flex justify-between text-sm text-zinc-600"
                      >
                        <span>
                          {PRODUCT.title} ({item.color}, {item.incense}) ×{" "}
                          {item.qty}
                        </span>
                        <span>{formatUSD(item.price * item.qty)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between border-t border-zinc-200 pt-2 text-sm font-medium text-black">
                      <span>Total</span>
                      <span>{formatUSD(cartTotal)}</span>
                    </div>
                  </div>

                  <p className="text-sm font-medium text-black">
                    Contact information
                  </p>
                  <div className="flex flex-col gap-3">
                    <input
                      type="text"
                      placeholder="Full name"
                      value={order.fullName}
                      onChange={(e) =>
                        handleOrderChange("fullName", e.target.value)
                      }
                      className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-black"
                    />
                    <input
                      type="email"
                      placeholder="Email address"
                      value={order.email}
                      onChange={(e) =>
                        handleOrderChange("email", e.target.value)
                      }
                      className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-black"
                    />
                    <input
                      type="tel"
                      placeholder="Phone number"
                      value={order.phone}
                      onChange={(e) =>
                        handleOrderChange("phone", e.target.value)
                      }
                      className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-black"
                    />
                  </div>

                  <p className="mt-2 text-sm font-medium text-black">
                    Shipping address
                  </p>
                  <div className="flex flex-col gap-3">
                    <input
                      type="text"
                      placeholder="Street address"
                      value={order.address}
                      onChange={(e) =>
                        handleOrderChange("address", e.target.value)
                      }
                      className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-black"
                    />
                    <div className="flex gap-3">
                      <input
                        type="text"
                        placeholder="City"
                        value={order.city}
                        onChange={(e) =>
                          handleOrderChange("city", e.target.value)
                        }
                        className="w-1/2 rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-black"
                      />
                      <input
                        type="text"
                        placeholder="State / Province"
                        value={order.state}
                        onChange={(e) =>
                          handleOrderChange("state", e.target.value)
                        }
                        className="w-1/2 rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-black"
                      />
                    </div>
                    <div className="flex gap-3">
                      <input
                        type="text"
                        placeholder="ZIP / Postal code"
                        value={order.zip}
                        onChange={(e) =>
                          handleOrderChange("zip", e.target.value)
                        }
                        className="w-1/2 rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-black"
                      />
                      <input
                        type="text"
                        placeholder="Country"
                        value={order.country}
                        onChange={(e) =>
                          handleOrderChange("country", e.target.value)
                        }
                        className="w-1/2 rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-black"
                      />
                    </div>
                    <textarea
                      placeholder="Order notes (optional)"
                      value={order.notes}
                      onChange={(e) =>
                        handleOrderChange("notes", e.target.value)
                      }
                      rows={3}
                      className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-black"
                    />
                  </div>

                  {orderError && (
                    <p className="text-sm text-red-600">{orderError}</p>
                  )}
                </form>
              )}

              {/* Confirmation step */}
              {checkoutStep === "confirmed" && confirmedOrder && (
                <div className="flex flex-col gap-4">
                  <p className="text-sm text-zinc-600">
                    Thank you, {confirmedOrder.customer.fullName}. Your order
                    has been placed.
                  </p>
                  <div className="flex flex-col gap-2 rounded-md bg-zinc-50 p-4 text-sm text-zinc-600">
                    {confirmedOrder.items.map((item) => (
                      <div key={item.id} className="flex justify-between">
                        <span>
                          {PRODUCT.title} ({item.color}, {item.incense}) ×{" "}
                          {item.qty}
                        </span>
                        <span>{formatUSD(item.price * item.qty)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between border-t border-zinc-200 pt-2 font-medium text-black">
                      <span>Total</span>
                      <span>{formatUSD(confirmedOrder.total)}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 text-sm text-zinc-600">
                    <p className="font-medium text-black">Shipping to</p>
                    <p>{confirmedOrder.customer.address}</p>
                    <p>
                      {confirmedOrder.customer.city}
                      {confirmedOrder.customer.city ? ", " : ""}
                      {confirmedOrder.customer.state}{" "}
                      {confirmedOrder.customer.zip}
                    </p>
                    <p>{confirmedOrder.customer.country}</p>
                    <p className="mt-2">{confirmedOrder.customer.email}</p>
                    <p>{confirmedOrder.customer.phone}</p>
                  </div>
                  <p className="text-xs text-zinc-400">
                    A confirmation email will be sent to{" "}
                    {confirmedOrder.customer.email}.
                  </p>
                </div>
              )}
            </div>

            {/* Footer actions */}
            <div className="border-t border-zinc-200 px-6 py-5">
              {checkoutStep === "cart" && cart.length > 0 && (
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between text-sm font-medium text-black">
                    <span>Subtotal</span>
                    <span>{formatUSD(cartTotal)}</span>
                  </div>
                  <button
                    onClick={() => setCheckoutStep("checkout")}
                    className="flex h-12 w-full items-center justify-center rounded-full bg-black text-sm font-medium text-white hover:bg-zinc-800"
                  >
                    Proceed to checkout
                  </button>
                </div>
              )}

              {checkoutStep === "checkout" && (
                <div className="flex gap-3">
                  <button
                    onClick={() => setCheckoutStep("cart")}
                    className="h-12 flex-1 rounded-full border border-zinc-300 text-sm text-zinc-700 hover:border-black"
                  >
                    Back to cart
                  </button>
                  <button
                    type="submit"
                    form="checkout-form"
                    className="h-12 flex-1 rounded-full bg-black text-sm font-medium text-white hover:bg-zinc-800"
                  >
                    Place order
                  </button>
                </div>
              )}

              {checkoutStep === "confirmed" && (
                <button
                  onClick={closeCartPanel}
                  className="flex h-12 w-full items-center justify-center rounded-full bg-black text-sm font-medium text-white hover:bg-zinc-800"
                >
                  Continue shopping
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
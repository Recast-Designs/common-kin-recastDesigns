"use client";

import { useState, useEffect, useMemo } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  onSnapshot,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";

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
  // ---- Product data (from Firestore) ----
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState("");

  // ---- Selected product / PDP state ----
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [activeImage, setActiveImage] = useState(0);
  const [color, setColor] = useState(null);
  const [incense, setIncense] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [added, setAdded] = useState(false);

  // ---- Cart ----
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);

  // ---- View: "shop" | "checkout" | "confirmed" ----
  const [view, setView] = useState("shop");
  const [order, setOrder] = useState({
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
  });
  const [orderError, setOrderError] = useState("");
  const [confirmedOrder, setConfirmedOrder] = useState(null);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  // ---- Load products from Firestore ----
  // ---- Load products from Firestore (live updates) ----
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "products"),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setProducts(list);
        setProductsLoading(false);
        setProductsError("");

        // Keep the current selection if it still exists; otherwise fall
        // back to the first product in the (possibly updated) list.
        setSelectedProductId((prevId) => {
          const stillExists = list.some((p) => p.id === prevId);
          if (stillExists) return prevId;
          const next = list[0];
          setColor(next?.colors?.[0] ?? null);
          setIncense(next?.incenseOptions?.[0] ?? null);
          return next?.id ?? null;
        });
      },
      (err) => {
        console.error("Failed to load products:", err);
        setProductsError("Couldn't load products. Please try again later.");
        setProductsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId) || null,
    [products, selectedProductId]
  );

  const images = selectedProduct?.images || [];

  function selectProduct(id) {
    const p = products.find((prod) => prod.id === id);
    setSelectedProductId(id);
    setActiveImage(0);
    setActiveTab(0);
    setColor(p?.colors?.[0] ?? null);
    setIncense(p?.incenseOptions?.[0] ?? null);
  }

  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);
  const cartTotal = cart.reduce((sum, item) => sum + item.qty * item.price, 0);
  const shippingCost = 0; // free shipping, no payment gateway involved
  const orderTotal = cartTotal + shippingCost;

  function handleAddToCart() {
    if (!selectedProduct) return;
    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (item) =>
          item.productId === selectedProduct.id &&
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
          id: `${selectedProduct.id}-${color}-${incense}-${Date.now()}`,
          productId: selectedProduct.id,
          title: selectedProduct.title,
          image: images[0]?.src || null,
          color,
          incense,
          price: selectedProduct.price,
          qty: 1,
        },
      ];
    });
    setAdded(true);
    setCartOpen(true);
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

  function goToCheckout() {
    setCartOpen(false);
    setView("checkout");
  }

  function backToShop() {
    setView("shop");
  }

  async function handlePlaceOrder(e) {
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
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(order.email)) {
      setOrderError("Please enter a valid email address.");
      return;
    }
    if (cart.length === 0) {
      setOrderError("Your cart is empty.");
      return;
    }

    setOrderError("");
    setIsSubmittingOrder(true);

    const items = cart.map((item) => ({
      productId: item.productId,
      title: item.title,
      color: item.color,
      incense: item.incense,
      price: item.price,
      qty: item.qty,
      lineTotal: item.price * item.qty,
    }));

    const orderPayload = {
      items,
      subtotal: cartTotal,
      shipping: shippingCost,
      total: orderTotal,
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
      status: "new",
      createdAt: serverTimestamp(),
    };

    try {
      const docRef = await addDoc(collection(db, "orders"), orderPayload);
      setConfirmedOrder({
        id: docRef.id,
        items: cart,
        subtotal: cartTotal,
        shipping: shippingCost,
        total: orderTotal,
        customer: order,
      });
      setView("confirmed");
      setCart([]);
    } catch (err) {
      console.error("Failed to save order to Firestore:", err);
      setOrderError(
        "Something went wrong placing your order. Please try again."
      );
    } finally {
      setIsSubmittingOrder(false);
    }
  }

  // ============================================================
  // CHECKOUT VIEW — Shopify-style two-column layout
  // ============================================================
  if (view === "checkout" || view === "confirmed") {
    const displayItems =
      view === "confirmed" ? confirmedOrder?.items || [] : cart;
    const displaySubtotal =
      view === "confirmed" ? confirmedOrder?.subtotal || 0 : cartTotal;
    const displayShipping =
      view === "confirmed" ? confirmedOrder?.shipping || 0 : shippingCost;
    const displayTotal =
      view === "confirmed" ? confirmedOrder?.total || 0 : orderTotal;

    return (
      <div className="min-h-screen bg-white font-sans text-zinc-800">
        {/* Top bar */}
        <div className="flex w-full items-center justify-between border-b border-zinc-200 px-6 py-4 sm:px-10">
          <button
            onClick={backToShop}
            className="text-lg font-semibold tracking-tight text-black"
          >
            Commmon Kin
          </button>
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <span>Cart</span>
            <span>›</span>
            <span className={view === "checkout" ? "text-black" : ""}>
              Information
            </span>
            <span>›</span>
            <span className={view === "confirmed" ? "text-black" : ""}>
              Complete
            </span>
          </div>
        </div>

        <div className="mx-auto flex w-full max-w-6xl flex-col-reverse lg:flex-row">
          {/* Left column — form / confirmation */}
          <div className="flex w-full flex-col gap-8 px-6 py-10 sm:px-10 lg:w-1/2 lg:border-r lg:border-zinc-200 lg:py-14 lg:pr-14">
            {view === "checkout" && (
              <form
                id="checkout-form"
                onSubmit={handlePlaceOrder}
                className="flex flex-col gap-8"
              >
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-medium text-black">
                      Contact
                    </h2>
                  </div>
                  <input
                    type="email"
                    placeholder="Email"
                    value={order.email}
                    onChange={(e) =>
                      handleOrderChange("email", e.target.value)
                    }
                    className="rounded-md border border-zinc-300 px-3 py-3 text-sm outline-none focus:border-black"
                  />
                </div>

                <div className="flex flex-col gap-3">
                  <h2 className="text-base font-medium text-black">
                    Delivery
                  </h2>
                  <select
                    value={order.country}
                    onChange={(e) =>
                      handleOrderChange("country", e.target.value)
                    }
                    className="rounded-md border border-zinc-300 bg-white px-3 py-3 text-sm text-zinc-700 outline-none focus:border-black"
                  >
                    <option value="">Country/Region</option>
                    <option value="Egypt">Egypt</option>
                    <option value="United Arab Emirates">
                      United Arab Emirates
                    </option>
                    <option value="Jordan">Jordan</option>
                    <option value="United States">United States</option>
                    <option value="United Kingdom">United Kingdom</option>
                    <option value="Other">Other</option>
                  </select>

                  <input
                    type="text"
                    placeholder="Full name"
                    value={order.fullName}
                    onChange={(e) =>
                      handleOrderChange("fullName", e.target.value)
                    }
                    className="rounded-md border border-zinc-300 px-3 py-3 text-sm outline-none focus:border-black"
                  />

                  <input
                    type="text"
                    placeholder="Address"
                    value={order.address}
                    onChange={(e) =>
                      handleOrderChange("address", e.target.value)
                    }
                    className="rounded-md border border-zinc-300 px-3 py-3 text-sm outline-none focus:border-black"
                  />

                  <input
                    type="text"
                    placeholder="Apartment, suite, etc. (optional)"
                    value={order.apartment}
                    onChange={(e) =>
                      handleOrderChange("apartment", e.target.value)
                    }
                    className="rounded-md border border-zinc-300 px-3 py-3 text-sm outline-none focus:border-black"
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="City"
                      value={order.city}
                      onChange={(e) =>
                        handleOrderChange("city", e.target.value)
                      }
                      className="rounded-md border border-zinc-300 px-3 py-3 text-sm outline-none focus:border-black"
                    />
                    <input
                      type="text"
                      placeholder="State / Governorate"
                      value={order.state}
                      onChange={(e) =>
                        handleOrderChange("state", e.target.value)
                      }
                      className="rounded-md border border-zinc-300 px-3 py-3 text-sm outline-none focus:border-black"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Postal code (optional)"
                      value={order.zip}
                      onChange={(e) =>
                        handleOrderChange("zip", e.target.value)
                      }
                      className="rounded-md border border-zinc-300 px-3 py-3 text-sm outline-none focus:border-black"
                    />
                    <input
                      type="tel"
                      placeholder="Phone"
                      value={order.phone}
                      onChange={(e) =>
                        handleOrderChange("phone", e.target.value)
                      }
                      className="rounded-md border border-zinc-300 px-3 py-3 text-sm outline-none focus:border-black"
                    />
                  </div>

                  <textarea
                    placeholder="Order notes (optional)"
                    value={order.notes}
                    onChange={(e) =>
                      handleOrderChange("notes", e.target.value)
                    }
                    rows={3}
                    className="rounded-md border border-zinc-300 px-3 py-3 text-sm outline-none focus:border-black"
                  />
                </div>

                <div className="flex flex-col gap-3">
                  <h2 className="text-base font-medium text-black">
                    Shipping method
                  </h2>
                  <div className="flex items-center justify-between rounded-md border border-black bg-zinc-50 px-4 py-3 text-sm">
                    <span>Standard Shipping</span>
                    <span className="font-medium text-black">Free</span>
                  </div>
                </div>

                {orderError && (
                  <p className="text-sm text-red-600">{orderError}</p>
                )}

                <div className="flex flex-col gap-3 border-t border-zinc-200 pt-6 sm:flex-row-reverse">
                  <button
                    type="submit"
                    form="checkout-form"
                    disabled={isSubmittingOrder}
                    className="flex h-12 flex-1 items-center justify-center rounded-md bg-black text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
                  >
                    {isSubmittingOrder ? "Placing order..." : "Complete order"}
                  </button>
                  <button
                    type="button"
                    onClick={backToShop}
                    disabled={isSubmittingOrder}
                    className="flex h-12 items-center justify-center rounded-md border border-zinc-300 px-6 text-sm text-zinc-700 hover:border-black disabled:opacity-50"
                  >
                    Return to cart
                  </button>
                </div>
              </form>
            )}

            {view === "confirmed" && confirmedOrder && (
              <div className="flex flex-col gap-6">
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-medium text-emerald-700">
                    Order confirmed
                  </p>
                  <h1 className="text-2xl font-medium tracking-tight text-black">
                    Thank you, {confirmedOrder.customer.fullName}
                  </h1>
                  <p className="text-sm text-zinc-500">
                    Confirmation #{confirmedOrder.id.slice(0, 8).toUpperCase()}
                  </p>
                </div>

                <div className="flex flex-col gap-2 rounded-md bg-zinc-50 p-4 text-sm">
                  <p className="font-medium text-black">Contact information</p>
                  <p className="text-zinc-600">{confirmedOrder.customer.email}</p>
                  <p className="text-zinc-600">{confirmedOrder.customer.phone}</p>
                </div>

                <div className="flex flex-col gap-2 rounded-md bg-zinc-50 p-4 text-sm">
                  <p className="font-medium text-black">Shipping address</p>
                  <p className="text-zinc-600">
                    {confirmedOrder.customer.address}
                    {confirmedOrder.customer.apartment
                      ? `, ${confirmedOrder.customer.apartment}`
                      : ""}
                  </p>
                  <p className="text-zinc-600">
                    {confirmedOrder.customer.city}
                    {confirmedOrder.customer.city ? ", " : ""}
                    {confirmedOrder.customer.state}{" "}
                    {confirmedOrder.customer.zip}
                  </p>
                  <p className="text-zinc-600">
                    {confirmedOrder.customer.country}
                  </p>
                </div>

                <div className="flex flex-col gap-2 rounded-md bg-zinc-50 p-4 text-sm">
                  <p className="font-medium text-black">Shipping method</p>
                  <p className="text-zinc-600">Standard Shipping · Free</p>
                </div>

                <button
                  onClick={backToShop}
                  className="flex h-12 w-full items-center justify-center rounded-md bg-black text-sm font-medium text-white hover:bg-zinc-800 sm:w-fit sm:px-8"
                >
                  Continue shopping
                </button>
              </div>
            )}
          </div>

          {/* Right column — sticky order summary */}
          <div className="flex w-full flex-col gap-6 bg-zinc-50 px-6 py-10 sm:px-10 lg:w-1/2 lg:py-14 lg:pl-14">
            <div className="flex flex-col gap-5 lg:sticky lg:top-10">
              <div className="flex flex-col gap-4">
                {displayItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-4">
                    <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-md bg-white ring-1 ring-zinc-200">
                      {item.image && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.image}
                          alt={item.title}
                          className="h-full w-full object-cover"
                        />
                      )}
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
                      {formatUSD(item.price * item.qty)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-2 border-t border-zinc-200 pt-4 text-sm">
                <div className="flex justify-between text-zinc-600">
                  <span>Subtotal</span>
                  <span>{formatUSD(displaySubtotal)}</span>
                </div>
                <div className="flex justify-between text-zinc-600">
                  <span>Shipping</span>
                  <span>{displayShipping === 0 ? "Free" : formatUSD(displayShipping)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-zinc-200 pt-4">
                <span className="text-base font-medium text-black">Total</span>
                <span className="text-lg font-medium text-black">
                  {formatUSD(displayTotal)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // SHOP VIEW — product listing + PDP + cart drawer
  // ============================================================
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
            <a href="#" className="hover:text-black">Shop</a>
            <a href="#" className="hover:text-black">Seating</a>
            <a href="#" className="hover:text-black">Aroma</a>
            <a href="#" className="hover:text-black">Home</a>
            <a href="#" className="hover:text-black">Body</a>
          </nav>
        </div>
        <div className="flex items-center gap-5 text-sm text-zinc-700">
          <button aria-label="Search" className="hover:text-black">Search</button>
          <button aria-label="Account" className="hover:text-black">Account</button>
          <button
            aria-label="Cart"
            onClick={() => setCartOpen(true)}
            className="relative hover:text-black"
          >
            Cart ({cartCount})
          </button>
        </div>
      </header>

      {productsLoading && (
        <div className="px-6 py-16 text-center text-sm text-zinc-500 sm:px-10">
          Loading products…
        </div>
      )}

      {productsError && (
        <div className="px-6 py-16 text-center text-sm text-red-600 sm:px-10">
          {productsError}
        </div>
      )}

      {!productsLoading && !productsError && products.length === 0 && (
        <div className="px-6 py-16 text-center text-sm text-zinc-500 sm:px-10">
          No products found. Add documents to the &quot;products&quot; collection
          in Firestore.
        </div>
      )}

      {!productsLoading && products.length > 1 && (
        <div className="mx-auto flex w-full max-w-6xl flex-wrap gap-3 px-6 pt-8 sm:px-10">
          {products.map((p) => (
            <button
              key={p.id}
              onClick={() => selectProduct(p.id)}
              className={`rounded-full border px-4 py-2 text-sm transition ${
                selectedProductId === p.id
                  ? "border-black bg-black text-white"
                  : "border-zinc-300 text-zinc-700 hover:border-black"
              }`}
            >
              {p.title}
            </button>
          ))}
        </div>
      )}

      {selectedProduct && (
        <>
          {/* Main product section */}
          <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-10 sm:px-10 lg:flex-row lg:gap-16 lg:py-16">
            {/* Gallery */}
            <div className="flex flex-1 flex-col gap-4">
              <div className="relative aspect-square w-full overflow-hidden bg-zinc-50">
                {images[activeImage] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={images[activeImage].src}
                    alt={images[activeImage].alt || selectedProduct.title}
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
              {images.length > 1 && (
                <div className="grid grid-cols-5 gap-2 sm:grid-cols-6">
                  {images.map((img, i) => (
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
                        alt={img.alt || selectedProduct.title}
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product info */}
            <div className="flex w-full flex-col gap-6 lg:max-w-md">
              <div className="flex flex-col gap-2">
                <h1 className="text-2xl font-medium tracking-tight text-black">
                  {selectedProduct.title}
                </h1>
                <p className="text-lg text-zinc-700">
                  {formatUSD(selectedProduct.price)}
                </p>
                {(selectedProduct.rating || selectedProduct.reviewCount) && (
                  <div className="flex items-center gap-2 text-sm text-zinc-600">
                    <div className="flex items-center gap-0.5">
                      {[0, 1, 2, 3].map((i) => (
                        <Star
                          key={i}
                          filled={i < Math.round(selectedProduct.rating || 0)}
                        />
                      ))}
                      <Star filled={false} />
                    </div>
                    {selectedProduct.rating && <span>{selectedProduct.rating}</span>}
                    {selectedProduct.reviewCount && (
                      <>
                        <span className="text-zinc-400">·</span>
                        <span>{selectedProduct.reviewCount} Reviews</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {selectedProduct.colors?.length > 0 && (
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-medium text-black">
                    Color — {color}
                  </p>
                  <div className="flex gap-2">
                    {selectedProduct.colors.map((c) => (
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
              )}

              {selectedProduct.incenseOptions?.length > 0 && (
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-medium text-black">Incense</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedProduct.incenseOptions.map((opt) => (
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
              )}

              <button
                onClick={handleAddToCart}
                className="mt-2 flex h-12 w-full items-center justify-center rounded-full bg-black text-sm font-medium text-white transition-colors hover:bg-zinc-800"
              >
                {added ? "Added" : "Add to cart"}
              </button>

              <div className="flex flex-col gap-1 text-xs text-zinc-500">
                <p>{selectedProduct.inStockNote || "In stock. Ships in 1-2 days."}</p>
                <p>30-Day Returns · Free Shipping Over $100</p>
              </div>

              <div className="flex items-center justify-center gap-3 border-y border-zinc-200 py-4 text-xs text-zinc-500">
                <span>10,000+ customers meditate with Common Kin</span>
              </div>

              {(selectedProduct.description ||
                selectedProduct.specsImage ||
                selectedProduct.usageBullets) && (
                <div className="flex flex-col gap-4">
                  <div className="flex gap-6 border-b border-zinc-200 text-sm">
                    {["Description", "Specs", "Usage & Care"].map((label, i) => (
                      <button
                        key={label}
                        onClick={() => setActiveTab(i)}
                        className={`-mb-px border-b-2 pb-3 transition ${
                          activeTab === i
                            ? "border-black text-black"
                            : "border-transparent text-zinc-500 hover:text-black"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="text-sm leading-6 text-zinc-600">
                    {activeTab === 0 && (
                      <div className="flex flex-col gap-4">
                        {selectedProduct.description && (
                          <p>{selectedProduct.description}</p>
                        )}
                        {selectedProduct.descriptionBullets?.length > 0 && (
                          <>
                            <hr className="border-zinc-200" />
                            <ul className="flex flex-col gap-1">
                              {selectedProduct.descriptionBullets.map((b) => (
                                <li key={b}>· {b}</li>
                              ))}
                            </ul>
                          </>
                        )}
                      </div>
                    )}
                    {activeTab === 1 && selectedProduct.specsImage && (
                      <div className="relative w-full aspect-[3/2]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={selectedProduct.specsImage}
                          alt={`${selectedProduct.title} dimensions`}
                          className="h-full w-full object-contain"
                        />
                      </div>
                    )}
                    {activeTab === 2 && (
                      <div className="flex flex-col gap-4">
                        {selectedProduct.usageBullets?.length > 0 && (
                          <ul className="flex flex-col gap-1">
                            {selectedProduct.usageBullets.map((b) => (
                              <li key={b}>· {b}</li>
                            ))}
                          </ul>
                        )}
                        {selectedProduct.careBullets?.length > 0 && (
                          <>
                            <hr className="border-zinc-200" />
                            <p className="font-medium text-black">
                              Care Instructions
                            </p>
                            <ul className="flex flex-col gap-1">
                              {selectedProduct.careBullets.map((b) => (
                                <li key={b}>· {b}</li>
                              ))}
                            </ul>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2 border-t border-zinc-200 pt-4 text-sm">
                <p className="text-zinc-600">Questions? Chat with our live concierge.</p>
                <button className="w-fit rounded-full border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:border-black">
                  Chat with Live Concierge
                </button>
              </div>
            </div>
          </main>
        </>
      )}

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
            <a href="#" className="hover:text-black">About Common Kin</a>
            <a href="#" className="hover:text-black">Instagram</a>
          </div>
          <div className="flex flex-col gap-2">
            <p className="font-medium text-black">Trade</p>
            <a href="#" className="hover:text-black">Hospitality and Studio</a>
            <a href="#" className="hover:text-black">Retail Partners</a>
            <a href="#" className="hover:text-black">Corporate Gifting</a>
          </div>
          <div className="flex flex-col gap-2">
            <p className="font-medium text-black">Support</p>
            <a href="#" className="hover:text-black">FAQ</a>
            <a href="#" className="hover:text-black">Returns</a>
            <a href="mailto:hello@walden.us" className="hover:text-black">hello@walden.us</a>
          </div>
          <div className="flex flex-col gap-2">
            <p className="font-medium text-black">Terms</p>
            <a href="#" className="hover:text-black">Terms of Service</a>
            <a href="#" className="hover:text-black">Privacy Policy</a>
            <a href="#" className="hover:text-black">Shipping Policy</a>
          </div>
        </div>
        <p className="mx-auto mt-10 w-full max-w-6xl text-xs text-zinc-400">
          © 2026 Common-Kin. All rights reserved.
        </p>
      </footer>

      {/* Cart drawer */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            aria-label="Close cart"
            onClick={() => setCartOpen(false)}
            className="absolute inset-0 bg-black/40"
          />
          <div className="relative flex h-full w-full max-w-md flex-col bg-white shadow-xl">
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
                  <button
                    onClick={() => setCartOpen(false)}
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
                        {item.image && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.image}
                            alt={item.title}
                            className="h-full w-full object-cover"
                          />
                        )}
                      </div>
                      <div className="flex flex-1 flex-col gap-1">
                        <div className="flex items-start justify-between">
                          <p className="text-sm font-medium text-black">
                            {item.title}
                          </p>
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
            </div>

            {cart.length > 0 && (
              <div className="border-t border-zinc-200 px-6 py-5">
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between text-sm font-medium text-black">
                    <span>Subtotal</span>
                    <span>{formatUSD(cartTotal)}</span>
                  </div>
                  <button
                    onClick={goToCheckout}
                    className="flex h-12 w-full items-center justify-center rounded-full bg-black text-sm font-medium text-white hover:bg-zinc-800"
                  >
                    Proceed to checkout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
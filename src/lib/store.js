"use client";

import { createContext, useContext } from "react";

// ============================================================
// SHARED STORE STATE
// Lives in its own module so the landing components can read the
// cart and product data without importing page.js.
// ============================================================
export const StoreContext = createContext(null);

export function useStore() {
  return useContext(StoreContext);
}

/* eslint-disable react/prop-types */
import React, { createContext, useContext, useState, useCallback } from "react";

// ── Context ──────────────────────────────────────────────────────────────────

const WishlistContext = createContext(null);

// ── Provider ─────────────────────────────────────────────────────────────────

export function WishlistProvider({ children }) {
  // items: Array<{ id, name, basePrice, imageUrl, category? }>
  const [items, setItems] = useState([]);

  const addToWishlist = useCallback((product) => {
    setItems((prev) => {
      if (prev.find((i) => i.id === product.id)) return prev;
      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          basePrice: product.basePrice,
          imageUrl: product.imageUrl || null,
          category: product.category || null,
          availableQty: product.availableQty ?? 99,
        },
      ];
    });
  }, []);

  const removeFromWishlist = useCallback((productId) => {
    setItems((prev) => prev.filter((i) => i.id !== productId));
  }, []);

  const isInWishlist = useCallback(
    (productId) => items.some((i) => i.id === productId),
    [items],
  );

  const toggleWishlist = useCallback(
    (product) => {
      if (isInWishlist(product.id)) {
        removeFromWishlist(product.id);
      } else {
        addToWishlist(product);
      }
    },
    [isInWishlist, removeFromWishlist, addToWishlist],
  );

  return (
    <WishlistContext.Provider
      value={{
        items,
        addToWishlist,
        removeFromWishlist,
        isInWishlist,
        toggleWishlist,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used inside <WishlistProvider>");
  return ctx;
}

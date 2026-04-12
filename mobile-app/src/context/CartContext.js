/* eslint-disable react/prop-types */
import React, { createContext, useContext, useState, useCallback } from "react";

// ── Context ──────────────────────────────────────────────────────────────────

const CartContext = createContext(null);

// ── Provider ─────────────────────────────────────────────────────────────────

export function CartProvider({ children }) {
  // items: Array<{ productId, name, basePrice, quantity, availableQty, image? }>
  const [items, setItems] = useState([]);

  const addToCart = useCallback((product, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id
            ? { ...i, quantity: Math.min(i.quantity + quantity, product.availableQty) }
            : i,
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          basePrice: product.basePrice,
          availableQty: product.availableQty,
          quantity,
          image: product.image || null,
        },
      ];
    });
  }, []);

  const removeFromCart = useCallback((productId) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }, []);

  const updateQuantity = useCallback((productId, quantity) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => i.productId !== productId));
      return;
    }
    setItems((prev) =>
      prev.map((i) =>
        i.productId === productId ? { ...i, quantity: Math.min(quantity, i.availableQty) } : i,
      ),
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  // Tổng số lượng sản phẩm trong giỏ (hiển thị trên badge)
  const totalCount = items.reduce((sum, i) => sum + i.quantity, 0);

  // Tổng tiền sản phẩm (UI preview — backend là source of truth)
  const subtotal = items.reduce((sum, i) => sum + i.basePrice * i.quantity, 0);

  /**
   * Tạo payload cho POST /orders theo đúng API contract
   * Không gửi priceAtPurchase hay totalAmount
   */
  const buildOrderItems = useCallback(() => {
    return items.map(({ productId, quantity }) => ({ productId, quantity }));
  }, [items]);

  return (
    <CartContext.Provider
      value={{
        items,
        totalCount,
        subtotal,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        buildOrderItems,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}

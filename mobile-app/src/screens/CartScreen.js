/* eslint-disable react/prop-types */
import React from "react";
import {
  View,
  Text,
  Image,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
} from "react-native";
import { useCart } from "../context/CartContext";
import { COLORS } from "../constants/colors";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ── Mock data cho trạng thái giỏ trống ──────────────────────────────────────

const WISHLIST_ITEMS = [
  {
    id: "w1",
    name: "Lorem ipsum dolor sit amet consectetur",
    price: 17.0,
    color: "Pink",
    size: "M",
    image:
      "https://images.unsplash.com/photo-1515347619362-e612984183ab?q=80&w=400&auto=format&fit=crop",
  },
  {
    id: "w2",
    name: "Lorem ipsum dolor sit amet consectetur",
    price: 17.0,
    color: "Pink",
    size: "M",
    image:
      "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?q=80&w=400&auto=format&fit=crop",
  },
  {
    id: "w3",
    name: "Lorem ipsum dolor sit amet consectetur",
    price: 17.0,
    color: "Pink",
    size: "M",
    image:
      "https://images.unsplash.com/photo-1487222477894-f702f940ed78?q=80&w=400&auto=format&fit=crop",
  },
];

const POPULAR_ITEMS = [
  {
    id: "p1",
    name: "Popular Outfit 1",
    basePrice: 20.0,
    label: "New",
    likes: "1780",
    image:
      "https://images.unsplash.com/photo-1515347619362-e612984183ab?q=80&w=400&auto=format&fit=crop",
  },
  {
    id: "p2",
    name: "Popular Outfit 2",
    basePrice: 25.0,
    label: "Sale",
    likes: "1780",
    image:
      "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?q=80&w=400&auto=format&fit=crop",
  },
  {
    id: "p3",
    name: "Popular Outfit 3",
    basePrice: 30.0,
    label: "Hot",
    likes: "1780",
    image:
      "https://images.unsplash.com/photo-1487222477894-f702f940ed78?q=80&w=400&auto=format&fit=crop",
  },
  {
    id: "p4",
    name: "Popular Outfit 4",
    basePrice: 15.0,
    label: "New",
    likes: "1780",
    image:
      "https://images.unsplash.com/photo-1496747611176-843222e1e57c?q=80&w=400&auto=format&fit=crop",
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatUSD(amount) {
  return "$" + amount.toFixed(2).replace(".", ",");
}

// ── Component: Shipping Address Card ────────────────────────────────────────

function ShippingAddressCard({ onEditPress }) {
  return (
    <View style={styles.addressCard}>
      <View style={styles.addressContent}>
        <Text style={styles.addressTitle}>Shipping Address</Text>
        <Text style={styles.addressText} numberOfLines={2}>
          26, Duong So 2, Thao Dien Ward, An Phu, District 2, Ho Chi Minh city
        </Text>
      </View>
      <TouchableOpacity style={styles.addressEditBtn} onPress={onEditPress}>
        <Text style={styles.addressEditIcon}>✎</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Component: Cart Item Row ────────────────────────────────────────────────

function CartItemRow({ item, onRemove, onUpdateQty }) {
  const fallbackImage =
    "https://images.unsplash.com/photo-1515347619362-e612984183ab?q=80&w=400&auto=format&fit=crop";

  return (
    <View style={styles.cartItemRow}>
      {/* Product image + delete button */}
      <View style={styles.cartItemImageWrap}>
        <Image
          source={{ uri: item.image || fallbackImage }}
          style={styles.cartItemImage}
          resizeMode="cover"
        />
        <TouchableOpacity style={styles.deleteBtn} onPress={() => onRemove(item.productId)}>
          <Text style={styles.deleteBtnIcon}>🗑</Text>
        </TouchableOpacity>
      </View>

      {/* Product info */}
      <View style={styles.cartItemInfo}>
        <Text style={styles.cartItemName} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={styles.cartItemVariant}>Pink, Size M</Text>
        <View style={styles.cartItemBottom}>
          <Text style={styles.cartItemPrice}>{formatUSD(item.basePrice)}</Text>
          <View style={styles.qtyControls}>
            <TouchableOpacity
              style={styles.qtyCircle}
              onPress={() => onUpdateQty(item.productId, item.quantity - 1)}
            >
              <Text style={styles.qtyCircleText}>−</Text>
            </TouchableOpacity>
            <View style={styles.qtyBox}>
              <Text style={styles.qtyBoxText}>{item.quantity}</Text>
            </View>
            <TouchableOpacity
              style={styles.qtyCircleFilled}
              onPress={() => onUpdateQty(item.productId, item.quantity + 1)}
            >
              <Text style={styles.qtyCircleFilledText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

// ── Component: Empty Cart Icon ──────────────────────────────────────────────

function EmptyCartIcon() {
  return (
    <View style={styles.emptyIconWrap}>
      <View style={styles.emptyIconCircle}>
        <Text style={styles.emptyBagIcon}>🛍</Text>
        <View style={styles.emptyBadge}>
          <Text style={styles.emptyBadgeText}>S</Text>
        </View>
      </View>
    </View>
  );
}

// ── Component: Wishlist Item (trạng thái giỏ trống #46) ─────────────────────

function WishlistItem({ item, onAddToCart }) {
  return (
    <View style={styles.wishlistRow}>
      <View style={styles.wishlistImageWrap}>
        <Image source={{ uri: item.image }} style={styles.wishlistImage} resizeMode="cover" />
        <TouchableOpacity style={styles.deleteBtn}>
          <Text style={styles.deleteBtnIcon}>🗑</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.wishlistInfo}>
        <Text style={styles.wishlistName} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={styles.wishlistPrice}>{formatUSD(item.price)}</Text>
        <View style={styles.wishlistChips}>
          <View style={styles.variantChip}>
            <Text style={styles.variantChipText}>{item.color}</Text>
          </View>
          <View style={styles.variantChip}>
            <Text style={styles.variantChipText}>{item.size}</Text>
          </View>
        </View>
      </View>
      <TouchableOpacity style={styles.addToCartMiniBtn} onPress={() => onAddToCart(item)}>
        <Text style={styles.addToCartMiniIcon}>＋</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Component: Popular Item Card (trạng thái giỏ trống #47) ─────────────────

function PopularCard({ item, onAddToCart }) {
  return (
    <TouchableOpacity
      style={styles.popularCard}
      activeOpacity={0.8}
      onPress={() => onAddToCart(item)}
    >
      <Image source={{ uri: item.image }} style={styles.popularImage} resizeMode="cover" />
      <View style={styles.popularBottom}>
        <Text style={styles.popularLikes}>{item.likes}</Text>
        <Text style={styles.popularHeart}>♥</Text>
      </View>
      <View style={styles.popularTag}>
        <Text style={styles.popularTagText}>{item.label}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ── Main Screen ─────────────────────────────────────────────────────────────

export default function CartScreen({ navigation }) {
  const { items, totalCount, subtotal, removeFromCart, updateQuantity, addToCart } = useCart();

  const handleAddToCart = (product) => {
    addToCart({
      id: product.id,
      name: product.name,
      basePrice: product.price || product.basePrice,
      availableQty: 10, // Mock quantity for testing
      image: product.image,
    });
  };

  const hasItems = items.length > 0;

  // ── Render nội dung giỏ hàng CÓ SẢN PHẨM (#45) ──────────────────────────

  const renderCartContent = () => (
    <>
      {/* Cart items */}
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.productId)}
        renderItem={({ item }) => (
          <CartItemRow item={item} onRemove={removeFromCart} onUpdateQty={updateQuantity} />
        )}
        scrollEnabled={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      {/* From Your Wishlist section */}
      <Text style={styles.sectionTitle}>From Your Wishlist</Text>
      {WISHLIST_ITEMS.map((item) => (
        <WishlistItem key={item.id} item={item} onAddToCart={handleAddToCart} />
      ))}
    </>
  );

  // ── Render nội dung giỏ hàng TRỐNG (#46, #47) ────────────────────────────

  const renderEmptyContent = () => (
    <>
      {/* Empty bag icon */}
      <EmptyCartIcon />

      {/* From Your Wishlist */}
      <Text style={styles.sectionTitle}>From Your Wishlist</Text>
      {WISHLIST_ITEMS.map((item) => (
        <WishlistItem key={item.id} item={item} onAddToCart={handleAddToCart} />
      ))}

      {/* Most Popular */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Most Popular</Text>
        <TouchableOpacity
          style={styles.seeAllBtn}
          onPress={() => navigation.navigate("ProductList")}
        >
          <Text style={styles.seeAllText}>See All</Text>
          <View style={styles.seeAllCircle}>
            <Text style={styles.seeAllArrow}>→</Text>
          </View>
        </TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.popularScroll}>
        {POPULAR_ITEMS.map((item) => (
          <PopularCard key={item.id} item={item} onAddToCart={handleAddToCart} />
        ))}
      </ScrollView>
    </>
  );

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Cart</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{totalCount}</Text>
          </View>
        </View>

        {/* Shipping Address — tap ✎ để chọn địa chỉ trong Checkout */}
        <ShippingAddressCard onEditPress={() => navigation.navigate("Checkout")} />

        {/* Conditional content */}
        {hasItems ? renderCartContent() : renderEmptyContent()}

        {/* Bottom spacer */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── FIXED BOTTOM BAR ── */}
      <View style={styles.bottomBar}>
        <View style={styles.totalWrap}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalAmount}>{formatUSD(subtotal)}</Text>
        </View>
        <TouchableOpacity
          style={[styles.checkoutBtn, !hasItems && styles.checkoutBtnDisabled]}
          activeOpacity={0.85}
          disabled={!hasItems}
          onPress={() => navigation.navigate("Checkout")}
        >
          <Text style={styles.checkoutBtnText}>Checkout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgPrimary },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.textPrimary,
  },
  badge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.info,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
  },
  badgeText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },

  // Shipping Address
  addressCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.bgSecondary,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
  },
  addressContent: { flex: 1, marginRight: 12 },
  addressTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  addressText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  addressEditBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.info,
    justifyContent: "center",
    alignItems: "center",
  },
  addressEditIcon: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },

  // Cart Item Row
  cartItemRow: {
    flexDirection: "row",
    paddingVertical: 12,
  },
  cartItemImageWrap: {
    width: 100,
    height: 120,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: COLORS.bgSecondary,
    marginRight: 14,
  },
  cartItemImage: {
    width: "100%",
    height: "100%",
  },
  deleteBtn: {
    position: "absolute",
    bottom: 6,
    left: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.92)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  deleteBtnIcon: {
    fontSize: 14,
  },
  cartItemInfo: {
    flex: 1,
    justifyContent: "space-between",
  },
  cartItemName: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  cartItemVariant: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  cartItemBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  cartItemPrice: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },

  // Quantity controls
  qtyControls: {
    flexDirection: "row",
    alignItems: "center",
  },
  qtyCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: COLORS.info,
    justifyContent: "center",
    alignItems: "center",
  },
  qtyCircleText: {
    fontSize: 18,
    color: COLORS.info,
    fontWeight: "500",
    marginTop: -1,
  },
  qtyCircleFilled: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.info,
    justifyContent: "center",
    alignItems: "center",
  },
  qtyCircleFilledText: {
    fontSize: 18,
    color: "#fff",
    fontWeight: "600",
    marginTop: -1,
  },
  qtyBox: {
    width: 36,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.bgSecondary,
    borderRadius: 6,
    marginHorizontal: 8,
  },
  qtyBoxText: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },

  separator: {
    height: 1,
    backgroundColor: COLORS.divider,
  },

  // Section headings
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginTop: 24,
    marginBottom: 14,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 24,
    marginBottom: 14,
  },

  // See All
  seeAllBtn: {
    flexDirection: "row",
    alignItems: "center",
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginRight: 8,
  },
  seeAllCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.info,
    justifyContent: "center",
    alignItems: "center",
  },
  seeAllArrow: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },

  // Empty cart icon
  emptyIconWrap: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyIconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.bgSecondary,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyBagIcon: {
    fontSize: 48,
  },
  emptyBadge: {
    position: "absolute",
    bottom: 18,
    right: 22,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.info,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  emptyBadgeText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
  },

  // Wishlist items
  wishlistRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  wishlistImageWrap: {
    width: 90,
    height: 110,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: COLORS.bgSecondary,
    marginRight: 14,
  },
  wishlistImage: {
    width: "100%",
    height: "100%",
  },
  wishlistInfo: {
    flex: 1,
    marginRight: 8,
  },
  wishlistName: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  wishlistPrice: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginTop: 4,
  },
  wishlistChips: {
    flexDirection: "row",
    marginTop: 8,
  },
  variantChip: {
    paddingVertical: 4,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 8,
  },
  variantChipText: {
    fontSize: 12,
    fontWeight: "500",
    color: COLORS.textSecondary,
  },

  // Add to cart mini button
  addToCartMiniBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.info,
    justifyContent: "center",
    alignItems: "center",
  },
  addToCartMiniIcon: {
    fontSize: 18,
    color: COLORS.info,
    fontWeight: "600",
  },

  // Popular cards
  popularScroll: {
    marginBottom: 8,
  },
  popularCard: {
    width: (SCREEN_WIDTH - 56) / 3.5,
    height: 155,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: COLORS.bgSecondary,
    marginRight: 12,
  },
  popularImage: {
    width: "100%",
    height: "100%",
  },
  popularBottom: {
    position: "absolute",
    bottom: 8,
    left: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  popularLikes: {
    fontSize: 11,
    fontWeight: "600",
    color: "#fff",
    marginRight: 2,
  },
  popularHeart: {
    fontSize: 11,
    color: COLORS.accent,
  },
  popularTag: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  popularTagText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
  },

  // Bottom bar
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.bgPrimary,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  totalWrap: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginRight: 6,
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.textPrimary,
  },
  checkoutBtn: {
    backgroundColor: COLORS.info,
    paddingVertical: 14,
    paddingHorizontal: 36,
    borderRadius: 28,
  },
  checkoutBtnDisabled: {
    backgroundColor: COLORS.bgSecondary,
  },
  checkoutBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});

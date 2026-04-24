/* eslint-disable react/prop-types */
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Image,
  ScrollView,
} from "react-native";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import { formatPrice } from "../services/api";

const PLACEHOLDER_IMAGE =
  "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=500&auto=format&fit=crop";

function CartItemCard({ item, onDecrease, onIncrease, onRemove }) {
  const imageUri = item.image || item.imageUrl || PLACEHOLDER_IMAGE;
  const price = item.basePrice || item.price || 0;

  return (
    <View style={styles.itemCard}>
      <Image source={{ uri: imageUri }} style={styles.itemImage} />
      <View style={styles.itemBody}>
        <View style={styles.itemTopRow}>
          <Text style={styles.itemName} numberOfLines={2}>
            {item.name}
          </Text>
          <TouchableOpacity style={styles.removeBtn} onPress={onRemove} activeOpacity={0.85}>
            <Text style={styles.removeBtnText}>×</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.itemMeta}>
          {item.availableQty > 0 ? `Có thể đặt ${item.availableQty}` : "Tạm hết hàng"}
        </Text>
        <View style={styles.itemBottomRow}>
          <Text style={styles.itemPrice}>{formatPrice(price)}</Text>
          <View style={styles.qtyControl}>
            <TouchableOpacity style={styles.qtyBtn} onPress={onDecrease} activeOpacity={0.85}>
              <Text style={styles.qtyBtnText}>−</Text>
            </TouchableOpacity>
            <View style={styles.qtyValueWrap}>
              <Text style={styles.qtyValueText}>{item.quantity}</Text>
            </View>
            <TouchableOpacity style={styles.qtyBtn} onPress={onIncrease} activeOpacity={0.85}>
              <Text style={styles.qtyBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

function WishlistRow({ product, onMoveToCart }) {
  const price = product.basePrice || product.price || 0;
  const imageUri = product.imageUrl || product.image || PLACEHOLDER_IMAGE;

  return (
    <View style={styles.wishlistRow}>
      <Image source={{ uri: imageUri }} style={styles.wishlistImage} />
      <View style={styles.wishlistInfo}>
        <Text style={styles.wishlistName} numberOfLines={2}>
          {product.name}
        </Text>
        <Text style={styles.wishlistPrice}>{formatPrice(price)}</Text>
      </View>
      <TouchableOpacity style={styles.wishlistAction} onPress={onMoveToCart} activeOpacity={0.88}>
        <Text style={styles.wishlistActionText}>Thêm</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function CartScreen({ navigation }) {
  const { items, updateQuantity, removeFromCart, addToCart } = useCart();
  const { items: wishlistItems, removeFromWishlist } = useWishlist();

  const subtotal = items.reduce(
    (sum, item) => sum + (item.basePrice || item.price || 0) * item.quantity,
    0,
  );
  const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const wishlistPreview = wishlistItems.slice(0, 3);

  const handleCheckout = () => {
    if (items.length === 0) {
      return;
    }

    navigation.navigate("Checkout");
  };

  const handleMoveWishlistToCart = (product) => {
    addToCart({
      id: product.id || product._id,
      name: product.name,
      basePrice: product.basePrice || product.price || 0,
      availableQty: product.availableQty || product.stockCount || 1,
      image: product.imageUrl || product.image || null,
    });
    removeFromWishlist(product.id || product._id);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={styles.scrollView}
      >
        <View style={styles.heroCard}>
          <Text style={styles.heroEyebrow}>Shopping Bag</Text>
          <View style={styles.heroTopRow}>
            <Text style={styles.heroTitle}>Giỏ hàng của bạn</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{totalCount}</Text>
            </View>
          </View>
          <Text style={styles.heroSubtext}>
            {items.length > 0
              ? `${totalCount} sản phẩm đang chờ được hoàn tất.`
              : "Chọn thêm sản phẩm để bắt đầu đơn hàng tiếp theo."}
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Sản phẩm đã chọn</Text>
            {items.length > 0 ? <Text style={styles.sectionMeta}>{totalCount} món</Text> : null}
          </View>
          {items.length > 0 ? (
            items.map((item) => (
              <CartItemCard
                key={String(item.productId || item.id)}
                item={item}
                onDecrease={() => {
                  if (item.quantity > 1) {
                    updateQuantity(item.productId || item.id, item.quantity - 1);
                    return;
                  }
                  removeFromCart(item.productId || item.id);
                }}
                onIncrease={() => updateQuantity(item.productId || item.id, item.quantity + 1)}
                onRemove={() => removeFromCart(item.productId || item.id)}
              />
            ))
          ) : (
            <View style={styles.emptyBagCard}>
              <Text style={styles.emptyBagTitle}>Giỏ hàng đang trống</Text>
              <Text style={styles.emptyBagText}>
                Khám phá thêm các thiết kế mới và lưu lại những món bạn muốn sở hữu.
              </Text>
              <TouchableOpacity
                style={styles.emptyBagBtn}
                onPress={() => navigation.navigate("ProductList")}
                activeOpacity={0.88}
              >
                <Text style={styles.emptyBagBtnText}>Xem sản phẩm</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {wishlistPreview.length > 0 ? (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Từ danh sách yêu thích</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate("MainTabs", { screen: "Wishlist" })}
                activeOpacity={0.85}
              >
                <Text style={styles.sectionAction}>Xem tất cả</Text>
              </TouchableOpacity>
            </View>
            {wishlistPreview.map((product) => (
              <WishlistRow
                key={String(product.id || product._id)}
                product={product}
                onMoveToCart={() => handleMoveWishlistToCart(product)}
              />
            ))}
          </View>
        ) : null}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <View>
          <Text style={styles.bottomLabel}>Tổng tạm tính</Text>
          <Text style={styles.bottomTotal}>{formatPrice(subtotal)}</Text>
        </View>
        <TouchableOpacity
          style={[styles.checkoutBtn, items.length === 0 && styles.checkoutBtnDisabled]}
          onPress={handleCheckout}
          activeOpacity={items.length === 0 ? 1 : 0.88}
          disabled={items.length === 0}
        >
          <Text
            style={[styles.checkoutBtnText, items.length === 0 && styles.checkoutBtnTextDisabled]}
          >
            Thanh toán
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FCF9F4",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  heroCard: {
    backgroundColor: "#1E1815",
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
  },
  heroEyebrow: {
    color: "#DCC4A8",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroTitle: {
    color: "#FFF8EE",
    fontSize: 28,
    fontWeight: "900",
    flex: 1,
    marginRight: 12,
  },
  countBadge: {
    minWidth: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F2E2D2",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  countBadgeText: {
    color: "#9B4B1F",
    fontSize: 16,
    fontWeight: "800",
  },
  heroSubtext: {
    color: "rgba(255,248,238,0.76)",
    fontSize: 14,
    lineHeight: 22,
    marginTop: 10,
  },
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  sectionTitle: {
    color: "#1E1815",
    fontSize: 17,
    fontWeight: "800",
  },
  sectionAction: {
    color: "#9B4B1F",
    fontSize: 13,
    fontWeight: "700",
  },
  sectionMeta: {
    color: "#7A685B",
    fontSize: 13,
    fontWeight: "700",
  },
  itemCard: {
    flexDirection: "row",
    paddingBottom: 14,
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F0E5D8",
  },
  itemImage: {
    width: 98,
    height: 118,
    borderRadius: 18,
    backgroundColor: "#EFE8E0",
    marginRight: 14,
  },
  itemBody: {
    flex: 1,
    justifyContent: "space-between",
  },
  itemTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  itemName: {
    flex: 1,
    color: "#241A13",
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 22,
    marginRight: 12,
  },
  removeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#F5ECE3",
    alignItems: "center",
    justifyContent: "center",
  },
  removeBtnText: {
    color: "#9B4B1F",
    fontSize: 18,
    lineHeight: 20,
    fontWeight: "700",
  },
  itemMeta: {
    color: "#8A7B6F",
    fontSize: 12,
    marginTop: 6,
  },
  itemBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14,
  },
  itemPrice: {
    color: "#9B4B1F",
    fontSize: 18,
    fontWeight: "900",
  },
  qtyControl: {
    flexDirection: "row",
    alignItems: "center",
  },
  qtyBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#D9C7B7",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FCF9F4",
  },
  qtyBtnText: {
    color: "#9B4B1F",
    fontSize: 18,
    fontWeight: "800",
  },
  qtyValueWrap: {
    minWidth: 38,
    height: 34,
    borderRadius: 12,
    backgroundColor: "#F5ECE3",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 8,
    paddingHorizontal: 10,
  },
  qtyValueText: {
    color: "#241A13",
    fontSize: 14,
    fontWeight: "800",
  },
  emptyBagCard: {
    borderRadius: 18,
    backgroundColor: "#F7EFE7",
    padding: 20,
    alignItems: "flex-start",
  },
  emptyBagTitle: {
    color: "#1E1815",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 8,
  },
  emptyBagText: {
    color: "#76675B",
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 16,
  },
  emptyBagBtn: {
    backgroundColor: "#1E1815",
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  emptyBagBtnText: {
    color: "#FFFDF9",
    fontSize: 14,
    fontWeight: "800",
  },
  wishlistRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 12,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0E5D8",
  },
  wishlistImage: {
    width: 70,
    height: 84,
    borderRadius: 14,
    backgroundColor: "#EFE8E0",
    marginRight: 12,
  },
  wishlistInfo: {
    flex: 1,
    marginRight: 12,
  },
  wishlistName: {
    color: "#241A13",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
    marginBottom: 6,
  },
  wishlistPrice: {
    color: "#9B4B1F",
    fontSize: 14,
    fontWeight: "800",
  },
  wishlistAction: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "#1E1815",
  },
  wishlistActionText: {
    color: "#FFFDF9",
    fontSize: 13,
    fontWeight: "800",
  },
  bottomSpacer: {
    height: 120,
  },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 34,
    backgroundColor: "#FCF9F4",
    borderTopWidth: 1,
    borderTopColor: "#EFE3D6",
  },
  bottomLabel: {
    color: "#78695C",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  bottomTotal: {
    color: "#1E1815",
    fontSize: 22,
    fontWeight: "900",
  },
  checkoutBtn: {
    minWidth: 148,
    paddingHorizontal: 22,
    paddingVertical: 15,
    borderRadius: 18,
    alignItems: "center",
    backgroundColor: "#1E1815",
  },
  checkoutBtnDisabled: {
    backgroundColor: "#E7DBCF",
  },
  checkoutBtnText: {
    color: "#FFFDF9",
    fontSize: 16,
    fontWeight: "800",
  },
  checkoutBtnTextDisabled: {
    color: "#8A7B6F",
  },
});

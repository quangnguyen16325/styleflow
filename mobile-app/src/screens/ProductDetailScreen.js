/* eslint-disable react/prop-types */
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { getProductById, formatPrice } from "../services/api";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import { COLORS } from "../constants/colors";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1515347619362-e612984183ab?q=80&w=800&auto=format&fit=crop";

export default function ProductDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const rawProductId = route.params?.productId ?? route.params?.id ?? 1;
  const productId = parseInt(String(rawProductId), 10);

  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const data = await getProductById(productId);
        setProduct(data);
      } catch (error) {
        console.error("Error fetching product:", error);
        setProduct(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [productId]);

  useEffect(() => {
    if (!product) return;
    setQuantity((prev) => {
      if (product.availableQty <= 0) return 0;
      return Math.min(Math.max(prev, 1), product.availableQty);
    });
  }, [product]);

  const liked = product ? isInWishlist(product.id) : false;
  const availableQty = Number(product?.availableQty ?? 0);
  const minStockLevel = Number(product?.minStockLevel ?? 0);
  const isOutOfStock = availableQty <= 0;
  const imageUrl = product?.imageUrl || FALLBACK_IMAGE;

  const stockLabel = isOutOfStock
    ? "Hết hàng"
    : availableQty <= minStockLevel
      ? "Sắp hết hàng"
      : "Còn hàng";

  const stockTone = isOutOfStock
    ? styles.stockBadgeDanger
    : availableQty <= minStockLevel
      ? styles.stockBadgeWarn
      : styles.stockBadgeOk;

  const increaseQty = () => {
    if (!product || isOutOfStock) return;
    setQuantity((prev) => Math.min(prev + 1, availableQty));
  };

  const decreaseQty = () => {
    setQuantity((prev) => Math.max(prev - 1, 1));
  };

  const handleAddToCart = () => {
    if (!product || isOutOfStock) return;
    addToCart(product, quantity);
    alert("Đã thêm vào giỏ hàng!");
  };

  const handleBuyNow = () => {
    if (!product || isOutOfStock) return;
    addToCart(product, quantity);
    navigation.navigate("Checkout");
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>Không tải được sản phẩm</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.retryBtnText}>Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} bounces={false}>
        <View style={styles.heroWrapper}>
          <Image source={{ uri: imageUrl }} style={styles.heroImage} resizeMode="cover" />
        </View>

        <View style={styles.contentPanel}>
          <View style={styles.headerRow}>
            <View style={styles.titleCol}>
              <Text style={styles.priceText}>{formatPrice(product.basePrice)}</Text>
              <Text style={styles.titleText}>{product.name}</Text>
            </View>
            <TouchableOpacity
              style={styles.heartBtnTop}
              onPress={() => toggleWishlist(product)}
              activeOpacity={0.85}
            >
              <Text style={[styles.heartIcon, liked && styles.heartActive]}>
                {liked ? "♥" : "♡"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.metaRow}>
            {product.category ? (
              <View style={styles.metaChip}>
                <Text style={styles.metaChipText}>{product.category}</Text>
              </View>
            ) : null}
            {product.sku ? (
              <View style={styles.metaChip}>
                <Text style={styles.metaChipText}>SKU: {product.sku}</Text>
              </View>
            ) : null}
          </View>

          <View style={[styles.stockBadge, stockTone]}>
            <Text style={styles.stockBadgeText}>{stockLabel}</Text>
          </View>

          <Text style={styles.sectionTitle}>Thông tin sản phẩm</Text>
          <Text style={styles.descText}>
            {product.category
              ? `Danh mục: ${product.category}.`
              : "Sản phẩm hiện đã sẵn sàng để đặt hàng."}{" "}
            {isOutOfStock
              ? "Sản phẩm đang tạm hết hàng."
              : `Bạn có thể đặt tối đa ${availableQty} sản phẩm ở thời điểm hiện tại.`}
          </Text>

          <View style={styles.purchaseInfoCard}>
            <Text style={styles.purchaseInfoLabel}>Số lượng có thể đặt</Text>
            <Text style={styles.purchaseInfoValue}>{availableQty}</Text>
            <Text style={styles.purchaseInfoHint}>
              {availableQty <= minStockLevel && !isOutOfStock
                ? "Số lượng còn lại không nhiều. Nên đặt sớm nếu bạn muốn giữ hàng."
                : "Giới hạn này được lấy trực tiếp từ tồn kho hiện tại của hệ thống."}
            </Text>
          </View>

          <Text style={styles.sectionTitle}>Số lượng</Text>
          <View style={styles.qtyRow}>
            <TouchableOpacity
              style={[styles.qtyCircle, quantity <= 1 && styles.qtyCircleDisabled]}
              onPress={decreaseQty}
              disabled={quantity <= 1}
            >
              <Text style={styles.qtyCircleText}>−</Text>
            </TouchableOpacity>
            <View style={styles.qtyBox}>
              <Text style={styles.qtyBoxText}>{quantity}</Text>
            </View>
            <TouchableOpacity
              style={[
                styles.qtyCircle,
                (isOutOfStock || quantity >= availableQty) && styles.qtyCircleDisabled,
              ]}
              onPress={increaseQty}
              disabled={isOutOfStock || quantity >= availableQty}
            >
              <Text style={styles.qtyCircleText}>+</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.helperText}>
            {isOutOfStock
              ? "Sản phẩm hiện không thể đặt thêm."
              : `Bạn đang chọn ${quantity} / ${availableQty} sản phẩm có thể đặt.`}
          </Text>

          <View style={styles.summaryCard}>
            <SummaryRow label="Đơn giá" value={formatPrice(product.basePrice)} />
            <SummaryRow label="Tạm tính" value={formatPrice(product.basePrice * quantity)} />
          </View>

          <View style={styles.bottomSpacer} />
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.secondaryBtn}
          activeOpacity={0.85}
          onPress={handleAddToCart}
          disabled={isOutOfStock}
        >
          <Text style={styles.secondaryBtnText}>{isOutOfStock ? "Hết hàng" : "Thêm vào giỏ"}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.primaryBtn, isOutOfStock && styles.primaryBtnDisabled]}
          activeOpacity={0.85}
          onPress={handleBuyNow}
          disabled={isOutOfStock}
        >
          <Text style={styles.primaryBtnText}>{isOutOfStock ? "Không thể mua" : "Mua ngay"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function SummaryRow({ label, value }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

const RADIUS = 24;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgPrimary },
  scrollView: { flex: 1 },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.bgPrimary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.bgPrimary,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  retryBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
  },
  retryBtnText: {
    color: "#fff",
    fontWeight: "700",
  },
  heroWrapper: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.5,
    backgroundColor: "#f3f4f6",
  },
  heroImage: { width: "100%", height: "100%" },
  contentPanel: {
    marginTop: -RADIUS,
    borderTopLeftRadius: RADIUS,
    borderTopRightRadius: RADIUS,
    backgroundColor: COLORS.bgPrimary,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  titleCol: { flex: 1 },
  priceText: {
    fontSize: 26,
    fontWeight: "800",
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  titleText: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
    lineHeight: 24,
  },
  heartBtnTop: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.bgSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  heartIcon: { fontSize: 22, color: COLORS.textMuted },
  heartActive: { color: "#e5484d" },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14,
    marginBottom: 12,
  },
  metaChip: {
    backgroundColor: COLORS.bgSecondary,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  metaChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textSecondary,
    textTransform: "capitalize",
  },
  stockBadge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  stockBadgeOk: { backgroundColor: "#e7f7ed" },
  stockBadgeWarn: { backgroundColor: "#fff4db" },
  stockBadgeDanger: { backgroundColor: "#fdecec" },
  stockBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginTop: 18,
    marginBottom: 10,
  },
  descText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 21,
  },
  purchaseInfoCard: {
    marginTop: 8,
    backgroundColor: COLORS.bgSecondary,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  purchaseInfoLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 6,
  },
  purchaseInfoValue: {
    fontSize: 24,
    fontWeight: "800",
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  purchaseInfoHint: {
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.textSecondary,
  },
  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  qtyCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.bgSecondary,
    justifyContent: "center",
    alignItems: "center",
  },
  qtyCircleDisabled: {
    opacity: 0.45,
  },
  qtyCircleText: {
    fontSize: 24,
    color: COLORS.textPrimary,
    marginTop: -2,
  },
  qtyBox: {
    minWidth: 56,
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 14,
    backgroundColor: COLORS.bgSecondary,
    justifyContent: "center",
    alignItems: "center",
  },
  qtyBoxText: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  helperText: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 10,
    lineHeight: 18,
  },
  summaryCard: {
    marginTop: 18,
    backgroundColor: COLORS.bgSecondary,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  summaryLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  bottomSpacer: { height: 110 },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 22,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  secondaryBtn: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    backgroundColor: COLORS.bgSecondary,
    justifyContent: "center",
    alignItems: "center",
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  primaryBtn: {
    flex: 1.2,
    height: 52,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  primaryBtnDisabled: {
    opacity: 0.5,
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#fff",
  },
});

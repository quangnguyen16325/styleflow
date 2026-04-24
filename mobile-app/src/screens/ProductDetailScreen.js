import React, { useState, useEffect } from "react";
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

export default function ProductDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const productId = parseInt(route.params?.id || "1", 10);

  const { addToCart } = useCart();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  // Variation states
  const [selectedColor, setSelectedColor] = useState(0);
  const [selectedSize, setSelectedSize] = useState("M");
  const [quantity, setQuantity] = useState(1);
  const { isInWishlist, toggleWishlist } = useWishlist();
  const liked = product ? isInWishlist(product.id || product._id) : false;

  const colorVariants = [
    { name: "Pink", hex: "#F9A8D4" },
    { name: "Yellow", hex: "#FDE68A" },
    { name: "Red", hex: "#FCA5A5" },
    { name: "Purple", hex: "#C4B5FD" },
  ];
  const sizes = ["S", "M", "L", "XL", "XXL", "XXXL"];

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const data = await getProductById(productId);
        setProduct(data);
      } catch (error) {
        console.error("Error fetching product:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [productId]);

  const increaseQty = () => setQuantity((p) => p + 1);
  const decreaseQty = () => {
    if (quantity > 1) setQuantity((p) => p - 1);
  };

  const handleAddToCart = () => {
    if (product) {
      addToCart(product, quantity);
      alert("Đã thêm vào giỏ hàng!");
    }
  };

  const handleBuyNow = () => {
    if (product) {
      addToCart(product, quantity);
      navigation.navigate("Checkout");
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // Fallback data
  const title = product?.name || "White Blouse Shirt";
  const price = product?.price != null ? formatPrice(product.price) : formatPrice(17000);
  const description =
    product?.description ||
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Etiam arcu mauris, scelerisque eu mauris id, pretium pulvinar sapien.";
  const imageUrl =
    product?.imageUrl ||
    "https://images.unsplash.com/photo-1515347619362-e612984183ab?q=80&w=800&auto=format&fit=crop";

  // Mock data for "Most Popular" and "You Might Like"
  const mostPopular = [
    { id: 1, label: "New", tag: "1780", image: imageUrl },
    { id: 2, label: "Sale", tag: "1780", image: imageUrl },
    { id: 3, label: "Hot", tag: "1780", image: imageUrl },
  ];
  const youMightLike = [
    { id: 1, name: "Lorem ipsum dolor sit amet consectetur", price: "$17,00", image: imageUrl },
    { id: 2, name: "Lorem ipsum dolor sit amet consectetur", price: "$17,00", image: imageUrl },
    { id: 3, name: "Lorem ipsum dolor sit amet consectetur", price: "$12,00", image: imageUrl },
    { id: 4, name: "Lorem ipsum dolor sit amet consectetur", price: "$17,00", image: imageUrl },
  ];

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} bounces={false}>
        {/* ── HERO IMAGE — Full-screen ── */}
        <View style={styles.heroWrapper}>
          <Image source={{ uri: imageUrl }} style={styles.heroImage} resizeMode="cover" />
        </View>

        {/* ── CONTENT PANEL — slides over hero on scroll ── */}
        <View style={styles.contentPanel}>
          {/* Price & Share */}
          <View style={styles.priceRow}>
            <Text style={styles.priceText}>{price}</Text>
            <TouchableOpacity style={styles.shareBtn}>
              <Text style={styles.shareIcon}>↗</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.titleText}>{title}</Text>
          <Text style={styles.descText}>{description}</Text>

          {/* ── Variations ── */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Variations</Text>
          </View>
          <View style={styles.variationChips}>
            <View style={styles.chipOutline}>
              <Text style={styles.chipLabel}>{colorVariants[selectedColor].name}</Text>
            </View>
            <View style={styles.chipOutline}>
              <Text style={styles.chipLabel}>{selectedSize}</Text>
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorScroll}>
            {colorVariants.map((c, i) => {
              const isActive = selectedColor === i;
              return (
                <TouchableOpacity
                  key={i}
                  onPress={() => setSelectedColor(i)}
                  style={[styles.colorThumb, isActive && styles.colorThumbActive]}
                >
                  <View style={[styles.colorThumbInner, { backgroundColor: c.hex }]} />
                  {isActive && (
                    <View style={styles.checkBadge}>
                      <Text style={styles.checkMark}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* ── Specifications ── */}
          <Text style={styles.sectionTitle}>Specifications</Text>

          <Text style={styles.specLabel}>Material</Text>
          <View style={styles.specChipRow}>
            <View style={[styles.specChip, styles.specChipActive]}>
              <Text style={styles.specChipText}>Cotton 95%</Text>
            </View>
            <View style={styles.specChip}>
              <Text style={styles.specChipText}>Nylon 5%</Text>
            </View>
          </View>

          <Text style={styles.specLabel}>Origin</Text>
          <View style={styles.specChipRow}>
            <View style={[styles.specChip, styles.specChipActive]}>
              <Text style={styles.specChipText}>EU</Text>
            </View>
          </View>

          {/* ── Size selector (Figma #37 bottom half) ── */}
          <Text style={styles.sectionTitle}>Size</Text>
          <View style={styles.sizeRow}>
            {sizes.map((s, i) => {
              const isActive = selectedSize === s;
              const isDisabled = i >= 4; // XXL, XXXL disabled per design
              return (
                <TouchableOpacity
                  key={s}
                  disabled={isDisabled}
                  onPress={() => setSelectedSize(s)}
                  style={[
                    styles.sizeChip,
                    isActive && styles.sizeChipActive,
                    isDisabled && styles.sizeChipDisabled,
                  ]}
                >
                  <Text
                    style={[
                      styles.sizeChipText,
                      isActive && styles.sizeChipTextActive,
                      isDisabled && styles.sizeChipTextDisabled,
                    ]}
                  >
                    {s}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ── Quantity ── */}
          <View style={styles.qtyRow}>
            <Text style={styles.sectionTitle}>Quantity</Text>
            <View style={styles.qtyControls}>
              <TouchableOpacity style={styles.qtyCircle} onPress={decreaseQty}>
                <Text style={styles.qtyCircleText}>−</Text>
              </TouchableOpacity>
              <View style={styles.qtyBox}>
                <Text style={styles.qtyBoxText}>{quantity}</Text>
              </View>
              <TouchableOpacity style={styles.qtyCircle} onPress={increaseQty}>
                <Text style={styles.qtyCircleText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={styles.sizeGuideRow}>
            <Text style={styles.sizeGuideText}>Size guide</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          {/* ── Delivery ── */}
          <Text style={styles.sectionTitle}>Delivery</Text>
          <View style={styles.deliveryRow}>
            <View style={[styles.deliveryOption, styles.deliveryActive]}>
              <Text style={styles.deliveryLabel}>Standart</Text>
              <Text style={styles.deliveryDays}>6-7 days</Text>
            </View>
            <Text style={styles.deliveryPrice}>$3,00</Text>
          </View>
          <View style={styles.deliveryRow}>
            <View style={styles.deliveryOption}>
              <Text style={styles.deliveryLabel}>Express</Text>
              <Text style={styles.deliveryDays}>1-2 days</Text>
            </View>
            <Text style={styles.deliveryPrice}>$12,00</Text>
          </View>

          {/* ── Rating & Reviews ── */}
          <Text style={styles.sectionTitle}>Rating & Reviews</Text>
          <View style={styles.ratingHeaderRow}>
            <Text style={styles.stars}>★★★★☆</Text>
            <Text style={styles.ratingCount}>4/5</Text>
          </View>
          <View style={styles.reviewCard}>
            <View style={styles.reviewerRow}>
              <View style={styles.reviewerAvatar}>
                <Text style={styles.reviewerInitial}>V</Text>
              </View>
              <View>
                <Text style={styles.reviewerName}>Veronika</Text>
                <Text style={styles.reviewerStars}>★★★★★</Text>
              </View>
            </View>
            <Text style={styles.reviewBody} numberOfLines={2}>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor
              incididunt ut labore et dolore magna aliqua...
            </Text>
          </View>
          <TouchableOpacity style={styles.viewAllBtn}>
            <Text style={styles.viewAllText}>View All Reviews</Text>
            <Text style={styles.viewAllArrow}>↓</Text>
          </TouchableOpacity>

          {/* ── Most Popular ── */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Most Popular</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllLink}>See All →</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.popularScroll}
          >
            {mostPopular.map((item) => (
              <View key={item.id} style={styles.popularCard}>
                <Image
                  source={{ uri: item.image }}
                  style={styles.popularImage}
                  resizeMode="cover"
                />
                <View style={styles.popularTag}>
                  <Text style={styles.popularTagText}>{item.label}</Text>
                </View>
              </View>
            ))}
          </ScrollView>

          {/* ── You Might Like ── */}
          <Text style={styles.sectionTitle}>You Might Like</Text>
          <View style={styles.gridRow}>
            {youMightLike.map((item) => (
              <View key={item.id} style={styles.gridCard}>
                <Image source={{ uri: item.image }} style={styles.gridImage} resizeMode="cover" />
                <Text style={styles.gridName} numberOfLines={2}>
                  {item.name}
                </Text>
                <Text style={styles.gridPrice}>{item.price}</Text>
              </View>
            ))}
          </View>

          {/* Spacer for bottom bar */}
          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* ── FIXED BOTTOM BAR ── */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.heartBtn}
          onPress={() => {
            if (product) toggleWishlist(product);
          }}
        >
          <Text style={[styles.heartIcon, liked && styles.heartActive]}>{liked ? "♥" : "♡"}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.addCartBtn} activeOpacity={0.85} onPress={handleAddToCart}>
          <Text style={styles.addCartText}>Add to cart</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.buyNowBtn} activeOpacity={0.85} onPress={handleBuyNow}>
          <Text style={styles.buyNowText}>Buy now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const RADIUS = 24;

const styles = StyleSheet.create({
  // Layout
  container: { flex: 1, backgroundColor: COLORS.bgPrimary },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.bgPrimary,
  },
  scrollView: { flex: 1 },

  // Hero
  heroWrapper: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.55,
    backgroundColor: "#f3f4f6",
  },
  heroImage: { width: "100%", height: "100%" },

  // Content panel that overlaps the hero
  contentPanel: {
    marginTop: -RADIUS,
    borderTopLeftRadius: RADIUS,
    borderTopRightRadius: RADIUS,
    backgroundColor: COLORS.bgPrimary,
    paddingHorizontal: 20,
    paddingTop: 28,
  },

  // Price row
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  priceText: {
    fontSize: 26,
    fontWeight: "800",
    color: COLORS.textPrimary,
  },
  shareBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.bgSecondary,
    justifyContent: "center",
    alignItems: "center",
  },
  shareIcon: { fontSize: 16, color: COLORS.textSecondary },

  // Title & desc
  titleText: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  descText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 20,
  },

  // Section titles
  sectionHeader: { marginBottom: 8 },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 12,
    marginTop: 16,
  },
  seeAllLink: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.primary,
    marginTop: 16,
  },

  // Variation chips
  variationChips: { flexDirection: "row", marginBottom: 12 },
  chipOutline: {
    paddingVertical: 4,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 8,
  },
  chipLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: COLORS.textSecondary,
  },

  // Color thumbnails
  colorScroll: { marginBottom: 20 },
  colorThumb: {
    width: 64,
    height: 80,
    borderRadius: 10,
    marginRight: 12,
    borderWidth: 2.5,
    borderColor: "transparent",
    overflow: "hidden",
  },
  colorThumbActive: { borderColor: COLORS.primary },
  colorThumbInner: { flex: 1 },
  checkBadge: {
    position: "absolute",
    bottom: 6,
    left: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#fff",
  },
  checkMark: { color: "#fff", fontSize: 10, fontWeight: "bold" },

  // Specifications
  specLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  specChipRow: { flexDirection: "row", marginBottom: 12, flexWrap: "wrap" },
  specChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: COLORS.bgSecondary,
    marginRight: 8,
    marginBottom: 4,
  },
  specChipActive: { backgroundColor: COLORS.primaryBg },
  specChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },

  // Size guide
  sizeGuideRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    marginTop: 4,
  },
  sizeGuideText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  chevron: { fontSize: 20, color: COLORS.textMuted },

  // Delivery
  deliveryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  deliveryOption: {
    flexDirection: "row",
    alignItems: "center",
  },
  deliveryActive: {},
  deliveryLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginRight: 8,
  },
  deliveryDays: {
    fontSize: 12,
    color: COLORS.textMuted,
    backgroundColor: COLORS.bgSecondary,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 8,
    overflow: "hidden",
  },
  deliveryPrice: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },

  // Rating & Reviews
  ratingHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  stars: { fontSize: 18, color: COLORS.accentGold, marginRight: 8 },
  ratingCount: { fontSize: 14, fontWeight: "600", color: COLORS.textSecondary },

  reviewCard: {
    backgroundColor: COLORS.bgSecondary,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  reviewerRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  reviewerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  reviewerInitial: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  reviewerStars: { fontSize: 12, color: COLORS.accentGold },
  reviewBody: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 19 },

  viewAllBtn: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.primaryBg,
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 8,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.primary,
    marginRight: 6,
  },
  viewAllArrow: { fontSize: 14, color: COLORS.primary },

  // Most Popular
  popularScroll: { marginBottom: 8 },
  popularCard: {
    width: 130,
    height: 170,
    borderRadius: 12,
    marginRight: 12,
    overflow: "hidden",
    backgroundColor: COLORS.bgSecondary,
  },
  popularImage: { width: "100%", height: "100%" },
  popularTag: {
    position: "absolute",
    bottom: 8,
    left: 8,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingVertical: 2,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  popularTagText: { color: "#fff", fontSize: 11, fontWeight: "600" },

  // You Might Like grid
  gridRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  gridCard: {
    width: (SCREEN_WIDTH - 52) / 2,
    marginBottom: 16,
    backgroundColor: COLORS.bgSecondary,
    borderRadius: 12,
    overflow: "hidden",
  },
  gridImage: { width: "100%", height: 140 },
  gridName: {
    fontSize: 12,
    color: COLORS.textSecondary,
    paddingHorizontal: 8,
    paddingTop: 8,
    lineHeight: 16,
  },
  gridPrice: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textPrimary,
    paddingHorizontal: 8,
    paddingBottom: 10,
    paddingTop: 4,
  },

  // Size chips
  sizeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 8,
  },
  sizeChip: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgPrimary,
    marginRight: 8,
    marginBottom: 8,
  },
  sizeChipActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryBg,
  },
  sizeChipDisabled: {
    backgroundColor: COLORS.bgSecondary,
    borderColor: COLORS.divider,
    opacity: 0.45,
  },
  sizeChipText: {
    fontWeight: "600",
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  sizeChipTextActive: { color: COLORS.primary },
  sizeChipTextDisabled: { color: COLORS.textMuted },

  // Quantity
  qtyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 16,
  },
  qtyControls: { flexDirection: "row", alignItems: "center" },
  qtyCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  qtyCircleText: { fontSize: 20, color: COLORS.primary, fontWeight: "500" },
  qtyBox: {
    width: 50,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.primaryBg,
    borderRadius: 8,
    marginHorizontal: 12,
  },
  qtyBoxText: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },

  // Bottom bar
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.bgPrimary,
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    alignItems: "center",
  },
  heartBtn: {
    width: 50,
    height: 50,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.bgSecondary,
    borderWidth: 1,
    borderColor: COLORS.divider,
    marginRight: 12,
  },
  heartIcon: { fontSize: 24, color: COLORS.textMuted },
  heartActive: { color: COLORS.accent },

  addCartBtn: {
    flex: 1,
    height: 50,
    backgroundColor: COLORS.textPrimary,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  addCartText: { color: "#ffffff", fontWeight: "700", fontSize: 15 },

  buyNowBtn: {
    flex: 1,
    height: 50,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  buyNowText: { color: "#ffffff", fontWeight: "700", fontSize: 15 },
});

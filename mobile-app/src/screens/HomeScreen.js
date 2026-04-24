/* eslint-disable react/prop-types */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import HeaderBar from "../components/HeaderBar";
import { COLORS } from "../constants/colors";
import { getCategories, getProducts, formatPrice } from "../services/api";
import { useWishlist } from "../context/WishlistContext";

const PLACEHOLDER_IMAGES = [
  "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=700&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1542272604-787c3835535d?q=80&w=700&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=700&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1556821840-3a63f95609a7?q=80&w=700&auto=format&fit=crop",
];

const COLLECTION_TONES = ["#F7EEE7", "#E9EDF9", "#F4EAF6", "#EFF5E8"];

function getProductImage(product, fallbackIndex) {
  if (product?.imageUrl) return product.imageUrl;
  return PLACEHOLDER_IMAGES[fallbackIndex % PLACEHOLDER_IMAGES.length];
}

function getProductStatus(product) {
  if (product.availableQty <= 0) {
    return { label: "Hết hàng", color: COLORS.danger };
  }

  if (product.availableQty <= Math.max(1, product.minStockLevel || 0)) {
    return { label: "Sắp hết", color: COLORS.warning };
  }

  return { label: "Có thể đặt", color: COLORS.success };
}

export default function HomeScreen({ navigation, onSettingsPress }) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { isInWishlist, toggleWishlist } = useWishlist();

  const fetchHomeData = useCallback(async () => {
    try {
      setError(null);
      const [productData, categoryData] = await Promise.all([getProducts(), getCategories()]);
      setProducts(Array.isArray(productData) ? productData : []);
      setCategories(Array.isArray(categoryData) ? categoryData : []);
    } catch (err) {
      setError(err.message || "Không thể tải dữ liệu trang chủ");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchHomeData();
  }, [fetchHomeData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchHomeData();
  }, [fetchHomeData]);

  const handleSearch = useCallback(() => {
    const query = searchQuery.trim();
    if (!query) return;
    navigation.navigate("ProductList", { query });
  }, [navigation, searchQuery]);

  const navigateToList = useCallback(
    (params = {}) => navigation.navigate("ProductList", params),
    [navigation],
  );

  const availableProducts = useMemo(
    () => products.filter((product) => product.availableQty > 0),
    [products],
  );

  const newestProducts = useMemo(
    () =>
      [...products].sort(
        (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
      ),
    [products],
  );

  const heroProduct = availableProducts[0] || newestProducts[0] || products[0] || null;
  const heroImage = getProductImage(heroProduct, 0);

  const categorySummaries = useMemo(() => {
    const counts = products.reduce((acc, product) => {
      const key = (product.category || "").toLowerCase();
      if (!key) return acc;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return categories.map((category, index) => ({
      ...category,
      count: counts[(category.name || "").toLowerCase()] || 0,
      tone: COLLECTION_TONES[index % COLLECTION_TONES.length],
    }));
  }, [categories, products]);

  const spotlightProducts = availableProducts.length > 0 ? availableProducts : newestProducts;
  const editorialProducts = newestProducts.length > 0 ? newestProducts : products;

  const renderCategoryCard = (category) => (
    <TouchableOpacity
      key={category.id}
      style={[styles.categoryCard, { backgroundColor: category.tone }]}
      activeOpacity={0.88}
      onPress={() => navigateToList({ category: category.name })}
    >
      <Text style={styles.categoryLabel}>Danh mục</Text>
      <Text style={styles.categoryTitle}>{category.name}</Text>
      <Text style={styles.categoryCount}>
        {category.count > 0 ? `${category.count} sản phẩm` : "Chưa có sản phẩm"}
      </Text>
      <View style={styles.categoryLinkRow}>
        <Text style={styles.categoryLink}>Mở bộ sưu tập</Text>
        <Text style={styles.categoryArrow}>→</Text>
      </View>
    </TouchableOpacity>
  );

  const renderSpotlightCard = (item, index) => {
    const status = getProductStatus(item);

    return (
      <TouchableOpacity
        key={item.id}
        style={styles.spotlightCard}
        onPress={() => navigation.navigate("ProductDetail", { productId: item.id })}
        activeOpacity={0.9}
      >
        <Image source={{ uri: getProductImage(item, index + 1) }} style={styles.spotlightImage} />
        <View style={[styles.statusBadge, { backgroundColor: status.color }]}>
          <Text style={styles.statusBadgeText}>{status.label}</Text>
        </View>
        <TouchableOpacity style={styles.wishlistBtn} onPress={() => toggleWishlist(item)}>
          <Text style={[styles.wishlistIcon, isInWishlist(item.id) && styles.wishlistActive]}>
            {isInWishlist(item.id) ? "♥" : "♡"}
          </Text>
        </TouchableOpacity>
        <View style={styles.spotlightInfo}>
          {item.category ? (
            <Text style={styles.spotlightCategory} numberOfLines={1}>
              {item.category}
            </Text>
          ) : null}
          <Text style={styles.spotlightName} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={styles.spotlightPrice}>{formatPrice(item.basePrice)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEditorialCard = (item, index) => {
    const status = getProductStatus(item);

    return (
      <TouchableOpacity
        key={item.id}
        style={styles.editorialCard}
        onPress={() => navigation.navigate("ProductDetail", { productId: item.id })}
        activeOpacity={0.9}
      >
        <Image source={{ uri: getProductImage(item, index + 2) }} style={styles.editorialImage} />
        <View
          style={[
            styles.statusBadge,
            styles.editorialStatusBadge,
            { backgroundColor: status.color },
          ]}
        >
          <Text style={styles.statusBadgeText}>{status.label}</Text>
        </View>
        <TouchableOpacity style={styles.editorialWishBtn} onPress={() => toggleWishlist(item)}>
          <Text style={[styles.wishlistIcon, isInWishlist(item.id) && styles.wishlistActive]}>
            {isInWishlist(item.id) ? "♥" : "♡"}
          </Text>
        </TouchableOpacity>
        <View style={styles.editorialInfo}>
          <Text style={styles.editorialName} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={styles.editorialPrice}>{formatPrice(item.basePrice)}</Text>
          <Text style={styles.editorialMeta}>
            {item.availableQty > 0 ? `Có thể đặt ${item.availableQty}` : "Tạm hết hàng"}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <HeaderBar onSettingsPress={onSettingsPress} />

      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
      >
        <View style={styles.searchWrapper}>
          <View style={styles.searchContainer}>
            <Text style={styles.searchIcon}>○</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm kiếm quần áo, phụ kiện..."
              placeholderTextColor={COLORS.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            {searchQuery.length > 0 ? (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Text style={styles.clearIcon}>✕</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={styles.loader} />
        ) : error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>Không tải được trang chủ</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={fetchHomeData}>
              <Text style={styles.retryBtn}>Thử lại</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.heroShell}>
              <View style={styles.heroCopy}>
                <Text style={styles.heroEyebrow}>Bộ sưu tập hôm nay</Text>
                <Text style={styles.heroTitle}>Trang phục và phụ kiện</Text>
                <Text style={styles.heroText}>
                  {heroProduct?.category
                    ? `${heroProduct.category} đang có mặt trong cửa hàng hôm nay.`
                    : "Sản phẩm hiện tại được lấy trực tiếp từ hệ thống đang chạy."}
                </Text>
                <View style={styles.heroStatsRow}>
                  <View style={styles.heroStat}>
                    <Text style={styles.heroStatValue}>{products.length}</Text>
                    <Text style={styles.heroStatLabel}>Sản phẩm</Text>
                  </View>
                  <View style={styles.heroStat}>
                    <Text style={styles.heroStatValue}>{categories.length}</Text>
                    <Text style={styles.heroStatLabel}>Danh mục</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.heroButton} onPress={() => navigateToList()}>
                  <Text style={styles.heroButtonText}>Xem sản phẩm</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.heroMedia}>
                <Image source={{ uri: heroImage }} style={styles.heroImage} />
                {heroProduct ? (
                  <View style={styles.heroProductTag}>
                    <Text style={styles.heroProductTagLabel}>Spotlight</Text>
                    <Text style={styles.heroProductTagName} numberOfLines={1}>
                      {heroProduct.name}
                    </Text>
                    <Text style={styles.heroProductTagPrice}>
                      {formatPrice(heroProduct.basePrice)}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderContent}>
                  <Text style={styles.sectionEyebrow}>Shop by category</Text>
                  <Text style={styles.sectionTitle}>Danh mục nổi bật</Text>
                </View>
                <TouchableOpacity onPress={() => navigateToList()}>
                  <Text style={styles.sectionLink}>Xem tất cả →</Text>
                </TouchableOpacity>
              </View>

              {categorySummaries.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.categoryList}
                >
                  {categorySummaries.map(renderCategoryCard)}
                </ScrollView>
              ) : (
                <Text style={styles.emptyText}>Chưa có danh mục nào.</Text>
              )}
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderContent}>
                  <Text style={styles.sectionEyebrow}>Ready to wear</Text>
                  <Text style={styles.sectionTitle}>Sản phẩm có thể đặt</Text>
                </View>
                <TouchableOpacity onPress={() => navigateToList()}>
                  <Text style={styles.sectionLink}>Xem tất cả →</Text>
                </TouchableOpacity>
              </View>

              {spotlightProducts.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.spotlightList}
                >
                  {spotlightProducts
                    .slice(0, 8)
                    .map((item, index) => renderSpotlightCard(item, index))}
                </ScrollView>
              ) : (
                <Text style={styles.emptyText}>Chưa có sản phẩm khả dụng.</Text>
              )}
            </View>

            <View style={styles.editorialPanel}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderContent}>
                  <Text style={styles.sectionEyebrowDark}>New in</Text>
                  <Text style={styles.sectionTitleDark}>Mới về hôm nay</Text>
                </View>
                <Text style={styles.sectionMetaDark}>{editorialProducts.length} sản phẩm</Text>
              </View>

              {editorialProducts.length > 0 ? (
                <View style={styles.editorialGrid}>
                  {editorialProducts
                    .slice(0, 6)
                    .map((item, index) => renderEditorialCard(item, index))}
                </View>
              ) : (
                <Text style={styles.emptyTextDark}>Chưa có sản phẩm nào.</Text>
              )}
            </View>
          </>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FCF9F4",
  },
  container: {
    flex: 1,
    backgroundColor: "#FCF9F4",
  },
  searchWrapper: {
    backgroundColor: "#FCF9F4",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    height: 50,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E8DFD4",
    gap: 8,
  },
  searchIcon: {
    fontSize: 18,
    color: "#7A6656",
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#271C15",
  },
  clearIcon: {
    fontSize: 16,
    color: "#A09082",
  },
  loader: {
    marginVertical: 36,
  },
  heroShell: {
    marginHorizontal: 20,
    marginTop: 6,
    borderRadius: 28,
    overflow: "hidden",
    backgroundColor: "#1E1815",
    padding: 20,
  },
  heroCopy: {
    paddingRight: 8,
    marginBottom: 18,
  },
  heroEyebrow: {
    color: "#DCC4A8",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  heroTitle: {
    color: "#FFF9F0",
    fontSize: 29,
    lineHeight: 34,
    fontWeight: "900",
    letterSpacing: -0.7,
    marginBottom: 10,
  },
  heroText: {
    color: "rgba(255, 249, 240, 0.78)",
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 16,
  },
  heroStatsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 18,
  },
  heroStat: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  heroStatValue: {
    color: "#FFF7EA",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 2,
  },
  heroStatLabel: {
    color: "rgba(255, 249, 240, 0.68)",
    fontSize: 12,
    fontWeight: "600",
  },
  heroButton: {
    alignSelf: "flex-start",
    backgroundColor: "#D99152",
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 12,
  },
  heroButtonText: {
    color: "#FFFDF9",
    fontSize: 14,
    fontWeight: "800",
  },
  heroMedia: {
    position: "relative",
  },
  heroImage: {
    width: "100%",
    height: 280,
    borderRadius: 22,
    backgroundColor: "#362C24",
  },
  heroProductTag: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
    padding: 12,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.9)",
  },
  heroProductTagLabel: {
    color: "#8C6B54",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  heroProductTagName: {
    color: "#221A15",
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 2,
  },
  heroProductTagPrice: {
    color: "#BA5A1D",
    fontSize: 14,
    fontWeight: "800",
  },
  section: {
    marginTop: 28,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 12,
  },
  sectionHeaderContent: {
    flex: 1,
    flexShrink: 1,
  },
  sectionEyebrow: {
    color: "#AA7A54",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  sectionTitle: {
    color: "#211912",
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  sectionLink: {
    color: "#9E5E2F",
    fontSize: 13,
    fontWeight: "700",
  },
  categoryList: {
    paddingHorizontal: 14,
  },
  categoryCard: {
    width: 178,
    marginHorizontal: 6,
    padding: 16,
    borderRadius: 22,
  },
  categoryLabel: {
    color: "#826C5B",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  categoryTitle: {
    color: "#201914",
    fontSize: 19,
    lineHeight: 22,
    fontWeight: "900",
    marginBottom: 12,
  },
  categoryCount: {
    color: "#6C5C51",
    fontSize: 13,
    marginBottom: 22,
  },
  categoryLinkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  categoryLink: {
    color: "#201914",
    fontSize: 13,
    fontWeight: "700",
  },
  categoryArrow: {
    color: "#201914",
    fontSize: 16,
    fontWeight: "700",
  },
  spotlightList: {
    paddingHorizontal: 14,
  },
  spotlightCard: {
    width: 210,
    marginHorizontal: 6,
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    shadowColor: "#1E1815",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  spotlightImage: {
    width: "100%",
    height: 260,
    backgroundColor: "#EFE8E0",
  },
  statusBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  statusBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },
  wishlistBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  wishlistIcon: {
    fontSize: 16,
    color: "#8D857F",
  },
  wishlistActive: {
    color: "#D53F56",
  },
  spotlightInfo: {
    padding: 14,
  },
  spotlightCategory: {
    color: "#8A705A",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 6,
  },
  spotlightName: {
    color: "#211912",
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "800",
    marginBottom: 6,
  },
  spotlightPrice: {
    color: "#A44E1D",
    fontSize: 18,
    fontWeight: "900",
  },
  editorialPanel: {
    marginHorizontal: 20,
    marginTop: 30,
    paddingTop: 22,
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderRadius: 28,
    backgroundColor: "#F1E8DC",
  },
  sectionEyebrowDark: {
    color: "#8D6C52",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  sectionTitleDark: {
    color: "#201812",
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  sectionMetaDark: {
    color: "#7D6654",
    fontSize: 13,
    fontWeight: "700",
    flexShrink: 0,
    alignSelf: "flex-start",
    paddingTop: 18,
  },
  editorialGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  editorialCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    marginBottom: 14,
    borderRadius: 20,
    overflow: "hidden",
  },
  editorialImage: {
    width: "100%",
    height: 176,
    backgroundColor: "#EDE6DE",
    resizeMode: "cover",
  },
  editorialStatusBadge: {
    top: 10,
    left: 10,
  },
  editorialWishBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  editorialInfo: {
    padding: 12,
  },
  editorialName: {
    color: "#221A15",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "800",
    minHeight: 40,
    marginBottom: 4,
  },
  editorialPrice: {
    color: "#9B4B1F",
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 4,
  },
  editorialMeta: {
    color: "#77695F",
    fontSize: 12,
  },
  errorBox: {
    marginHorizontal: 20,
    marginTop: 24,
    padding: 20,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#241C16",
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: "#75665A",
    textAlign: "center",
    marginBottom: 10,
  },
  retryBtn: {
    color: "#9E5E2F",
    fontWeight: "700",
    fontSize: 15,
  },
  emptyText: {
    paddingHorizontal: 20,
    color: "#76675B",
    fontSize: 14,
  },
  emptyTextDark: {
    color: "#7D6654",
    fontSize: 14,
    paddingHorizontal: 4,
  },
  bottomSpacer: {
    height: 32,
  },
});

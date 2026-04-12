/* eslint-disable react/prop-types */
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
  Dimensions,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import HeaderBar from "../components/HeaderBar";
import { COLORS } from "../constants/colors";
import { getProducts, formatPrice } from "../services/api";

const { width } = Dimensions.get("window");

// ── Static data ──────────────────────────────────────────────────────────────

const TOP_CATEGORIES = [
  { id: "1", name: "Dresses", icon: "👗" },
  { id: "2", name: "T-Shirts", icon: "👕" },
  { id: "3", name: "Skirts", icon: "🥻" },
  { id: "4", name: "Shoes", icon: "👟" },
  { id: "5", name: "Bags", icon: "👜" },
  { id: "6", name: "Hoodies", icon: "🧥" },
];

const FLASH_SALE_PRODUCTS = [
  {
    id: "fs1",
    name: "Urban Jacket",
    price: 450000,
    oldPrice: 550000,
    image:
      "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?q=80&w=400&auto=format&fit=crop",
    discount: "-20%",
  },
  {
    id: "fs2",
    name: "Classic Watch",
    price: 1200000,
    oldPrice: 1500000,
    image:
      "https://images.unsplash.com/photo-1523275335684-37898b6baf30?q=80&w=400&auto=format&fit=crop",
    discount: "-20%",
  },
  {
    id: "fs3",
    name: "Leather Bag",
    price: 850000,
    oldPrice: 1050000,
    image:
      "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?q=80&w=400&auto=format&fit=crop",
    discount: "-20%",
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

const PLACEHOLDER_IMAGES = [
  "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=400&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1542272604-787c3835535d?q=80&w=400&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=400&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1556821840-3a63f95609a7?q=80&w=400&auto=format&fit=crop",
];

function getProductImage(index) {
  return PLACEHOLDER_IMAGES[index % PLACEHOLDER_IMAGES.length];
}

// ── Home Screen ──────────────────────────────────────────────────────────────

export default function HomeScreen({ navigation, onSettingsPress }) {
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [apiError, setApiError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchProducts = useCallback(async () => {
    try {
      setApiError(null);
      const data = await getProducts();
      setProducts(data);
    } catch (err) {
      setApiError(err.message || "Không thể tải sản phẩm");
    } finally {
      setLoadingProducts(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProducts();
  }, [fetchProducts]);

  const handleSearch = useCallback(() => {
    if (searchQuery.trim()) {
      navigation.navigate("ProductList", { query: searchQuery.trim() });
    }
  }, [searchQuery, navigation]);

  const navigateToList = useCallback(
    (category) => navigation.navigate("ProductList", { category }),
    [navigation],
  );

  // ── Renderers ────────────────────────────────────────────────────────────

  const renderTopCategory = (item) => (
    <TouchableOpacity
      key={item.id}
      style={styles.categoryItem}
      activeOpacity={0.7}
      onPress={() => navigateToList(item.name)}
    >
      <View style={styles.categoryIconContainer}>
        <Text style={styles.categoryIconText}>{item.icon}</Text>
      </View>
      <Text style={styles.categoryName}>{item.name}</Text>
    </TouchableOpacity>
  );

  const renderFlashSaleItem = (item) => (
    <TouchableOpacity
      key={item.id}
      style={styles.flashSaleCard}
      onPress={() => navigation.navigate("ProductDetail", { productId: item.id })}
      activeOpacity={0.85}
    >
      <Image source={{ uri: item.image }} style={styles.flashSaleImage} />
      <View style={styles.discountBadge}>
        <Text style={styles.discountText}>{item.discount}</Text>
      </View>
      <View style={styles.flashSaleInfo}>
        <Text style={styles.flashSalePrice}>{formatPrice(item.price)}</Text>
        <Text style={styles.flashSaleOldPrice}>{formatPrice(item.oldPrice)}</Text>
      </View>
    </TouchableOpacity>
  );

  // Sản phẩm từ API — cuộn ngang
  const renderApiProductItem = (item, index) => (
    <TouchableOpacity
      key={item.id}
      style={styles.apiProductCard}
      onPress={() => navigation.navigate("ProductDetail", { productId: item.id })}
      activeOpacity={0.85}
    >
      <Image source={{ uri: getProductImage(index) }} style={styles.apiProductImage} />
      {item.availableQty === 0 && (
        <View style={styles.outOfStockBadge}>
          <Text style={styles.outOfStockText}>Hết hàng</Text>
        </View>
      )}
      <View style={styles.apiProductInfo}>
        <Text style={styles.apiProductName} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={styles.apiProductPrice}>{formatPrice(item.basePrice)}</Text>
      </View>
    </TouchableOpacity>
  );

  // Grid 2 cột cho "Just For You"
  const renderGridItem = (item, index) => (
    <TouchableOpacity
      key={item.id}
      style={styles.gridCard}
      onPress={() => navigation.navigate("ProductDetail", { productId: item.id })}
      activeOpacity={0.85}
    >
      <Image source={{ uri: getProductImage(index + 2) }} style={styles.gridImage} />
      {item.availableQty === 0 && (
        <View style={styles.outOfStockBadge}>
          <Text style={styles.outOfStockText}>Hết hàng</Text>
        </View>
      )}
      <View style={styles.gridInfo}>
        <Text style={styles.gridName} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={styles.gridPrice}>{formatPrice(item.basePrice)}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      {/* Header */}
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
        {/* Search Bar */}
        <View style={styles.searchWrapper}>
          <View style={styles.searchContainer}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Tìm kiếm sản phẩm..."
              placeholderTextColor={COLORS.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Text style={{ fontSize: 16, color: COLORS.textMuted }}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Big Sale Banner */}
        <View style={styles.bannerContainer}>
          <Image
            source={{
              uri: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=800&auto=format&fit=crop",
            }}
            style={styles.bannerImage}
            resizeMode="cover"
          />
          <View style={styles.bannerOverlay}>
            <Text style={styles.bannerSubtitle}>Happening Now</Text>
            <Text style={styles.bannerTitle}>Big Sale</Text>
            <View style={styles.bannerBadge}>
              <Text style={styles.bannerBadgeText}>Lên đến 50%</Text>
            </View>
          </View>
        </View>

        {/* Top Products / Categories */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Products</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.hList}
          >
            {TOP_CATEGORIES.map(renderTopCategory)}
          </ScrollView>
        </View>

        {/* Flash Sale */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Flash Sale 🔥</Text>
            <View style={styles.timerRow}>
              <View style={styles.timerBox}>
                <Text style={styles.timerNum}>00</Text>
              </View>
              <Text style={styles.timerColon}>:</Text>
              <View style={styles.timerBox}>
                <Text style={styles.timerNum}>36</Text>
              </View>
              <Text style={styles.timerColon}>:</Text>
              <View style={styles.timerBox}>
                <Text style={styles.timerNum}>58</Text>
              </View>
            </View>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.hList}
          >
            {FLASH_SALE_PRODUCTS.map(renderFlashSaleItem)}
          </ScrollView>
        </View>

        {/* Most Popular — từ API */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Most Popular</Text>
            <TouchableOpacity onPress={() => navigateToList()}>
              <Text style={styles.seeAll}>Xem tất cả →</Text>
            </TouchableOpacity>
          </View>
          {loadingProducts ? (
            <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 20 }} />
          ) : apiError ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️ {apiError}</Text>
              <TouchableOpacity onPress={fetchProducts}>
                <Text style={styles.retryBtn}>Thử lại</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.hList}
            >
              {products.slice(0, 6).map((p, i) => renderApiProductItem(p, i))}
            </ScrollView>
          )}
        </View>

        {/* Just For You — Grid 2 cột từ API */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Just For You ⭐</Text>
          {!loadingProducts && products.length > 0 && (
            <View style={styles.gridContainer}>
              {products.slice(0, 4).map((p, i) => renderGridItem(p, i))}
            </View>
          )}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.bgPrimary },
  container: { flex: 1, backgroundColor: COLORS.bgSecondary },

  // Search
  searchWrapper: { backgroundColor: COLORS.bgPrimary, paddingHorizontal: 20, paddingVertical: 12 },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.bgInput,
    paddingHorizontal: 14,
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    gap: 8,
  },
  searchIcon: { fontSize: 18 },
  searchInput: { flex: 1, fontSize: 15, color: COLORS.textPrimary },

  // Banner
  bannerContainer: {
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 4,
    height: 168,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: COLORS.primaryDark,
  },
  bannerImage: { width: "100%", height: "100%", opacity: 0.55 },
  bannerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: 22,
    justifyContent: "center",
  },
  bannerSubtitle: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  bannerTitle: {
    color: "#FFFFFF",
    fontSize: 34,
    fontWeight: "900",
    marginBottom: 14,
    letterSpacing: -0.5,
  },
  bannerBadge: {
    backgroundColor: COLORS.accent,
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
  },
  bannerBadgeText: { color: "#FFFFFF", fontWeight: "800", fontSize: 14 },

  // Sections
  section: { marginTop: 20, marginBottom: 4 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingRight: 20,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.textPrimary,
    marginLeft: 20,
    marginBottom: 14,
  },
  seeAll: { fontSize: 14, color: COLORS.primary, fontWeight: "700" },
  hList: { paddingHorizontal: 14 },

  // Timer
  timerRow: { flexDirection: "row", alignItems: "center", marginRight: 20 },
  timerBox: {
    backgroundColor: COLORS.textPrimary,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 4,
    overflow: "hidden",
  },
  timerNum: { color: "#fff", fontSize: 13, fontWeight: "800" },
  timerColon: { color: COLORS.textPrimary, fontWeight: "800", marginHorizontal: 3, fontSize: 16 },

  // Categories
  categoryItem: { alignItems: "center", marginHorizontal: 8, width: 64 },
  categoryIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primaryBg,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  categoryIconText: { fontSize: 26 },
  categoryName: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: "600",
    textAlign: "center",
  },

  // Flash Sale cards
  flashSaleCard: {
    width: 136,
    marginHorizontal: 6,
    backgroundColor: COLORS.bgCard,
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  flashSaleImage: { width: "100%", height: 136, backgroundColor: "#f1f1f1" },
  discountBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: COLORS.accent,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  discountText: { color: "#FFF", fontSize: 11, fontWeight: "800" },
  flashSaleInfo: { padding: 10, alignItems: "center" },
  flashSalePrice: { fontSize: 16, fontWeight: "800", color: COLORS.accent },
  flashSaleOldPrice: {
    fontSize: 12,
    color: COLORS.textMuted,
    textDecorationLine: "line-through",
    marginTop: 2,
  },

  // API product cards (horizontal)
  apiProductCard: {
    width: 140,
    marginHorizontal: 6,
    backgroundColor: COLORS.bgCard,
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  apiProductImage: { width: "100%", height: 140, backgroundColor: "#f1f1f1" },
  apiProductInfo: { padding: 10 },
  apiProductName: {
    fontSize: 13,
    color: COLORS.textPrimary,
    fontWeight: "600",
    marginBottom: 4,
    lineHeight: 18,
  },
  apiProductPrice: { fontSize: 15, fontWeight: "800", color: COLORS.primary },

  // Out of stock badge
  outOfStockBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: COLORS.danger,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  outOfStockText: { color: "#FFF", fontSize: 10, fontWeight: "800" },

  // Grid 2 col
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 14,
    justifyContent: "space-between",
  },
  gridCard: {
    width: width / 2 - 20,
    backgroundColor: COLORS.bgCard,
    marginBottom: 14,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  gridImage: { width: "100%", height: 180, backgroundColor: "#f1f1f1", resizeMode: "cover" },
  gridInfo: { padding: 12 },
  gridName: {
    fontSize: 13,
    color: COLORS.textPrimary,
    fontWeight: "600",
    lineHeight: 19,
    height: 38,
    marginBottom: 6,
  },
  gridPrice: { fontSize: 16, color: COLORS.primary, fontWeight: "800" },

  // Error
  errorBox: { alignItems: "center", paddingVertical: 20, gap: 8 },
  errorText: { fontSize: 14, color: COLORS.textSecondary },
  retryBtn: { color: COLORS.primary, fontWeight: "700", fontSize: 15 },
});

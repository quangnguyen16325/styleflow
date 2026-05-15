/* eslint-disable react/prop-types */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AppImage from "../components/AppImage";
import AppIcon from "../components/AppIcon";
import { getProducts, formatPrice } from "../services/api";
import { useWishlist } from "../context/WishlistContext";
import { COLORS } from "../constants/colors";

const screenWidth = Dimensions.get("window").width;

function getProductImage(product) {
  if (product?.imageUrl) return product.imageUrl;
  return null;
}

export default function ProductListScreen({ navigation, route }) {
  const { isInWishlist, toggleWishlist } = useWishlist();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const searchQuery = route.params?.query?.trim() || "";
  const categoryFilter = route.params?.category?.trim() || "";

  const fetchProducts = useCallback(async () => {
    try {
      setError(null);
      const data = await getProducts();
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Không thể tải danh sách sản phẩm");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchQuery = searchQuery
        ? product.name.toLowerCase().includes(searchQuery.toLowerCase())
        : true;
      const matchCategory = categoryFilter
        ? (product.category || "").toLowerCase() === categoryFilter.toLowerCase()
        : true;

      return matchQuery && matchCategory;
    });
  }, [categoryFilter, products, searchQuery]);

  const screenTitle = useMemo(() => {
    if (searchQuery) return `Kết quả cho "${searchQuery}"`;
    if (categoryFilter) return categoryFilter;
    return "Tất cả sản phẩm";
  }, [categoryFilter, searchQuery]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProducts();
  }, [fetchProducts]);

  const renderProduct = ({ item }) => {
    const isOutOfStock = item.availableQty <= 0;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate("ProductDetail", { productId: item.id })}
        activeOpacity={0.85}
      >
        <AppImage source={{ uri: getProductImage(item) }} style={styles.image} />
        <View
          style={[styles.stockBadge, isOutOfStock ? styles.stockBadgeOut : styles.stockBadgeIn]}
        >
          <Text style={styles.stockBadgeText}>{isOutOfStock ? "Hết hàng" : "Có thể đặt"}</Text>
        </View>
        <TouchableOpacity style={styles.wishlistBtn} onPress={() => toggleWishlist(item)}>
          <AppIcon
            name={isInWishlist(item.id) ? "heartFilled" : "heart"}
            size={18}
            color={isInWishlist(item.id) ? "#C44A34" : "#6C5647"}
          />
        </TouchableOpacity>
        <View style={styles.info}>
          {item.category ? (
            <Text style={styles.category} numberOfLines={1}>
              {item.category}
            </Text>
          ) : null}
          <Text style={styles.name} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={styles.price}>{formatPrice(item.basePrice)}</Text>
          <Text style={styles.meta}>
            {isOutOfStock ? "Tạm hết hàng" : `Số lượng có thể đặt: ${item.availableQty}`}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <AppIcon name="chevronLeft" size={24} color="#1E1815" />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.title}>{screenTitle}</Text>
          <Text style={styles.subtitle}>{filteredProducts.length} sản phẩm</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={styles.loader} />
      ) : error ? (
        <View style={styles.stateBox}>
          <Text style={styles.stateTitle}>Không tải được sản phẩm</Text>
          <Text style={styles.stateText}>{error}</Text>
          <TouchableOpacity onPress={fetchProducts}>
            <Text style={styles.retryBtn}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : filteredProducts.length === 0 ? (
        <View style={styles.stateBox}>
          <Text style={styles.stateTitle}>Không có sản phẩm phù hợp</Text>
          <Text style={styles.stateText}>
            {searchQuery || categoryFilter
              ? "Thử đổi từ khóa hoặc chọn danh mục khác."
              : "Hiện chưa có sản phẩm nào."}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderProduct}
          numColumns={2}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={styles.columnWrapper}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FCF9F4",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F5ECE3",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  headerTitleWrap: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: "900",
    color: "#1E1815",
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    color: "#8A7B6F",
  },
  loader: {
    marginTop: 32,
  },
  listContent: {
    paddingHorizontal: 14,
    paddingBottom: 24,
  },
  columnWrapper: {
    justifyContent: "space-between",
  },
  card: {
    width: screenWidth / 2 - 21,
    backgroundColor: "#FFFFFF",
    marginBottom: 16,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#1E1815",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  image: {
    width: "100%",
    height: 190,
    resizeMode: "cover",
    backgroundColor: "#EFE8E0",
  },
  stockBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 12,
  },
  stockBadgeIn: {
    backgroundColor: "#00C48C",
  },
  stockBadgeOut: {
    backgroundColor: "#FF2D2D",
  },
  stockBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },
  wishlistBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.9)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  info: {
    padding: 14,
  },
  name: {
    fontSize: 14,
    color: "#211912",
    fontWeight: "800",
    lineHeight: 20,
    marginBottom: 4,
    minHeight: 40,
  },
  category: {
    fontSize: 12,
    color: "#8A705A",
    fontWeight: "800",
    textTransform: "uppercase",
    marginBottom: 6,
  },
  price: {
    fontSize: 17,
    color: "#9B4B1F",
    fontWeight: "900",
    marginBottom: 6,
  },
  meta: {
    fontSize: 12,
    color: "#76675B",
  },
  stateBox: {
    marginHorizontal: 20,
    marginTop: 32,
    padding: 20,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
  },
  stateTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#241C16",
    marginBottom: 8,
  },
  stateText: {
    fontSize: 14,
    color: "#75665A",
    textAlign: "center",
    marginBottom: 12,
  },
  retryBtn: {
    color: "#9E5E2F",
    fontWeight: "800",
    fontSize: 15,
  },
});

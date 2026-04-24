/* eslint-disable react/prop-types */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Image,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { getProducts, formatPrice } from "../services/api";
import { COLORS } from "../constants/colors";

const screenWidth = Dimensions.get("window").width;

const PLACEHOLDER_IMAGES = [
  "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=400&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1542272604-787c3835535d?q=80&w=400&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=400&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1556821840-3a63f95609a7?q=80&w=400&auto=format&fit=crop",
];

function getProductImage(product, fallbackIndex) {
  if (product?.imageUrl) return product.imageUrl;
  return PLACEHOLDER_IMAGES[fallbackIndex % PLACEHOLDER_IMAGES.length];
}

export default function ProductListScreen({ navigation, route }) {
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

  const renderProduct = ({ item, index }) => {
    const isOutOfStock = item.availableQty <= 0;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate("ProductDetail", { productId: item.id })}
        activeOpacity={0.85}
      >
        <Image source={{ uri: getProductImage(item, index) }} style={styles.image} />
        <View
          style={[styles.stockBadge, isOutOfStock ? styles.stockBadgeOut : styles.stockBadgeIn]}
        >
          <Text style={styles.stockBadgeText}>{isOutOfStock ? "Hết hàng" : "Có thể đặt"}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={2}>
            {item.name}
          </Text>
          {item.category ? (
            <Text style={styles.category} numberOfLines={1}>
              {item.category}
            </Text>
          ) : null}
          <Text style={styles.price}>{formatPrice(item.basePrice)}</Text>
          <Text style={styles.meta}>
            {isOutOfStock ? "Tạm hết hàng" : `Số lượng có thể đặt: ${item.availableQty}`}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{screenTitle}</Text>
        <Text style={styles.subtitle}>{filteredProducts.length} sản phẩm</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgSecondary,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  loader: {
    marginTop: 32,
  },
  listContent: {
    paddingHorizontal: 10,
    paddingBottom: 20,
  },
  columnWrapper: {
    justifyContent: "space-between",
  },
  card: {
    backgroundColor: COLORS.bgCard,
    width: screenWidth / 2 - 15,
    marginBottom: 15,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  image: {
    width: "100%",
    height: 180,
    resizeMode: "cover",
    backgroundColor: "#f1f1f1",
  },
  stockBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  stockBadgeIn: {
    backgroundColor: COLORS.success,
  },
  stockBadgeOut: {
    backgroundColor: COLORS.danger,
  },
  stockBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },
  info: {
    padding: 12,
  },
  name: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: "700",
    lineHeight: 20,
    marginBottom: 4,
    minHeight: 40,
  },
  category: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  price: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: "800",
    marginBottom: 4,
  },
  meta: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  stateBox: {
    marginHorizontal: 16,
    marginTop: 32,
    padding: 20,
    borderRadius: 16,
    backgroundColor: COLORS.bgCard,
    alignItems: "center",
  },
  stateTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  stateText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: 10,
  },
  retryBtn: {
    color: COLORS.primary,
    fontWeight: "700",
    fontSize: 15,
  },
});

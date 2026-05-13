/* eslint-disable react/prop-types */
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, FlatList, SafeAreaView } from "react-native";
import AppImage from "../components/AppImage";
import { useWishlist } from "../context/WishlistContext";
import { useCart } from "../context/CartContext";
import { formatPrice } from "../services/api";

export default function WishlistScreen({ navigation }) {
  const { items, removeFromWishlist } = useWishlist();
  const { addToCart } = useCart();

  const handleAddToCart = (item) => {
    addToCart({
      id: item.id,
      name: item.name,
      basePrice: item.basePrice,
      availableQty: item.availableQty || 99,
      image: item.imageUrl,
    });
    removeFromWishlist(item.id);
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <AppImage source={{ uri: item.imageUrl || null }} style={styles.cardImage} />
      <View style={styles.cardBody}>
        {item.category ? (
          <Text style={styles.cardCategory} numberOfLines={1}>
            {item.category}
          </Text>
        ) : null}
        <Text style={styles.cardName} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={styles.cardPrice}>{formatPrice(item.basePrice)}</Text>
        <Text style={styles.cardMeta}>
          {item.availableQty > 0 ? `Có thể đặt ${item.availableQty}` : "Tạm hết hàng"}
        </Text>
        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.addCartBtn} onPress={() => handleAddToCart(item)}>
            <Text style={styles.addCartText}>Thêm vào giỏ</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.removeBtn} onPress={() => removeFromWishlist(item.id)}>
            <Text style={styles.removeText}>Bỏ lưu</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (items.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.heroCard}>
          <Text style={styles.heroEyebrow}>Wishlist</Text>
          <Text style={styles.heroTitle}>Danh sách yêu thích đang trống</Text>
          <Text style={styles.heroText}>
            Lưu lại quần áo, phụ kiện hoặc món bạn đang cân nhắc để quay lại xem nhanh hơn.
          </Text>
          <TouchableOpacity
            style={styles.heroButton}
            onPress={() => navigation.navigate("ProductList")}
          >
            <Text style={styles.heroButtonText}>Xem sản phẩm</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <Text style={styles.headerEyebrow}>Wishlist</Text>
            <View style={styles.headerRow}>
              <Text style={styles.headerTitle}>Đã lưu để xem lại</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{items.length}</Text>
              </View>
            </View>
            <Text style={styles.headerText}>
              Những món bạn yêu thích đang chờ thêm vào giỏ hàng.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FCF9F4",
  },
  list: {
    padding: 20,
    paddingBottom: 40,
  },
  headerBlock: {
    marginBottom: 18,
  },
  headerEyebrow: {
    color: "#9D7A60",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 28,
    fontWeight: "900",
    color: "#1E1815",
    letterSpacing: -0.6,
  },
  headerText: {
    color: "#78695C",
    fontSize: 14,
    lineHeight: 22,
  },
  countBadge: {
    minWidth: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 8,
    backgroundColor: "#F1E0D0",
    marginLeft: 12,
  },
  countText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#9B4B1F",
  },
  card: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    marginBottom: 18,
    overflow: "hidden",
    shadowColor: "#201812",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  cardImage: {
    width: 128,
    height: 168,
    backgroundColor: "#EFE8E0",
  },
  cardBody: {
    flex: 1,
    padding: 14,
    justifyContent: "space-between",
  },
  cardCategory: {
    color: "#8C6F58",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  cardName: {
    color: "#211912",
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 22,
    marginBottom: 6,
  },
  cardPrice: {
    color: "#9B4B1F",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 4,
  },
  cardMeta: {
    color: "#78695C",
    fontSize: 12,
    marginBottom: 12,
  },
  cardActions: {
    flexDirection: "row",
    gap: 8,
  },
  addCartBtn: {
    flex: 1,
    backgroundColor: "#1E1815",
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: "center",
  },
  addCartText: {
    color: "#FFF8EE",
    fontSize: 13,
    fontWeight: "700",
  },
  removeBtn: {
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: "#F5ECE3",
    justifyContent: "center",
    alignItems: "center",
  },
  removeText: {
    color: "#9B4B1F",
    fontSize: 12,
    fontWeight: "700",
  },
  heroCard: {
    margin: 20,
    padding: 24,
    borderRadius: 28,
    backgroundColor: "#1E1815",
  },
  heroEyebrow: {
    color: "#DCC4A8",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  heroTitle: {
    color: "#FFF8EE",
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "900",
    marginBottom: 10,
  },
  heroText: {
    color: "rgba(255,248,238,0.76)",
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 18,
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
});

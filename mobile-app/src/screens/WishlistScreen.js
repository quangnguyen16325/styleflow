/* eslint-disable react/prop-types */
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  Image,
} from "react-native";
import { useWishlist } from "../context/WishlistContext";
import { useCart } from "../context/CartContext";

function formatMoney(amount) {
  if (amount == null) return "$0,00";
  return "$" + Number(amount).toFixed(2).replace(".", ",");
}

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
      <Image
        source={{ uri: item.imageUrl || "https://via.placeholder.com/120" }}
        style={styles.cardImage}
      />
      <View style={styles.cardBody}>
        <Text style={styles.cardName} numberOfLines={2}>{item.name}</Text>
        {item.category ? <Text style={styles.cardCategory}>{item.category}</Text> : null}
        <Text style={styles.cardPrice}>{formatMoney(item.basePrice)}</Text>
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.addCartBtn}
            onPress={() => handleAddToCart(item)}
          >
            <Text style={styles.addCartText}>+ Giỏ hàng</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.removeBtn}
            onPress={() => removeFromWishlist(item.id)}
          >
            <Text style={styles.removeIcon}>✕</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (items.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerBar}>
          <Text style={styles.headerTitle}>Yêu thích</Text>
        </View>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyCircle}>
            <Text style={styles.emptyIcon}>♡</Text>
          </View>
          <Text style={styles.emptyTitle}>Chưa có sản phẩm yêu thích</Text>
          <Text style={styles.emptySub}>Bấm ♡ trên sản phẩm để thêm vào đây</Text>
          <TouchableOpacity
            style={styles.shopBtn}
            onPress={() => navigation.navigate("Home")}
          >
            <Text style={styles.shopBtnText}>Khám phá ngay</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>Yêu thích</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{items.length}</Text>
        </View>
      </View>
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },

  headerBar: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: "#F0F0F0",
  },
  headerTitle: { fontSize: 24, fontWeight: "900", color: "#111" },
  countBadge: {
    marginLeft: 12, backgroundColor: "#EFF2FE",
    width: 30, height: 30, borderRadius: 15,
    justifyContent: "center", alignItems: "center",
  },
  countText: { fontSize: 14, fontWeight: "800", color: "#0055ff" },

  list: { padding: 20, paddingBottom: 40 },

  card: {
    flexDirection: "row", backgroundColor: "#fff",
    borderRadius: 16, marginBottom: 20, overflow: "hidden",
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 }, elevation: 3,
  },
  cardImage: { width: 120, height: 140, backgroundColor: "#eee" },
  cardBody: { flex: 1, padding: 14, justifyContent: "space-between" },
  cardName: { fontSize: 15, fontWeight: "600", color: "#222" },
  cardCategory: { fontSize: 12, color: "#888", marginTop: 2 },
  cardPrice: { fontSize: 18, fontWeight: "900", color: "#0055ff", marginTop: 6 },

  cardActions: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginTop: 10,
  },
  addCartBtn: {
    backgroundColor: "#0055ff", paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 8,
  },
  addCartText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  removeBtn: {
    width: 32, height: 32, borderRadius: 16,
    borderWidth: 1.5, borderColor: "#ddd",
    justifyContent: "center", alignItems: "center",
  },
  removeIcon: { fontSize: 14, color: "#999" },

  // Empty
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 20 },
  emptyCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: "rgba(0, 85, 255, 0.08)",
    justifyContent: "center", alignItems: "center", marginBottom: 24,
  },
  emptyIcon: { fontSize: 36, color: "#0055ff" },
  emptyTitle: { fontSize: 20, fontWeight: "800", color: "#111", marginBottom: 8 },
  emptySub: { fontSize: 14, color: "#666", textAlign: "center", marginBottom: 28 },
  shopBtn: { backgroundColor: "#0055ff", paddingHorizontal: 28, paddingVertical: 14, borderRadius: 12 },
  shopBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});

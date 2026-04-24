/* eslint-disable react/prop-types */
import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  Image,
  ScrollView,
  Dimensions,
  Modal,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import api, { formatPrice } from "../services/api";

const { width } = Dimensions.get("window");



export default function CartScreen({ navigation }) {
  const { items, updateQuantity, removeFromCart, addToCart } = useCart();
  
  const [defaultAddress, setDefaultAddress] = useState(null);
  const [addressModalVisible, setAddressModalVisible] = useState(false);
  const [apiAddresses, setApiAddresses] = useState([]);
  const { items: wishlistItems, removeFromWishlist } = useWishlist();
  
  // Tổng thanh toán cục bộ
  const subtotal = items.reduce((sum, item) => sum + ((item.basePrice || item.price || 0) * item.quantity), 0);
  const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);

  useFocusEffect(
    useCallback(() => {
      // Gọi API thực tế từ database
      const loadData = async () => {
        try {
          // Lấy địa chỉ
          const addrRes = await api.get("/me/addresses").catch(() => null);
          if (addrRes && addrRes.data) {
            const list = Array.isArray(addrRes.data) ? addrRes.data : [];
            const mapped = list.map((a) => ({
              id: a.id,
              label: a.label || "Khác",
              fullAddress: [a.addressLine, a.ward, a.district, a.city, a.country].filter(Boolean).join(", "),
              phone: a.receiverPhone || "",
              isDefault: a.isDefault || false,
            }));
            setApiAddresses(mapped);
            const def = mapped.find((a) => a.isDefault) || mapped[0];
            setDefaultAddress(def || null);
          }
        } catch (err) {
          console.warn("Lỗi tải data CartScreen:", err);
        }
      };

      loadData();
    }, [])
  );

  const handleCheckout = () => {
    if (items.length === 0) return;
    navigation.navigate("Checkout", { cartItems: items, subtotal });
  };

  const handleAddToCart = (product) => {
    if (addToCart) {
      addToCart({
        id: product.id || product._id,
        name: product.name,
        basePrice: product.basePrice || product.price || 0,
        availableQty: product.availableQty || product.stockCount || 10,
        image: product.imageUrl || product.image || product.thumbnail,
      });
      // Xóa khỏi wishlist khi vào giỏ
      if (removeFromWishlist) removeFromWishlist(product.id || product._id);
    }
  };

  // Wishlist items thật từ WishlistContext
  const displayWishlistItems = wishlistItems.slice(0, 4);

  // Address Display String
  const addressString = defaultAddress
    ? defaultAddress.fullAddress
    : "No address selected";

  // --- RENDERS ---

  const renderCartItem = ({ item }) => {
    const qty = item.quantity || 1;
    const priceRaw = item.basePrice || item.price || 0;
    const imageUri = item.image || item.imageUrl || "https://via.placeholder.com/150";

    return (
      <View style={styles.cartItem}>
        <View style={styles.imageWrap}>
          <Image source={{ uri: imageUri }} style={styles.itemImage} />
          <TouchableOpacity style={styles.trashCircle} onPress={() => removeFromCart(item.productId || item.id)}>
            {/* Outline red circle inner */}
            <View style={styles.trashOutline}>
              <Text style={styles.trashIcon}>🗑</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.itemInfo}>
          <Text style={styles.itemName} numberOfLines={2}>
            {item.name || "Lorem ipsum dolor sit amet consectetur."}
          </Text>
          <Text style={styles.itemVariant}>Pink, Size M</Text>
          
          <View style={styles.itemBotRow}>
            <Text style={styles.itemPrice}>{formatPrice(priceRaw)}</Text>
            
            <View style={styles.qtyBox}>
              <TouchableOpacity
                style={styles.qtyBtnBorder}
                onPress={() => {
                  if (qty > 1) updateQuantity(item.productId || item.id, qty - 1);
                  else removeFromCart(item.productId || item.id);
                }}
              >
                <Text style={styles.qtyBtnIconText}>-</Text>
              </TouchableOpacity>
              
              <View style={styles.qtyValueWrap}>
                <Text style={styles.qtyValueText}>{qty}</Text>
              </View>

              <TouchableOpacity
                style={styles.qtyBtnBorder}
                onPress={() => updateQuantity(item.productId || item.id, qty + 1)}
              >
                <Text style={styles.qtyBtnIconText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderWishlistItem = (product) => {
    const priceRaw = product.price || product.basePrice || 17;
    const imageUri = product.imageUrl || product.image || "https://via.placeholder.com/150";

    return (
      <View key={product.id || product._id} style={styles.cartItem}>
        <View style={styles.imageWrap}>
          <Image source={{ uri: imageUri }} style={styles.itemImage} resizeMode="cover" />
          <TouchableOpacity style={styles.trashCircle}>
            <View style={styles.trashOutline}>
              <Text style={styles.trashIcon}>🗑</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.itemInfo}>
          <Text style={styles.itemName} numberOfLines={2}>
            {product.name || "Lorem ipsum dolor sit amet."}
          </Text>
          <Text style={styles.itemPrice}>{formatPrice(priceRaw)}</Text>

          <View style={styles.wishlistBotRow}>
            <View style={{ flexDirection: "row", gap: 10 }}>
               <View style={styles.variantChip}><Text style={styles.variantText}>Pink</Text></View>
               <View style={styles.variantChip}><Text style={styles.variantText}>M</Text></View>
            </View>
            <TouchableOpacity onPress={() => handleAddToCart(product)}>
               {/* Add to cart icon blue outline style */}
               <Text style={styles.addCartIcon}>🛍+</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };



  // Khối rỗng - Cart 0
  const renderEmptyContent = () => (
    <>
      <View style={styles.emptyCircleBag}>
        <View style={styles.emptyCircleBlue}>
          <Text style={styles.emptyBagWhiteIco}>🛍</Text>
          <Text style={styles.emptyBagS}>S</Text>
        </View>
      </View>

      {displayWishlistItems.length > 0 && (
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionTitle}>From Your Wishlist</Text>
          {displayWishlistItems.map(renderWishlistItem)}
        </View>
      )}
    </>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      
      {/* Scrollable Body */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.mainScroll}>
        
        {/* Header: Cart 2 */}
        <View style={styles.headerRow}>
          <Text style={styles.mainHeading}>Cart</Text>
          <View style={styles.cartCountBadge}>
            <Text style={styles.cartCountText}>{totalCount}</Text>
          </View>
        </View>

        {/* Address Card */}
        <View style={styles.addressCard}>
          <View style={styles.addrLeftDiv}>
            <Text style={styles.addrTitle}>Shipping Address</Text>
            <Text style={styles.addrText} numberOfLines={2}>
              {addressString}
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.addrEditCircle} 
            onPress={() => setAddressModalVisible(true)}
          >
            <Text style={styles.addrEditPencil}>✎</Text>
          </TouchableOpacity>
        </View>

        {/* Cart Listing */}
        {items.length > 0 ? (
          <>
            <FlatList
              data={items}
              keyExtractor={(item, index) => String(item.productId || item.id || index)}
              renderItem={renderCartItem}
              scrollEnabled={false}
            />

            {displayWishlistItems.length > 0 && (
              <View style={styles.sectionWrap}>
                <Text style={styles.sectionTitle}>From Your Wishlist</Text>
                {displayWishlistItems.map(renderWishlistItem)}
              </View>
            )}
          </>
        ) : renderEmptyContent()}

      </ScrollView>

      {/* Sticky Total Footer */}
      <View style={styles.footerWrap}>
        <View style={styles.footerPriceCol}>
          <Text style={styles.totalLbl}>Total</Text>
          <Text style={styles.totalVal}>{formatPrice(subtotal)}</Text>
        </View>
        <TouchableOpacity 
          style={[styles.checkoutBtn, items.length === 0 && styles.checkoutDisabled]}
          onPress={handleCheckout}
          activeOpacity={items.length === 0 ? 1 : 0.8}
        >
          <Text style={[styles.checkoutBtnTxt, items.length === 0 && styles.checkoutTxtDis]}>
            Checkout
          </Text>
        </TouchableOpacity>
      </View>


      {/* ── Address Picker Modal ─────────────────────────────────────────── */}
      <Modal visible={addressModalVisible} animationType="slide" transparent onRequestClose={() => setAddressModalVisible(false)}>
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <Text style={{ fontSize: 18, fontWeight: "bold", marginBottom: 15 }}>Chọn địa chỉ</Text>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: Dimensions.get("window").height * 0.5 }}>
              {apiAddresses.map((addr) => (
                <TouchableOpacity
                  key={addr.id}
                  style={[
                    styles.addressCard,
                    { borderWidth: 2, borderColor: defaultAddress?.id === addr.id ? "#0055ff" : "transparent" },
                  ]}
                  onPress={() => {
                    setDefaultAddress(addr);
                    setAddressModalVisible(false);
                  }}
                >
                  <View style={styles.addrLeftDiv}>
                    <Text style={[styles.addrTitle, { textTransform: 'capitalize' }]}>{addr.label}</Text>
                    <Text style={styles.addrText} numberOfLines={2}>
                      {addr.fullAddress}
                    </Text>
                    <Text style={{ fontSize: 12, color: "#888", marginTop: 4 }}>{addr.phone}</Text>
                  </View>
                  {defaultAddress?.id === addr.id && (
                    <Text style={{ color: "#0055ff", fontWeight: "bold", fontSize: 20 }}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setAddressModalVisible(false)}>
              <Text style={{ color: "#fff", fontWeight: "bold" }}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  mainScroll: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 100 },
  
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  mainHeading: { fontSize: 28, fontWeight: "900", color: "#111" },
  cartCountBadge: { 
    marginLeft: 12, backgroundColor: "#EFF2FE", 
    width: 32, height: 32, borderRadius: 16, 
    justifyContent: "center", alignItems: "center" 
  },
  cartCountText: { fontSize: 16, fontWeight: "800", color: "#111" },

  addressCard: {
    flexDirection: "row", alignItems: "center", 
    backgroundColor: "#F8F9FA", padding: 18, 
    borderRadius: 12, marginBottom: 25
  },
  addrLeftDiv: { flex: 1, marginRight: 15 },
  addrTitle: { fontSize: 16, fontWeight: "700", color: "#111", marginBottom: 6 },
  addrText: { fontSize: 13, color: "#666", lineHeight: 18 },
  addrEditCircle: { 
    width: 40, height: 40, borderRadius: 20, 
    backgroundColor: "#0055ff", justifyContent: "center", alignItems: "center"
  },
  addrEditPencil: { color: "#fff", fontSize: 18 },

  // ITEM CART LIST
  cartItem: {
    flexDirection: "row", marginBottom: 24, alignItems: "stretch"
  },
  imageWrap: { position: "relative", width: 110, height: 110 },
  itemImage: { width: 110, height: 110, borderRadius: 12, backgroundColor: "#eee" },
  trashCircle: { 
    position: "absolute", bottom: -5, left: -5,
    width: 40, height: 40, borderRadius: 20, backgroundColor: "#fff",
    justifyContent: "center", alignItems: "center",
    shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 5, elevation: 4
  },
  trashOutline: {
    width: 30, height: 30, borderRadius: 15,
    borderWidth: 1, borderColor: "#ff4d4f",
    justifyContent: "center", alignItems: "center"
  },
  trashIcon: { color: "#ff4d4f", fontSize: 14 },

  itemInfo: { flex: 1, marginLeft: 20, justifyContent: "space-between" },
  itemName: { fontSize: 15, fontWeight: "500", color: "#222" },
  itemVariant: { fontSize: 13, color: "#444", marginTop: 4 },
  itemBotRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 },
  itemPrice: { fontSize: 18, fontWeight: "900", color: "#111" },
  
  qtyBox: { flexDirection: "row", alignItems: "center" },
  qtyBtnBorder: { 
    width: 32, height: 32, borderRadius: 16, 
    borderWidth: 1.5, borderColor: "#0055ff",
    justifyContent: "center", alignItems: "center"
  },
  qtyBtnIconText: { fontSize: 20, color: "#0055ff", fontWeight: "600", marginTop: -2 },
  qtyValueWrap: { 
    width: 36, height: 32, backgroundColor: "#EFF2FE", 
    marginHorizontal: 8, borderRadius: 8, 
    justifyContent: "center", alignItems: "center" 
  },
  qtyValueText: { fontSize: 16, fontWeight: "700", color: "#111" },

  // WISHLIST
  sectionWrap: { marginTop: 10, paddingBottom: 20 },
  sectionTitle: { fontSize: 24, fontWeight: "800", color: "#111", marginBottom: 20 },
  wishlistBotRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: 10 },
  variantChip: { backgroundColor: "#EFF2FE", paddingHorizontal: 16, paddingVertical: 6, borderRadius: 6 },
  variantText: { color: "#333", fontWeight: "500", fontSize: 14 },
  addCartIcon: { fontSize: 28, color: "#0055ff" },

  // EMPTY STATE //
  emptyCircleBag: { alignItems: "center", marginVertical: 30 },
  emptyCircleBlue: { 
    width: 140, height: 140, borderRadius: 70, 
    backgroundColor: "#fff", 
    shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 20, elevation: 8,
    justifyContent: "center", alignItems: "center", position: "relative"
  },
  emptyBagWhiteIco: { fontSize: 60, color: "#0055ff" },
  emptyBagS: { 
    position: "absolute", top: 70, fontSize: 32, fontWeight: "900", color: "#fff"
  },

  // POPULAR ITEMS
  popularHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  seeAllBtn: { flexDirection: "row", alignItems: "center" },
  seeAllText: { fontSize: 16, fontWeight: "800", color: "#111", marginRight: 8 },
  seeAllCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#0055ff", justifyContent: "center", alignItems: "center" },
  seeAllArrow: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  popScrollList: { paddingRight: 20, gap: 15 },
  popularCard: { width: width * 0.4, paddingRight: 10 },
  popCardImg: { width: "100%", height: 160, borderRadius: 12, backgroundColor: "#eee" },
  popCardBot: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 },
  popHeartText: { fontSize: 16, fontWeight: "900", color: "#111" },
  popBadge: { fontSize: 14, color: "#666" },

  // FOOTER
  footerWrap: { 
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: "#fff", paddingHorizontal: 20, paddingTop: 16, paddingBottom: 35,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    borderTopWidth: 1, borderTopColor: "#eee"
  },
  footerPriceCol: { flexDirection: "row", alignItems: "center" },
  totalLbl: { fontSize: 20, fontWeight: "900", color: "#111", marginRight: 10 },
  totalVal: { fontSize: 20, fontWeight: "900", color: "#111" },
  checkoutBtn: { 
    backgroundColor: "#0055ff", paddingVertical: 16, paddingHorizontal: 40, borderRadius: 12
  },
  checkoutBtnTxt: { color: "#fff", fontSize: 16, fontWeight: "700" },
  checkoutDisabled: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#ddd", paddingHorizontal: 39, paddingVertical: 15 },
  checkoutTxtDis: { color: "#666" },

  // Modal styles
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 },
  modalCloseBtn: { backgroundColor: "#0055ff", padding: 15, borderRadius: 12, alignItems: "center", marginTop: 15 },
});

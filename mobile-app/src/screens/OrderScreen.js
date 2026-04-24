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
  ActivityIndicator,
  Modal,
  ScrollView,
  Alert,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import api, { formatPrice } from "../services/api";


// Helper: Format Ngày tháng đẹp
const formatDate = (dateString) => {
  if (!dateString) return "Không rõ ngày";
  const d = new Date(dateString);
  const ho = d.getHours().toString().padStart(2, "0");
  const mi = d.getMinutes().toString().padStart(2, "0");
  const dd = d.getDate().toString().padStart(2, "0");
  const mm = (d.getMonth() + 1).toString().padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${ho}:${mi} - ${dd}/${mm}/${yyyy}`;
};

export default function OrderScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Tất cả");
  const [userProfile, setUserProfile] = useState(null);
  const [reviewOrder, setReviewOrder] = useState(null);
  const [addressModal, setAddressModal] = useState(null); // holds orderId for address change
  const [addresses, setAddresses] = useState([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);

  const TABS = ["Tất cả", "Đang xử lý", "Đang giao", "Hoàn thành"];

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const fetchOrdersAndProfile = async () => {
        try {
          if (isActive) setLoading(true);
          const [meRes, ordersRes] = await Promise.all([
            api.get("/me").catch(() => null),
            api.get("/orders").catch(() => ({ data: [] })),
          ]);

          if (isActive) {
            if (meRes && meRes.data) setUserProfile(meRes.data);
            if (ordersRes && Array.isArray(ordersRes.data)) {
              // Sắp xếp mới nhất lên đầu
              const sorted = ordersRes.data.sort(
                (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
              );
              setOrders(sorted);
            }
          }
        } catch (error) {
          console.warn("Lỗi tải lịch sử đơn hàng:", error);
        } finally {
          if (isActive) setLoading(false);
        }
      };

      fetchOrdersAndProfile();

      return () => {
        isActive = false;
      };
    }, [])
  );

  // Filter Logic
  const filteredOrders = orders.filter((order) => {
    if (activeTab === "Tất cả") return true;
    const s = order.status || "";
    if (activeTab === "Đang xử lý") return ["pending", "confirmed", "processing"].includes(s);
    if (activeTab === "Đang giao") return ["shipping", "shipped", "packed"].includes(s); // Mockup uses Packed
    if (activeTab === "Hoàn thành") return ["delivered", "completed"].includes(s);
    return true;
  });

  // Load addresses when address modal opens
  const openAddressChange = async (orderId) => {
    setAddressModal(orderId);
    setLoadingAddresses(true);
    try {
      const res = await api.get("/me/addresses");
      setAddresses(Array.isArray(res.data) ? res.data : []);
    } catch {
      setAddresses([]);
    } finally {
      setLoadingAddresses(false);
    }
  };

  const handleAddressChange = async (addressId) => {
    try {
      await api.post(`/orders/${addressModal}/address-change-request`, { addressId });
      Alert.alert("Thành công", "Yêu cầu đổi địa chỉ đã được gửi!");
      setAddressModal(null);
    } catch (err) {
      Alert.alert("Lỗi", err?.message || "Đã có yêu cầu đổi địa chỉ đang xử lý.");
    }
  };

  // Kiểm tra đơn hàng còn trong 7 ngày không
  const isWithin7Days = (dateStr) => {
    if (!dateStr) return false;
    const diff = (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24);
    return diff <= 7;
  };

  const getStatusDisplay = (status) => {
    const s = (status || "").toLowerCase();
    if (["shipping", "shipped", "packed"].includes(s))
      return { text: "Đang giao", color: "#F08C00" }; // Cam
    if (["delivered", "completed"].includes(s))
      return { text: "Hoàn thành", color: "#0055ff" }; // Xanh
    if (["cancelled", "failed"].includes(s))
      return { text: "Đã huỷ", color: "#e53e3e" }; // Đỏ
    return { text: "Đang xử lý", color: "#666" }; // Xám
  };

  // Component hiển thị Grid Ảnh
  const OrderImageGrid = ({ items = [] }) => {
    const count = items.length;
    if (count === 0) {
      return <View style={styles.gridBox} />;
    }
    
    // Nếu có 1 hình
    if (count === 1) {
      const img = items[0].productImage || items[0].product?.image || items[0].product?.imageUrl;
      return (
        <View style={styles.gridBox}>
          <Image source={{ uri: img || "https://via.placeholder.com/150" }} style={styles.gridImgFull} />
        </View>
      );
    }
    
    // Nếu có nhiều hính => Grid 2x2 (Hiển thị max 4 hình)
    const displayItems = items.slice(0, 4);
    return (
      <View style={[styles.gridBox, styles.gridContainer]}>
        {displayItems.map((it, idx) => {
          const img = it.productImage || it.product?.image || it.product?.imageUrl;
          return (
            <View key={idx} style={styles.gridCell}>
              <Image source={{ uri: img || "https://via.placeholder.com/150" }} style={styles.gridImgCell} />
            </View>
          );
        })}
      </View>
    );
  };

  const renderOrderCard = ({ item }) => {
    const sDisplay = getStatusDisplay(item.status);
    const isCompleted = sDisplay.text === "Hoàn thành";
    const orderItems = Array.isArray(item.items) ? item.items : [item.product].filter(Boolean);
    const itemsCount = orderItems.reduce((sum, i) => sum + (i.quantity || 1), 0);

    return (
      <View style={styles.cardInfo}>
        <OrderImageGrid items={orderItems} />
        
        <View style={styles.cardRight}>
          {/* Top Row: ID + Item Count */}
          <View style={styles.cardTopRow}>
            <Text style={styles.orderIdText}>Order #{item.id || item._id?.slice(-8).toUpperCase()}</Text>
            <View style={styles.itemCountBadge}>
              <Text style={styles.itemCountText}>{itemsCount} items</Text>
            </View>
          </View>
          
          {/* Middle: Thông tin Ngày / Tổng tiền */}
          <View style={styles.cardMidRow}>
            <Text style={styles.cardDate}>{formatDate(item.createdAt)}</Text>
            <Text style={styles.cardTotal}>{formatPrice(item.totalAmount || item.total_amount || 0)}</Text>
          </View>
          
          {/* Bottom Row: Status + Action Btns */}
          <View style={styles.cardBotRow}>
            <View style={styles.statusWrap}>
              <Text style={[styles.statusText, { color: sDisplay.color }]}>
                {sDisplay.text}
              </Text>
              {isCompleted && (
                <View style={styles.checkCircle}>
                  <Text style={styles.checkIcon}>✓</Text>
                </View>
              )}
            </View>

            <View style={styles.actionBtnsRow}>
              {/* Đổi địa chỉ cho đơn đang xử lý */}
              {["pending", "processing", "confirmed"].includes(item.status) && (
                <TouchableOpacity 
                  style={styles.btnAddressChange}
                  onPress={() => openAddressChange(item.id || item._id)}
                >
                  <Text style={styles.txtAddressChange}>Đổi địa chỉ</Text>
                </TouchableOpacity>
              )}

              {/* Trả hàng cho đơn hoàn thành trong 7 ngày */}
              {isCompleted && isWithin7Days(item.createdAt) && (
                <TouchableOpacity 
                  style={styles.btnReturn}
                  onPress={() => navigation.navigate("ReturnRequest", { 
                    orderId: item.id || item._id,
                    orderItems: orderItems,
                  })}
                >
                  <Text style={styles.txtReturn}>↩ Trả hàng</Text>
                </TouchableOpacity>
              )}

              {/* Track / Review */}
              <TouchableOpacity 
                style={[styles.actionBtn, isCompleted ? styles.btnReview : styles.btnTrack]}
                onPress={() => {
                  if (isCompleted) {
                    setReviewOrder(item);
                  } else {
                    navigation.navigate("OrderTracking", { orderId: item.id || item._id });
                  }
                }}
              >
                <Text style={[styles.btnText, isCompleted ? styles.txtReview : styles.txtTrack]}>
                  {isCompleted ? "Review" : "Track"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const currentInitial = userProfile?.fullName ? userProfile.fullName.charAt(0).toUpperCase() : "U";

  return (
    <SafeAreaView style={styles.container}>
      
      {/* ── HEADER ────────────────────────────────────────── */}
      <View style={styles.headerArea}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.avatarCircle} onPress={() => navigation.navigate("Profile")}>
            {userProfile?.avatar ? (
              <Image source={{ uri: userProfile.avatar }} style={styles.avatarImg} />
            ) : (
              <Text style={styles.avatarInitial}>{currentInitial}</Text>
            )}
          </TouchableOpacity>
          <View style={styles.headerTexts}>
            <Text style={styles.headerTitle}>To Receive</Text>
            <Text style={styles.headerSub}>My Orders</Text>
          </View>
        </View>

        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.iconCircle} onPress={() => navigation.navigate("Settings")}>
            <Text style={styles.hdrIcon}>⚙</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── TABS ────────────────────────────────────────── */}
      <View>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.tabsContainer}
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab;
            return (
               <TouchableOpacity 
                 key={tab} 
                 style={[styles.tabBtn, isActive && styles.tabBtnActive]}
                 onPress={() => setActiveTab(tab)}
               >
                 <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{tab}</Text>
               </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── LIST ────────────────────────────────────────── */}
      {loading ? (
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color="#0055ff" />
        </View>
      ) : filteredOrders.length === 0 ? (
        <View style={styles.centerWrap}>
          <Text style={styles.emptyIcon}>□</Text>
          <Text style={styles.emptyTitle}>Chưa có đơn hàng</Text>
          <Text style={styles.emptySub}>Danh mục {activeTab.toLowerCase()} đang trống.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item, index) => String(item.id || item._id || index)}
          renderItem={renderOrderCard}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* ── REVIEW MODAL ────────────────────────────────────────── */}
      <Modal visible={!!reviewOrder} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Which item you want to review?</Text>
              <TouchableOpacity onPress={() => setReviewOrder(null)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.reviewList}>
               {(reviewOrder?.items || [reviewOrder?.product]).filter(Boolean).map((it, idx) => {
                  const img = it.productImage || it.product?.image || it.product?.imageUrl || "https://via.placeholder.com/150";
                  const name = it.productName || it.product?.name || "Lorem ipsum dolor sit amet";

                  return (
                    <View key={idx} style={styles.reviewCard}>
                      <Image source={{ uri: img }} style={styles.reviewImg} />
                      <View style={styles.reviewInfo}>
                        <Text style={styles.reviewItemName} numberOfLines={2}>{name}</Text>
                        <Text style={styles.reviewOrderId}>Order #{reviewOrder.id || reviewOrder._id?.slice(-8).toUpperCase()}</Text>
                        <View style={styles.reviewActionRow}>
                          <View style={styles.reviewDateBadge}>
                            <Text style={styles.reviewDateText}>{formatDate(reviewOrder.createdAt).split(' - ')[1]}</Text>
                          </View>
                          <TouchableOpacity style={styles.btnReviewItem} onPress={() => {
                            setReviewOrder(null);
                            alert("Chức năng Review đang phát triển!");
                          }}>
                            <Text style={styles.txtReviewItem}>Review</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  );
               })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── ADDRESS CHANGE MODAL ───────────────────────────────────── */}
      <Modal visible={!!addressModal} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Đổi địa chỉ giao hàng</Text>
              <TouchableOpacity onPress={() => setAddressModal(null)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {loadingAddresses ? (
              <ActivityIndicator size="large" color="#0055ff" style={{ marginVertical: 30 }} />
            ) : addresses.length === 0 ? (
              <View style={{ alignItems: "center", paddingVertical: 30 }}>
                <Text style={{ color: "#666", marginBottom: 16 }}>Chưa có địa chỉ nào.</Text>
                <TouchableOpacity
                  style={styles.submitBtn}
                  onPress={() => { setAddressModal(null); navigation.navigate("AddressForm"); }}
                >
                  <Text style={styles.submitBtnText}>+ Thêm địa chỉ mới</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} style={styles.reviewList}>
                {addresses.map((addr) => (
                  <TouchableOpacity
                    key={addr.id}
                    style={styles.addressCard}
                    onPress={() => handleAddressChange(addr.id)}
                  >
                    <View style={styles.addressCardLeft}>
                      <Text style={styles.addressLabel}>{addr.label || "Khác"}</Text>
                      <Text style={styles.addressLine} numberOfLines={2}>
                        {addr.addressLine}{addr.ward ? `, ${addr.ward}` : ""}{addr.district ? `, ${addr.district}` : ""}{addr.city ? `, ${addr.city}` : ""}
                      </Text>
                      {addr.receiverPhone && <Text style={styles.addressPhone}>{addr.receiverPhone}</Text>}
                    </View>
                    {addr.isDefault && (
                      <View style={styles.defaultBadge}>
                        <Text style={styles.defaultBadgeText}>Mặc định</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={[styles.submitBtn, { marginTop: 12 }]}
                  onPress={() => { setAddressModal(null); navigation.navigate("AddressForm"); }}
                >
                  <Text style={styles.submitBtnText}>+ Thêm địa chỉ mới</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  centerWrap: { flex: 1, justifyContent: "center", alignItems: "center", paddingBottom: 50 },

  // Header
  headerArea: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 15
  },
  headerLeft: { flexDirection: "row", alignItems: "center" },
  avatarCircle: { 
    width: 48, height: 48, borderRadius: 24, 
    backgroundColor: "#F28C8C", justifyContent: "center", alignItems: "center",
    marginRight: 12
  },
  avatarImg: { width: 48, height: 48, borderRadius: 24 },
  avatarInitial: { fontSize: 20, color: "#fff", fontWeight: "900" },
  headerTexts: { justifyContent: "center" },
  headerTitle: { fontSize: 24, fontWeight: "900", color: "#111" },
  headerSub: { fontSize: 13, color: "#666", marginTop: 2 },
  
  headerIcons: { flexDirection: "row", gap: 8 },
  iconCircle: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: "#EFF2FE",
    justifyContent: "center", alignItems: "center", position: "relative"
  },
  hdrIcon: { fontSize: 18, color: "#0055ff", fontWeight: "600" },
  dotIndicator: {
    position: "absolute", top: 8, right: 8, width: 8, height: 8, 
    borderRadius: 4, backgroundColor: "#e53e3e"
  },

  // Tabs
  tabsContainer: {
    flexDirection: "row", paddingHorizontal: 20, marginBottom: 15, gap: 10,
    borderBottomWidth: 1, borderBottomColor: "#F0F0F0", paddingBottom: 10
  },
  tabBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, backgroundColor: "#f5f5f5" },
  tabBtnActive: { backgroundColor: "#0055ff" },
  tabText: { fontSize: 13, fontWeight: "600", color: "#666" },
  tabTextActive: { color: "#fff" },

  // Orders List
  listContainer: { paddingHorizontal: 20, paddingBottom: 30 },
  
  cardInfo: { 
    flexDirection: "row", alignItems: "stretch", 
    marginBottom: 20, backgroundColor: "#fff" 
  },
  // Box ẢNH CHÍNH
  gridBox: {
    width: 100, height: 100, backgroundColor: "#fff", 
    borderRadius: 12, overflow: "hidden",
    shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 3
  },
  gridImgFull: { width: "100%", height: "100%", resizeMode: "cover" },
  gridContainer: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", alignContent: "space-between", padding: 2 },
  gridCell: { width: "48.5%", height: "48.5%", borderRadius: 6, overflow: "hidden", backgroundColor: "#eee" },
  gridImgCell: { width: "100%", height: "100%", resizeMode: "cover" },
  
  // Nửa Phải CARD
  cardRight: { flex: 1, marginLeft: 16, justifyContent: "space-between", paddingVertical: 4 },
  
  cardTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  orderIdText: { fontSize: 15, fontWeight: "800", color: "#111", flex: 1, marginRight: 10 },
  itemCountBadge: { backgroundColor: "#f5f5f5", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  itemCountText: { fontSize: 12, fontWeight: "600", color: "#444" },

  cardMidRow: { marginTop: 4 },
  cardDate: { fontSize: 13, color: "#666" },
  cardTotal: { fontSize: 15, fontWeight: "700", color: "#111", marginTop: 2 },

  cardBotRow: { flexDirection: "column", alignItems: "flex-start", marginTop: 8 },
  statusWrap: { flexDirection: "row", alignItems: "center" },
  statusText: { fontSize: 16, fontWeight: "800" },
  checkCircle: {
    width: 18, height: 18, borderRadius: 9, backgroundColor: "#0055ff",
    justifyContent: "center", alignItems: "center", marginLeft: 6
  },
  checkIcon: { color: "#fff", fontSize: 10, fontWeight: "bold" },
  
  actionBtn: { paddingVertical: 8, paddingHorizontal: 20, borderRadius: 8 },
  btnReviewItem: { borderWidth: 1.5, borderColor: "#0055ff", borderRadius: 8, paddingHorizontal: 20, paddingVertical: 6 },
  txtReviewItem: { color: "#0055ff", fontWeight: "700", fontSize: 14 },

  btnTrack: { backgroundColor: "#0055ff" },
  txtTrack: { color: "#fff", fontWeight: "700", fontSize: 14 },
  btnReview: { backgroundColor: "#fff", borderWidth: 1.5, borderColor: "#0055ff" },
  txtReview: { color: "#0055ff", fontWeight: "700", fontSize: 14 },

  emptyIcon: { fontSize: 50, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#111", marginBottom: 8 },
  emptySub: { fontSize: 14, color: "#666" },

  // Modal Review
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalContent: { 
    backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, 
    padding: 24, paddingBottom: 40, maxHeight: "80%" 
  },

  // Action buttons row
  actionBtnsRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 12, width: "100%", justifyContent: "flex-end" },
  btnAddressChange: {
    borderWidth: 1.5, borderColor: "#F08C00", borderRadius: 8,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  txtAddressChange: { color: "#F08C00", fontWeight: "700", fontSize: 13 },
  btnReturn: {
    borderWidth: 1.5, borderColor: "#e53e3e", borderRadius: 8,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  txtReturn: { color: "#e53e3e", fontWeight: "700", fontSize: 13 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: "900", color: "#111" },
  modalCloseText: { fontSize: 24, color: "#666", fontWeight: "300" },
  reviewList: { marginTop: 10 },
  reviewCard: { 
    flexDirection: "row", marginBottom: 20, backgroundColor: "#fff", 
    padding: 12, borderRadius: 12, 
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 
  },
  reviewImg: { width: 90, height: 90, borderRadius: 8, backgroundColor: "#eee" },
  reviewInfo: { flex: 1, marginLeft: 16, justifyContent: "space-between" },
  reviewItemName: { fontSize: 14, color: "#222" },
  reviewOrderId: { fontSize: 13, fontWeight: "800", color: "#111", marginTop: 4 },
  reviewActionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: 10 },
  reviewDateBadge: { backgroundColor: "#f5f5f5", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  reviewDateText: { fontSize: 12, fontWeight: "600", color: "#666" },

  // Address card in modal
  addressCard: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: "#fff", padding: 16, borderRadius: 12, marginBottom: 12,
    borderWidth: 1, borderColor: "#F0F0F0",
  },
  addressCardLeft: { flex: 1 },
  addressLabel: { fontSize: 14, fontWeight: "800", color: "#111", marginBottom: 4, textTransform: "capitalize" },
  addressLine: { fontSize: 13, color: "#555", lineHeight: 18 },
  addressPhone: { fontSize: 12, color: "#888", marginTop: 4 },
  defaultBadge: { backgroundColor: "#EFF2FE", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  defaultBadgeText: { fontSize: 11, fontWeight: "700", color: "#0055ff" },

  submitBtn: { backgroundColor: "#0055ff", paddingVertical: 14, borderRadius: 12, alignItems: "center" },
  submitBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
});

/* eslint-disable react/prop-types */
import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
  Image,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import api from "../services/api";
import { COLORS } from "../constants/colors";
import AppIcon from "../components/AppIcon";

export default function OrderDetailScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = async () => {
    try {
      const res = await api.get("/orders");
      // Sắp xếp đơn mới nhất lên đầu
      const sorted = (res.data || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setOrders(sorted);
    } catch (err) {
      console.warn("Lỗi tải danh sách đơn hàng:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchOrders();
    }, []),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const handlePressItem = (orderId) => {
    navigation.navigate("OrderTracking", { orderId });
  };

  const getStatusDisplay = (status) => {
    const s = (status || "").toLowerCase();
    if (s === "pending") return "Pending";
    if (s === "processing") return "Packed";
    if (s === "shipping") return "Shipped";
    if (s === "completed") return "Delivered";
    if (s === "failed") return "Failed";
    if (s === "cancelled") return "Cancelled";
    return "Pending";
  };

  const renderOrderCard = (order) => {
    const statusText = getStatusDisplay(order.status);
    const isDelivered = statusText === "Delivered";

    const totalQuantity = Array.isArray(order.items)
      ? order.items.reduce((sum, item) => sum + (item.quantity || 1), 0)
      : 0;

    // Fallback colors cho tối đa 4 blocks
    const FALLBACK_COLORS = ["#FFD1D1", "#D1E8FF", "#E2D1FF", "#D1FFDF"];
    const itemsList = Array.isArray(order.items) ? order.items : [];

    return (
      <TouchableOpacity
        style={styles.card}
        key={order.id}
        activeOpacity={0.8}
        onPress={() => handlePressItem(order.id)}
      >
        {/* Collage layout 4 góc */}
        <View style={styles.collageWrap}>
          {[0, 1, 2, 3].map((idx) => {
            const item = itemsList[idx];
            if (item && item.imageUrl) {
              return (
                <Image
                  key={idx}
                  source={{ uri: item.imageUrl }}
                  style={styles.collageChunk}
                  resizeMode="cover"
                />
              );
            } else {
              return (
                <View
                  key={idx}
                  style={[styles.collageChunk, { backgroundColor: FALLBACK_COLORS[idx] }]}
                />
              );
            }
          })}
        </View>

        {/* Thông tin */}
        <View style={styles.cardInfo}>
          <View style={styles.cardRow}>
            <Text style={styles.orderIdText}>Order #{order.id}</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {totalQuantity} {totalQuantity > 1 ? "items" : "item"}
              </Text>
            </View>
          </View>

          <Text style={styles.deliveryType}>Standard Delivery</Text>

          <View style={styles.cardBottomRow}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={styles.statusText}>{statusText}</Text>
              {isDelivered && (
                <AppIcon name="check" size={15} color={COLORS.info} style={styles.successCheck} />
              )}
            </View>

            <TouchableOpacity
              style={[styles.actionBtn, isDelivered ? styles.reviewBtn : styles.trackBtn]}
              onPress={() => handlePressItem(order.id)}
            >
              <Text
                style={[
                  styles.actionBtnText,
                  isDelivered ? styles.reviewBtnText : styles.trackBtnText,
                ]}
              >
                {isDelivered ? "Review" : "Track"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* ── Header theo chuẩn Figma 57 ── */}
      <View style={styles.header}>
        <View style={styles.avatarWrap}>
          <Text style={styles.avatarText}>ME</Text>
        </View>
        <View style={styles.headerMid}>
          <Text style={styles.headerTitle}>To Receive</Text>
          <Text style={styles.headerSub}>My Orders</Text>
        </View>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.iconBtn}>
            <AppIcon name="note" size={17} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn}>
            <AppIcon name="settings" size={18} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollList}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
      >
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : orders.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyText}>You don&apos;t have any orders to receive.</Text>
          </View>
        ) : (
          orders.map(renderOrderCard)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.bgPrimary },
  center: { marginTop: 40, alignItems: "center" },
  emptyText: { color: COLORS.textSecondary, fontSize: 16 },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 15,
    backgroundColor: COLORS.bgPrimary,
  },
  avatarWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFE5E5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  avatarText: { fontWeight: "bold", color: COLORS.primary },
  headerMid: { flex: 1 },
  headerTitle: { fontSize: 22, fontWeight: "800", color: COLORS.textPrimary },
  headerSub: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  headerIcons: { flexDirection: "row" },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.bgSecondary,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
  },

  // List
  scrollList: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 100 },
  card: {
    flexDirection: "row",
    backgroundColor: COLORS.bgPrimary, // Trắng
    marginBottom: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F3F0FF",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 3,
    padding: 12,
    alignItems: "center",
  },

  // Collage image holder
  collageWrap: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: "hidden",
    flexDirection: "row",
    flexWrap: "wrap",
    marginRight: 16,
  },
  collageChunk: { width: "50%", height: "50%" },

  // Info
  cardInfo: { flex: 1 },
  cardRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  orderIdText: { fontSize: 15, fontWeight: "700", color: COLORS.textPrimary },
  badge: { backgroundColor: "#F5F5F5", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: "600" },
  deliveryType: { fontSize: 13, color: COLORS.textSecondary, marginVertical: 6 },
  cardBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  statusText: { fontSize: 18, fontWeight: "800", color: COLORS.textPrimary },
  successCheck: { marginLeft: 4 },

  // Buttons
  actionBtn: {
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 8,
    justifyContent: "center",
  },
  trackBtn: { backgroundColor: COLORS.info },
  trackBtnText: { color: "#FFF", fontWeight: "700", fontSize: 14 },
  reviewBtn: { backgroundColor: "transparent", borderWidth: 1, borderColor: COLORS.info },
  reviewBtnText: { color: COLORS.info, fontWeight: "700", fontSize: 14 },
});

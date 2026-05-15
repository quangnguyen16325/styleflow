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
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import AppImage from "../components/AppImage";
import api, { formatPrice, PAYMENT_GATEWAY_LABEL } from "../services/api";
import AppIcon from "../components/AppIcon";

export default function OrderDetailScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = async () => {
    try {
      const res = await api.get("/orders");
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
    const map = {
      pending: { label: "Chờ xử lý", color: "#AA9C8F" },
      processing: { label: "Đang xử lý", color: "#D99152" },
      shipping: { label: "Đang giao", color: "#3B82F6" },
      completed: { label: "Hoàn tất", color: "#2D9F6F" },
      failed: { label: "Thất bại", color: "#C43A2F" },
      cancelled: { label: "Đã hủy", color: "#AA9C8F" },
    };
    const s = (status || "").toLowerCase();
    return map[s] || { label: "Chờ xử lý", color: "#AA9C8F" };
  };

  const getPaymentLabel = (gateway) => {
    return PAYMENT_GATEWAY_LABEL[gateway] || "Chưa chọn";
  };

  const renderOrderCard = (order) => {
    const statusInfo = getStatusDisplay(order.status);
    const totalQuantity = Array.isArray(order.items)
      ? order.items.reduce((sum, item) => sum + (item.quantity || 1), 0)
      : 0;
    const itemsList = Array.isArray(order.items) ? order.items : [];
    const FALLBACK_TONES = ["#F5ECE3", "#E8DDD4", "#F0E5D8", "#EBE1D7"];

    return (
      <TouchableOpacity
        style={styles.card}
        key={order.id}
        activeOpacity={0.88}
        onPress={() => handlePressItem(order.id)}
      >
        {/* Collage ảnh sản phẩm */}
        <View style={styles.collageWrap}>
          {[0, 1, 2, 3].map((idx) => {
            const item = itemsList[idx];
            if (item && item.imageUrl) {
              return (
                <AppImage
                  key={idx}
                  source={{ uri: item.imageUrl }}
                  style={styles.collageChunk}
                  resizeMode="cover"
                />
              );
            }
            return (
              <View
                key={idx}
                style={[styles.collageChunk, { backgroundColor: FALLBACK_TONES[idx] }]}
              />
            );
          })}
        </View>

        {/* Thông tin đơn */}
        <View style={styles.cardInfo}>
          <View style={styles.cardTopRow}>
            <Text style={styles.orderIdText}>Đơn #{order.id}</Text>
            <View style={styles.qtyBadge}>
              <Text style={styles.qtyBadgeText}>{totalQuantity} sản phẩm</Text>
            </View>
          </View>

          {/* Hình thức thanh toán */}
          <Text style={styles.paymentMethodText}>{getPaymentLabel(order.paymentGateway)}</Text>

          {/* Tổng tiền */}
          {order.totalAmount ? (
            <Text style={styles.totalText}>{formatPrice(order.totalAmount)}</Text>
          ) : null}

          <View style={styles.cardBottomRow}>
            <View style={[styles.statusBadge, { backgroundColor: statusInfo.color + "18" }]}>
              <View style={[styles.statusDot, { backgroundColor: statusInfo.color }]} />
              <Text style={[styles.statusText, { color: statusInfo.color }]}>
                {statusInfo.label}
              </Text>
            </View>

            <TouchableOpacity style={styles.trackBtn} onPress={() => handlePressItem(order.id)}>
              <Text style={styles.trackBtnText}>Chi tiết</Text>
              <Text style={styles.trackBtnArrow}>→</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerEyebrow}>My Orders</Text>
          <Text style={styles.headerTitle}>Đơn hàng của bạn</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollList}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#9B4B1F" />
        }
      >
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#9B4B1F" />
          </View>
        ) : orders.length === 0 ? (
          <View style={styles.emptyCard}>
            <AppIcon name="note" size={28} color="#AA9C8F" />
            <Text style={styles.emptyTitle}>Chưa có đơn hàng nào</Text>
            <Text style={styles.emptyText}>
              Các đơn hàng bạn đặt sẽ xuất hiện tại đây để bạn dễ dàng theo dõi.
            </Text>
          </View>
        ) : (
          orders.map(renderOrderCard)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FCF9F4",
  },
  center: {
    marginTop: 60,
    alignItems: "center",
  },

  // Header
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    backgroundColor: "#FCF9F4",
  },
  headerEyebrow: {
    color: "#AA9C8F",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  headerTitle: {
    color: "#1E1815",
    fontSize: 26,
    fontWeight: "900",
  },

  // Empty
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 28,
    alignItems: "center",
    marginTop: 20,
  },
  emptyTitle: {
    color: "#1E1815",
    fontSize: 17,
    fontWeight: "800",
    marginTop: 14,
    marginBottom: 8,
  },
  emptyText: {
    color: "#76675B",
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
  },

  // List
  scrollList: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 100,
  },
  card: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    marginBottom: 14,
    borderRadius: 22,
    padding: 14,
    alignItems: "center",
    shadowColor: "#1E1815",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 3,
  },

  // Collage
  collageWrap: {
    width: 80,
    height: 80,
    borderRadius: 16,
    overflow: "hidden",
    flexDirection: "row",
    flexWrap: "wrap",
    marginRight: 14,
  },
  collageChunk: {
    width: "50%",
    height: "50%",
  },

  // Info
  cardInfo: {
    flex: 1,
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  orderIdText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1E1815",
  },
  qtyBadge: {
    backgroundColor: "#F5ECE3",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  qtyBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#76675B",
  },
  paymentMethodText: {
    fontSize: 13,
    color: "#76675B",
    fontWeight: "600",
    marginBottom: 2,
  },
  totalText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#9B4B1F",
    marginBottom: 8,
  },
  cardBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "800",
  },
  trackBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E1815",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  trackBtnText: {
    color: "#FFFDF9",
    fontSize: 13,
    fontWeight: "800",
    marginRight: 4,
  },
  trackBtnArrow: {
    color: "#FFFDF9",
    fontSize: 14,
    fontWeight: "800",
  },
});

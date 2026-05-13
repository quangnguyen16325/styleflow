/* eslint-disable react/prop-types */
import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, SafeAreaView } from "react-native";
import BankTransferPaymentCard, {
  shouldShowBankTransferPayment,
} from "../components/BankTransferPaymentCard";
import BackPillButton from "../components/BackPillButton";
import api, {
  DELIVERY_STATUS_LABEL,
  formatPrice,
  ORDER_STATUS_LABEL,
  PAYMENT_STATUS_LABEL,
} from "../services/api";

function formatDate(dateString) {
  if (!dateString) return "Không rõ thời gian";
  return new Date(dateString).toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getProgressStep(status) {
  const normalized = String(status || "").toLowerCase();

  if (normalized === "pending") return 1;
  if (normalized === "processing") return 2;
  if (normalized === "shipping") return 3;
  if (normalized === "completed") return 4;
  if (["cancelled", "failed"].includes(normalized)) return 0;
  return 1;
}

function getStatusText(status) {
  return ORDER_STATUS_LABEL[String(status || "").toLowerCase()] || "Đơn hàng";
}

function Stepper({ currentStep }) {
  const steps = ["Đặt hàng", "Xử lý", "Vận chuyển", "Hoàn tất"];

  return (
    <View style={styles.stepperCard}>
      {steps.map((label, index) => {
        const stepNumber = index + 1;
        const isDone = stepNumber <= currentStep;
        const isLast = index === steps.length - 1;

        return (
          <View key={label} style={styles.stepperRow}>
            <View style={styles.stepperLeft}>
              <View style={[styles.stepDot, isDone && styles.stepDotActive]}>
                <Text style={[styles.stepDotText, isDone && styles.stepDotTextActive]}>
                  {stepNumber}
                </Text>
              </View>
              {!isLast ? <View style={[styles.stepLine, isDone && styles.stepLineActive]} /> : null}
            </View>
            <View style={styles.stepperTextWrap}>
              <Text style={[styles.stepLabel, isDone && styles.stepLabelActive]}>{label}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

function OrderItemRow({ item }) {
  return (
    <View style={styles.orderItemRow}>
      <View style={styles.productToken}>
        <Text style={styles.productTokenText}>#{item.productId}</Text>
      </View>
      <View style={styles.orderItemInfo}>
        <Text style={styles.orderItemName}>Sản phẩm #{item.productId}</Text>
        <Text style={styles.orderItemMeta}>Số lượng {item.quantity}</Text>
      </View>
      <Text style={styles.orderItemPrice}>{formatPrice(item.priceAtPurchase * item.quantity)}</Text>
    </View>
  );
}

export default function OrderTrackingScreen({ route, navigation }) {
  const { orderId } = route?.params || {};
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }

    let active = true;

    const fetchOrderData = async () => {
      try {
        const res = await api.get(`/orders/${orderId}`);
        if (active) {
          setOrder(res.data);
        }
      } catch (error) {
        console.warn("Lỗi tải đơn hàng:", error);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchOrderData();

    return () => {
      active = false;
    };
  }, [orderId]);

  const progressStep = useMemo(() => getProgressStep(order?.status), [order?.status]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.center]}>
        <ActivityIndicator size="large" color="#9B4B1F" />
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.center]}>
        <Text style={styles.emptyTitle}>Không tìm thấy đơn hàng</Text>
        <BackPillButton onPress={() => navigation.goBack()} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.heroCard}>
          <Text style={styles.heroEyebrow}>Tracking</Text>
          <Text style={styles.heroTitle}>Đơn hàng #{order.id}</Text>
          <Text style={styles.heroSubtext}>
            {getStatusText(order.status)} • cập nhật lúc{" "}
            {formatDate(order.updatedAt || order.createdAt)}
          </Text>
        </View>

        <Stepper currentStep={progressStep} />

        {shouldShowBankTransferPayment(order) ? <BankTransferPaymentCard order={order} /> : null}

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Thông tin đơn hàng</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Ngày đặt</Text>
            <Text style={styles.summaryValue}>{formatDate(order.createdAt)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Trạng thái</Text>
            <Text style={styles.summaryValue}>{getStatusText(order.status)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Thanh toán</Text>
            <Text style={styles.summaryValue}>
              {PAYMENT_STATUS_LABEL[order.paymentStatus] || "Chưa rõ"}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Giao hàng</Text>
            <Text style={styles.summaryValue}>
              {DELIVERY_STATUS_LABEL[order.deliveryStatus] || "Chưa rõ"}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Phí vận chuyển</Text>
            <Text style={styles.summaryValue}>{formatPrice(order.shippingFee)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tổng thanh toán</Text>
            <Text style={styles.summaryTotal}>{formatPrice(order.totalAmount)}</Text>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Địa chỉ nhận hàng</Text>
          <Text style={styles.shippingName}>{order.shipping?.receiverName || "Người nhận"}</Text>
          {order.shipping?.receiverPhone ? (
            <Text style={styles.shippingPhone}>{order.shipping.receiverPhone}</Text>
          ) : null}
          <Text style={styles.shippingAddress}>
            {order.shipping?.fullAddress || order.shippingAddress || "Chưa có địa chỉ"}
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Sản phẩm trong đơn</Text>
          {(order.items || []).map((item) => (
            <OrderItemRow key={item.id || `${item.productId}-${item.quantity}`} item={item} />
          ))}
        </View>
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
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 32,
  },
  heroCard: {
    backgroundColor: "#1E1815",
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
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
    fontWeight: "900",
    lineHeight: 34,
  },
  heroSubtext: {
    color: "rgba(255,248,238,0.76)",
    fontSize: 14,
    lineHeight: 22,
    marginTop: 10,
  },
  stepperCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
  },
  stepperRow: {
    flexDirection: "row",
  },
  stepperLeft: {
    width: 30,
    alignItems: "center",
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#F3ECE5",
    alignItems: "center",
    justifyContent: "center",
  },
  stepDotActive: {
    backgroundColor: "#9B4B1F",
  },
  stepDotText: {
    color: "#8A7B6F",
    fontSize: 11,
    fontWeight: "800",
  },
  stepDotTextActive: {
    color: "#FFFDF9",
  },
  stepLine: {
    width: 2,
    flex: 1,
    backgroundColor: "#E7DBCF",
    marginVertical: 4,
  },
  stepLineActive: {
    backgroundColor: "#D69A65",
  },
  stepperTextWrap: {
    flex: 1,
    paddingLeft: 12,
    paddingBottom: 18,
  },
  stepLabel: {
    color: "#7A685B",
    fontSize: 14,
    fontWeight: "700",
  },
  stepLabelActive: {
    color: "#1E1815",
  },
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
  },
  sectionTitle: {
    color: "#1E1815",
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 14,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  summaryLabel: {
    color: "#6D5D51",
    fontSize: 13,
    marginRight: 14,
  },
  summaryValue: {
    color: "#1E1815",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "right",
    flex: 1,
  },
  summaryTotal: {
    color: "#9B4B1F",
    fontSize: 16,
    fontWeight: "900",
    textAlign: "right",
    flex: 1,
  },
  shippingName: {
    color: "#1E1815",
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 4,
  },
  shippingPhone: {
    color: "#7A685B",
    fontSize: 13,
    marginBottom: 8,
  },
  shippingAddress: {
    color: "#54483E",
    fontSize: 14,
    lineHeight: 22,
  },
  orderItemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 12,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0E5D8",
  },
  productToken: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#F5ECE3",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  productTokenText: {
    color: "#9B4B1F",
    fontSize: 13,
    fontWeight: "800",
  },
  orderItemInfo: {
    flex: 1,
    marginRight: 12,
  },
  orderItemName: {
    color: "#241A13",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4,
  },
  orderItemMeta: {
    color: "#8A7B6F",
    fontSize: 12,
  },
  orderItemPrice: {
    color: "#9B4B1F",
    fontSize: 14,
    fontWeight: "800",
  },
  emptyTitle: {
    color: "#1E1815",
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 16,
  },
});

/* eslint-disable react/prop-types */
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  SafeAreaView,
  Image,
} from "react-native";
import api from "../services/api";
import { COLORS } from "../constants/colors";

// ── Validation Helpers ──
const getStatusStep = (status) => {
  if (!status) return 0;
  const s = status.toLowerCase();
  if (["processing"].includes(s)) return 1;
  if (["shipping", "ready_to_ship"].includes(s)) return 3;
  if (["completed", "delivered"].includes(s)) return 4;
  if (s === "failed" || s === "delivery_failed") return 3;
  return 0; // pending, awaiting_payment, etc.
};

const Stepper = ({ currentStep }) => {
  const stepsCount = 5;
  return (
    <View style={styles.stepperWrap}>
      <View style={styles.lineBg} />
      <View
        style={[
          styles.lineActive,
          { width: `${(Math.min(currentStep, stepsCount - 1) / (stepsCount - 1)) * 100}%` },
        ]}
      />
      {[0, 1, 2, 3, 4].map((step) => {
        let dotStyle = styles.dotFuture;
        if (step < currentStep) dotStyle = styles.dotPast;
        else if (step === currentStep) dotStyle = styles.dotCurrent;

        return (
          <View
            key={step}
            style={[styles.dotBase, dotStyle, { left: `${(step / (stepsCount - 1)) * 100}%` }]}
          />
        );
      })}
    </View>
  );
};

export default function OrderTrackingScreen({ route, navigation }) {
  // Lấy orderId từ navigation params
  const { orderId } = route?.params || {};
  const [order, setOrder] = useState(null);
  const [timelineEvents, setTimelineEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [failedModalVisible, setFailedModalVisible] = useState(false);

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }
    const fetchOrderData = async () => {
      try {
        const resOrder = await api.get(`/orders/${orderId}`);
        setOrder(resOrder.data);

        // Chuẩn bị sẵn (future-proof) gọi API timeline lúc backend tung ra cho Customer
        // Dùng try-catch nội bộ riêng để nếu backend trả 403/404 chưa mở API thì luồng order không bị gãy
        try {
          const resEvents = await api.get(`/orders/${orderId}/delivery-events`);
          if (Array.isArray(resEvents.data) && resEvents.data.length > 0) {
            setTimelineEvents(resEvents.data);
          }
        } catch {
          // Chưa có API thì fallback mảng rỗng
        }
      } catch (err) {
        console.warn("Lỗi tải đơn hàng:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrderData();
  }, [orderId]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.center]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.center]}>
        <Text style={styles.errorText}>Order #{orderId} not found!</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const currentStep = getStatusStep(order.status);
  const isFailed = order.status === "failed" || order.status === "delivery_failed";
  const isDelivered = order.status === "completed" || order.status === "delivered";

  // Kết hợp data API timeline và data nội bộ
  const deliveryEvents = timelineEvents.length > 0 ? timelineEvents : order?.deliveryEvents || [];

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.avatarWrap}>
          <Text style={styles.avatarText}>ME</Text>
        </View>
        <View style={styles.headerMid}>
          <Text style={styles.headerTitle}>To Receive</Text>
          <Text style={styles.headerSub}>Track Your Order</Text>
        </View>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.iconBtn}>
            <Text>📑</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn}>
            <Text>⚙️</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* ── Stepper (Thanh tiến trình) ── */}
        <Stepper currentStep={currentStep} />

        {/* Tracking Number Block */}
        <View style={styles.trackingBlock}>
          <View>
            <Text style={styles.trackingTitle}>Tracking Number</Text>
            <Text style={styles.trackingVal}>
              {order.trackingNumber || `LGS-${Math.floor(Date.now() / 10000)}`}
            </Text>
          </View>
          <Text style={styles.trackingIcon}>📋</Text>
        </View>

        {/* ── Timeline Chi tiết ── */}
        <View style={styles.timelineContainer}>
          {deliveryEvents.length > 0 ? (
            deliveryEvents.map((evt, idx) => (
              <View key={evt.id || idx} style={styles.eventRow}>
                <View style={styles.eventLeft}>
                  <Text style={styles.eventTitle}>
                    {evt.status || evt.reason || "Event Update"}
                  </Text>
                  <Text style={styles.eventDesc}>{evt.partner || "Logistic Facility"}</Text>
                </View>
                <Text style={styles.eventTime}>
                  {new Date(evt.createdAt).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </View>
            ))
          ) : (
            <View style={styles.eventRow}>
              <View style={styles.eventLeft}>
                <Text style={styles.eventTitle}>
                  {getStatusStep(order.status) === 0
                    ? "Pending"
                    : getStatusStep(order.status) === 1
                      ? "Packed"
                      : "Processing..."}
                </Text>
                <Text style={styles.eventDesc}>Updating delivery information from partner...</Text>
              </View>
            </View>
          )}

          {/* Cảnh báo thất bại */}
          {isFailed && (
            <TouchableOpacity
              style={styles.failedAlert}
              onPress={() => setFailedModalVisible(true)}
            >
              <Text style={styles.failedAlertText}>
                Attempt to deliver your parcel was not successful
              </Text>
              <Text style={styles.failedAlertArrow}>→</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Nút Review - Nếu Delivered */}
        {isDelivered && (
          <TouchableOpacity
            style={styles.mainReviewBtn}
            onPress={() => setReviewModalVisible(true)}
          >
            <Text style={styles.mainReviewBtnText}>Review your Items</Text>
          </TouchableOpacity>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── Modal Review (image_58) ── */}
      <Modal visible={reviewModalVisible} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTopTitle}>Which item you want to review?</Text>
            <ScrollView style={{ maxHeight: 450 }} showsVerticalScrollIndicator={false}>
              {order?.items?.map((item, idx) => (
                <View key={item.id || idx} style={styles.reviewItemCard}>
                  {/* Future-proof: Nếu backend trả url ảnh thì vẽ Ảnh, không thì ô xám */}
                  {item.imageUrl ? (
                    <Image
                      source={{ uri: item.imageUrl }}
                      style={styles.reviewImgPlaceholder}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.reviewImgPlaceholder} />
                  )}
                  <View style={styles.reviewItemInfo}>
                    <Text style={styles.reviewItemText} numberOfLines={2}>
                      {item.name || `Product #${item.productId}`}
                    </Text>
                    <Text style={styles.reviewItemOrder}>Order #{order.id}</Text>
                  </View>
                  <TouchableOpacity style={styles.reviewBtnAction}>
                    <Text style={styles.reviewBtnText}>Review</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setReviewModalVisible(false)}>
              <Text style={styles.closeBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Modal Cảnh báo Thất bại (image_61) ── */}
      <Modal visible={failedModalVisible} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <Text style={styles.modalFailMainTitle}>Delivery was not successful</Text>
            <Text style={styles.modalFailSubTitle}>What should I do?</Text>
            <Text style={styles.modalFailDesc}>
              Don&apos;t worry, we will shortly contact you to arrange more suitable time for the
              delivery. You can also contact us by using this number +00 000 000 000 or chat with
              our customer care service
            </Text>
            <TouchableOpacity style={styles.chatBtn} onPress={() => setFailedModalVisible(false)}>
              <Text style={styles.chatBtnText}>Chat Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ── Styles ──
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.bgPrimary },
  center: { justifyContent: "center", alignItems: "center" },
  errorText: { fontSize: 16, color: COLORS.danger, fontWeight: "600", marginBottom: 16 },
  backBtn: { padding: 12, backgroundColor: COLORS.bgSecondary, borderRadius: 8 },
  backBtnText: { color: COLORS.textPrimary, fontWeight: "600" },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
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
  headerTitle: { fontSize: 20, fontWeight: "800", color: COLORS.textPrimary },
  headerSub: { fontSize: 14, color: COLORS.textSecondary, marginTop: 2 },
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

  scrollContainer: { flex: 1, paddingHorizontal: 20 },

  // Stepper
  stepperWrap: {
    height: 30,
    marginHorizontal: 15,
    marginVertical: 24,
    position: "relative",
    justifyContent: "center",
  },
  lineBg: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: "#E5E5EB",
    borderRadius: 2,
  },
  lineActive: {
    position: "absolute",
    left: 0,
    height: 4,
    backgroundColor: COLORS.info,
    borderRadius: 2,
    zIndex: 1,
  },
  dotBase: {
    position: "absolute",
    width: 16,
    height: 16,
    borderRadius: 8,
    zIndex: 2,
    top: "50%",
    marginTop: -8,
    marginLeft: -8,
  },
  dotPast: { backgroundColor: COLORS.primaryDark }, // Xanh đậm
  dotCurrent: { backgroundColor: COLORS.info }, // Xanh nhạt
  dotFuture: { backgroundColor: "#E5E5EB" },

  // Tracking Block
  trackingBlock: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.bgSecondary,
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  trackingTitle: { fontSize: 14, fontWeight: "700", color: COLORS.textPrimary, marginBottom: 4 },
  trackingVal: { fontSize: 14, color: COLORS.textSecondary },
  trackingIcon: { fontSize: 20, color: COLORS.info },

  // Timeline
  timelineContainer: {
    flex: 1,
  },
  eventRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  eventLeft: { flex: 1, paddingRight: 16 },
  eventTitle: { fontSize: 16, fontWeight: "700", color: COLORS.textPrimary, marginBottom: 4 },
  eventDesc: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 20 },
  eventTime: { fontSize: 13, color: COLORS.textPrimary, fontWeight: "500" },

  // Alert Failed
  failedAlert: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFF2F2",
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FFE0E0",
    marginTop: 10,
  },
  failedAlertText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.danger,
    fontWeight: "700",
    paddingRight: 10,
  },
  failedAlertArrow: { fontSize: 18, color: COLORS.danger, fontWeight: "bold" },

  mainReviewBtn: {
    marginTop: 30,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: "center",
  },
  mainReviewBtnText: { color: "#FFF", fontSize: 16, fontWeight: "700" },

  // Modals Overlay
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  modalContent: {
    backgroundColor: COLORS.bgPrimary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },

  // Review Modal items
  modalTopTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.textPrimary,
    marginBottom: 20,
    textAlign: "center",
  },
  reviewItemCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.bgSecondary,
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  reviewImgPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: "#E5E5EA",
    marginRight: 12,
  },
  reviewItemInfo: { flex: 1 },
  reviewItemText: { fontSize: 14, fontWeight: "600", color: COLORS.textPrimary, marginBottom: 4 },
  reviewItemOrder: { fontSize: 12, color: COLORS.textSecondary },
  reviewBtnAction: {
    borderWidth: 1,
    borderColor: COLORS.info,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  reviewBtnText: { color: COLORS.info, fontSize: 13, fontWeight: "700" },
  closeBtn: {
    marginTop: 16,
    alignItems: "center",
    paddingVertical: 12,
    backgroundColor: COLORS.bgSecondary,
    borderRadius: 12,
  },
  closeBtnText: { color: COLORS.textSecondary, fontWeight: "700", fontSize: 15 },

  // Fail Modal items
  modalFailMainTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  modalFailSubTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  modalFailDesc: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 22, marginBottom: 30 },
  chatBtn: {
    backgroundColor: COLORS.info,
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: "center",
  },
  chatBtnText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
});

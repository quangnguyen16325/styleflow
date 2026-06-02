/* eslint-disable react/prop-types */
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from "react-native";
import BankTransferPaymentCard, {
  shouldShowBankTransferPayment,
} from "../components/BankTransferPaymentCard";
import MomoPaymentCard, { shouldShowMomoPayment } from "../components/MomoPaymentCard";
import BackPillButton from "../components/BackPillButton";
import AppImage from "../components/AppImage";
import api, {
  createProductReview,
  DELIVERY_STATUS_LABEL,
  formatPrice,
  ORDER_STATUS_LABEL,
  PAYMENT_STATUS_LABEL,
  PAYMENT_GATEWAY_LABEL,
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

function OrderItemRow({ item, canReview, isReviewed, onReview }) {
  const quantity = Number(item.quantity || 0);
  const unitPrice = Number(item.priceAtPurchase || 0);
  const lineTotal = unitPrice * quantity;

  return (
    <View style={styles.orderItemRow}>
      {item.imageUrl ? (
        <AppImage source={{ uri: item.imageUrl }} style={styles.productImage} resizeMode="cover" />
      ) : (
        <View style={styles.productToken}>
          <Text style={styles.productTokenText}>#{item.productId}</Text>
        </View>
      )}
      <View style={styles.orderItemInfo}>
        <Text style={styles.orderItemName} numberOfLines={2}>
          {item.name || `Sản phẩm #${item.productId}`}
        </Text>
        <Text style={styles.orderItemMeta}>Mã sản phẩm: #{item.productId}</Text>
        <View style={styles.itemPriceBreakdown}>
          <Text style={styles.orderItemMeta}>Đơn giá: {formatPrice(unitPrice)}</Text>
          <Text style={styles.orderItemMeta}>SL: {quantity}</Text>
        </View>
        {canReview ? (
          <TouchableOpacity
            style={[styles.reviewItemBtn, isReviewed && styles.reviewItemBtnDone]}
            activeOpacity={0.85}
            onPress={() => onReview(item)}
            disabled={isReviewed}
          >
            <Text style={[styles.reviewItemBtnText, isReviewed && styles.reviewItemBtnTextDone]}>
              {isReviewed ? "Đã đánh giá" : "Đánh giá sản phẩm"}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
      <View style={styles.orderItemAmountWrap}>
        <Text style={styles.orderItemAmountLabel}>Thành tiền</Text>
        <Text style={styles.orderItemPrice}>{formatPrice(lineTotal)}</Text>
      </View>
    </View>
  );
}

function canReviewOrder(order) {
  const orderStatus = String(order?.status || "").toLowerCase();
  const deliveryStatus = String(order?.deliveryStatus || "").toLowerCase();
  return orderStatus === "completed" || ["delivered", "returned"].includes(deliveryStatus);
}

function isApprovedReturn(order) {
  return (
    String(order?.latestRefundRequestStatus || "").toLowerCase() === "approved" &&
    String(order?.deliveryStatus || "").toLowerCase() !== "returned"
  );
}

function ApprovedReturnNotice() {
  return (
    <View style={styles.approvedReturnNotice}>
      <Text style={styles.approvedReturnTitle}>Yêu cầu trả hàng đã được duyệt</Text>
      <Text style={styles.approvedReturnText}>
        Vui lòng đóng gói sản phẩm đầy đủ và đợi shipper tới lấy hàng.
      </Text>
    </View>
  );
}

export default function OrderTrackingScreen({ route, navigation }) {
  const { orderId } = route?.params || {};
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviewingItem, setReviewingItem] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewedItemIds, setReviewedItemIds] = useState(() => new Set());

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
  const reviewable = useMemo(() => canReviewOrder(order), [order]);

  const openReviewModal = (item) => {
    setReviewingItem(item);
    setReviewRating(5);
    setReviewComment("");
  };

  const closeReviewModal = () => {
    if (submittingReview) return;
    setReviewingItem(null);
    setReviewComment("");
    setReviewRating(5);
  };

  const handleSubmitReview = async () => {
    if (!reviewingItem) return;

    try {
      setSubmittingReview(true);
      await createProductReview(reviewingItem.productId, {
        orderItemId: reviewingItem.id,
        rating: reviewRating,
        comment: reviewComment,
      });

      setReviewedItemIds((current) => {
        const next = new Set(current);
        next.add(Number(reviewingItem.id));
        return next;
      });
      Alert.alert("Đã gửi đánh giá", "Cảm ơn bạn đã đánh giá sản phẩm.");
      setReviewingItem(null);
      setReviewComment("");
      setReviewRating(5);
    } catch (error) {
      const message =
        error?.code === "CONFLICT"
          ? "Sản phẩm trong đơn này đã được đánh giá trước đó."
          : error?.message || "Không thể gửi đánh giá. Vui lòng thử lại.";
      if (error?.code === "CONFLICT" && reviewingItem?.id) {
        setReviewedItemIds((current) => {
          const next = new Set(current);
          next.add(Number(reviewingItem.id));
          return next;
        });
      }
      Alert.alert("Lỗi đánh giá", message);
    } finally {
      setSubmittingReview(false);
    }
  };

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
        <BackPillButton onPress={() => navigation.goBack()} />

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
        {shouldShowMomoPayment(order) ? <MomoPaymentCard order={order} /> : null}
        {isApprovedReturn(order) ? <ApprovedReturnNotice /> : null}

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
            <Text style={styles.summaryLabel}>Hình thức TT</Text>
            <Text style={styles.summaryValue}>
              {PAYMENT_GATEWAY_LABEL[order.paymentGateway] || order.paymentGateway || "Chưa rõ"}
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
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Sản phẩm trong đơn</Text>
            <Text style={styles.sectionCount}>{order.items?.length || 0} dòng</Text>
          </View>
          {(order.items || []).length > 0 ? (
            (order.items || []).map((item) => (
              <OrderItemRow
                key={item.id || `${item.productId}-${item.quantity}`}
                item={item}
                canReview={reviewable}
                isReviewed={reviewedItemIds.has(Number(item.id))}
                onReview={openReviewModal}
              />
            ))
          ) : (
            <Text style={styles.emptyItemsText}>Đơn hàng chưa có thông tin sản phẩm.</Text>
          )}
        </View>
      </ScrollView>

      <ReviewModal
        item={reviewingItem}
        visible={!!reviewingItem}
        rating={reviewRating}
        comment={reviewComment}
        submitting={submittingReview}
        onRatingChange={setReviewRating}
        onCommentChange={setReviewComment}
        onClose={closeReviewModal}
        onSubmit={handleSubmitReview}
      />
    </SafeAreaView>
  );
}

function ReviewModal({
  visible,
  item,
  rating,
  comment,
  submitting,
  onRatingChange,
  onCommentChange,
  onClose,
  onSubmit,
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable style={styles.modalDismissArea} onPress={Keyboard.dismiss} />
        <Pressable style={styles.reviewModalSheet} onPress={Keyboard.dismiss}>
          <View style={styles.modalHandle} />
          <Text style={styles.reviewModalTitle}>Đánh giá sản phẩm</Text>
          <Text style={styles.reviewModalProduct} numberOfLines={2}>
            {item?.name || `Sản phẩm #${item?.productId || ""}`}
          </Text>

          <View style={styles.reviewStars}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                activeOpacity={0.8}
                onPress={() => onRatingChange(star)}
                disabled={submitting}
              >
                <Text style={styles.reviewStarText}>{star <= rating ? "★" : "☆"}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            style={styles.reviewInput}
            value={comment}
            onChangeText={onCommentChange}
            placeholder="Chia sẻ cảm nhận của bạn về sản phẩm..."
            placeholderTextColor="#AA9C8F"
            multiline
            maxLength={1000}
            editable={!submitting}
            returnKeyType="done"
            blurOnSubmit
            onSubmitEditing={Keyboard.dismiss}
          />
          <Text style={styles.reviewInputHint}>{comment.length}/1000 ký tự</Text>

          <View style={styles.reviewModalActions}>
            <TouchableOpacity
              style={styles.reviewCancelBtn}
              activeOpacity={0.85}
              onPress={onClose}
              disabled={submitting}
            >
              <Text style={styles.reviewCancelText}>Đóng</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.reviewSubmitBtn, submitting && styles.reviewSubmitBtnDisabled]}
              activeOpacity={0.85}
              onPress={onSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFDF9" size="small" />
              ) : (
                <Text style={styles.reviewSubmitText}>Gửi đánh giá</Text>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
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
    marginTop: 14,
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
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  sectionCount: {
    color: "#8A7B6F",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  approvedReturnNotice: {
    backgroundColor: "#EAF7F3",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#B8DED2",
    padding: 18,
    marginBottom: 14,
  },
  approvedReturnTitle: {
    color: "#1B6F5B",
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 6,
  },
  approvedReturnText: {
    color: "#3F6F62",
    fontSize: 14,
    lineHeight: 22,
    fontWeight: "700",
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
    alignItems: "flex-start",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0E5D8",
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
    marginRight: 12,
  },
  productToken: {
    width: 60,
    height: 60,
    borderRadius: 12,
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
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 4,
    lineHeight: 20,
  },
  orderItemMeta: {
    color: "#8A7B6F",
    fontSize: 12,
    lineHeight: 18,
  },
  itemPriceBreakdown: {
    marginTop: 4,
  },
  reviewItemBtn: {
    alignSelf: "flex-start",
    backgroundColor: "#1E1815",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 10,
  },
  reviewItemBtnDone: {
    backgroundColor: "#F5ECE3",
  },
  reviewItemBtnText: {
    color: "#FFFDF9",
    fontSize: 12,
    fontWeight: "800",
  },
  reviewItemBtnTextDone: {
    color: "#7A685B",
  },
  orderItemAmountWrap: {
    minWidth: 92,
    alignItems: "flex-end",
  },
  orderItemAmountLabel: {
    color: "#AA9C8F",
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  orderItemPrice: {
    color: "#9B4B1F",
    fontSize: 14,
    fontWeight: "900",
    textAlign: "right",
  },
  emptyItemsText: {
    color: "#76675B",
    fontSize: 14,
    lineHeight: 22,
  },
  emptyTitle: {
    color: "#1E1815",
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 16,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(24, 18, 14, 0.34)",
  },
  modalDismissArea: {
    flex: 1,
  },
  reviewModalSheet: {
    backgroundColor: "#FCF9F4",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: 30,
  },
  modalHandle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#D3C4B6",
    marginBottom: 14,
  },
  reviewModalTitle: {
    color: "#1E1815",
    fontSize: 21,
    fontWeight: "900",
    marginBottom: 6,
  },
  reviewModalProduct: {
    color: "#76675B",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  reviewStars: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  reviewStarText: {
    color: "#D99152",
    fontSize: 34,
    fontWeight: "900",
    marginRight: 7,
  },
  reviewInput: {
    minHeight: 116,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E6DBCE",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#1E1815",
    fontSize: 14,
    lineHeight: 20,
    textAlignVertical: "top",
  },
  reviewInputHint: {
    color: "#AA9C8F",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "right",
    marginTop: 8,
  },
  reviewModalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  reviewCancelBtn: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: "#F5ECE3",
    paddingVertical: 14,
    alignItems: "center",
  },
  reviewCancelText: {
    color: "#7A685B",
    fontSize: 14,
    fontWeight: "800",
  },
  reviewSubmitBtn: {
    flex: 1.3,
    borderRadius: 16,
    backgroundColor: "#1E1815",
    paddingVertical: 14,
    alignItems: "center",
  },
  reviewSubmitBtnDisabled: {
    opacity: 0.65,
  },
  reviewSubmitText: {
    color: "#FFFDF9",
    fontSize: 14,
    fontWeight: "800",
  },
});

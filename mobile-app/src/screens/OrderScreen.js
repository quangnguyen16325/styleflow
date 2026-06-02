/* eslint-disable react/prop-types */
import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Modal,
  Alert,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { shouldShowBankTransferPayment } from "../components/BankTransferPaymentCard";
import api, {
  DELIVERY_STATUS_LABEL,
  formatPrice,
  getShippingQuote,
  ORDER_STATUS_LABEL,
  PAYMENT_STATUS_LABEL,
  PAYMENT_GATEWAY_LABEL,
} from "../services/api";

const ADDRESS_CHANGE_WEBHOOK_URL =
  process.env.EXPO_PUBLIC_N8N_ADDRESS_CHANGE_WEBHOOK_URL ||
  "https://n8n.ecloria.co.uk/webhook/address-change-request";
const ADDRESS_CHANGE_PROCESSING_FEE = 10000;
const ADDRESS_CHANGE_PROCESSING_FEE_STATUSES = [
  "ready_to_ship",
  "handover",
  "in_transit",
  "retry_pending",
];

const TABS = [
  { key: "all", label: "Tất cả" },
  { key: "processing", label: "Đang xử lý" },
  { key: "shipping", label: "Đang giao" },
  { key: "done", label: "Hoàn tất" },
  { key: "refund", label: "Trả hàng" },
];

function formatDate(dateString) {
  if (!dateString) return "Không rõ ngày";
  return new Date(dateString).toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getOrderStatusMeta(status) {
  const normalized = String(status || "").toLowerCase();

  if (["pending", "processing"].includes(normalized)) {
    return { label: "Đang xử lý", tone: "#B66A1E", bg: "#F6E6D7" };
  }

  if (normalized === "shipping") {
    return { label: "Đang giao", tone: "#005A9C", bg: "#E5EDF8" };
  }

  if (normalized === "completed") {
    return { label: "Hoàn tất", tone: "#1C7C54", bg: "#E4F2EA" };
  }

  if (["cancelled", "failed"].includes(normalized)) {
    return { label: "Đã huỷ", tone: "#B33939", bg: "#F8E4E4" };
  }

  return { label: ORDER_STATUS_LABEL[normalized] || "Đơn hàng", tone: "#65574C", bg: "#F3ECE5" };
}

function getPaymentStatusMeta(paymentStatus, paymentGateway) {
  const normalized = String(paymentStatus || "").toLowerCase();
  const gateway = String(paymentGateway || "").toUpperCase();

  if (normalized === "unpaid") {
    return gateway === "COD"
      ? { label: "COD chưa thu", tone: "#7A4B12", bg: "#FFF2D8" }
      : { label: "Chưa thanh toán", tone: "#9B4B1F", bg: "#F7E4D4" };
  }

  if (normalized === "payment_pending") {
    return { label: "Chờ thanh toán", tone: "#9B4B1F", bg: "#FFF1E5" };
  }

  if (normalized === "paid") {
    return { label: "Đã thanh toán", tone: "#1C7C54", bg: "#E4F2EA" };
  }

  if (normalized === "paid_held") {
    return { label: "Tạm giữ tiền", tone: "#7A4B12", bg: "#FFF2D8" };
  }

  if (normalized === "payment_unknown") {
    return { label: "Cần xác minh tiền", tone: "#8A5A00", bg: "#FFF4CC" };
  }

  if (normalized === "payment_failed") {
    return { label: "Thanh toán lỗi", tone: "#B33939", bg: "#F8E4E4" };
  }

  if (normalized === "refund_pending") {
    return { label: "Chờ hoàn tiền", tone: "#7B4E9B", bg: "#F1E7F8" };
  }

  if (normalized === "refunded") {
    return { label: "Đã hoàn tiền", tone: "#1B6F78", bg: "#DFF3F5" };
  }

  return {
    label: PAYMENT_STATUS_LABEL[normalized] || "Thanh toán chưa rõ",
    tone: "#65574C",
    bg: "#F3ECE5",
  };
}

function isCompletedStatus(status) {
  return String(status || "").toLowerCase() === "completed";
}

function canChangeAddress(order) {
  const status = String(order?.status || "").toLowerCase();
  if (["completed", "cancelled", "failed"].includes(status)) {
    return false;
  }
  return ["pending", "ready_to_ship", "handover", "in_transit", "retry_pending"].includes(
    String(order?.deliveryStatus || "").toLowerCase(),
  );
}

function getAddressChangeProcessingFee(order) {
  return ADDRESS_CHANGE_PROCESSING_FEE_STATUSES.includes(
    String(order?.deliveryStatus || "").toLowerCase(),
  )
    ? ADDRESS_CHANGE_PROCESSING_FEE
    : 0;
}

function isApprovedReturn(order) {
  return (
    String(order?.latestRefundRequestStatus || "").toLowerCase() === "approved" &&
    String(order?.deliveryStatus || "").toLowerCase() !== "returned"
  );
}

function canReviewOrder(order) {
  const status = String(order?.status || "").toLowerCase();
  const deliveryStatus = String(order?.deliveryStatus || "").toLowerCase();
  return status === "completed" || ["delivered", "returned"].includes(deliveryStatus);
}

function getPendingReviewCount(order) {
  if (!canReviewOrder(order) || !Array.isArray(order?.items)) {
    return 0;
  }

  return order.items.filter((item) => !item.review?.id).length;
}

function hasRefundRequest(latestRefundRequestStatus) {
  return (
    typeof latestRefundRequestStatus === "string" && latestRefundRequestStatus.trim().length > 0
  );
}

function getRefundStatusLabel(latestRefundRequestStatus) {
  const normalized = String(latestRefundRequestStatus || "").toLowerCase();

  if (normalized === "pending") return "Yêu cầu đã gửi";
  if (normalized === "manual_review_required") return "Chờ duyệt thủ công";
  if (normalized === "approved") return "Đã duyệt";
  if (normalized === "rejected") return "Đã từ chối";
  if (normalized === "refunded") return "Đã trả hàng";

  return "Đang xử lý trả hàng";
}

function getRefundStatusMeta(latestRefundRequestStatus) {
  const normalized = String(latestRefundRequestStatus || "").toLowerCase();

  if (normalized === "pending") {
    return { label: "Đã gửi yêu cầu trả", tone: "#9B4B1F", bg: "#FFF1E5" };
  }

  if (normalized === "manual_review_required") {
    return { label: "Chờ duyệt trả hàng", tone: "#8A5A00", bg: "#FFF4CC" };
  }

  if (normalized === "approved") {
    return { label: "Đã duyệt trả hàng", tone: "#1B6F78", bg: "#DFF3F5" };
  }

  if (normalized === "rejected") {
    return { label: "Từ chối trả hàng", tone: "#B33939", bg: "#F8E4E4" };
  }

  if (normalized === "refunded") {
    return { label: "Đã trả hàng", tone: "#1C7C54", bg: "#E4F2EA" };
  }

  return { label: "Đang xử lý trả hàng", tone: "#7B4E9B", bg: "#F1E7F8" };
}

function getCustomerFacingBadges(order) {
  const orderStatus = String(order?.status || "").toLowerCase();
  const paymentStatus = String(order?.paymentStatus || "").toLowerCase();
  const deliveryStatus = String(order?.deliveryStatus || "").toLowerCase();
  const refundStatus = String(order?.latestRefundRequestStatus || "").toLowerCase();
  const badges = [];

  if (deliveryStatus === "returned") {
    badges.push({ label: "Đã trả hàng", tone: "#1C7C54", bg: "#E4F2EA" });
    return badges;
  }

  if (refundStatus) {
    badges.push(getRefundStatusMeta(refundStatus));
    if (["refunded", "approved"].includes(refundStatus)) {
      return badges;
    }
  }

  if (["payment_pending", "payment_unknown", "payment_failed"].includes(paymentStatus)) {
    badges.push(getPaymentStatusMeta(paymentStatus, order?.paymentGateway));
    return badges;
  }

  if (paymentStatus === "unpaid" && order?.paymentGateway !== "COD") {
    badges.push(getPaymentStatusMeta(paymentStatus, order?.paymentGateway));
    return badges;
  }

  if (["returning", "returned"].includes(deliveryStatus)) {
    badges.push(
      deliveryStatus === "returned"
        ? { label: "Đã trả hàng", tone: "#1C7C54", bg: "#E4F2EA" }
        : { label: "Đang hoàn hàng", tone: "#7B4E9B", bg: "#F1E7F8" },
    );
    return badges;
  }

  if (["delivery_failed", "retry_pending"].includes(deliveryStatus)) {
    badges.push({ label: "Giao hàng gặp lỗi", tone: "#B66A1E", bg: "#F6E6D7" });
    return badges;
  }

  badges.push(getOrderStatusMeta(orderStatus));

  if (orderStatus === "completed" && paymentStatus === "refunded") {
    badges.push(getPaymentStatusMeta(paymentStatus, order?.paymentGateway));
  }

  return badges.slice(0, 2);
}

function isWithin7Days(dateStr) {
  if (!dateStr) return false;
  const diff = (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24);
  return diff <= 7;
}

function AddressPickerModal({
  visible,
  addresses,
  loading,
  selectedAddressId,
  currentOrderAddressId,
  currentShippingFee,
  shippingQuote,
  loadingShippingQuote,
  submitting,
  onClose,
  onSelect,
  onConfirm,
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Đổi địa chỉ giao hàng</Text>
          <ScrollView
            style={styles.modalScroll}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.modalScrollContent}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#9B4B1F" style={{ marginVertical: 24 }} />
            ) : addresses.length === 0 ? (
              <View style={styles.modalEmptyCard}>
                <Text style={styles.modalEmptyTitle}>Chưa có địa chỉ nào</Text>
                <Text style={styles.modalEmptyText}>
                  Hãy thêm địa chỉ trong sổ địa chỉ trước khi đổi nơi nhận hàng.
                </Text>
              </View>
            ) : (
              addresses.map((addr) => {
                const isCurrentAddress = currentOrderAddressId === addr.id;

                return (
                  <TouchableOpacity
                    key={addr.id}
                    style={[
                      styles.modalOption,
                      isCurrentAddress && styles.modalOptionDisabled,
                      selectedAddressId === addr.id && styles.modalOptionSelected,
                    ]}
                    onPress={() => onSelect(addr.id)}
                    activeOpacity={isCurrentAddress ? 1 : 0.88}
                    disabled={isCurrentAddress}
                  >
                    <Text style={styles.modalOptionLabel}>{addr.label || "Địa chỉ"}</Text>
                    <Text style={styles.modalOptionText}>{addr.receiverName}</Text>
                    <Text style={styles.modalOptionSub}>{addr.receiverPhone}</Text>
                    <Text style={styles.modalOptionSub}>
                      {[addr.addressLine, addr.ward, addr.district, addr.city, addr.country]
                        .filter(Boolean)
                        .join(", ")}
                    </Text>
                    {isCurrentAddress ? (
                      <Text style={styles.modalOptionCurrent}>Địa chỉ hiện tại</Text>
                    ) : null}
                    {selectedAddressId === addr.id ? (
                      <Text style={styles.modalOptionCheck}>Đã chọn</Text>
                    ) : null}
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
          {selectedAddressId ? (
            <View style={styles.shippingPreviewCard}>
              <Text style={styles.shippingPreviewTitle}>Phí giao hàng sau khi đổi</Text>
              <View style={styles.shippingPreviewRow}>
                <Text style={styles.shippingPreviewLabel}>Phí ship hiện tại</Text>
                <Text style={styles.shippingPreviewValue}>{formatPrice(currentShippingFee)}</Text>
              </View>
              <View style={styles.shippingPreviewRow}>
                <Text style={styles.shippingPreviewLabel}>Phí ship mới</Text>
                {loadingShippingQuote ? (
                  <ActivityIndicator size="small" color="#9B4B1F" />
                ) : (
                  <Text style={styles.shippingPreviewValue}>
                    {shippingQuote ? formatPrice(shippingQuote.newShippingFee) : "Chưa tính được"}
                  </Text>
                )}
              </View>
              <View style={[styles.shippingPreviewRow, styles.shippingPreviewDeltaRow]}>
                <Text style={styles.shippingPreviewDeltaLabel}>Chênh lệch phí ship</Text>
                {loadingShippingQuote ? (
                  <ActivityIndicator size="small" color="#9B4B1F" />
                ) : (
                  <Text
                    style={[
                      styles.shippingPreviewDeltaValue,
                      shippingQuote?.shippingDelta > 0 && styles.shippingPreviewDeltaIncrease,
                      shippingQuote?.shippingDelta < 0 && styles.shippingPreviewDeltaDecrease,
                    ]}
                  >
                    {shippingQuote
                      ? `${shippingQuote.shippingDelta > 0 ? "+" : ""}${formatPrice(
                          shippingQuote.shippingDelta,
                        )}`
                      : "Chưa rõ"}
                  </Text>
                )}
              </View>
              {shippingQuote?.processingFee > 0 ? (
                <View style={styles.shippingPreviewRow}>
                  <Text style={styles.shippingPreviewLabel}>Phí xử lý đổi địa chỉ</Text>
                  <Text style={styles.shippingPreviewValue}>
                    {formatPrice(shippingQuote.processingFee)}
                  </Text>
                </View>
              ) : null}
              <View style={[styles.shippingPreviewRow, styles.shippingPreviewTotalRow]}>
                <Text style={styles.shippingPreviewDeltaLabel}>Tổng chênh lệch</Text>
                {loadingShippingQuote ? (
                  <ActivityIndicator size="small" color="#9B4B1F" />
                ) : (
                  <Text
                    style={[
                      styles.shippingPreviewDeltaValue,
                      shippingQuote?.totalDelta > 0 && styles.shippingPreviewDeltaIncrease,
                      shippingQuote?.totalDelta < 0 && styles.shippingPreviewDeltaDecrease,
                    ]}
                  >
                    {shippingQuote
                      ? `${shippingQuote.totalDelta > 0 ? "+" : ""}${formatPrice(
                          shippingQuote.totalDelta,
                        )}`
                      : "Chưa rõ"}
                  </Text>
                )}
              </View>
            </View>
          ) : null}
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.modalSecondaryBtn}
              onPress={onClose}
              activeOpacity={0.88}
            >
              <Text style={styles.modalSecondaryBtnText}>Huỷ</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modalCloseBtn,
                (!selectedAddressId || submitting || loadingShippingQuote) &&
                  styles.modalCloseBtnDisabled,
              ]}
              onPress={onConfirm}
              activeOpacity={selectedAddressId && !submitting && !loadingShippingQuote ? 0.88 : 1}
              disabled={!selectedAddressId || submitting || loadingShippingQuote}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFDF9" />
              ) : (
                <Text style={styles.modalCloseBtnText}>Xác nhận</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function OrderItemSummary({ items }) {
  return (
    <View style={styles.itemSummaryRow}>
      {items.slice(0, 3).map((orderItem, index) => (
        <View key={orderItem.id || `${orderItem.productId}-${index}`} style={styles.itemChip}>
          <Text style={styles.itemChipText}>#{orderItem.productId}</Text>
          <Text style={styles.itemChipQty}>x{orderItem.quantity}</Text>
        </View>
      ))}
      {items.length > 3 ? (
        <Text style={styles.itemMoreText}>+{items.length - 3} sản phẩm</Text>
      ) : null}
    </View>
  );
}

function StatusPill({ meta }) {
  return (
    <View style={[styles.statusPill, { backgroundColor: meta.bg }]}>
      <Text style={[styles.statusPillText, { color: meta.tone }]}>{meta.label}</Text>
    </View>
  );
}

function ApprovedReturnNotice({ compact = false }) {
  return (
    <View style={[styles.approvedReturnNotice, compact && styles.approvedReturnNoticeCompact]}>
      <Text style={styles.approvedReturnTitle}>Yêu cầu trả hàng đã được duyệt</Text>
      <Text style={styles.approvedReturnText}>
        Vui lòng đóng gói sản phẩm đầy đủ và đợi shipper tới lấy hàng.
      </Text>
    </View>
  );
}

export default function OrderScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [userProfile, setUserProfile] = useState(null);
  const [addressModalOrderId, setAddressModalOrderId] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [addressChangeQuote, setAddressChangeQuote] = useState(null);
  const [loadingAddressChangeQuote, setLoadingAddressChangeQuote] = useState(false);
  const [submittingAddressChange, setSubmittingAddressChange] = useState(false);

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

          if (!isActive) return;

          if (meRes?.data) {
            setUserProfile(meRes.data);
          }

          const list = Array.isArray(ordersRes?.data) ? ordersRes.data : [];
          const sorted = [...list].sort(
            (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
          );
          setOrders(sorted);
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
    }, []),
  );

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const status = String(order.status || "").toLowerCase();
      const deliveryStatus = String(order.deliveryStatus || "").toLowerCase();

      if (activeTab === "all") return true;
      if (activeTab === "processing") {
        return ["pending", "processing"].includes(status);
      }
      if (activeTab === "shipping") {
        return (
          status === "shipping" ||
          ["ready_to_ship", "handover", "in_transit"].includes(deliveryStatus)
        );
      }
      if (activeTab === "done") {
        return status === "completed";
      }
      if (activeTab === "refund") {
        return hasRefundRequest(order.latestRefundRequestStatus);
      }
      return true;
    });
  }, [activeTab, orders]);

  const activeAddressOrder = useMemo(
    () => orders.find((order) => order.id === addressModalOrderId) || null,
    [addressModalOrderId, orders],
  );

  const openAddressChange = async (orderId) => {
    setAddressModalOrderId(orderId);
    setSelectedAddressId(null);
    setAddressChangeQuote(null);
    setLoadingAddresses(true);
    try {
      const res = await api.get("/me/addresses");
      setAddresses(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.warn("Lỗi tải danh sách địa chỉ:", error);
      setAddresses([]);
    } finally {
      setLoadingAddresses(false);
    }
  };

  const handleSelectAddressForChange = async (addressId) => {
    setSelectedAddressId(addressId);
    setAddressChangeQuote(null);

    if (!addressId || activeAddressOrder?.customerAddressId === addressId) {
      return;
    }

    try {
      setLoadingAddressChangeQuote(true);
      const quote = await getShippingQuote({ addressId });
      const currentShippingFee = Number(activeAddressOrder?.shippingFee || 0);
      const newShippingFee = Number(quote.shippingFee ?? 0);
      const processingFee = getAddressChangeProcessingFee(activeAddressOrder);
      const shippingDelta = newShippingFee - currentShippingFee;
      setAddressChangeQuote({
        currentShippingFee,
        newShippingFee,
        shippingDelta,
        processingFee,
        totalDelta: shippingDelta + processingFee,
      });
    } catch (error) {
      console.warn("Lỗi tính phí ship đổi địa chỉ:", error);
      setAddressChangeQuote(null);
    } finally {
      setLoadingAddressChangeQuote(false);
    }
  };

  const handleAddressChange = async () => {
    if (!selectedAddressId) {
      return;
    }

    try {
      setSubmittingAddressChange(true);
      const res = await api.post(`/orders/${addressModalOrderId}/address-change-request`, {
        addressId: selectedAddressId,
      });
      const orderId = addressModalOrderId;
      const action = res?.data?.action;
      const requiresApproval = action === "pending_approval";

      setAddressModalOrderId(null);
      setSelectedAddressId(null);
      setSubmittingAddressChange(false);

      if (requiresApproval) {
        Alert.alert("Thành công", "Yêu cầu đổi địa chỉ đã được gửi.");
      } else {
        Alert.alert("Thành công", "Địa chỉ giao hàng đã được cập nhật.");
      }

      void fetch(ADDRESS_CHANGE_WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId,
          requiresApproval,
        }),
      }).catch((webhookError) => {
        console.warn("Lỗi gửi webhook address-change-request:", webhookError);
      });
    } catch (err) {
      Alert.alert("Lỗi", err?.message || "Không thể đổi địa chỉ cho đơn hàng này.");
    } finally {
      setSubmittingAddressChange(false);
    }
  };

  const currentInitial = userProfile?.fullName ? userProfile.fullName.charAt(0).toUpperCase() : "U";

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitial}>{currentInitial}</Text>
            </View>
            <View style={styles.heroTextWrap}>
              <Text style={styles.heroEyebrow}>Orders</Text>
              <Text style={styles.heroTitle}>Lịch sử đơn hàng</Text>
            </View>
          </View>
          <Text style={styles.heroSubtext}>
            Theo dõi tiến độ xử lý và mở lại những đơn bạn đã đặt gần đây.
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContainer}
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tabBtn, isActive && styles.tabBtnActive]}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.88}
              >
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {loading ? (
          <ActivityIndicator size="large" color="#9B4B1F" style={{ marginTop: 80 }} />
        ) : filteredOrders.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Chưa có đơn hàng phù hợp</Text>
            <Text style={styles.emptyText}>
              Những đơn bạn đặt sẽ xuất hiện tại đây để tiện theo dõi và xử lý.
            </Text>
          </View>
        ) : (
          filteredOrders.map((order) => {
            const displayBadges = getCustomerFacingBadges(order);
            const itemCount = (order.items || []).reduce((sum, item) => sum + item.quantity, 0);
            const completed = isCompletedStatus(order.status);
            const refundRequested = hasRefundRequest(order.latestRefundRequestStatus);
            const approvedReturn = isApprovedReturn(order);
            const needsBankTransferPayment = shouldShowBankTransferPayment(order);
            const pendingReviewCount = getPendingReviewCount(order);

            return (
              <View key={order.id} style={styles.orderCard}>
                <View style={styles.orderHeader}>
                  <View>
                    <Text style={styles.orderId}>Đơn #{order.id}</Text>
                    <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
                  </View>
                  <View style={styles.badgesColumn}>
                    {displayBadges.map((badge) => (
                      <StatusPill key={badge.label} meta={badge} />
                    ))}
                  </View>
                </View>

                <OrderItemSummary items={order.items || []} />

                <View style={styles.summaryBox}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Sản phẩm</Text>
                    <Text style={styles.summaryValue}>{itemCount} món</Text>
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
                      {PAYMENT_GATEWAY_LABEL[order.paymentGateway] ||
                        order.paymentGateway ||
                        "Chưa rõ"}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Giao hàng</Text>
                    <Text style={styles.summaryValue}>
                      {DELIVERY_STATUS_LABEL[order.deliveryStatus] || "Chưa rõ"}
                    </Text>
                  </View>
                  {refundRequested ? (
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Trả hàng</Text>
                      <Text style={styles.summaryValue}>
                        {getRefundStatusLabel(order.latestRefundRequestStatus)}
                      </Text>
                    </View>
                  ) : null}
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Tổng thanh toán</Text>
                    <Text style={styles.summaryTotal}>{formatPrice(order.totalAmount)}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Giao đến</Text>
                    <Text style={styles.summaryAddress} numberOfLines={2}>
                      {order.shipping?.fullAddress || order.shippingAddress || "Chưa có địa chỉ"}
                    </Text>
                  </View>
                </View>

                {needsBankTransferPayment ? (
                  <View style={styles.paymentPendingBox}>
                    <View style={styles.paymentPendingTextWrap}>
                      <Text style={styles.paymentPendingTitle}>Chờ chuyển khoản</Text>
                      <Text style={styles.paymentPendingText}>
                        Nội dung thanh toán: ORD{order.id}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.paymentPendingBtn}
                      onPress={() => navigation.navigate("OrderTracking", { orderId: order.id })}
                      activeOpacity={0.88}
                    >
                      <Text style={styles.paymentPendingBtnText}>Thanh toán ngay</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}

                {approvedReturn ? <ApprovedReturnNotice compact /> : null}

                <View style={styles.actionsRow}>
                  {pendingReviewCount > 0 ? (
                    <TouchableOpacity
                      style={styles.reviewAction}
                      onPress={() => navigation.navigate("OrderTracking", { orderId: order.id })}
                      activeOpacity={0.88}
                    >
                      <Text style={styles.reviewActionText}>
                        Đánh giá{pendingReviewCount > 1 ? ` (${pendingReviewCount})` : ""}
                      </Text>
                    </TouchableOpacity>
                  ) : null}

                  {canChangeAddress(order) ? (
                    <TouchableOpacity
                      style={styles.secondaryAction}
                      onPress={() => openAddressChange(order.id)}
                      activeOpacity={0.88}
                    >
                      <Text style={styles.secondaryActionText}>Đổi địa chỉ</Text>
                    </TouchableOpacity>
                  ) : null}

                  {completed && isWithin7Days(order.createdAt) && !refundRequested ? (
                    <TouchableOpacity
                      style={styles.secondaryAction}
                      onPress={() =>
                        navigation.navigate("ReturnRequest", {
                          orderId: order.id,
                          orderItems: order.items || [],
                        })
                      }
                      activeOpacity={0.88}
                    >
                      <Text style={styles.secondaryActionText}>Trả hàng</Text>
                    </TouchableOpacity>
                  ) : null}

                  <TouchableOpacity
                    style={styles.primaryAction}
                    onPress={() => navigation.navigate("OrderTracking", { orderId: order.id })}
                    activeOpacity={0.88}
                  >
                    <Text style={styles.primaryActionText}>Xem chi tiết</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <AddressPickerModal
        visible={addressModalOrderId != null}
        addresses={addresses}
        loading={loadingAddresses}
        selectedAddressId={selectedAddressId}
        currentOrderAddressId={activeAddressOrder?.customerAddressId ?? null}
        submitting={submittingAddressChange}
        onClose={() => {
          setAddressModalOrderId(null);
          setSelectedAddressId(null);
          setAddressChangeQuote(null);
        }}
        currentShippingFee={Number(activeAddressOrder?.shippingFee || 0)}
        shippingQuote={addressChangeQuote}
        loadingShippingQuote={loadingAddressChangeQuote}
        onSelect={handleSelectAddressForChange}
        onConfirm={handleAddressChange}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FCF9F4",
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
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#F2E2D2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  avatarInitial: {
    color: "#9B4B1F",
    fontSize: 18,
    fontWeight: "900",
  },
  heroTextWrap: {
    flex: 1,
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
  tabsContainer: {
    paddingBottom: 8,
    gap: 10,
  },
  tabBtn: {
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 999,
    backgroundColor: "#F3ECE5",
  },
  tabBtnActive: {
    backgroundColor: "#1E1815",
  },
  tabText: {
    color: "#6D5D51",
    fontSize: 13,
    fontWeight: "700",
  },
  tabTextActive: {
    color: "#FFF8EE",
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 22,
    marginTop: 18,
  },
  emptyTitle: {
    color: "#1E1815",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 8,
  },
  emptyText: {
    color: "#76675B",
    fontSize: 14,
    lineHeight: 22,
  },
  orderCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 18,
    marginTop: 14,
  },
  orderHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  badgesColumn: {
    alignItems: "flex-end",
    gap: 8,
    flexShrink: 1,
    maxWidth: "56%",
  },
  orderId: {
    color: "#1E1815",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 4,
  },
  orderDate: {
    color: "#7A685B",
    fontSize: 12,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    alignSelf: "flex-end",
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: "800",
  },
  itemSummaryRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  itemChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F7EFE7",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  itemChipText: {
    color: "#1E1815",
    fontSize: 13,
    fontWeight: "700",
    marginRight: 6,
  },
  itemChipQty: {
    color: "#8A7B6F",
    fontSize: 12,
    fontWeight: "700",
  },
  itemMoreText: {
    color: "#7A685B",
    fontSize: 12,
    fontWeight: "700",
  },
  summaryBox: {
    backgroundColor: "#FCF9F4",
    borderRadius: 18,
    padding: 14,
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
  },
  summaryTotal: {
    color: "#9B4B1F",
    fontSize: 16,
    fontWeight: "900",
  },
  summaryAddress: {
    flex: 1,
    textAlign: "right",
    color: "#1E1815",
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "600",
  },
  paymentPendingBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderRadius: 18,
    padding: 14,
    marginTop: 12,
    backgroundColor: "#FFF8EE",
    borderWidth: 1,
    borderColor: "#E8D7C6",
  },
  paymentPendingTextWrap: {
    flex: 1,
  },
  paymentPendingTitle: {
    color: "#9B4B1F",
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 4,
  },
  paymentPendingText: {
    color: "#6D5D51",
    fontSize: 12,
    fontWeight: "700",
  },
  paymentPendingBtn: {
    borderRadius: 14,
    paddingHorizontal: 13,
    paddingVertical: 10,
    backgroundColor: "#1E1815",
  },
  paymentPendingBtnText: {
    color: "#FFFDF9",
    fontSize: 12,
    fontWeight: "900",
  },
  approvedReturnNotice: {
    borderRadius: 18,
    padding: 14,
    marginTop: 12,
    backgroundColor: "#EAF7F3",
    borderWidth: 1,
    borderColor: "#B8DED2",
  },
  approvedReturnNoticeCompact: {
    marginBottom: 0,
  },
  approvedReturnTitle: {
    color: "#1B6F5B",
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 5,
  },
  approvedReturnText: {
    color: "#3F6F62",
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "700",
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 14,
    flexWrap: "wrap",
  },
  secondaryAction: {
    borderWidth: 1,
    borderColor: "#D9C7B7",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 11,
    backgroundColor: "#FCF9F4",
  },
  secondaryActionText: {
    color: "#65574C",
    fontSize: 13,
    fontWeight: "700",
  },
  reviewAction: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 11,
    backgroundColor: "#FFF2D8",
    borderWidth: 1,
    borderColor: "#E6B06D",
  },
  reviewActionText: {
    color: "#9B4B1F",
    fontSize: 13,
    fontWeight: "900",
  },
  primaryAction: {
    backgroundColor: "#1E1815",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  primaryActionText: {
    color: "#FFFDF9",
    fontSize: 13,
    fontWeight: "800",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(24, 18, 14, 0.32)",
  },
  modalSheet: {
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
    marginBottom: 12,
  },
  modalTitle: {
    color: "#1E1815",
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 16,
  },
  modalScroll: {
    maxHeight: "65%",
  },
  modalScrollContent: {
    paddingBottom: 8,
  },
  modalEmptyCard: {
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EDE0D3",
    padding: 16,
  },
  modalEmptyTitle: {
    color: "#1E1815",
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 6,
  },
  modalEmptyText: {
    color: "#76675B",
    fontSize: 14,
    lineHeight: 22,
  },
  modalOption: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EDE0D3",
    marginBottom: 10,
  },
  modalOptionSelected: {
    borderColor: "#D69A65",
    backgroundColor: "#F5ECE3",
  },
  modalOptionDisabled: {
    opacity: 0.55,
  },
  modalOptionLabel: {
    color: "#8A6548",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 8,
  },
  modalOptionText: {
    color: "#1E1815",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 3,
  },
  modalOptionSub: {
    color: "#54483E",
    fontSize: 13,
    lineHeight: 20,
  },
  modalOptionCheck: {
    color: "#9B4B1F",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 8,
  },
  modalOptionCurrent: {
    color: "#65574C",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 8,
  },
  shippingPreviewCard: {
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EDE0D3",
    padding: 14,
    marginTop: 8,
  },
  shippingPreviewTitle: {
    color: "#1E1815",
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 8,
  },
  shippingPreviewRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  shippingPreviewLabel: {
    color: "#6D5D51",
    fontSize: 13,
  },
  shippingPreviewValue: {
    color: "#1E1815",
    fontSize: 13,
    fontWeight: "800",
  },
  shippingPreviewDeltaRow: {
    borderTopWidth: 1,
    borderTopColor: "#F0E5D8",
    marginTop: 4,
    paddingTop: 10,
  },
  shippingPreviewTotalRow: {
    borderTopWidth: 1,
    borderTopColor: "#F0E5D8",
    marginTop: 4,
    paddingTop: 10,
  },
  shippingPreviewDeltaLabel: {
    color: "#1E1815",
    fontSize: 14,
    fontWeight: "800",
  },
  shippingPreviewDeltaValue: {
    color: "#1E1815",
    fontSize: 15,
    fontWeight: "900",
  },
  shippingPreviewDeltaIncrease: {
    color: "#B66A1E",
  },
  shippingPreviewDeltaDecrease: {
    color: "#1C7C54",
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  modalSecondaryBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    backgroundColor: "#EFE3D6",
  },
  modalSecondaryBtnText: {
    color: "#65574C",
    fontSize: 14,
    fontWeight: "800",
  },
  modalCloseBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    backgroundColor: "#1E1815",
  },
  modalCloseBtnDisabled: {
    backgroundColor: "#D8CCC1",
  },
  modalCloseBtnText: {
    color: "#FFFDF9",
    fontSize: 14,
    fontWeight: "800",
  },
});

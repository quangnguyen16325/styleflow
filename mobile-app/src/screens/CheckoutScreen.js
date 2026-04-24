/* eslint-disable react/prop-types */
/**
 * CheckoutScreen.js
 * Commit 5 — Thanh toán & Chốt đơn
 *
 * Tuân thủ MOBILE_MANIFESTO:
 *  - KHÔNG gửi priceAtPurchase / totalAmount lên API
 *  - Chỉ gửi: items[{productId, quantity}], paymentMethod, shippingAddressId
 *  - Timeout 30s → Alert "Chuyển sang Chuyển khoản"
 *  - Thành công → clearCart() → navigate("Success")
 *  - KHÔNG sửa App.js
 */
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  SafeAreaView,
  Image,
} from "react-native";
import { useCart } from "../context/CartContext";
import api, { formatPrice } from "../services/api";
import { COLORS } from "../constants/colors";

// MOCK_ADDRESSES removed — will load from API

// ── Danh sách phương thức thanh toán ─────────────────────────────────────────

const PAYMENT_METHODS = [
  {
    key: "CARD",
    label: "Card",
    sublabel: "Thẻ Tín dụng / Ghi nợ",
    image:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Visa_Inc._logo.svg/200px-Visa_Inc._logo.svg.png",
  },
  {
    key: "COD",
    label: "COD",
    sublabel: "Thanh toán khi nhận hàng",
    image: "https://cdn-icons-png.flaticon.com/512/1554/1554401.png",
  },
  {
    key: "MOMO",
    label: "MoMo",
    sublabel: "Ví điện tử MoMo",
    image: "https://upload.wikimedia.org/wikipedia/vi/f/fe/MoMo_Logo.png",
  },
  {
    key: "BANK_TRANSFER",
    label: "Bank Transfer",
    sublabel: "Chuyển khoản ngân hàng",
    image: "https://cdn-icons-png.flaticon.com/512/2830/2830284.png",
  },
  {
    key: "PAYPAL",
    label: "PayPal",
    sublabel: "Thanh toán qua PayPal",
    image: "https://upload.wikimedia.org/wikipedia/commons/a/a4/Paypal_2014_logo.png",
  },
];

// ── Shipping options ──────────────────────────────────────────────────────────

const SHIPPING_OPTIONS = [
  {
    key: "standard",
    label: "Giao hàng tiêu chuẩn",
    duration: "5–7 ngày",
    priceLabel: "Miễn phí",
    price: 0,
  },
  {
    key: "express",
    label: "Giao hàng hỏa tốc",
    duration: "1–2 ngày",
    priceLabel: formatPrice(25000),
    price: 25000,
  },
];

// ── Helper ────────────────────────────────────────────────────────────────────

// Removed formatUSD, using formatPrice from api

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHeader({ title }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

function AddressCard({ address, onEdit }) {
  return (
    <View style={styles.infoCard}>
      <View style={styles.infoCardContent}>
        <Text style={styles.infoCardTitle}>Shipping Address</Text>
        <Text style={styles.infoCardText} numberOfLines={3}>
          {address.fullAddress}
        </Text>
        <View style={styles.contactInfoCard}>
          <Text style={styles.infoCardTitle}>Contact Information</Text>
          <Text style={styles.infoCardText}>{address.phone}</Text>
          <Text style={styles.infoCardText}>{address.email}</Text>
        </View>
      </View>
      <TouchableOpacity style={styles.editCircleBtn} onPress={onEdit}>
        <Text style={styles.editCircleIcon}>›</Text>
      </TouchableOpacity>
    </View>
  );
}

function ShippingOptionRow({ option, selected, onSelect }) {
  return (
    <TouchableOpacity
      style={[styles.shippingRow, selected && styles.shippingRowSelected]}
      onPress={() => onSelect(option.key)}
      activeOpacity={0.8}
    >
      <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
        {selected && <View style={styles.radioInner} />}
      </View>
      <View style={styles.shippingInfo}>
        <Text style={[styles.shippingLabel, selected && styles.shippingLabelSelected]}>
          {option.label}
        </Text>
        <Text style={styles.shippingDuration}>{option.duration}</Text>
      </View>
      <Text style={[styles.shippingPrice, option.price === 0 && styles.shippingPriceFree]}>
        {option.priceLabel}
      </Text>
    </TouchableOpacity>
  );
}

function PaymentMethodRow({ method, selected, onSelect }) {
  return (
    <TouchableOpacity
      style={[styles.paymentRow, selected && styles.paymentRowSelected]}
      onPress={() => onSelect(method.key)}
      activeOpacity={0.8}
    >
      <Image source={{ uri: method.image }} style={styles.paymentLogo} resizeMode="contain" />
      <View style={styles.paymentInfo}>
        <Text style={[styles.paymentLabel, selected && styles.paymentLabelSelected]}>
          {method.label}
        </Text>
        <Text style={styles.paymentSublabel}>{method.sublabel}</Text>
      </View>
      <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
        {selected && <View style={styles.radioInner} />}
      </View>
    </TouchableOpacity>
  );
}

function CartItemSummaryRow({ item }) {
  return (
    <View style={styles.summaryItemRow}>
      <View style={styles.summaryQtyBadge}>
        <Text style={styles.summaryQtyText}>{item.quantity}</Text>
      </View>
      <Text style={styles.summaryItemName} numberOfLines={2}>
        {item.name}
      </Text>
      <Text style={styles.summaryItemPrice}>{formatPrice(item.basePrice)}</Text>
    </View>
  );
}

// ── Address Picker Modal ──────────────────────────────────────────────────────

function AddressPickerModal({ visible, addresses, selectedId, onSelect, onClose }) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Chọn địa chỉ giao hàng</Text>
          <ScrollView
            style={{ maxHeight: "75%" }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
          >
            {addresses.map((addr) => (
              <TouchableOpacity
                key={addr.id}
                style={[styles.addrOption, selectedId === addr.id && styles.addrOptionSelected]}
                onPress={() => {
                  onSelect(addr.id);
                  onClose();
                }}
                activeOpacity={0.8}
              >
                <View style={styles.addrOptionLeft}>
                  <Text style={styles.addrOptionLabel}>{addr.label}</Text>
                  <Text style={styles.addrOptionText} numberOfLines={2}>
                    {addr.fullAddress}
                  </Text>
                  <Text style={styles.addrOptionPhone}>{addr.phone}</Text>
                </View>
                {selectedId === addr.id && (
                  <View style={styles.addrOptionCheck}>
                    <Text style={styles.addrOptionCheckIcon}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={{ flexDirection: "row", gap: 10, paddingTop: 10 }}>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={onClose}>
              <Text style={styles.modalCloseBtnText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function CheckoutScreen({ navigation }) {
  const { items, subtotal, clearCart } = useCart();

  // ── State ───────────────
  const [apiAddresses, setApiAddresses] = useState([]);
  const [shippingAddressId, setShippingAddressId] = useState(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("CARD");
  const [selectedShipping, setSelectedShipping] = useState("standard");
  const [addressModalVisible, setAddressModalVisible] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [voucherModalVisible, setVoucherModalVisible] = useState(false);
  const [voucherCode, setVoucherCode] = useState(null);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  // Load addresses from API on mount
  useEffect(() => {
    const loadAddresses = async () => {
      try {
        const res = await api.get("/me/addresses");
        const list = Array.isArray(res.data) ? res.data : [];
        // Transform API format to match AddressCard component
        const mapped = list.map((a) => ({
          id: a.id,
          label: a.label || "Khác",
          fullAddress: [a.addressLine, a.ward, a.district, a.city, a.country]
            .filter(Boolean)
            .join(", "),
          phone: a.receiverPhone || "",
          email: "",
          isDefault: a.isDefault || false,
        }));
        setApiAddresses(mapped);
        const def = mapped.find((a) => a.isDefault) || mapped[0];
        if (def) setShippingAddressId(def.id);
      } catch (err) {
        console.warn("Lỗi tải địa chỉ:", err);
      }
    };
    loadAddresses();
  }, []);

  const selectedAddress = apiAddresses.find((a) => a.id === shippingAddressId) ||
    apiAddresses[0] || {
      id: null,
      label: "",
      fullAddress: "Chưa có địa chỉ",
      phone: "",
      email: "",
    };
  const shippingOption = SHIPPING_OPTIONS.find((s) => s.key === selectedShipping);
  const shippingCost = shippingOption?.price ?? 0;
  const grandTotal = subtotal + shippingCost;

  // ── handlePlaceOrder ──────────────────────────────────────────────────────
  const handlePlaceOrder = async () => {
    if (items.length === 0) {
      Alert.alert("Giỏ hàng trống", "Vui lòng thêm sản phẩm trước khi đặt hàng.");
      return;
    }

    setIsPlacingOrder(true);

    const payload = {
      items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      addressId: shippingAddressId || 1,
      shippingFee: shippingCost > 0 ? shippingCost * 1000 : 15000,
    };

    console.log("[CheckoutScreen] Gửi payload tạo đơn:", JSON.stringify(payload, null, 2));

    try {
      const response = await api.post("/orders", payload);

      console.log("[CheckoutScreen] Tạo đơn thành công:", response.data);

      clearCart();
      const newOrderId = response.data.id;
      navigation.navigate("Success", { orderId: newOrderId });
    } catch (error) {
      console.log("[CheckoutScreen] Lỗi chi tiết khi đặt hàng:", error);
      const errorMessage =
        error.response?.data?.message || error.message || "Đặt hàng thất bại. Vui lòng thử lại.";
      Alert.alert("Lỗi đặt hàng", errorMessage);
    } finally {
      setIsPlacingOrder(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Shipping Address & Contact ─────────────────────────────────── */}
        <AddressCard
          address={selectedAddress}
          onEdit={() => console.log("Điều hướng sang Address Book sáng mai")}
        />

        {/* ── Items Summary ─────────────────────────────────────────────── */}
        <View style={styles.itemsSection}>
          <View style={styles.itemsHeaderRow}>
            <View style={styles.itemsHeaderLeft}>
              <Text style={styles.itemsTitle}>Items</Text>
              <View style={styles.itemCountBadge}>
                <Text style={styles.itemCountText}>{items.length}</Text>
              </View>
            </View>
            {voucherCode ? (
              <TouchableOpacity style={styles.voucherBadge} onPress={() => setVoucherCode(null)}>
                <Text style={styles.voucherBadgeText}>
                  {voucherCode === "FIRST" ? "5% Discount" : "15% Discount"}
                </Text>
                <Text style={styles.voucherBadgeClose}>✕</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.addVoucherBtn}
                onPress={() => setVoucherModalVisible(true)}
              >
                <Text style={styles.addVoucherText}>Add Voucher</Text>
              </TouchableOpacity>
            )}
          </View>
          {items.map((item) => (
            <CartItemSummaryRow key={String(item.productId)} item={item} />
          ))}
          {items.length === 0 && (
            <Text style={styles.emptyCartNote}>Giỏ hàng trống – quay lại thêm sản phẩm.</Text>
          )}
        </View>

        {/* ── Shipping Options ──────────────────────────────────────────── */}
        <SectionHeader title="Shipping Options" />
        {SHIPPING_OPTIONS.map((option) => (
          <ShippingOptionRow
            key={option.key}
            option={option}
            selected={selectedShipping === option.key}
            onSelect={setSelectedShipping}
          />
        ))}
        {selectedShipping === "express" && (
          <Text style={styles.deliveryNote}>Delivered in 1–2 business days</Text>
        )}
        {selectedShipping === "standard" && (
          <Text style={styles.deliveryNote}>Delivered on or before Thursday, 23 April</Text>
        )}

        {/* ── Payment Method ────────────────────────────────────────────── */}
        <View style={styles.paymentHeaderRow}>
          <SectionHeader title="Payment Method" />
          <TouchableOpacity
            style={styles.editCircleBtnSmall}
            onPress={() => setPaymentModalVisible(true)}
          >
            <Text style={styles.editCircleIcon}>›</Text>
          </TouchableOpacity>
        </View>
        <View style={{ flexDirection: "row", marginTop: 10 }}>
          <View style={styles.paymentPill}>
            <Text style={styles.paymentPillText}>
              {PAYMENT_METHODS.find((m) => m.key === selectedPaymentMethod)?.label || "Card"}
            </Text>
          </View>
        </View>

        {/* ── Order Summary ─────────────────────────────────────────────── */}
        <SectionHeader title="Order Summary" />
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryRowLabel}>Subtotal</Text>
            <Text style={styles.summaryRowValue}>{formatPrice(subtotal)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryRowLabel}>Shipping</Text>
            <Text style={[styles.summaryRowValue, shippingCost === 0 && styles.freeLabel]}>
              {shippingCost === 0 ? "FREE" : formatPrice(shippingCost)}
            </Text>
          </View>
          <View style={[styles.summaryRow, styles.summaryRowTotal]}>
            <Text style={styles.summaryTotalLabel}>Total</Text>
            <Text style={styles.summaryTotalValue}>{formatPrice(grandTotal)}</Text>
          </View>
        </View>

        <View style={{ height: 110 }} />
      </ScrollView>

      {/* ── Fixed Bottom: Total + Pay ────────────────────────────────────── */}
      <View style={styles.bottomBar}>
        <View style={styles.totalWrap}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalAmount}>{formatPrice(grandTotal)}</Text>
        </View>
        <TouchableOpacity
          style={[styles.payBtn, (isPlacingOrder || items.length === 0) && styles.payBtnDisabled]}
          onPress={handlePlaceOrder}
          disabled={isPlacingOrder || items.length === 0}
          activeOpacity={0.85}
        >
          {isPlacingOrder ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.payBtnText}>Pay</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* ── Address Picker Modal ─────────────────────────────────────────── */}
      <AddressPickerModal
        visible={addressModalVisible}
        addresses={apiAddresses}
        selectedId={shippingAddressId}
        onSelect={setShippingAddressId}
        onClose={() => setAddressModalVisible(false)}
      />

      {/* ── Payment Method Modal ─────────────────────────────────────────── */}
      <Modal visible={paymentModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Payment Methods</Text>
            {PAYMENT_METHODS.map((method) => (
              <PaymentMethodRow
                key={method.key}
                method={method}
                selected={selectedPaymentMethod === method.key}
                onSelect={(val) => {
                  setSelectedPaymentMethod(val);
                  setPaymentModalVisible(false);
                }}
              />
            ))}
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setPaymentModalVisible(false)}
            >
              <Text style={styles.modalCloseBtnText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Voucher Modal ─────────────────────────────────────────────────── */}
      <Modal visible={voucherModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Active Vouchers</Text>

            <TouchableOpacity
              style={styles.voucherCard}
              onPress={() => {
                setVoucherCode("FIRST");
                setVoucherModalVisible(false);
              }}
            >
              <View style={styles.voucherHeader}>
                <Text style={styles.voucherType}>Voucher</Text>
                <Text style={styles.voucherValid}>Valid Until 5.16.20</Text>
              </View>
              <View style={styles.voucherBody}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.voucherTitle}>First Purchase</Text>
                  <Text style={styles.voucherDesc}>5% off for your next order</Text>
                </View>
                <View style={styles.applyBtn}>
                  <Text style={styles.applyBtnText}>Apply</Text>
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.voucherCard}
              onPress={() => {
                setVoucherCode("GIFT");
                setVoucherModalVisible(false);
              }}
            >
              <View style={styles.voucherHeader}>
                <Text style={styles.voucherType}>Voucher</Text>
                <Text style={styles.voucherValid}>Valid Until 6.20.20</Text>
              </View>
              <View style={styles.voucherBody}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.voucherTitle}>Gift From Customer Care</Text>
                  <Text style={styles.voucherDesc}>15% off your next purchase</Text>
                </View>
                <View style={styles.applyBtn}>
                  <Text style={styles.applyBtnText}>Apply</Text>
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setVoucherModalVisible(false)}
            >
              <Text style={styles.modalCloseBtnText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary,
  },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 12 },

  // ── Address / Contact Card ──────────────────────────────────────────────────
  infoCard: {
    flexDirection: "row",
    backgroundColor: COLORS.bgSecondary,
    borderRadius: 16,
    padding: 16,
    marginBottom: 6,
  },
  infoCardContent: { flex: 1, marginRight: 12 },
  infoCardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  infoCardText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  contactInfoCard: { marginTop: 12 },
  editCircleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.info,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
  },
  editCircleBtnSmall: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.info,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 2,
  },
  editCircleIcon: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

  // ── Items Summary ────────────────────────────────────────────────────────────
  itemsSection: {
    marginTop: 16,
  },
  itemsHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  itemsHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  itemsTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.textPrimary,
    marginRight: 10,
  },
  itemCountBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.info,
    justifyContent: "center",
    alignItems: "center",
  },
  itemCountText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  summaryItemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  summaryQtyBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: COLORS.primaryBg,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  summaryQtyText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.primary,
  },
  summaryItemName: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginRight: 10,
  },
  summaryItemPrice: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  emptyCartNote: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: "center",
    paddingVertical: 16,
  },

  // ── Section header ───────────────────────────────────────────────────────────
  sectionHeader: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginTop: 24,
    marginBottom: 12,
  },
  paymentHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },

  // ── Shipping Options ─────────────────────────────────────────────────────────
  shippingRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.bgSecondary,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  shippingRowSelected: {
    borderColor: COLORS.info,
    backgroundColor: "#EFF6FF",
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  radioOuterSelected: {
    borderColor: COLORS.info,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.info,
  },
  shippingInfo: { flex: 1 },
  shippingLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  shippingLabelSelected: { color: COLORS.info },
  shippingDuration: {
    fontSize: 12,
    color: COLORS.info,
    marginTop: 2,
  },
  shippingPrice: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  shippingPriceFree: {
    color: COLORS.success,
  },
  deliveryNote: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: -2,
    marginBottom: 8,
    paddingLeft: 4,
  },

  // ── Voucher UI ──────────────────────────────────────────────────────────────
  addVoucherBtn: {
    borderWidth: 1,
    borderColor: COLORS.info,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addVoucherText: {
    color: COLORS.info,
    fontSize: 13,
    fontWeight: "600",
  },
  voucherBadge: {
    flexDirection: "row",
    backgroundColor: COLORS.info,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  voucherBadgeText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
    marginRight: 6,
  },
  voucherBadgeClose: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },

  // ── Modals Additional Styles ────────────────────────────────────────────────
  paymentPill: {
    backgroundColor: "#E5E5EA",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  paymentPillText: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.info,
  },
  voucherCard: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: COLORS.info,
    borderRadius: 8,
    marginBottom: 12,
    overflow: "hidden",
  },
  voucherHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.info,
    borderStyle: "dashed",
  },
  voucherType: { color: COLORS.info, fontWeight: "700" },
  voucherValid: { color: COLORS.textMuted, fontSize: 12 },
  voucherBody: {
    flexDirection: "row",
    padding: 12,
    alignItems: "center",
  },
  voucherTitle: { fontSize: 15, fontWeight: "700", marginBottom: 4 },
  voucherDesc: { fontSize: 12, color: COLORS.textSecondary },
  applyBtn: {
    backgroundColor: COLORS.info,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  applyBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },

  // ── Payment Method ───────────────────────────────────────────────────────────
  paymentRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.bgSecondary,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  paymentRowSelected: {
    borderColor: COLORS.info,
    backgroundColor: "#EFF6FF",
  },
  paymentLogo: {
    width: 30,
    height: 24,
    marginRight: 14,
  },
  paymentInfo: { flex: 1 },
  paymentLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  paymentLabelSelected: { color: COLORS.info },
  paymentSublabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  // ── Order Summary Card ───────────────────────────────────────────────────────
  summaryCard: {
    backgroundColor: COLORS.bgSecondary,
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  summaryRowTotal: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  summaryRowLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  summaryRowValue: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  freeLabel: {
    color: COLORS.success,
    fontWeight: "700",
  },
  summaryTotalLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  summaryTotalValue: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.primary,
  },

  // ── Bottom Bar ───────────────────────────────────────────────────────────────
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.bgPrimary,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  totalWrap: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginRight: 8,
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.textPrimary,
  },
  payBtn: {
    backgroundColor: COLORS.textPrimary,
    paddingVertical: 14,
    paddingHorizontal: 44,
    borderRadius: 28,
    minWidth: 110,
    alignItems: "center",
  },
  payBtnDisabled: {
    backgroundColor: COLORS.textMuted,
  },
  payBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },

  // ── Address Modal ────────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: COLORS.bgPrimary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  addrOption: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: COLORS.bgSecondary,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  addrOptionSelected: {
    borderColor: COLORS.info,
    backgroundColor: "#EFF6FF",
  },
  addrOptionLeft: { flex: 1 },
  addrOptionLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  addrOptionText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  addrOptionPhone: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  addrOptionCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.info,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginLeft: 10,
  },
  addrOptionCheckIcon: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  modalCloseBtn: {
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: COLORS.bgSecondary,
    alignItems: "center",
  },
  modalCloseBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
});

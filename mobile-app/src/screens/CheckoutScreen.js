/* eslint-disable react/prop-types */
import React, { useCallback, useMemo, useState } from "react";
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
import { useFocusEffect } from "@react-navigation/native";
import { useCart } from "../context/CartContext";
import api, { createOrder, formatPrice } from "../services/api";

const SHIPPING_OPTIONS = [
  {
    key: "standard",
    label: "Giao tiêu chuẩn",
    note: "Phù hợp đơn thông thường",
    price: 15000,
  },
  {
    key: "express",
    label: "Giao nhanh",
    note: "Ưu tiên xử lý sớm hơn",
    price: 25000,
  },
];

const PLACEHOLDER_IMAGE =
  "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=400&auto=format&fit=crop";

function AddressPickerModal({ visible, addresses, selectedId, onSelect, onClose, onAddAddress }) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Chọn địa chỉ giao hàng</Text>

          <ScrollView
            style={styles.modalScroll}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.modalScrollContent}
          >
            {addresses.length === 0 ? (
              <View style={styles.modalEmptyState}>
                <Text style={styles.modalEmptyTitle}>Bạn chưa có địa chỉ nào</Text>
                <Text style={styles.modalEmptyText}>
                  Thêm địa chỉ để backend có thể tạo đơn hàng đúng theo thông tin giao nhận.
                </Text>
              </View>
            ) : (
              addresses.map((addr) => (
                <TouchableOpacity
                  key={addr.id}
                  style={[styles.addrOption, selectedId === addr.id && styles.addrOptionSelected]}
                  onPress={() => {
                    onSelect(addr.id);
                    onClose();
                  }}
                  activeOpacity={0.85}
                >
                  <View style={styles.addrOptionLeft}>
                    <View style={styles.addrOptionTop}>
                      <Text style={styles.addrOptionLabel}>{addr.label}</Text>
                      {addr.isDefault ? (
                        <View style={styles.addrDefaultBadge}>
                          <Text style={styles.addrDefaultBadgeText}>Mặc định</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.addrOptionReceiver}>{addr.receiverName}</Text>
                    <Text style={styles.addrOptionPhone}>{addr.receiverPhone}</Text>
                    <Text style={styles.addrOptionText} numberOfLines={3}>
                      {addr.fullAddress}
                    </Text>
                  </View>
                  {selectedId === addr.id ? (
                    <View style={styles.addrOptionCheck}>
                      <Text style={styles.addrOptionCheckIcon}>✓</Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
              ))
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.modalSecondaryBtn} onPress={onAddAddress}>
              <Text style={styles.modalSecondaryBtnText}>Thêm địa chỉ</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalPrimaryBtn} onPress={onClose}>
              <Text style={styles.modalPrimaryBtnText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function ShippingOptionRow({ option, selected, onSelect }) {
  return (
    <TouchableOpacity
      style={[styles.shippingRow, selected && styles.shippingRowSelected]}
      onPress={() => onSelect(option.key)}
      activeOpacity={0.88}
    >
      <View style={styles.shippingInfo}>
        <Text style={[styles.shippingLabel, selected && styles.shippingLabelSelected]}>
          {option.label}
        </Text>
        <Text style={styles.shippingNote}>{option.note}</Text>
      </View>
      <Text style={styles.shippingPrice}>{formatPrice(option.price)}</Text>
    </TouchableOpacity>
  );
}

function CheckoutItemRow({ item }) {
  return (
    <View style={styles.itemRow}>
      <Image source={{ uri: item.image || PLACEHOLDER_IMAGE }} style={styles.itemImage} />
      <View style={styles.itemInfo}>
        <Text style={styles.itemName} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={styles.itemMeta}>SL {item.quantity}</Text>
      </View>
      <Text style={styles.itemPrice}>{formatPrice(item.basePrice * item.quantity)}</Text>
    </View>
  );
}

export default function CheckoutScreen({ navigation }) {
  const { items, subtotal, clearCart } = useCart();
  const [apiAddresses, setApiAddresses] = useState([]);
  const [shippingAddressId, setShippingAddressId] = useState(null);
  const [selectedShipping, setSelectedShipping] = useState("standard");
  const [addressModalVisible, setAddressModalVisible] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [loadingAddresses, setLoadingAddresses] = useState(true);

  const loadAddresses = useCallback(async () => {
    try {
      setLoadingAddresses(true);
      const res = await api.get("/me/addresses");
      const list = Array.isArray(res.data) ? res.data : [];
      const mapped = list.map((address) => ({
        id: address.id,
        label:
          address.label === "home"
            ? "Nhà"
            : address.label === "office"
              ? "Văn phòng"
              : address.label || "Khác",
        receiverName: address.receiverName || "",
        receiverPhone: address.receiverPhone || "",
        fullAddress: [
          address.addressLine,
          address.ward,
          address.district,
          address.city,
          address.country,
        ]
          .filter(Boolean)
          .join(", "),
        isDefault: address.isDefault || false,
      }));
      setApiAddresses(mapped);

      if (mapped.length === 0) {
        setShippingAddressId(null);
        return;
      }

      setShippingAddressId((current) => {
        if (current && mapped.some((address) => address.id === current)) {
          return current;
        }
        return mapped.find((address) => address.isDefault)?.id || mapped[0].id;
      });
    } catch (err) {
      console.warn("Lỗi tải địa chỉ:", err);
    } finally {
      setLoadingAddresses(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAddresses();
    }, [loadAddresses]),
  );

  const selectedAddress = useMemo(
    () => apiAddresses.find((address) => address.id === shippingAddressId) || null,
    [apiAddresses, shippingAddressId],
  );

  const shippingOption = SHIPPING_OPTIONS.find((option) => option.key === selectedShipping);
  const shippingCost = shippingOption?.price ?? 0;
  const totalAmount = subtotal + shippingCost;

  const handlePlaceOrder = async () => {
    if (items.length === 0) {
      Alert.alert("Giỏ hàng trống", "Vui lòng thêm sản phẩm trước khi đặt hàng.");
      return;
    }

    if (!shippingAddressId) {
      Alert.alert("Thiếu địa chỉ", "Vui lòng chọn địa chỉ giao hàng trước khi đặt hàng.");
      return;
    }

    setIsPlacingOrder(true);
    const payload = {
      items: items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
      addressId: shippingAddressId,
      shippingFee: shippingCost,
    };

    try {
      const order = await createOrder(payload);
      clearCart();
      navigation.navigate("Success", { orderId: order.id });
    } catch (error) {
      const errorMessage =
        error.response?.data?.error?.message ||
        error.message ||
        "Đặt hàng thất bại. Vui lòng thử lại.";
      Alert.alert("Lỗi đặt hàng", errorMessage);
    } finally {
      setIsPlacingOrder(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <Text style={styles.heroEyebrow}>Checkout</Text>
          <Text style={styles.heroTitle}>Xác nhận đơn hàng</Text>
          <Text style={styles.heroText}>
            Màn này đang bám đúng backend hiện tại: backend tạo đơn từ danh sách sản phẩm, địa chỉ
            giao hàng và phí ship gửi lên.
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Địa chỉ giao hàng</Text>
            <TouchableOpacity onPress={() => setAddressModalVisible(true)}>
              <Text style={styles.sectionAction}>Đổi địa chỉ</Text>
            </TouchableOpacity>
          </View>

          {loadingAddresses ? (
            <ActivityIndicator color="#9B4B1F" style={{ marginVertical: 16 }} />
          ) : selectedAddress ? (
            <View style={styles.addressCard}>
              <View style={styles.addressTopRow}>
                <Text style={styles.addressLabel}>{selectedAddress.label}</Text>
                {selectedAddress.isDefault ? (
                  <View style={styles.defaultBadge}>
                    <Text style={styles.defaultBadgeText}>Mặc định</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.addressReceiver}>{selectedAddress.receiverName}</Text>
              <Text style={styles.addressPhone}>{selectedAddress.receiverPhone}</Text>
              <Text style={styles.addressText}>{selectedAddress.fullAddress}</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.emptyAddressCard}
              onPress={() => navigation.navigate("AddressForm", { mode: "add" })}
            >
              <Text style={styles.emptyAddressTitle}>Bạn chưa có địa chỉ giao hàng</Text>
              <Text style={styles.emptyAddressText}>
                Thêm địa chỉ trước khi đặt hàng để backend lưu đúng snapshot giao nhận.
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Sản phẩm trong đơn</Text>
          {items.length > 0 ? (
            items.map((item) => <CheckoutItemRow key={String(item.productId)} item={item} />)
          ) : (
            <Text style={styles.emptyStateText}>Giỏ hàng đang trống.</Text>
          )}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Phí vận chuyển</Text>
          {SHIPPING_OPTIONS.map((option) => (
            <ShippingOptionRow
              key={option.key}
              option={option}
              selected={selectedShipping === option.key}
              onSelect={setSelectedShipping}
            />
          ))}
          <Text style={styles.shippingHelper}>
            Backend hiện nhận `shippingFee` trực tiếp từ client khi tạo order, nên số tiền hiển thị
            ở đây là số tiền sẽ được gửi lên API.
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Tóm tắt thanh toán</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tiền hàng</Text>
            <Text style={styles.summaryValue}>{formatPrice(subtotal)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Phí vận chuyển</Text>
            <Text style={styles.summaryValue}>{formatPrice(shippingCost)}</Text>
          </View>
          <View style={[styles.summaryRow, styles.summaryTotalRow]}>
            <Text style={styles.summaryTotalLabel}>Tổng cộng</Text>
            <Text style={styles.summaryTotalValue}>{formatPrice(totalAmount)}</Text>
          </View>
        </View>

        <View style={styles.backendNoteCard}>
          <Text style={styles.backendNoteTitle}>Lưu ý backend</Text>
          <Text style={styles.backendNoteText}>
            Hiện backend chưa xử lý voucher, phương thức thanh toán hay ghi chú giao hàng trong
            `POST /orders`. Vì vậy màn thanh toán này chỉ hiển thị và gửi những gì backend thật sự
            dùng.
          </Text>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <View>
          <Text style={styles.bottomLabel}>Tổng thanh toán</Text>
          <Text style={styles.bottomTotal}>{formatPrice(totalAmount)}</Text>
        </View>
        <TouchableOpacity
          style={[
            styles.placeOrderBtn,
            (isPlacingOrder || items.length === 0) && styles.disabledBtn,
          ]}
          onPress={handlePlaceOrder}
          disabled={isPlacingOrder || items.length === 0}
          activeOpacity={0.88}
        >
          {isPlacingOrder ? (
            <ActivityIndicator color="#FFFDF9" size="small" />
          ) : (
            <Text style={styles.placeOrderText}>Đặt hàng</Text>
          )}
        </TouchableOpacity>
      </View>

      <AddressPickerModal
        visible={addressModalVisible}
        addresses={apiAddresses}
        selectedId={shippingAddressId}
        onSelect={setShippingAddressId}
        onClose={() => setAddressModalVisible(false)}
        onAddAddress={() => {
          setAddressModalVisible(false);
          navigation.navigate("AddressForm", { mode: "add" });
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FCF9F4",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  heroCard: {
    padding: 20,
    borderRadius: 24,
    backgroundColor: "#1E1815",
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
    fontSize: 26,
    lineHeight: 32,
    fontWeight: "900",
    marginBottom: 10,
  },
  heroText: {
    color: "rgba(255,248,238,0.76)",
    fontSize: 14,
    lineHeight: 22,
  },
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#1E1815",
  },
  sectionAction: {
    color: "#9B4B1F",
    fontSize: 13,
    fontWeight: "700",
  },
  addressCard: {
    borderRadius: 18,
    backgroundColor: "#F7EFE7",
    padding: 14,
  },
  addressTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  addressLabel: {
    color: "#8A6548",
    fontSize: 12,
    fontWeight: "700",
  },
  defaultBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#1E1815",
  },
  defaultBadgeText: {
    color: "#FFF8EE",
    fontSize: 11,
    fontWeight: "800",
  },
  addressReceiver: {
    color: "#1E1815",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 3,
  },
  addressPhone: {
    color: "#7C6B5F",
    fontSize: 13,
    marginBottom: 8,
  },
  addressText: {
    color: "#54483E",
    fontSize: 14,
    lineHeight: 21,
  },
  emptyAddressCard: {
    borderRadius: 18,
    backgroundColor: "#F7EFE7",
    padding: 16,
  },
  emptyAddressTitle: {
    color: "#1E1815",
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 6,
  },
  emptyAddressText: {
    color: "#76675B",
    fontSize: 14,
    lineHeight: 22,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F0E5D8",
  },
  itemImage: {
    width: 62,
    height: 74,
    borderRadius: 14,
    backgroundColor: "#EFE8E0",
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
    marginRight: 10,
  },
  itemName: {
    color: "#241A13",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
    marginBottom: 4,
  },
  itemMeta: {
    color: "#8A7B6F",
    fontSize: 12,
  },
  itemPrice: {
    color: "#9B4B1F",
    fontSize: 15,
    fontWeight: "800",
  },
  shippingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    backgroundColor: "#FCF9F4",
    borderWidth: 1,
    borderColor: "#E6DBCE",
  },
  shippingRowSelected: {
    backgroundColor: "#F5ECE3",
    borderColor: "#D69A65",
  },
  shippingInfo: {
    flex: 1,
    marginRight: 14,
  },
  shippingLabel: {
    color: "#1E1815",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 2,
  },
  shippingLabelSelected: {
    color: "#9B4B1F",
  },
  shippingNote: {
    color: "#7A685B",
    fontSize: 12,
  },
  shippingPrice: {
    color: "#9B4B1F",
    fontSize: 15,
    fontWeight: "800",
  },
  shippingHelper: {
    marginTop: 4,
    color: "#78695C",
    fontSize: 12,
    lineHeight: 18,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 9,
  },
  summaryLabel: {
    color: "#6F6257",
    fontSize: 14,
  },
  summaryValue: {
    color: "#241A13",
    fontSize: 14,
    fontWeight: "700",
  },
  summaryTotalRow: {
    marginTop: 4,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#EFE3D6",
  },
  summaryTotalLabel: {
    color: "#1E1815",
    fontSize: 16,
    fontWeight: "800",
  },
  summaryTotalValue: {
    color: "#9B4B1F",
    fontSize: 18,
    fontWeight: "900",
  },
  backendNoteCard: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: "#F5ECE3",
  },
  backendNoteTitle: {
    color: "#241A13",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 6,
  },
  backendNoteText: {
    color: "#76675B",
    fontSize: 13,
    lineHeight: 20,
  },
  emptyStateText: {
    color: "#78695C",
    fontSize: 14,
  },
  bottomSpacer: {
    height: 110,
  },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 34,
    backgroundColor: "#FCF9F4",
    borderTopWidth: 1,
    borderTopColor: "#EFE3D6",
  },
  bottomLabel: {
    color: "#78695C",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  bottomTotal: {
    color: "#1E1815",
    fontSize: 22,
    fontWeight: "900",
  },
  placeOrderBtn: {
    minWidth: 148,
    paddingHorizontal: 22,
    paddingVertical: 15,
    borderRadius: 18,
    alignItems: "center",
    backgroundColor: "#1E1815",
  },
  disabledBtn: {
    opacity: 0.6,
  },
  placeOrderText: {
    color: "#FFFDF9",
    fontSize: 15,
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
  modalEmptyState: {
    paddingVertical: 24,
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
  addrOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#EDE0D3",
  },
  addrOptionSelected: {
    backgroundColor: "#F5ECE3",
    borderColor: "#D69A65",
  },
  addrOptionLeft: {
    flex: 1,
    marginRight: 12,
  },
  addrOptionTop: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: 6,
  },
  addrOptionLabel: {
    color: "#8A6548",
    fontSize: 12,
    fontWeight: "700",
    marginRight: 8,
  },
  addrDefaultBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#1E1815",
  },
  addrDefaultBadgeText: {
    color: "#FFF8EE",
    fontSize: 10,
    fontWeight: "800",
  },
  addrOptionReceiver: {
    color: "#1E1815",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 2,
  },
  addrOptionPhone: {
    color: "#7C6B5F",
    fontSize: 12,
    marginBottom: 6,
  },
  addrOptionText: {
    color: "#564A40",
    fontSize: 13,
    lineHeight: 20,
  },
  addrOptionCheck: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#1E1815",
    justifyContent: "center",
    alignItems: "center",
  },
  addrOptionCheckIcon: {
    color: "#FFFDF9",
    fontSize: 14,
    fontWeight: "800",
  },
  modalFooter: {
    flexDirection: "row",
    gap: 10,
    paddingTop: 14,
  },
  modalSecondaryBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    backgroundColor: "#F5ECE3",
  },
  modalSecondaryBtnText: {
    color: "#9B4B1F",
    fontSize: 14,
    fontWeight: "800",
  },
  modalPrimaryBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    backgroundColor: "#1E1815",
  },
  modalPrimaryBtnText: {
    color: "#FFFDF9",
    fontSize: 14,
    fontWeight: "800",
  },
});

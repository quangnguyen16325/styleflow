/* eslint-disable react/prop-types */
import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Image,
  Linking,
} from "react-native";
import { formatPrice } from "../services/api";

const BANK_TRANSFER_CONFIG = {
  bank: "TPBank",
  accountNumber: "0000000001",
  accountName: "ECLORIA",
  template: "compact",
};

function buildSepayQrUrl(order) {
  const params = new URLSearchParams({
    bank: BANK_TRANSFER_CONFIG.bank,
    acc: BANK_TRANSFER_CONFIG.accountNumber,
    amount: String(Math.round(Number(order?.totalAmount || 0))),
    des: `Thanh toan don hang ORD${order?.id}`,
    template: BANK_TRANSFER_CONFIG.template,
  });

  return `https://qr.sepay.vn/img?${params.toString()}`;
}

function formatExpiresAt(value) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function SuccessScreen({ route, navigation }) {
  const order = route?.params?.order || null;
  const orderId = route?.params?.orderId || order?.id;
  const isBankTransfer = order?.paymentGateway === "BANK_TRANSFER";
  const paymentCode = orderId ? `ORD${orderId}` : "";
  const qrUrl = useMemo(
    () => (isBankTransfer ? buildSepayQrUrl(order) : null),
    [isBankTransfer, order],
  );
  const expiresAtLabel = formatExpiresAt(order?.paymentExpiresAt);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View style={styles.iconCircle}>
            <Text style={styles.checkIcon}>✓</Text>
          </View>
          <Text style={styles.successTitle}>
            {isBankTransfer ? "Đơn hàng đang chờ thanh toán" : "Đặt hàng thành công"}
          </Text>
          <Text style={styles.successSubtitle}>
            {isBankTransfer
              ? "Quét mã QR hoặc chuyển khoản đúng nội dung bên dưới để hệ thống xác nhận đơn."
              : "Cảm ơn bạn đã mua sắm tại Ecloria. Đơn hàng của bạn đang được xử lý."}
          </Text>
        </View>

        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>Mã đơn hàng</Text>
          <Text style={styles.codeValue}>{paymentCode || "Đang cập nhật"}</Text>
        </View>

        {isBankTransfer ? (
          <View style={styles.paymentCard}>
            <Text style={styles.sectionTitle}>Thanh toán chuyển khoản</Text>
            {qrUrl ? (
              <View style={styles.qrWrap}>
                <Image source={{ uri: qrUrl }} style={styles.qrImage} resizeMode="contain" />
              </View>
            ) : null}

            <View style={styles.paymentRows}>
              <InfoRow label="Ngân hàng" value={BANK_TRANSFER_CONFIG.bank} />
              <InfoRow label="Số tài khoản" value={BANK_TRANSFER_CONFIG.accountNumber} />
              <InfoRow label="Chủ tài khoản" value={BANK_TRANSFER_CONFIG.accountName} />
              <InfoRow
                label="Số tiền"
                value={formatPrice(Number(order?.totalAmount || 0))}
                strong
              />
              <InfoRow label="Nội dung" value={`Thanh toan don hang ${paymentCode}`} strong />
              {expiresAtLabel ? <InfoRow label="Hạn thanh toán" value={expiresAtLabel} /> : null}
            </View>

            <Text style={styles.paymentHint}>
              Nếu quá hạn mà chưa nhận được thanh toán, đơn sẽ tự chuyển sang thất bại.
            </Text>

            {qrUrl ? (
              <TouchableOpacity
                style={styles.outlineBtn}
                activeOpacity={0.85}
                onPress={() => Linking.openURL(qrUrl)}
              >
                <Text style={styles.outlineBtnText}>Mở mã QR</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : (
          <View style={styles.statusCard}>
            <Text style={styles.sectionTitle}>Thông tin đơn hàng</Text>
            <InfoRow label="Thanh toán" value="Thanh toán khi nhận hàng" />
            <InfoRow
              label="Tổng tiền"
              value={formatPrice(Number(order?.totalAmount || 0))}
              strong
            />
            <InfoRow label="Trạng thái" value="Đang xác nhận" />
          </View>
        )}

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.primaryBtn}
            activeOpacity={0.85}
            onPress={() => navigation.navigate("MainApp", { screen: "MainTabs" })}
          >
            <Text style={styles.primaryBtnText}>Tiếp tục mua sắm</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            activeOpacity={0.8}
            onPress={() => {
              if (orderId) {
                navigation.navigate("OrderTracking", { orderId });
              } else {
                navigation.navigate("MainApp", { screen: "Track" });
              }
            }}
          >
            <Text style={styles.secondaryBtnText}>Theo dõi đơn hàng</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value, strong }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, strong && styles.infoValueStrong]}>{value || "—"}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FCF9F4",
  },
  container: {
    padding: 20,
    paddingBottom: 34,
  },
  heroCard: {
    alignItems: "center",
    padding: 22,
    borderRadius: 28,
    backgroundColor: "#1E1815",
    marginBottom: 14,
  },
  iconCircle: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: "#DDA66D",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  checkIcon: {
    color: "#1E1815",
    fontSize: 34,
    fontWeight: "900",
  },
  successTitle: {
    color: "#FFF8EE",
    fontSize: 25,
    lineHeight: 31,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 8,
  },
  successSubtitle: {
    color: "#DCC4A8",
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
  },
  codeCard: {
    borderRadius: 22,
    padding: 18,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    marginBottom: 14,
  },
  codeLabel: {
    color: "#8A7B6F",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 6,
  },
  codeValue: {
    color: "#9B4B1F",
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: 2,
  },
  paymentCard: {
    borderRadius: 24,
    padding: 18,
    backgroundColor: "#FFFFFF",
    marginBottom: 16,
  },
  statusCard: {
    borderRadius: 24,
    padding: 18,
    backgroundColor: "#FFFFFF",
    marginBottom: 16,
  },
  sectionTitle: {
    color: "#1E1815",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 14,
  },
  qrWrap: {
    borderRadius: 22,
    backgroundColor: "#F7EFE7",
    padding: 14,
    alignItems: "center",
    marginBottom: 14,
  },
  qrImage: {
    width: 260,
    height: 260,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
  },
  paymentRows: {
    borderRadius: 18,
    backgroundColor: "#FCF9F4",
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#EFE3D6",
    gap: 14,
  },
  infoLabel: {
    color: "#78695C",
    fontSize: 13,
    fontWeight: "700",
  },
  infoValue: {
    flex: 1,
    color: "#241A13",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "right",
  },
  infoValueStrong: {
    color: "#9B4B1F",
    fontSize: 15,
    fontWeight: "900",
  },
  paymentHint: {
    color: "#78695C",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 12,
    marginBottom: 12,
  },
  actions: {
    gap: 10,
  },
  primaryBtn: {
    backgroundColor: "#1E1815",
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center",
  },
  primaryBtnText: {
    color: "#FFFDF9",
    fontSize: 15,
    fontWeight: "900",
  },
  secondaryBtn: {
    backgroundColor: "#F5ECE3",
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: "center",
  },
  secondaryBtnText: {
    color: "#9B4B1F",
    fontSize: 15,
    fontWeight: "900",
  },
  outlineBtn: {
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D69A65",
  },
  outlineBtnText: {
    color: "#9B4B1F",
    fontSize: 14,
    fontWeight: "900",
  },
});

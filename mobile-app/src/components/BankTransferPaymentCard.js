/* eslint-disable react/prop-types */
import React, { useMemo } from "react";
import { Image, Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { formatPrice } from "../services/api";

export const BANK_TRANSFER_CONFIG = {
  bank: "TPBank",
  accountNumber: "0000000001",
  accountName: "ECLORIA",
  template: "compact",
};

export function shouldShowBankTransferPayment(order) {
  return (
    order?.paymentGateway === "BANK_TRANSFER" &&
    String(order?.paymentStatus || "").toLowerCase() === "payment_pending" &&
    String(order?.status || "").toLowerCase() === "pending"
  );
}

export function buildBankTransferQrUrl(order) {
  const params = new URLSearchParams({
    bank: BANK_TRANSFER_CONFIG.bank,
    acc: BANK_TRANSFER_CONFIG.accountNumber,
    amount: String(Math.round(Number(order?.totalAmount || 0))),
    des: `Thanh toan don hang ORD${order?.id}`,
    template: BANK_TRANSFER_CONFIG.template,
  });

  return `https://qr.sepay.vn/img?${params.toString()}`;
}

export function formatPaymentExpiresAt(value) {
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

export default function BankTransferPaymentCard({ order, compact = false }) {
  const qrUrl = useMemo(() => buildBankTransferQrUrl(order), [order]);
  const paymentCode = order?.id ? `ORD${order.id}` : "";
  const expiresAtLabel = formatPaymentExpiresAt(order?.paymentExpiresAt);

  return (
    <View style={[styles.card, compact && styles.cardCompact]}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.eyebrow}>Chờ chuyển khoản</Text>
          <Text style={styles.title}>Thanh toán đơn {paymentCode}</Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>QR</Text>
        </View>
      </View>

      {!compact ? (
        <View style={styles.qrWrap}>
          <Image source={{ uri: qrUrl }} style={styles.qrImage} resizeMode="contain" />
        </View>
      ) : null}

      <View style={styles.rows}>
        <InfoRow label="Ngân hàng" value={BANK_TRANSFER_CONFIG.bank} />
        <InfoRow label="Số tài khoản" value={BANK_TRANSFER_CONFIG.accountNumber} />
        <InfoRow label="Số tiền" value={formatPrice(Number(order?.totalAmount || 0))} strong />
        <InfoRow label="Nội dung" value={`Thanh toan don hang ${paymentCode}`} strong />
        {expiresAtLabel ? <InfoRow label="Hạn thanh toán" value={expiresAtLabel} /> : null}
      </View>

      <TouchableOpacity
        style={styles.openQrBtn}
        activeOpacity={0.86}
        onPress={() => Linking.openURL(qrUrl)}
      >
        <Text style={styles.openQrBtnText}>{compact ? "Mở QR thanh toán" : "Mở mã QR"}</Text>
      </TouchableOpacity>
    </View>
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
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
  },
  cardCompact: {
    backgroundColor: "#FFF8EE",
    borderWidth: 1,
    borderColor: "#E8D7C6",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 14,
  },
  eyebrow: {
    color: "#9B4B1F",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 5,
  },
  title: {
    color: "#1E1815",
    fontSize: 17,
    fontWeight: "900",
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: "#1E1815",
  },
  badgeText: {
    color: "#FFF8EE",
    fontSize: 11,
    fontWeight: "900",
  },
  qrWrap: {
    borderRadius: 20,
    backgroundColor: "#F7EFE7",
    padding: 14,
    alignItems: "center",
    marginBottom: 14,
  },
  qrImage: {
    width: 250,
    height: 250,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
  },
  rows: {
    borderRadius: 18,
    backgroundColor: "#FCF9F4",
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: "#EFE3D6",
  },
  infoLabel: {
    color: "#6D5D51",
    fontSize: 13,
    fontWeight: "700",
  },
  infoValue: {
    flex: 1,
    color: "#1E1815",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "right",
  },
  infoValueStrong: {
    color: "#9B4B1F",
    fontWeight: "900",
  },
  openQrBtn: {
    alignItems: "center",
    borderRadius: 16,
    paddingVertical: 13,
    backgroundColor: "#1E1815",
    marginTop: 12,
  },
  openQrBtnText: {
    color: "#FFFDF9",
    fontSize: 14,
    fontWeight: "900",
  },
});

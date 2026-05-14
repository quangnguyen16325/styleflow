/* eslint-disable react/prop-types */
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import api, { formatPrice } from "../services/api";

export function shouldShowMomoPayment(order) {
  return (
    order?.paymentGateway === "MOMO" &&
    String(order?.paymentStatus || "").toLowerCase() === "payment_pending" &&
    String(order?.status || "").toLowerCase() === "pending"
  );
}

export function getMomoPaymentUrl(payment) {
  return payment?.deeplink || payment?.payUrl || payment?.shortLink || payment?.qrCodeUrl || null;
}

function isPaymentExpired(order) {
  if (!order?.paymentExpiresAt) return false;
  return new Date(order.paymentExpiresAt).getTime() <= Date.now();
}

export default function MomoPaymentCard({ order, payment, compact = false }) {
  const [loading, setLoading] = useState(false);
  const [currentPayment, setCurrentPayment] = useState(payment || order?.payment || null);
  const [currentPaymentExpiresAt, setCurrentPaymentExpiresAt] = useState(order?.paymentExpiresAt);
  const paymentUrl = getMomoPaymentUrl(currentPayment);
  const paymentExpired = isPaymentExpired({ paymentExpiresAt: currentPaymentExpiresAt });

  const openMomoPayment = async () => {
    try {
      setLoading(true);
      let nextPayment = currentPayment;

      if (order?.id && (paymentExpired || !getMomoPaymentUrl(nextPayment))) {
        const res = await api.post(`/orders/${order.id}/momo-payment`);
        nextPayment = res.data;
        setCurrentPayment(nextPayment);
        if (res.data?.paymentExpiresAt) {
          setCurrentPaymentExpiresAt(res.data.paymentExpiresAt);
        }
      }

      const url = getMomoPaymentUrl(nextPayment);
      if (url) {
        await Linking.openURL(url);
      } else {
        Alert.alert("Không thể tạo link MoMo", "Vui lòng thử lại sau.");
      }
    } catch (error) {
      console.warn("Lỗi mở thanh toán MoMo:", error);
      const message =
        error.response?.data?.error?.message ||
        error.message ||
        "Không thể tạo link thanh toán MoMo. Vui lòng thử lại.";
      Alert.alert("Lỗi thanh toán MoMo", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.card, compact && styles.cardCompact]}>
      <View style={styles.headerRow}>
        <View style={styles.iconBadge}>
          <Text style={styles.iconBadgeText}>MoMo</Text>
        </View>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>Chờ thanh toán ví MoMo</Text>
          <Text style={styles.title}>Đơn ORD{order?.id}</Text>
        </View>
      </View>

      <View style={styles.rows}>
        <InfoRow label="Số tiền" value={formatPrice(Number(order?.totalAmount || 0))} strong />
        <InfoRow label="Cổng thanh toán" value="Ví MoMo" />
        {currentPaymentExpiresAt ? (
          <InfoRow
            label="Hạn thanh toán"
            value={new Date(currentPaymentExpiresAt).toLocaleString("vi-VN")}
          />
        ) : null}
      </View>

      <TouchableOpacity
        style={[styles.payBtn, !order?.id && !paymentUrl && styles.payBtnDisabled]}
        activeOpacity={0.86}
        onPress={openMomoPayment}
        disabled={loading || (!order?.id && !paymentUrl)}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#FFFDF9" />
        ) : (
          <Text style={styles.payBtnText}>
            {paymentExpired || !paymentUrl ? "Tạo lại link MoMo" : "Mở MoMo để thanh toán"}
          </Text>
        )}
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
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  iconBadge: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: "#A50064",
    alignItems: "center",
    justifyContent: "center",
  },
  iconBadgeText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },
  headerCopy: {
    flex: 1,
  },
  eyebrow: {
    color: "#A50064",
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
    color: "#A50064",
    fontWeight: "900",
  },
  payBtn: {
    alignItems: "center",
    borderRadius: 16,
    paddingVertical: 13,
    backgroundColor: "#A50064",
    marginTop: 12,
  },
  payBtnDisabled: {
    opacity: 0.5,
  },
  payBtnText: {
    color: "#FFFDF9",
    fontSize: 14,
    fontWeight: "900",
  },
});

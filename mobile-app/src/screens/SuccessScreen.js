/* eslint-disable react/prop-types */
/**
 * SuccessScreen.js
 * Màn hình thông báo đặt hàng thành công.
 * Hiển thị sau khi clearCart() + navigation.replace("Success")
 */
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Animated,
  Easing,
} from "react-native";
import { COLORS } from "../constants/colors";

// ── Tạo mã đơn hàng giả (sẽ replace bằng orderId thật từ API response) ───────
function genOrderCode() {
  return "ECL-" + Math.random().toString(36).substring(2, 8).toUpperCase();
}

const ORDER_CODE = genOrderCode();

export default function SuccessScreen({ navigation }) {
  // ── Animations ──────────────────────────────────────────────────────────────
  const [scaleAnim] = useState(new Animated.Value(0));
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(40));

  useEffect(() => {
    Animated.sequence([
      // 1. Circle pops in
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 80,
        useNativeDriver: true,
      }),
      // 2. Text fades + slides up
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* ── Animated success icon ───────────────────────────────────────── */}
        <Animated.View style={[styles.iconCircle, { transform: [{ scale: scaleAnim }] }]}>
          <Text style={styles.checkIcon}>✓</Text>
        </Animated.View>

        {/* ── Content ─────────────────────────────────────────────────────── */}
        <Animated.View
          style={[styles.textBlock, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
        >
          <Text style={styles.successTitle}>Order Placed!</Text>
          <Text style={styles.successSubtitle}>
            Cảm ơn bạn đã mua sắm tại <Text style={styles.brandName}>ecloria</Text>.{"\n"}
            Đơn hàng của bạn đang được xử lý.
          </Text>

          {/* Order code */}
          <View style={styles.codeCard}>
            <Text style={styles.codeLabel}>Mã đơn hàng</Text>
            <Text style={styles.codeValue}>{ORDER_CODE}</Text>
          </View>

          {/* Info row */}
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Text style={styles.infoIcon}>📦</Text>
              <Text style={styles.infoText}>Đang xác nhận</Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoItem}>
              <Text style={styles.infoIcon}>🚚</Text>
              <Text style={styles.infoText}>5–7 ngày giao</Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoItem}>
              <Text style={styles.infoIcon}>🔔</Text>
              <Text style={styles.infoText}>Nhận thông báo</Text>
            </View>
          </View>
        </Animated.View>

        {/* ── Actions ─────────────────────────────────────────────────────── */}
        <Animated.View style={[styles.actions, { opacity: fadeAnim }]}>
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
            onPress={() => navigation.navigate("MainApp", { screen: "Track" })}
          >
            <Text style={styles.secondaryBtnText}>Theo dõi đơn hàng →</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary,
  },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },

  // Success icon
  iconCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: COLORS.success,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 32,
    shadowColor: COLORS.success,
    shadowOpacity: 0.35,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  checkIcon: {
    color: "#fff",
    fontSize: 52,
    fontWeight: "800",
    marginTop: -4,
  },

  // Text block
  textBlock: {
    alignItems: "center",
    width: "100%",
  },
  successTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: COLORS.textPrimary,
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  successSubtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  brandName: {
    color: COLORS.primary,
    fontWeight: "700",
  },

  // Order code
  codeCard: {
    backgroundColor: COLORS.primaryBg,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 28,
    alignItems: "center",
    marginBottom: 28,
    width: "100%",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  codeLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: "500",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  codeValue: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.primary,
    letterSpacing: 2,
  },

  // Info row
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.bgSecondary,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 10,
    width: "100%",
    marginBottom: 8,
  },
  infoItem: {
    flex: 1,
    alignItems: "center",
  },
  infoDivider: {
    width: 1,
    height: 36,
    backgroundColor: COLORS.divider,
  },
  infoIcon: {
    fontSize: 22,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: "600",
    textAlign: "center",
  },

  // Buttons
  actions: {
    width: "100%",
    marginTop: 36,
  },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 28,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 14,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryBtn: {
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.info,
  },
});

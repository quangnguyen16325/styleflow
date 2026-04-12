import React from "react";

import { View, Text, StyleSheet } from "react-native";
import { COLORS } from "../constants/colors";

export default function OrderTrackingScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>📦</Text>
      <Text style={styles.title}>Theo dõi đơn hàng</Text>
      <Text style={styles.subtitle}>Danh sách đơn hàng của bạn sẽ hiển thị ở đây</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.bgSecondary,
    gap: 8,
  },
  icon: { fontSize: 56, marginBottom: 8 },
  title: { fontSize: 20, fontWeight: "700", color: COLORS.textPrimary },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
    paddingHorizontal: 40,
  },
});

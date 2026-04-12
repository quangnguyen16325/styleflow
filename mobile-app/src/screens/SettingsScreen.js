import React from "react";

import { View, Text, StyleSheet } from "react-native";
import { COLORS } from "../constants/colors";

export default function SettingsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>⚙️</Text>
      <Text style={styles.title}>Cài đặt</Text>
      <Text style={styles.subtitle}>Ngôn ngữ, tiền tệ, địa chỉ, thanh toán...</Text>
      <Text style={styles.note}>Sẽ hoàn thiện ở Commit 5 (18/04)</Text>
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
  note: { fontSize: 12, color: COLORS.textMuted, fontStyle: "italic", marginTop: 8 },
});

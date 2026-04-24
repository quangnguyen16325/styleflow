/* eslint-disable react/prop-types */
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useAuth } from "../context/AuthContext";
import { COLORS } from "../constants/colors";

// Lấy lời chào theo giờ hiện tại
function getGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Chào buổi sáng ☀️";
  if (hour >= 12 && hour < 18) return "Chào buổi chiều 🌤️";
  if (hour >= 18 && hour < 22) return "Chào buổi tối 🌆";
  return "Khuya rồi nhé 🌙";
}

/**
 * HeaderBar — dùng trên tất cả màn hình MainApp
 * - Trái: Logo "ecloria" + lời chào + tên user
 * - Phải: Nút cài đặt ⚙️
 */
export default function HeaderBar({ onSettingsPress }) {
  const { displayName } = useAuth();
  const greeting = getGreeting();

  return (
    <View style={styles.container}>
      {/* Left — Logo + Greeting */}
      <View style={styles.left}>
        {/* Logo pill */}
        <View style={styles.logoPill}>
          <Text style={styles.logoText}>ecloria</Text>
        </View>
        {/* Greeting block */}
        <View style={styles.greetingBlock}>
          <Text style={styles.greeting} numberOfLines={1}>
            {greeting}
          </Text>
          <Text style={styles.userName} numberOfLines={1}>
            {displayName} 👋
          </Text>
        </View>
      </View>

      {/* Right — Settings gear */}
      <TouchableOpacity
        style={styles.settingsBtn}
        onPress={onSettingsPress}
        activeOpacity={0.7}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Text style={styles.settingsIcon}>⚙️</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 14,
    backgroundColor: COLORS.bgPrimary,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  logoPill: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  logoText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 1,
  },
  greetingBlock: {
    flex: 1,
  },
  greeting: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: "400",
    lineHeight: 16,
  },
  userName: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.bgInput,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  settingsIcon: {
    fontSize: 20,
  },
});

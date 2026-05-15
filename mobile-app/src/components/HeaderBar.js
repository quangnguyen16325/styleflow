/* eslint-disable react/prop-types */
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { useAuth } from "../context/AuthContext";
import AppIcon from "./AppIcon";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Buổi sáng";
  if (hour >= 12 && hour < 18) return "Buổi chiều";
  if (hour >= 18 && hour < 22) return "Buổi tối";
  return "Đêm muộn";
}

export default function HeaderBar() {
  const { displayName } = useAuth();
  const greeting = getGreeting();
  const firstName = displayName?.trim()?.split(" ")?.slice(-1)?.[0] || "Bạn";

  return (
    <View style={styles.shell}>
      <View style={styles.brandBlock}>
        <View style={styles.copyBlock}>
          <Text style={styles.brandWordmark}>Ecloria</Text>
          <Text style={styles.eyebrow}>{greeting}</Text>
          <Text style={styles.title} numberOfLines={1}>
            {firstName}, chọn outfit hôm nay
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.notificationBtn}
        activeOpacity={0.82}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <AppIcon name="bell" size={22} color="#6F5847" />
        <View style={styles.notificationBadge} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 12,
    backgroundColor: "#FCF9F4",
  },
  brandBlock: {
    flexDirection: "row",
    alignItems: "flex-start",
    flex: 1,
  },
  copyBlock: {
    flex: 1,
  },
  brandWordmark: {
    color: "#1E1815",
    fontSize: 24,
    fontFamily: Platform.select({
      ios: "Georgia",
      android: "serif",
      default: "serif",
    }),
    fontWeight: "700",
    fontStyle: "italic",
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  eyebrow: {
    color: "#9D7A60",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  title: {
    color: "#241A13",
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 22,
  },
  notificationBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E6DBCE",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  notificationBadge: {
    position: "absolute",
    top: 10,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#D99152",
    borderWidth: 1,
    borderColor: "#FFFFFF",
  },
});

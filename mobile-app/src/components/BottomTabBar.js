/* eslint-disable react/prop-types */
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCart } from "../context/CartContext";
import AppIcon from "./AppIcon";

const TABS = [
  { key: "Home", label: "Trang chủ", icon: "home" },
  { key: "Wishlist", label: "Yêu thích", icon: "heart" },
  { key: "Track", label: "Đơn hàng", icon: "orders", centerTab: true },
  { key: "Cart", label: "Giỏ hàng", icon: "cart" },
  { key: "Profile", label: "Tài khoản", icon: "profile" },
];

export default function BottomTabBar({ activeTab, onTabPress }) {
  const { totalCount } = useCart();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.outer, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <View style={styles.shell}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;

          if (tab.centerTab) {
            return (
              <TouchableOpacity
                key={tab.key}
                style={styles.centerTabBtn}
                onPress={() => onTabPress(tab.key)}
                activeOpacity={0.88}
              >
                <View style={[styles.centerCircle, isActive && styles.centerCircleActive]}>
                  <AppIcon
                    name={tab.icon}
                    size={22}
                    color={isActive ? "#FFFDF9" : "#FFF7EA"}
                    style={styles.centerIcon}
                  />
                </View>
                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          }

          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.tabBtn}
              onPress={() => onTabPress(tab.key)}
              activeOpacity={0.82}
            >
              <View style={[styles.iconBadge, isActive && styles.iconBadgeActive]}>
                <AppIcon name={tab.icon} size={18} color={isActive ? "#9B4B1F" : "#876E5B"} />
                {tab.key === "Cart" && totalCount > 0 ? (
                  <View style={styles.countBadge}>
                    <Text style={styles.countBadgeText}>
                      {totalCount > 99 ? "99+" : totalCount}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    backgroundColor: "#FCF9F4",
    paddingHorizontal: 14,
    paddingTop: 0,
  },
  shell: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingTop: 10,
    paddingBottom: 8,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E6DBCE",
    shadowColor: "#201812",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -2 },
    elevation: 8,
  },
  tabBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 4,
  },
  centerTabBtn: {
    flex: 1,
    alignItems: "center",
    marginTop: -20,
  },
  iconBadge: {
    position: "relative",
    width: 38,
    height: 38,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F7F0E8",
    marginBottom: 6,
  },
  iconBadgeActive: {
    backgroundColor: "#F1E0D0",
  },
  centerCircle: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: "#1E1815",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    borderWidth: 3,
    borderColor: "#FCF9F4",
  },
  centerCircleActive: {
    backgroundColor: "#9B4B1F",
  },
  centerIcon: {
    marginTop: 1,
  },
  tabLabel: {
    color: "#857669",
    fontSize: 10,
    fontWeight: "700",
  },
  tabLabelActive: {
    color: "#9B4B1F",
  },
  countBadge: {
    position: "absolute",
    top: -4,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#D53F56",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  countBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "900",
  },
});

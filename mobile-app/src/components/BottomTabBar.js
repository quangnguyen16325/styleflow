/* eslint-disable react/prop-types */
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useCart } from "../context/CartContext";

const TABS = [
  { key: "Home", label: "Trang chủ", icon: "◐" },
  { key: "Wishlist", label: "Yêu thích", icon: "♡" },
  { key: "Track", label: "Đơn hàng", icon: "◈", centerTab: true },
  { key: "Cart", label: "Giỏ hàng", icon: "◌" },
  { key: "Profile", label: "Tài khoản", icon: "◎" },
];

export default function BottomTabBar({ activeTab, onTabPress }) {
  const { totalCount } = useCart();

  return (
    <View style={styles.outer}>
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
                  <Text style={[styles.centerIcon, isActive && styles.centerIconActive]}>
                    {tab.icon}
                  </Text>
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
                <Text style={[styles.tabIcon, isActive && styles.tabIconActive]}>{tab.icon}</Text>
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
    paddingBottom: 10,
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
  tabIcon: {
    color: "#876E5B",
    fontSize: 18,
    fontWeight: "800",
  },
  tabIconActive: {
    color: "#9B4B1F",
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
    color: "#FFF7EA",
    fontSize: 22,
    fontWeight: "900",
  },
  centerIconActive: {
    color: "#FFFDF9",
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

/* eslint-disable react/prop-types */
import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import api from "../services/api";
import { useWishlist } from "../context/WishlistContext";

export default function ProfileScreen({ navigation, onSettingsPress }) {
  const [profile, setProfile] = useState(null);
  const [orderCount, setOrderCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { items: wishlistItems } = useWishlist();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [meRes, ordersRes] = await Promise.all([
        api.get("/me"),
        api.get("/orders").catch(() => ({ data: [] })),
      ]);
      setProfile(meRes.data);
      if (Array.isArray(ordersRes.data)) {
        setOrderCount(ordersRes.data.length);
      }
    } catch (err) {
      console.warn("Lỗi tải data Profile:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData]),
  );

  if (loading && !profile) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.center]}>
        <ActivityIndicator size="large" color="#0055ff" />
      </SafeAreaView>
    );
  }

  const initial = profile?.fullName ? profile.fullName.charAt(0).toUpperCase() : "U";

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Header & Settings Icon */}
        <View style={styles.topBar}>
          <Text style={styles.screenTitle}>Tài khoản</Text>
          <TouchableOpacity
            style={styles.settingsBtn}
            onPress={onSettingsPress || (() => navigation.navigate("Settings"))}
          >
            <Text style={styles.settingsIcon}>⚙</Text>
          </TouchableOpacity>
        </View>

        {/* User Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarWrap}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.fullName}>{profile?.fullName || "Người dùng"}</Text>
            <Text style={styles.email}>{profile?.email || "Chưa có email"}</Text>
            {profile?.phone ? <Text style={styles.phone}>{profile.phone}</Text> : null}
          </View>
        </View>

        {/* Stats Section */}
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{orderCount}</Text>
            <Text style={styles.statLabel}>Đơn hàng</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{wishlistItems.length}</Text>
            <Text style={styles.statLabel}>Yêu thích</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>Voucher</Text>
          </View>
        </View>

        {/* Quick Menu — Mua sắm */}
        <Text style={styles.sectionLabel}>MUA SẮM</Text>
        <View style={styles.menuGroup}>
          <MenuItem
            icon="◷"
            label="Theo dõi đơn hàng"
            onPress={() => navigation.navigate("MainTabs", { screen: "Track" })}
          />
          <MenuItem
            icon="♡"
            label="Sản phẩm yêu thích"
            sub={`${wishlistItems.length} sản phẩm`}
            onPress={() => navigation.navigate("MainTabs", { screen: "Wishlist" })}
          />
          <MenuItem
            icon="▽"
            label="Sổ địa chỉ giao hàng"
            onPress={() => navigation.navigate("AddressList")}
            isLast
          />
        </View>

        {/* Quick Menu — Tài khoản */}
        <Text style={styles.sectionLabel}>TÀI KHOẢN</Text>
        <View style={styles.menuGroup}>
          <MenuItem icon="○" label="Thông tin cá nhân" sub={profile?.email || ""} />
          <MenuItem icon="□" label="Bảo mật & Mật khẩu" />
          <MenuItem icon="◑" label="Thông báo" isLast />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Helper Component ──
function MenuItem({ icon, label, sub, onPress, isLast }) {
  return (
    <TouchableOpacity
      style={[styles.menuRow, isLast && styles.menuRowLast]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <View style={styles.menuIconWrap}>
        <Text style={styles.menuIconText}>{icon}</Text>
      </View>
      <View style={styles.menuTextCol}>
        <Text style={styles.menuText}>{label}</Text>
        {sub ? <Text style={styles.menuSub}>{sub}</Text> : null}
      </View>
      <Text style={styles.menuChevron}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8F9FA" },
  center: { justifyContent: "center", alignItems: "center" },
  scroll: { padding: 20, paddingBottom: 60 },

  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    marginTop: 10,
  },
  screenTitle: { fontSize: 28, fontWeight: "900", color: "#111" },
  settingsBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  settingsIcon: { fontSize: 22, color: "#111" },

  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  avatarWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#0055ff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  avatarText: { fontSize: 28, fontWeight: "800", color: "#fff" },
  profileInfo: { flex: 1 },
  fullName: { fontSize: 20, fontWeight: "800", color: "#111", marginBottom: 4 },
  email: { fontSize: 14, color: "#666" },
  phone: { fontSize: 13, color: "#888", marginTop: 2 },

  statsContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingVertical: 20,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  statBox: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 22, fontWeight: "800", color: "#0055ff", marginBottom: 6 },
  statLabel: { fontSize: 13, fontWeight: "600", color: "#666" },
  statDivider: { width: 1, height: "100%", backgroundColor: "#EEE" },

  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#999",
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },

  menuGroup: {
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: 20,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  menuRowLast: { borderBottomWidth: 0 },
  menuIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EFF2FE",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  menuIconText: { fontSize: 16, color: "#0055ff" },
  menuTextCol: { flex: 1 },
  menuText: { fontSize: 15, fontWeight: "700", color: "#111" },
  menuSub: { fontSize: 12, color: "#888", marginTop: 2 },
  menuChevron: { fontSize: 22, color: "#ccc" },
});

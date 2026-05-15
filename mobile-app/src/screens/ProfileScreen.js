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
  Alert,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import api from "../services/api";
import { useWishlist } from "../context/WishlistContext";
import { useAuth } from "../context/AuthContext";
import AppIcon from "../components/AppIcon";

function MenuItem({ label, sub, onPress, isLast = false }) {
  return (
    <TouchableOpacity
      style={[styles.menuRow, isLast && styles.menuRowLast]}
      onPress={onPress}
      activeOpacity={0.85}
      disabled={!onPress}
    >
      <View style={styles.menuTextCol}>
        <Text style={styles.menuText}>{label}</Text>
        {sub ? <Text style={styles.menuSub}>{sub}</Text> : null}
      </View>
      <Text style={styles.menuChevron}>›</Text>
    </TouchableOpacity>
  );
}

export default function ProfileScreen({ navigation, onSettingsPress, onTabSwitch }) {
  const [profile, setProfile] = useState(null);
  const [orderCount, setOrderCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { items: wishlistItems } = useWishlist();
  const { logout } = useAuth();

  const handleLogout = useCallback(() => {
    Alert.alert("Đăng xuất", "Bạn có chắc chắn muốn đăng xuất?", [
      { text: "Huỷ", style: "cancel" },
      {
        text: "Đăng xuất",
        style: "destructive",
        onPress: () => logout(),
      },
    ]);
  }, [logout]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [meRes, ordersRes] = await Promise.all([
        api.get("/me"),
        api.get("/orders").catch(() => ({ data: [] })),
      ]);
      const meData = meRes.data;
      setProfile(meData.customer || meData);
      setOrderCount(Array.isArray(ordersRes.data) ? ordersRes.data.length : 0);
    } catch (error) {
      console.warn("Lỗi tải data Profile:", error);
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
        <ActivityIndicator size="large" color="#9B4B1F" />
      </SafeAreaView>
    );
  }

  const initial = profile?.fullName ? profile.fullName.charAt(0).toUpperCase() : "E";

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={styles.scrollView}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroTextWrap}>
              <Text style={styles.heroEyebrow}>Account</Text>
              <Text style={styles.heroTitle}>Tài khoản của bạn</Text>
            </View>
            <TouchableOpacity
              style={styles.settingsBtn}
              onPress={onSettingsPress || (() => navigation.navigate("Settings"))}
              activeOpacity={0.88}
            >
              <AppIcon name="settings" size={22} color="#9B4B1F" />
            </TouchableOpacity>
          </View>
          <Text style={styles.heroSubtext}>
            Quản lý đơn hàng, địa chỉ giao hàng và danh sách những món bạn muốn quay lại sau.
          </Text>
        </View>

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

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{orderCount}</Text>
            <Text style={styles.statLabel}>Đơn hàng</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{wishlistItems.length}</Text>
            <Text style={styles.statLabel}>Yêu thích</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{profile?.phone ? "OK" : "—"}</Text>
            <Text style={styles.statLabel}>Liên hệ</Text>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Mua sắm</Text>
          <MenuItem
            label="Theo dõi đơn hàng"
            sub={`${orderCount} đơn đang lưu trong lịch sử`}
            onPress={() => onTabSwitch?.("Track")}
          />
          <MenuItem
            label="Sản phẩm yêu thích"
            sub={`${wishlistItems.length} sản phẩm`}
            onPress={() => onTabSwitch?.("Wishlist")}
          />
          <MenuItem
            label="Sổ địa chỉ giao hàng"
            sub="Cập nhật nơi nhận hàng mặc định"
            onPress={() => navigation.navigate("AddressList")}
            isLast
          />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Tài khoản</Text>
          <MenuItem
            label="Thông tin cá nhân"
            sub={profile?.email || ""}
            onPress={() =>
              Alert.alert(
                "Thông tin cá nhân",
                "Tính năng chỉnh sửa thông tin đang được phát triển.",
              )
            }
          />
          <MenuItem
            label="Cài đặt"
            sub="Thông báo, giao diện và tuỳ chọn khác"
            onPress={onSettingsPress || (() => navigation.navigate("Settings"))}
          />
          <MenuItem
            label="Bảo mật"
            sub="Kiểm tra thông tin đăng nhập"
            onPress={() =>
              Alert.alert("Bảo mật", "Tính năng bảo mật tài khoản đang được phát triển.")
            }
            isLast
          />
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.88}>
          <Text style={styles.logoutBtnText}>Đăng xuất</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FCF9F4",
  },
  center: {
    justifyContent: "center",
    alignItems: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  heroCard: {
    backgroundColor: "#1E1815",
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  heroTextWrap: {
    flex: 1,
    marginRight: 16,
  },
  heroEyebrow: {
    color: "#DCC4A8",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  heroTitle: {
    color: "#FFF8EE",
    fontSize: 28,
    fontWeight: "900",
    lineHeight: 34,
  },
  heroSubtext: {
    color: "rgba(255,248,238,0.76)",
    fontSize: 14,
    lineHeight: 22,
    marginTop: 10,
  },
  settingsBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#F2E2D2",
    justifyContent: "center",
    alignItems: "center",
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
  },
  avatarWrap: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#F5ECE3",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  avatarText: {
    color: "#9B4B1F",
    fontSize: 28,
    fontWeight: "900",
  },
  profileInfo: {
    flex: 1,
  },
  fullName: {
    color: "#1E1815",
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 4,
  },
  email: {
    color: "#65574C",
    fontSize: 14,
  },
  phone: {
    color: "#8A7B6F",
    fontSize: 13,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: "row",
    marginBottom: 14,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#F7EFE7",
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  statValue: {
    color: "#9B4B1F",
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 6,
  },
  statLabel: {
    color: "#65574C",
    fontSize: 12,
    fontWeight: "700",
  },
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 18,
    marginBottom: 14,
  },
  sectionTitle: {
    color: "#1E1815",
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 8,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0E5D8",
  },
  menuRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 4,
  },
  menuTextCol: {
    flex: 1,
    marginRight: 12,
  },
  menuText: {
    color: "#1E1815",
    fontSize: 15,
    fontWeight: "700",
  },
  menuSub: {
    color: "#7A685B",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  menuChevron: {
    color: "#9B4B1F",
    fontSize: 22,
  },
  logoutBtn: {
    alignItems: "center",
    paddingVertical: 16,
    borderRadius: 18,
    backgroundColor: "#F5ECE3",
    marginBottom: 30,
  },
  logoutBtnText: {
    color: "#C43A2F",
    fontSize: 15,
    fontWeight: "800",
  },
});

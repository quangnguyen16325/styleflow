/* eslint-disable react/prop-types */
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { COLORS } from "../constants/colors";

const SectionTitle = ({ title }) => <Text style={styles.sectionTitle}>{title}</Text>;

const MenuRow = ({ icon, label, onPress, isLast, renderRight }) => (
  <TouchableOpacity
    style={[styles.menuRow, isLast && styles.menuRowLast]}
    onPress={onPress}
    activeOpacity={onPress ? 0.7 : 1}
    disabled={!onPress}
  >
    <View style={styles.iconWrap}>
      <Text style={styles.icon}>{icon}</Text>
    </View>
    <Text style={styles.label}>{label}</Text>
    {renderRight ? renderRight() : <Text style={styles.chevron}>›</Text>}
  </TouchableOpacity>
);

export default function SettingsScreen({ navigation }) {
  const { logout } = useAuth();
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);

  const handleLogout = () => {
    Alert.alert("Đăng xuất", "Bạn có chắc muốn đăng xuất?", [
      { text: "Hủy", style: "cancel" },
      { text: "Đăng xuất", style: "destructive", onPress: logout },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Nhóm Tài khoản */}
        <SectionTitle title="Tài khoản" />
        <View style={styles.group}>
          <MenuRow
            icon="○"
            label="Thông tin cá nhân"
            onPress={() => Alert.alert("Thông báo", "Tính năng đang bảo trì.")}
          />
          <MenuRow icon="▽" label="Sổ địa chỉ" onPress={() => navigation.navigate("AddressList")} />
          <MenuRow
            icon="□"
            label="Bảo mật & Mật khẩu"
            onPress={() => Alert.alert("Bảo mật", "Tính năng đang phát triển.")}
            isLast
          />
        </View>

        {/* Nhóm Ứng dụng */}
        <SectionTitle title="Ứng dụng" />
        <View style={styles.group}>
          <MenuRow
            icon="○"
            label="Chế độ tối"
            onPress={() => setDarkMode(!darkMode)}
            renderRight={() => (
              <Text style={{ color: COLORS.primary, fontWeight: "700" }}>
                {darkMode ? "Bật" : "Tắt"}
              </Text>
            )}
          />
          <MenuRow
            icon="◑"
            label="Thông báo"
            onPress={() => setNotifications(!notifications)}
            renderRight={() => (
              <Text style={{ color: COLORS.primary, fontWeight: "700" }}>
                {notifications ? "Bật" : "Tắt"}
              </Text>
            )}
            isLast
          />
        </View>

        {/* Nhóm Hỗ trợ */}
        <SectionTitle title="Hỗ trợ" />
        <View style={styles.group}>
          <MenuRow
            icon="◇"
            label="Về StyleFlow"
            onPress={() => Alert.alert("StyleFlow", "Phiên bản 1.0.0 (Beta)")}
          />
          <MenuRow
            icon="□"
            label="Chính sách bảo mật"
            onPress={() => Alert.alert("Thông báo", "Đang cập nhật")}
            isLast
          />
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Text style={styles.logoutIcon}>→</Text>
          <Text style={styles.logoutText}>Đăng xuất</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.bgSecondary },
  scroll: { padding: 20 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textSecondary,
    marginBottom: 8,
    marginTop: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  group: {
    backgroundColor: COLORS.bgPrimary,
    borderRadius: 16,
    marginBottom: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  menuRowLast: { borderBottomWidth: 0 },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.bgInput,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  icon: { fontSize: 16, color: COLORS.primary },
  label: { flex: 1, fontSize: 15, fontWeight: "500", color: COLORS.textPrimary },
  chevron: { fontSize: 20, color: COLORS.textMuted },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF0F0",
    padding: 16,
    borderRadius: 16,
    marginTop: 10,
  },
  logoutIcon: { fontSize: 18, color: COLORS.danger, marginRight: 8 },
  logoutText: { fontSize: 15, fontWeight: "700", color: COLORS.danger },
});

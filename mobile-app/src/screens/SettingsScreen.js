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
import AppIcon from "../components/AppIcon";

const SectionTitle = ({ title }) => <Text style={styles.sectionTitle}>{title}</Text>;

const MenuRow = ({ icon, label, onPress, isLast, renderRight }) => (
  <TouchableOpacity
    style={[styles.menuRow, isLast && styles.menuRowLast]}
    onPress={onPress}
    activeOpacity={onPress ? 0.85 : 1}
    disabled={!onPress}
  >
    <View style={styles.iconWrap}>
      <AppIcon name={icon} size={16} color="#9B4B1F" />
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
            icon="profile"
            label="Thông tin cá nhân"
            onPress={() => Alert.alert("Thông báo", "Tính năng đang được phát triển.")}
          />
          <MenuRow
            icon="location"
            label="Sổ địa chỉ"
            onPress={() => navigation.navigate("AddressList")}
          />
          <MenuRow
            icon="shield"
            label="Bảo mật & Mật khẩu"
            onPress={() => Alert.alert("Bảo mật", "Tính năng đang được phát triển.")}
            isLast
          />
        </View>

        {/* Nhóm Ứng dụng */}
        <SectionTitle title="Ứng dụng" />
        <View style={styles.group}>
          <MenuRow
            icon="other"
            label="Chế độ tối"
            onPress={() => setDarkMode(!darkMode)}
            renderRight={() => (
              <Text style={styles.toggleText}>{darkMode ? "Bật" : "Tắt"}</Text>
            )}
          />
          <MenuRow
            icon="bell"
            label="Thông báo"
            onPress={() => setNotifications(!notifications)}
            renderRight={() => (
              <Text style={styles.toggleText}>{notifications ? "Bật" : "Tắt"}</Text>
            )}
            isLast
          />
        </View>

        {/* Nhóm Hỗ trợ */}
        <SectionTitle title="Hỗ trợ" />
        <View style={styles.group}>
          <MenuRow
            icon="note"
            label="Về Ecloria"
            onPress={() => Alert.alert("Ecloria", "Phiên bản 1.0.0 (Beta)")}
          />
          <MenuRow
            icon="shield"
            label="Chính sách bảo mật"
            onPress={() => Alert.alert("Thông báo", "Đang cập nhật.")}
            isLast
          />
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.88}>
          <AppIcon name="logout" size={18} color="#C43A2F" style={styles.logoutIcon} />
          <Text style={styles.logoutText}>Đăng xuất</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FCF9F4" },
  scroll: { padding: 20 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#AA9C8F",
    marginBottom: 10,
    marginTop: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  group: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    marginBottom: 18,
    overflow: "hidden",
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#F0E5D8",
  },
  menuRowLast: { borderBottomWidth: 0 },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F5ECE3",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  label: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: "#1E1815",
  },
  chevron: {
    fontSize: 22,
    color: "#9B4B1F",
  },
  toggleText: {
    color: "#9B4B1F",
    fontSize: 14,
    fontWeight: "800",
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5ECE3",
    paddingVertical: 16,
    borderRadius: 18,
    marginTop: 8,
  },
  logoutIcon: { marginRight: 8 },
  logoutText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#C43A2F",
  },
});

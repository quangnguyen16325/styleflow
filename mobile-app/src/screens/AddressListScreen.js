/* eslint-disable react/prop-types */
import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import api from "../services/api";
import { COLORS } from "../constants/colors";

// ── Address Card Component ───────────────────────────────────────────────────

function AddressCard({ address, onEdit, onDelete, onSetDefault }) {
  const fullAddr = [address.addressLine, address.ward, address.district, address.city]
    .filter(Boolean)
    .join(", ");

  const labelName = address.label === "home" ? "Nhà" : address.label === "office" ? "Văn phòng" : address.label || "Khác";

  return (
    <View style={[styles.card, address.isDefault && styles.cardDefault]}>
      {/* Label + Default badge */}
      <View style={styles.cardHeader}>
        <View style={styles.labelWrap}>
          <View style={styles.labelDot} />
          <Text style={styles.labelText}>{labelName}</Text>
        </View>
        {address.isDefault && (
          <View style={styles.defaultBadge}>
            <Text style={styles.defaultBadgeText}>Mặc định</Text>
          </View>
        )}
      </View>

      {/* Receiver info */}
      <Text style={styles.receiverName}>{address.receiverName}</Text>
      <Text style={styles.receiverPhone}>{address.receiverPhone}</Text>
      <Text style={styles.addressText}>{fullAddr}</Text>
      {address.postalCode && (
        <Text style={styles.postalCode}>Mã bưu chính: {address.postalCode}</Text>
      )}

      {/* Actions */}
      <View style={styles.cardActions}>
        {!address.isDefault && (
          <TouchableOpacity style={styles.setDefaultBtn} onPress={() => onSetDefault(address)}>
            <Text style={styles.setDefaultText}>Đặt mặc định</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.editBtn} onPress={() => onEdit(address)}>
          <Text style={styles.editBtnText}>Sửa</Text>
        </TouchableOpacity>
        {!address.isDefault && (
          <TouchableOpacity style={styles.deleteBtn} onPress={() => onDelete(address)}>
            <Text style={styles.deleteBtnText}>Xóa</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ── Main Screen ──────────────────────────────────────────────────────────────

export default function AddressListScreen({ navigation }) {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAddresses = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/me/addresses");
      setAddresses(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.warn("Lỗi tải địa chỉ:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchAddresses();
    }, [fetchAddresses]),
  );

  const handleEdit = (address) => {
    navigation.navigate("AddressForm", { address, mode: "edit" });
  };

  const handleAdd = () => {
    navigation.navigate("AddressForm", { mode: "add" });
  };

  const handleDelete = (address) => {
    Alert.alert("Xóa địa chỉ", `Bạn có chắc muốn xóa địa chỉ "${address.addressLine}"?`, [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          try {
            await api.delete(`/me/addresses/${address.id}`);
            setAddresses((prev) => prev.filter((a) => a.id !== address.id));
          } catch (err) {
            console.warn("Lỗi xóa:", err);
            Alert.alert("Lỗi", "Không thể xóa địa chỉ. Vui lòng thử lại.");
          }
        },
      },
    ]);
  };

  const handleSetDefault = async (address) => {
    try {
      await api.patch(`/me/addresses/${address.id}`, { isDefault: true });
      setAddresses((prev) =>
        prev.map((a) => ({ ...a, isDefault: a.id === address.id })),
      );
    } catch (err) {
      console.warn("Lỗi set default:", err);
      setAddresses((prev) =>
        prev.map((a) => ({ ...a, isDefault: a.id === address.id })),
      );
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={addresses}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <AddressCard
            address={item}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onSetDefault={handleSetDefault}
          />
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyIcon}>◎</Text>
            <Text style={styles.emptyTitle}>Chưa có địa chỉ nào</Text>
            <Text style={styles.emptyDesc}>Thêm địa chỉ giao hàng để đặt hàng nhanh hơn</Text>
          </View>
        }
      />

      {/* Add button */}
      <TouchableOpacity style={styles.addBtn} onPress={handleAdd} activeOpacity={0.85}>
        <Text style={styles.addBtnText}>+ Thêm địa chỉ mới</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgSecondary },
  center: { justifyContent: "center", alignItems: "center" },
  listContent: { padding: 16, paddingBottom: 100 },

  card: {
    backgroundColor: COLORS.bgPrimary,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  cardDefault: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryBg,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  labelWrap: { flexDirection: "row", alignItems: "center" },
  labelIcon: { fontSize: 18, marginRight: 6 },
  labelText: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textPrimary,
    textTransform: "capitalize",
  },
  defaultBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  defaultBadgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  receiverName: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  receiverPhone: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 6 },
  addressText: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 19 },
  postalCode: { fontSize: 12, color: COLORS.textMuted, marginTop: 4 },
  cardActions: { flexDirection: "row", marginTop: 12, gap: 8 },
  setDefaultBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.bgInput,
  },
  setDefaultText: { fontSize: 12, fontWeight: "600", color: COLORS.primary },
  editBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.info,
  },
  editBtnText: { fontSize: 12, fontWeight: "600", color: "#fff" },
  deleteBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#FFF0F0",
  },
  deleteBtnText: { fontSize: 12, fontWeight: "600", color: COLORS.danger },

  emptyWrap: { alignItems: "center", paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: COLORS.textPrimary, marginBottom: 4 },
  emptyDesc: { fontSize: 13, color: COLORS.textSecondary, textAlign: "center", paddingHorizontal: 40 },

  addBtn: {
    position: "absolute",
    bottom: 30,
    left: 20,
    right: 20,
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: COLORS.primary,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  addBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});

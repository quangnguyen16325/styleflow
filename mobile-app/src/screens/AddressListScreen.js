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

function AddressCard({ address, onEdit, onDelete, onSetDefault }) {
  const fullAddr = [address.addressLine, address.ward, address.district, address.city]
    .filter(Boolean)
    .join(", ");

  const labelName =
    address.label === "home"
      ? "Nhà"
      : address.label === "office"
        ? "Văn phòng"
        : address.label || "Khác";

  return (
    <View style={[styles.card, address.isDefault && styles.cardDefault]}>
      <View style={styles.cardHeader}>
        <View style={styles.labelPill}>
          <Text style={styles.labelPillText}>{labelName}</Text>
        </View>
        {address.isDefault ? (
          <View style={styles.defaultBadge}>
            <Text style={styles.defaultBadgeText}>Mặc định</Text>
          </View>
        ) : null}
      </View>

      <Text style={styles.receiverName}>{address.receiverName}</Text>
      <Text style={styles.receiverPhone}>{address.receiverPhone}</Text>
      <Text style={styles.addressText}>{fullAddr}</Text>
      {address.postalCode ? (
        <Text style={styles.postalCode}>Mã bưu chính: {address.postalCode}</Text>
      ) : null}

      <View style={styles.cardActions}>
        {!address.isDefault ? (
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => onSetDefault(address)}>
            <Text style={styles.secondaryBtnText}>Đặt mặc định</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity style={styles.primaryBtn} onPress={() => onEdit(address)}>
          <Text style={styles.primaryBtnText}>Chỉnh sửa</Text>
        </TouchableOpacity>
        {!address.isDefault ? (
          <TouchableOpacity style={styles.ghostBtn} onPress={() => onDelete(address)}>
            <Text style={styles.ghostBtnText}>Xóa</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

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
      setAddresses((prev) => prev.map((a) => ({ ...a, isDefault: a.id === address.id })));
    } catch (err) {
      console.warn("Lỗi set default:", err);
      setAddresses((prev) => prev.map((a) => ({ ...a, isDefault: a.id === address.id })));
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#9B4B1F" />
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
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            <Text style={styles.headerEyebrow}>Address book</Text>
            <Text style={styles.headerTitle}>Sổ địa chỉ giao hàng</Text>
            <Text style={styles.headerText}>
              Quản lý địa chỉ nhận hàng để checkout nhanh hơn và đổi địa chỉ thuận tiện hơn.
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyTitle}>Chưa có địa chỉ nào</Text>
            <Text style={styles.emptyDesc}>Thêm địa chỉ giao hàng để đặt hàng nhanh hơn.</Text>
          </View>
        }
      />

      <TouchableOpacity style={styles.addBtn} onPress={handleAdd} activeOpacity={0.88}>
        <Text style={styles.addBtnText}>+ Thêm địa chỉ mới</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FCF9F4",
  },
  center: {
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    padding: 20,
    paddingBottom: 120,
  },
  headerBlock: {
    marginBottom: 18,
  },
  headerEyebrow: {
    color: "#9D7A60",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  headerTitle: {
    color: "#1E1815",
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -0.6,
    marginBottom: 8,
  },
  headerText: {
    color: "#76675B",
    fontSize: 14,
    lineHeight: 22,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 18,
    marginBottom: 14,
    shadowColor: "#201812",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
    borderWidth: 1,
    borderColor: "#EFE3D6",
  },
  cardDefault: {
    backgroundColor: "#F5ECE3",
    borderColor: "#E4C9AD",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  labelPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#F3E4D6",
  },
  labelPillText: {
    color: "#8A6548",
    fontSize: 12,
    fontWeight: "700",
  },
  defaultBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#1E1815",
  },
  defaultBadgeText: {
    color: "#FFF8EE",
    fontSize: 11,
    fontWeight: "800",
  },
  receiverName: {
    color: "#1E1815",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 3,
  },
  receiverPhone: {
    color: "#7C6B5F",
    fontSize: 13,
    marginBottom: 8,
  },
  addressText: {
    color: "#55483D",
    fontSize: 14,
    lineHeight: 22,
  },
  postalCode: {
    color: "#8F7A6B",
    fontSize: 12,
    marginTop: 6,
  },
  cardActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14,
  },
  secondaryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#F7EFE7",
  },
  secondaryBtnText: {
    color: "#9B4B1F",
    fontSize: 12,
    fontWeight: "700",
  },
  primaryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#1E1815",
  },
  primaryBtnText: {
    color: "#FFF8EE",
    fontSize: 12,
    fontWeight: "700",
  },
  ghostBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#FFF2EE",
  },
  ghostBtnText: {
    color: "#C24A3A",
    fontSize: 12,
    fontWeight: "700",
  },
  emptyWrap: {
    alignItems: "center",
    paddingVertical: 70,
  },
  emptyTitle: {
    color: "#1E1815",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 6,
  },
  emptyDesc: {
    color: "#76675B",
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 30,
  },
  addBtn: {
    position: "absolute",
    bottom: 26,
    left: 20,
    right: 20,
    backgroundColor: "#D99152",
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: "center",
    shadowColor: "#9B4B1F",
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  addBtnText: {
    color: "#FFFDF9",
    fontSize: 16,
    fontWeight: "800",
  },
});

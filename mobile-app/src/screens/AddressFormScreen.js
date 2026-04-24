/* eslint-disable react/prop-types */
import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Switch,
} from "react-native";
import api from "../services/api";
import { COLORS } from "../constants/colors";

// ── Label Selector ───────────────────────────────────────────────────────────

const LABELS = [
  { key: "home", icon: "⌂", name: "Nhà" },
  { key: "office", icon: "▣", name: "Văn phòng" },
  { key: "other", icon: "◎", name: "Khác" },
];

function LabelSelector({ selected, onSelect }) {
  return (
    <View style={styles.labelRow}>
      {LABELS.map((l) => (
        <TouchableOpacity
          key={l.key}
          style={[styles.labelChip, selected === l.key && styles.labelChipActive]}
          onPress={() => onSelect(l.key)}
          activeOpacity={0.7}
        >
          <Text style={styles.labelChipIcon}>{l.icon}</Text>
          <Text style={[styles.labelChipText, selected === l.key && styles.labelChipTextActive]}>
            {l.name}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ── Main Screen ──────────────────────────────────────────────────────────────

export default function AddressFormScreen({ route, navigation }) {
  const { mode, address } = route.params || {};
  const isEdit = mode === "edit" && address;

  const [label, setLabel] = useState(isEdit ? (address.label || "home") : "home");
  const [receiverName, setReceiverName] = useState(isEdit ? (address.receiverName || "") : "");
  const [receiverPhone, setReceiverPhone] = useState(isEdit ? (address.receiverPhone || "") : "");
  const [addressLine, setAddressLine] = useState(isEdit ? (address.addressLine || "") : "");
  const [ward, setWard] = useState(isEdit ? (address.ward || "") : "");
  const [district, setDistrict] = useState(isEdit ? (address.district || "") : "");
  const [city, setCity] = useState(isEdit ? (address.city || "") : "Ho Chi Minh City");
  const country = isEdit ? (address.country || "Vietnam") : "Vietnam";
  const [postalCode, setPostalCode] = useState(isEdit ? (address.postalCode || "") : "");
  const [isDefault, setIsDefault] = useState(isEdit ? (address.isDefault || false) : false);
  const [saving, setSaving] = useState(false);

  const validate = () => {
    if (!receiverName.trim()) { Alert.alert("Lỗi", "Vui lòng nhập tên người nhận"); return false; }
    if (!receiverPhone.trim()) { Alert.alert("Lỗi", "Vui lòng nhập số điện thoại"); return false; }
    if (!addressLine.trim()) { Alert.alert("Lỗi", "Vui lòng nhập địa chỉ"); return false; }
    if (!city.trim()) { Alert.alert("Lỗi", "Vui lòng nhập tỉnh/thành phố"); return false; }
    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setSaving(true);
    const payload = {
      label,
      receiverName: receiverName.trim(),
      receiverPhone: receiverPhone.trim(),
      addressLine: addressLine.trim(),
      ward: ward.trim(),
      district: district.trim(),
      city: city.trim(),
      country: country.trim(),
      postalCode: postalCode.trim(),
      isDefault,
    };

    try {
      if (isEdit) {
        await api.patch(`/me/addresses/${address.id}`, payload);
        Alert.alert("Thành công", "Đã cập nhật địa chỉ!");
      } else {
        await api.post("/me/addresses", payload);
        Alert.alert("Thành công", "Đã thêm địa chỉ mới!");
      }
      navigation.goBack();
    } catch (err) {
      console.warn("Lỗi lưu địa chỉ:", err);
      Alert.alert("Lỗi", err?.message || "Không thể lưu địa chỉ. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Label */}
        <Text style={styles.sectionTitle}>Loại địa chỉ</Text>
        <LabelSelector selected={label} onSelect={setLabel} />

        {/* Receiver Info */}
        <Text style={styles.sectionTitle}>Thông tin người nhận</Text>

        <Text style={styles.inputLabel}>Tên người nhận *</Text>
        <TextInput
          style={styles.input}
          value={receiverName}
          onChangeText={setReceiverName}
          placeholder="Nguyễn Văn A"
          placeholderTextColor={COLORS.textMuted}
        />

        <Text style={styles.inputLabel}>Số điện thoại *</Text>
        <TextInput
          style={styles.input}
          value={receiverPhone}
          onChangeText={setReceiverPhone}
          placeholder="0901234567"
          placeholderTextColor={COLORS.textMuted}
          keyboardType="phone-pad"
        />

        {/* Address */}
        <Text style={styles.sectionTitle}>Địa chỉ giao hàng</Text>

        <Text style={styles.inputLabel}>Địa chỉ (số nhà, đường) *</Text>
        <TextInput
          style={styles.input}
          value={addressLine}
          onChangeText={setAddressLine}
          placeholder="123 Nguyễn Trãi"
          placeholderTextColor={COLORS.textMuted}
        />

        <View style={styles.rowTwo}>
          <View style={styles.halfField}>
            <Text style={styles.inputLabel}>Phường/Xã</Text>
            <TextInput
              style={styles.input}
              value={ward}
              onChangeText={setWard}
              placeholder="Phường 2"
              placeholderTextColor={COLORS.textMuted}
            />
          </View>
          <View style={styles.halfField}>
            <Text style={styles.inputLabel}>Quận/Huyện</Text>
            <TextInput
              style={styles.input}
              value={district}
              onChangeText={setDistrict}
              placeholder="Quận 5"
              placeholderTextColor={COLORS.textMuted}
            />
          </View>
        </View>

        <View style={styles.rowTwo}>
          <View style={styles.halfField}>
            <Text style={styles.inputLabel}>Tỉnh/Thành phố *</Text>
            <TextInput
              style={styles.input}
              value={city}
              onChangeText={setCity}
              placeholder="TP. HCM"
              placeholderTextColor={COLORS.textMuted}
            />
          </View>
          <View style={styles.halfField}>
            <Text style={styles.inputLabel}>Mã bưu chính</Text>
            <TextInput
              style={styles.input}
              value={postalCode}
              onChangeText={setPostalCode}
              placeholder="700000"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="number-pad"
            />
          </View>
        </View>

        <Text style={styles.inputLabel}>Quốc gia</Text>
        <TextInput
          style={[styles.input, styles.inputDisabled]}
          value={country}
          editable={false}
        />

        {/* Default toggle */}
        <View style={styles.defaultRow}>
          <View style={styles.defaultInfo}>
            <Text style={styles.defaultLabel}>Đặt làm địa chỉ mặc định</Text>
            <Text style={styles.defaultDesc}>Địa chỉ này sẽ được chọn tự động khi đặt hàng</Text>
          </View>
          <Switch
            value={isDefault}
            onValueChange={setIsDefault}
            trackColor={{ true: COLORS.primary, false: "#E5E5EA" }}
            thumbColor="#fff"
            ios_backgroundColor="#E5E5EA"
          />
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Save Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.saveBtnText}>
              {isEdit ? "Lưu thay đổi" : "Thêm địa chỉ"}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgSecondary },
  scrollView: { flex: 1 },
  scrollContent: { padding: 20 },

  // Section
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginTop: 20,
    marginBottom: 12,
  },

  // Label selector
  labelRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 8,
  },
  labelChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.bgPrimary,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  labelChipActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryBg,
  },
  labelChipIcon: { fontSize: 18, marginRight: 6 },
  labelChipText: { fontSize: 13, fontWeight: "600", color: COLORS.textSecondary },
  labelChipTextActive: { color: COLORS.primary },

  // Input
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: COLORS.bgPrimary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: COLORS.textPrimary,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  inputDisabled: {
    backgroundColor: COLORS.bgInput,
    color: COLORS.textMuted,
  },

  // Row two columns
  rowTwo: {
    flexDirection: "row",
    gap: 12,
  },
  halfField: {
    flex: 1,
  },

  // Default toggle
  defaultRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.bgPrimary,
    borderRadius: 14,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  defaultInfo: { flex: 1, marginRight: 12 },
  defaultLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  defaultDesc: {
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 17,
  },

  // Bottom bar
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.bgPrimary,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 34,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  saveBtn: {
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
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});

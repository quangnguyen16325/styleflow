/* eslint-disable react/prop-types */
import React, { useEffect, useState } from "react";
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
  Modal,
} from "react-native";
import api, { getVietnamDistricts, getVietnamProvinces, getVietnamWards } from "../services/api";

const LABELS = [
  { key: "home", icon: "⌂", name: "Nhà" },
  { key: "office", icon: "▣", name: "Văn phòng" },
  { key: "other", icon: "◎", name: "Khác" },
];

function LabelSelector({ selected, onSelect }) {
  return (
    <View style={styles.labelRow}>
      {LABELS.map((label) => (
        <TouchableOpacity
          key={label.key}
          style={[styles.labelChip, selected === label.key && styles.labelChipActive]}
          onPress={() => onSelect(label.key)}
          activeOpacity={0.82}
        >
          <Text style={styles.labelChipIcon}>{label.icon}</Text>
          <Text
            style={[styles.labelChipText, selected === label.key && styles.labelChipTextActive]}
          >
            {label.name}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function LocationPickerModal({ visible, title, items, selectedCode, onSelect, onClose }) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>{title}</Text>
          <ScrollView
            style={styles.modalScroll}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.modalScrollContent}
          >
            {items.length === 0 ? (
              <Text style={styles.modalEmptyText}>Chưa có dữ liệu để chọn.</Text>
            ) : (
              items.map((item) => (
                <TouchableOpacity
                  key={item.code}
                  style={[
                    styles.modalOption,
                    selectedCode === item.code && styles.modalOptionSelected,
                  ]}
                  onPress={() => {
                    onSelect(item);
                    onClose();
                  }}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.modalOptionText,
                      selectedCode === item.code && styles.modalOptionTextSelected,
                    ]}
                  >
                    {item.name}
                  </Text>
                  {selectedCode === item.code ? (
                    <Text style={styles.modalOptionCheck}>✓</Text>
                  ) : null}
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
          <TouchableOpacity style={styles.modalCloseBtn} onPress={onClose}>
            <Text style={styles.modalCloseBtnText}>Đóng</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function LocationSelectField({
  label,
  value,
  placeholder,
  onPress,
  disabled = false,
  loading = false,
}) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TouchableOpacity
        style={[styles.selectField, disabled && styles.selectFieldDisabled]}
        onPress={onPress}
        activeOpacity={disabled ? 1 : 0.82}
        disabled={disabled}
      >
        <Text style={[styles.selectFieldText, !value && styles.selectFieldPlaceholder]}>
          {value || placeholder}
        </Text>
        {loading ? (
          <ActivityIndicator size="small" color="#9B4B1F" />
        ) : (
          <Text style={styles.selectFieldArrow}>›</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

export default function AddressFormScreen({ route, navigation }) {
  const { mode, address } = route.params || {};
  const isEdit = mode === "edit" && address;

  const [label, setLabel] = useState(isEdit ? address.label || "home" : "home");
  const [receiverName, setReceiverName] = useState(isEdit ? address.receiverName || "" : "");
  const [receiverPhone, setReceiverPhone] = useState(isEdit ? address.receiverPhone || "" : "");
  const [addressLine, setAddressLine] = useState(isEdit ? address.addressLine || "" : "");
  const [postalCode, setPostalCode] = useState(isEdit ? address.postalCode || "" : "");
  const [isDefault, setIsDefault] = useState(isEdit ? address.isDefault || false : false);
  const [saving, setSaving] = useState(false);

  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [wards, setWards] = useState([]);
  const [loadingProvinces, setLoadingProvinces] = useState(true);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingWards, setLoadingWards] = useState(false);

  const [selectedProvince, setSelectedProvince] = useState(null);
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [selectedWard, setSelectedWard] = useState(null);

  const [provinceModalVisible, setProvinceModalVisible] = useState(false);
  const [districtModalVisible, setDistrictModalVisible] = useState(false);
  const [wardModalVisible, setWardModalVisible] = useState(false);

  useEffect(() => {
    const loadInitialLocationData = async () => {
      try {
        setLoadingProvinces(true);
        const provinceList = await getVietnamProvinces();
        const safeProvinces = Array.isArray(provinceList) ? provinceList : [];
        setProvinces(safeProvinces);

        const matchedProvince =
          safeProvinces.find((province) => province.name === address?.city) || null;
        setSelectedProvince(matchedProvince);

        if (!matchedProvince) {
          return;
        }

        setLoadingDistricts(true);
        const districtList = await getVietnamDistricts(matchedProvince.code);
        const safeDistricts = Array.isArray(districtList) ? districtList : [];
        setDistricts(safeDistricts);

        const matchedDistrict =
          safeDistricts.find((district) => district.name === address?.district) || null;
        setSelectedDistrict(matchedDistrict);

        if (!matchedDistrict) {
          return;
        }

        setLoadingWards(true);
        const wardList = await getVietnamWards(matchedDistrict.code);
        const safeWards = Array.isArray(wardList) ? wardList : [];
        setWards(safeWards);

        const matchedWard = safeWards.find((ward) => ward.name === address?.ward) || null;
        setSelectedWard(matchedWard);
      } catch (err) {
        console.warn("Lỗi tải địa giới hành chính:", err);
      } finally {
        setLoadingProvinces(false);
        setLoadingDistricts(false);
        setLoadingWards(false);
      }
    };

    loadInitialLocationData();
  }, [address?.city, address?.district, address?.ward]);

  const validate = () => {
    if (!receiverName.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập tên người nhận");
      return false;
    }
    if (!receiverPhone.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập số điện thoại");
      return false;
    }
    if (!addressLine.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập số nhà, tên đường");
      return false;
    }
    if (!selectedProvince) {
      Alert.alert("Lỗi", "Vui lòng chọn tỉnh/thành phố");
      return false;
    }
    if (!selectedDistrict) {
      Alert.alert("Lỗi", "Vui lòng chọn quận/huyện");
      return false;
    }
    return true;
  };

  const handleProvinceSelect = async (province) => {
    setSelectedProvince(province);
    setSelectedDistrict(null);
    setSelectedWard(null);
    setDistricts([]);
    setWards([]);

    try {
      setLoadingDistricts(true);
      const districtList = await getVietnamDistricts(province.code);
      setDistricts(Array.isArray(districtList) ? districtList : []);
    } catch (err) {
      console.warn("Lỗi tải quận/huyện:", err);
      Alert.alert("Lỗi", "Không tải được danh sách quận/huyện.");
    } finally {
      setLoadingDistricts(false);
    }
  };

  const handleDistrictSelect = async (district) => {
    setSelectedDistrict(district);
    setSelectedWard(null);
    setWards([]);

    try {
      setLoadingWards(true);
      const wardList = await getVietnamWards(district.code);
      setWards(Array.isArray(wardList) ? wardList : []);
    } catch (err) {
      console.warn("Lỗi tải phường/xã:", err);
      Alert.alert("Lỗi", "Không tải được danh sách phường/xã.");
    } finally {
      setLoadingWards(false);
    }
  };

  const handleSave = async () => {
    if (!validate()) return;

    setSaving(true);
    const payload = {
      label,
      receiverName: receiverName.trim(),
      receiverPhone: receiverPhone.trim(),
      addressLine: addressLine.trim(),
      ward: selectedWard?.name || "",
      district: selectedDistrict?.name || "",
      city: selectedProvince?.name || "",
      country: "Vietnam",
      postalCode: postalCode.trim(),
      isDefault,
    };

    try {
      if (isEdit) {
        await api.patch(`/me/addresses/${address.id}`, payload);
        Alert.alert("Thành công", "Đã cập nhật địa chỉ.");
      } else {
        await api.post("/me/addresses", payload);
        Alert.alert("Thành công", "Đã thêm địa chỉ mới.");
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
        <View style={styles.heroCard}>
          <Text style={styles.heroEyebrow}>{isEdit ? "Chỉnh sửa địa chỉ" : "Địa chỉ mới"}</Text>
          <Text style={styles.heroTitle}>
            {isEdit ? "Cập nhật nơi nhận hàng" : "Thêm nơi nhận hàng"}
          </Text>
          <Text style={styles.heroText}>
            Tỉnh, quận và phường được tải từ API địa giới Việt Nam của backend để map tên địa chỉ
            nhất quán khi lưu đơn hàng.
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Loại địa chỉ</Text>
          <LabelSelector selected={label} onSelect={setLabel} />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Thông tin người nhận</Text>

          <Text style={styles.inputLabel}>Tên người nhận *</Text>
          <TextInput
            style={styles.input}
            value={receiverName}
            onChangeText={setReceiverName}
            placeholder="Nguyễn Văn A"
            placeholderTextColor="#A09082"
          />

          <Text style={styles.inputLabel}>Số điện thoại *</Text>
          <TextInput
            style={styles.input}
            value={receiverPhone}
            onChangeText={setReceiverPhone}
            placeholder="0901234567"
            placeholderTextColor="#A09082"
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Địa chỉ giao hàng</Text>

          <Text style={styles.inputLabel}>Số nhà, đường *</Text>
          <TextInput
            style={styles.input}
            value={addressLine}
            onChangeText={setAddressLine}
            placeholder="123 Nguyễn Trãi"
            placeholderTextColor="#A09082"
          />

          <LocationSelectField
            label="Tỉnh/Thành phố *"
            value={selectedProvince?.name}
            placeholder={loadingProvinces ? "Đang tải..." : "Chọn tỉnh/thành phố"}
            onPress={() => setProvinceModalVisible(true)}
            loading={loadingProvinces}
          />

          <LocationSelectField
            label="Quận/Huyện *"
            value={selectedDistrict?.name}
            placeholder={selectedProvince ? "Chọn quận/huyện" : "Chọn tỉnh/thành trước"}
            onPress={() => setDistrictModalVisible(true)}
            disabled={!selectedProvince || loadingDistricts}
            loading={loadingDistricts}
          />

          <LocationSelectField
            label="Phường/Xã"
            value={selectedWard?.name}
            placeholder={selectedDistrict ? "Chọn phường/xã" : "Chọn quận/huyện trước"}
            onPress={() => setWardModalVisible(true)}
            disabled={!selectedDistrict || loadingWards}
            loading={loadingWards}
          />

          <Text style={styles.inputLabel}>Mã bưu chính</Text>
          <TextInput
            style={styles.input}
            value={postalCode}
            onChangeText={setPostalCode}
            placeholder="700000"
            placeholderTextColor="#A09082"
            keyboardType="number-pad"
          />

          <Text style={styles.inputLabel}>Quốc gia</Text>
          <TextInput
            style={[styles.input, styles.inputDisabled]}
            value="Vietnam"
            editable={false}
          />
        </View>

        <View style={styles.defaultRow}>
          <View style={styles.defaultInfo}>
            <Text style={styles.defaultLabel}>Đặt làm địa chỉ mặc định</Text>
            <Text style={styles.defaultDesc}>
              Địa chỉ này sẽ được chọn tự động khi bạn đặt hàng.
            </Text>
          </View>
          <Switch
            value={isDefault}
            onValueChange={setIsDefault}
            trackColor={{ true: "#C98A57", false: "#E5D8CA" }}
            thumbColor="#FFFFFF"
            ios_backgroundColor="#E5D8CA"
          />
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.88}
        >
          {saving ? (
            <ActivityIndicator color="#FFFDF9" size="small" />
          ) : (
            <Text style={styles.saveBtnText}>{isEdit ? "Lưu thay đổi" : "Thêm địa chỉ"}</Text>
          )}
        </TouchableOpacity>
      </View>

      <LocationPickerModal
        visible={provinceModalVisible}
        title="Chọn tỉnh/thành phố"
        items={provinces}
        selectedCode={selectedProvince?.code}
        onSelect={handleProvinceSelect}
        onClose={() => setProvinceModalVisible(false)}
      />

      <LocationPickerModal
        visible={districtModalVisible}
        title="Chọn quận/huyện"
        items={districts}
        selectedCode={selectedDistrict?.code}
        onSelect={handleDistrictSelect}
        onClose={() => setDistrictModalVisible(false)}
      />

      <LocationPickerModal
        visible={wardModalVisible}
        title="Chọn phường/xã"
        items={wards}
        selectedCode={selectedWard?.code}
        onSelect={setSelectedWard}
        onClose={() => setWardModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FCF9F4",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  heroCard: {
    padding: 20,
    borderRadius: 24,
    backgroundColor: "#1E1815",
    marginBottom: 16,
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
    fontSize: 26,
    lineHeight: 32,
    fontWeight: "900",
    marginBottom: 10,
  },
  heroText: {
    color: "rgba(255,248,238,0.76)",
    fontSize: 14,
    lineHeight: 22,
  },
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#1E1815",
    marginBottom: 14,
  },
  labelRow: {
    flexDirection: "row",
    gap: 10,
  },
  labelChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: "#F7F0E8",
    borderWidth: 1,
    borderColor: "#E6DBCE",
  },
  labelChipActive: {
    borderColor: "#D69A65",
    backgroundColor: "#F2E2D2",
  },
  labelChipIcon: {
    fontSize: 17,
    marginRight: 6,
    color: "#6C5647",
  },
  labelChipText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6C5647",
  },
  labelChipTextActive: {
    color: "#9B4B1F",
  },
  fieldBlock: {
    marginTop: 10,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#7A685B",
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: "#FCF9F4",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: "#241A13",
    borderWidth: 1,
    borderColor: "#E7DBCF",
  },
  inputDisabled: {
    color: "#9D9084",
  },
  selectField: {
    minHeight: 52,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#E7DBCF",
    backgroundColor: "#FCF9F4",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectFieldDisabled: {
    opacity: 0.6,
  },
  selectFieldText: {
    flex: 1,
    fontSize: 15,
    color: "#241A13",
    marginRight: 12,
  },
  selectFieldPlaceholder: {
    color: "#9D9084",
  },
  selectFieldArrow: {
    fontSize: 22,
    color: "#9B4B1F",
  },
  defaultRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F5ECE3",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E8D5C2",
  },
  defaultInfo: {
    flex: 1,
    marginRight: 12,
  },
  defaultLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#241A13",
    marginBottom: 3,
  },
  defaultDesc: {
    fontSize: 12,
    color: "#7A685B",
    lineHeight: 18,
  },
  bottomSpacer: {
    height: 110,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FCF9F4",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 34,
    borderTopWidth: 1,
    borderTopColor: "#EFE3D6",
  },
  saveBtn: {
    backgroundColor: "#1E1815",
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: "center",
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: "#FFFDF9",
    fontSize: 16,
    fontWeight: "800",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(24, 18, 14, 0.32)",
  },
  modalSheet: {
    backgroundColor: "#FCF9F4",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: 30,
  },
  modalHandle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: "#D3C4B6",
    marginBottom: 12,
  },
  modalTitle: {
    color: "#1E1815",
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 16,
  },
  modalScroll: {
    maxHeight: "65%",
  },
  modalScrollContent: {
    paddingBottom: 8,
  },
  modalEmptyText: {
    color: "#76675B",
    fontSize: 14,
    lineHeight: 22,
    paddingVertical: 12,
  },
  modalOption: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EDE0D3",
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalOptionSelected: {
    backgroundColor: "#F5ECE3",
    borderColor: "#D69A65",
  },
  modalOptionText: {
    color: "#241A13",
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
    marginRight: 12,
  },
  modalOptionTextSelected: {
    color: "#9B4B1F",
  },
  modalOptionCheck: {
    color: "#9B4B1F",
    fontSize: 16,
    fontWeight: "800",
  },
  modalCloseBtn: {
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    backgroundColor: "#1E1815",
  },
  modalCloseBtnText: {
    color: "#FFFDF9",
    fontSize: 14,
    fontWeight: "800",
  },
});

/* eslint-disable react/prop-types */
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Image,
  ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import api from "../services/api";

const RETURN_REASONS = [
  { id: "damaged", label: "Hàng bị hư hỏng / vỡ", requiresPhoto: true },
  { id: "wrong_item", label: "Sai size / màu / chủng loại", requiresPhoto: true },
  { id: "not_as_described", label: "Không giống mô tả", requiresPhoto: true },
  { id: "changed_mind", label: "Đổi ý / không muốn nữa", requiresPhoto: false },
  { id: "other", label: "Lý do khác", requiresPhoto: false },
];

export default function ReturnRequestScreen({ route, navigation }) {
  const { orderId, orderItems } = route?.params || {};
  const [selectedReason, setSelectedReason] = useState(null);
  const [customReason, setCustomReason] = useState("");
  const [imageUri, setImageUri] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const activeReason = RETURN_REASONS.find((r) => r.id === selectedReason);
  const needsPhoto = activeReason?.requiresPhoto || false;

  const handlePickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert("Quyền truy cập", "Vui lòng cấp quyền truy cập thư viện ảnh.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        setImageUri(result.assets[0].uri);
      }
    } catch (err) {
      console.warn("Lỗi chọn ảnh:", err);
    }
  };

  const handleTakePhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert("Quyền truy cập", "Vui lòng cấp quyền truy cập máy ảnh.");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        setImageUri(result.assets[0].uri);
      }
    } catch (err) {
      console.warn("Lỗi chụp ảnh:", err);
    }
  };

  const handleSubmit = async () => {
    if (!selectedReason) {
      Alert.alert("Thiếu thông tin", "Vui lòng chọn lý do trả hàng.");
      return;
    }

    if (needsPhoto && !imageUri) {
      Alert.alert("Thiếu ảnh", "Vui lòng gửi ảnh minh chứng cho trường hợp này.");
      return;
    }

    try {
      setSubmitting(true);

      // Gửi POST /refund-requests theo API Contract
      // imageUrl: dùng URI tạm (tương lai sẽ upload lên cloud)
      const payload = {
        orderId: Number(orderId),
        imageUrl: imageUri || "https://placeholder.ecloria.co.uk/refund-evidence.jpg",
      };

      await api.post("/refund-requests", payload);

      Alert.alert(
        "Gửi thành công",
        "Yêu cầu trả hàng đã được ghi nhận. Chúng tôi sẽ xem xét và phản hồi trong vòng 24 giờ.",
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
    } catch (err) {
      const msg = err?.message || "Không thể gửi yêu cầu. Vui lòng thử lại.";
      Alert.alert("Lỗi", msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      
      {/* Order Info */}
      <View style={styles.orderInfoCard}>
        <Text style={styles.orderInfoTitle}>Đơn hàng #{orderId}</Text>
        <Text style={styles.orderInfoSub}>
          {(orderItems || []).length} sản phẩm trong đơn
        </Text>
      </View>

      {/* Sản phẩm trong đơn */}
      {Array.isArray(orderItems) && orderItems.length > 0 && (
        <View style={styles.itemsSection}>
          <Text style={styles.sectionLabel}>SẢN PHẨM TRONG ĐƠN</Text>
          {orderItems.map((it, idx) => {
            const img = it.productImage || it.product?.imageUrl || it.product?.image || "https://via.placeholder.com/60";
            const name = it.productName || it.product?.name || "Sản phẩm";
            return (
              <View key={idx} style={styles.itemRow}>
                <Image source={{ uri: img }} style={styles.itemImg} />
                <View style={styles.itemInfoCol}>
                  <Text style={styles.itemName} numberOfLines={1}>{name}</Text>
                  <Text style={styles.itemQty}>Số lượng: {it.quantity || 1}</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Chọn lý do */}
      <Text style={styles.sectionLabel}>TẠI SAO BẠN MUỐN TRẢ HÀNG?</Text>
      <View style={styles.reasonsGroup}>
        {RETURN_REASONS.map((reason) => {
          const isSelected = selectedReason === reason.id;
          return (
            <TouchableOpacity
              key={reason.id}
              style={[styles.reasonRow, isSelected && styles.reasonRowSelected]}
              onPress={() => setSelectedReason(reason.id)}
              activeOpacity={0.7}
            >
              <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
                {isSelected && <View style={styles.radioInner} />}
              </View>
              <Text style={[styles.reasonLabel, isSelected && styles.reasonLabelSelected]}>
                {reason.label}
              </Text>
              {reason.requiresPhoto && (
                <Text style={styles.photoTag}>Cần ảnh</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Custom Reason */}
      {selectedReason === "other" && (
        <View style={styles.customReasonWrap}>
          <TextInput
            style={styles.customInput}
            placeholder="Mô tả lý do của bạn..."
            placeholderTextColor="#999"
            value={customReason}
            onChangeText={setCustomReason}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>
      )}

      {/* Gửi ảnh minh chứng */}
      {(needsPhoto || selectedReason) && (
        <View style={styles.photoSection}>
          <Text style={styles.sectionLabel}>
            {needsPhoto ? "ẢNH MINH CHỨNG (BẮT BUỘC)" : "ẢNH MINH CHỨNG (TÙY CHỌN)"}
          </Text>

          {imageUri ? (
            <View style={styles.previewWrap}>
              <Image source={{ uri: imageUri }} style={styles.previewImage} />
              <TouchableOpacity
                style={styles.removePhotoBtn}
                onPress={() => setImageUri(null)}
              >
                <Text style={styles.removePhotoText}>✕</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.photoActions}>
              <TouchableOpacity style={styles.photoBtn} onPress={handlePickImage}>
                <Text style={styles.photoBtnIcon}>▢</Text>
                <Text style={styles.photoBtnText}>Chọn ảnh</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.photoBtn} onPress={handleTakePhoto}>
                <Text style={styles.photoBtnIcon}>◎</Text>
                <Text style={styles.photoBtnText}>Chụp ảnh</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Submit Button */}
      <TouchableOpacity
        style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
        activeOpacity={0.8}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitBtnText}>Gửi yêu cầu trả hàng</Text>
        )}
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA", padding: 20 },

  orderInfoCard: {
    backgroundColor: "#fff", borderRadius: 16, padding: 20, marginBottom: 20,
    shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 8, elevation: 2,
  },
  orderInfoTitle: { fontSize: 18, fontWeight: "900", color: "#111" },
  orderInfoSub: { fontSize: 13, color: "#666", marginTop: 4 },

  itemsSection: { marginBottom: 20 },
  itemRow: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#fff",
    padding: 12, borderRadius: 12, marginBottom: 8,
  },
  itemImg: { width: 50, height: 50, borderRadius: 8, backgroundColor: "#eee" },
  itemInfoCol: { flex: 1, marginLeft: 12 },
  itemName: { fontSize: 14, fontWeight: "600", color: "#222" },
  itemQty: { fontSize: 12, color: "#888", marginTop: 2 },

  sectionLabel: {
    fontSize: 12, fontWeight: "700", color: "#999", letterSpacing: 0.5,
    marginBottom: 10, marginLeft: 4,
  },

  reasonsGroup: {
    backgroundColor: "#fff", borderRadius: 16, overflow: "hidden",
    marginBottom: 20,
    shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 8, elevation: 2,
  },
  reasonRow: {
    flexDirection: "row", alignItems: "center", padding: 16,
    borderBottomWidth: 1, borderBottomColor: "#F0F0F0",
  },
  reasonRowSelected: { backgroundColor: "#F0F4FF" },
  radioOuter: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 2,
    borderColor: "#ccc", justifyContent: "center", alignItems: "center",
    marginRight: 14,
  },
  radioOuterSelected: { borderColor: "#0055ff" },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#0055ff" },
  reasonLabel: { flex: 1, fontSize: 15, color: "#333" },
  reasonLabelSelected: { fontWeight: "700", color: "#111" },
  photoTag: {
    fontSize: 11, color: "#0055ff", fontWeight: "700",
    backgroundColor: "#EFF2FE", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
  },

  customReasonWrap: { marginBottom: 20 },
  customInput: {
    backgroundColor: "#fff", borderRadius: 14, padding: 16, fontSize: 15,
    color: "#111", minHeight: 100, borderWidth: 1, borderColor: "#E8E8E8",
  },

  photoSection: { marginBottom: 24 },
  photoActions: { flexDirection: "row", gap: 12 },
  photoBtn: {
    flex: 1, backgroundColor: "#fff", borderRadius: 14, padding: 20,
    alignItems: "center", borderWidth: 1.5, borderColor: "#E8E8E8", borderStyle: "dashed",
  },
  photoBtnIcon: { fontSize: 28, color: "#0055ff", marginBottom: 8 },
  photoBtnText: { fontSize: 13, fontWeight: "600", color: "#666" },

  previewWrap: { position: "relative" },
  previewImage: {
    width: "100%", height: 200, borderRadius: 14, backgroundColor: "#eee",
  },
  removePhotoBtn: {
    position: "absolute", top: 10, right: 10,
    width: 30, height: 30, borderRadius: 15, backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center", alignItems: "center",
  },
  removePhotoText: { color: "#fff", fontSize: 14, fontWeight: "bold" },

  submitBtn: {
    backgroundColor: "#0055ff", paddingVertical: 18, borderRadius: 14,
    alignItems: "center",
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});

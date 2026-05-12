/* eslint-disable react/prop-types */
import React, { useMemo, useState } from "react";
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
  SafeAreaView,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import api, {
  createRefundEvidenceUpload,
  formatPrice,
  uploadFileToSignedUrl,
} from "../services/api";

const REFUND_REQUESTS_WEBHOOK_URL =
  process.env.EXPO_PUBLIC_N8N_REFUND_REQUESTS_WEBHOOK_URL ||
  "https://n8n.ecloria.co.uk/webhook/refund-requests";

const RETURN_REASONS = [
  { id: "damaged", label: "Hàng bị hư hỏng / vỡ", requiresPhoto: true },
  { id: "wrong_item", label: "Sai size / màu / chủng loại", requiresPhoto: true },
  { id: "not_as_described", label: "Không giống mô tả", requiresPhoto: true },
  { id: "changed_mind", label: "Đổi ý / không muốn nữa", requiresPhoto: false },
  { id: "other", label: "Lý do khác", requiresPhoto: false },
];

function resolveOrderItemName(item) {
  return item?.productName || `Sản phẩm #${item?.productId ?? "?"}`;
}

function resolveImageMeta(asset) {
  const uri = asset?.uri;
  const mimeType = asset?.mimeType || inferContentTypeFromUri(uri);
  const fileName =
    asset?.fileName || `refund-evidence-${Date.now()}.${extensionFromContentType(mimeType)}`;

  return {
    uri,
    mimeType,
    fileName,
  };
}

function inferContentTypeFromUri(uri) {
  const normalized = String(uri || "").toLowerCase();
  if (normalized.endsWith(".png")) return "image/png";
  if (normalized.endsWith(".webp")) return "image/webp";
  if (normalized.endsWith(".gif")) return "image/gif";
  return "image/jpeg";
}

function extensionFromContentType(contentType) {
  switch (contentType) {
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    default:
      return "jpeg";
  }
}

export default function ReturnRequestScreen({ route, navigation }) {
  const { orderId, orderItems } = route?.params || {};
  const [selectedReason, setSelectedReason] = useState(null);
  const [customReason, setCustomReason] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const activeReason = RETURN_REASONS.find((reason) => reason.id === selectedReason) || null;
  const requiresPhoto = activeReason?.requiresPhoto || false;

  const totalRefundPreview = useMemo(
    () =>
      Array.isArray(orderItems)
        ? orderItems.reduce(
            (sum, item) => sum + Number(item.priceAtPurchase || 0) * Number(item.quantity || 1),
            0,
          )
        : 0,
    [orderItems],
  );

  const handleCloseAfterSubmit = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.navigate("MainTabs");
  };

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

      if (!result.canceled && result.assets?.[0]) {
        setSelectedImage(resolveImageMeta(result.assets[0]));
      }
    } catch (error) {
      console.warn("Lỗi chọn ảnh:", error);
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

      if (!result.canceled && result.assets?.[0]) {
        setSelectedImage(resolveImageMeta(result.assets[0]));
      }
    } catch (error) {
      console.warn("Lỗi chụp ảnh:", error);
    }
  };

  const handleSubmit = async () => {
    if (!selectedReason) {
      Alert.alert("Thiếu thông tin", "Vui lòng chọn lý do trả hàng.");
      return;
    }

    const customReasonValue = customReason.trim();
    const reason =
      selectedReason === "other"
        ? customReasonValue
        : customReasonValue
          ? `${activeReason?.label?.trim()}: ${customReasonValue}`
          : activeReason?.label?.trim() || "";

    if (!reason) {
      Alert.alert("Thiếu thông tin", "Vui lòng nhập lý do trả hàng.");
      return;
    }

    if (requiresPhoto && !selectedImage?.uri) {
      Alert.alert("Thiếu ảnh", "Vui lòng gửi ảnh minh chứng cho trường hợp này.");
      return;
    }

    try {
      setSubmitting(true);

      let imageUrl = null;
      if (selectedImage?.uri) {
        const upload = await createRefundEvidenceUpload(
          Number(orderId),
          selectedImage.fileName,
          selectedImage.mimeType,
        );
        await uploadFileToSignedUrl(upload.uploadUrl, selectedImage.uri, selectedImage.mimeType);
        imageUrl = upload.publicUrl;
      }

      const refundRequest = await api.post("/refund-requests", {
        orderId: Number(orderId),
        imageUrl,
        reason,
      });

      const refundRequestId = Number(refundRequest?.data?.id);

      setSubmitting(false);

      Alert.alert(
        "Đã gửi yêu cầu",
        "Yêu cầu trả hàng của bạn đã được ghi nhận. Chúng tôi sẽ phản hồi sớm nhất có thể.",
        [{ text: "OK", onPress: handleCloseAfterSubmit }],
      );

      if (Number.isInteger(refundRequestId) && refundRequestId > 0) {
        void fetch(REFUND_REQUESTS_WEBHOOK_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            refundRequestId,
          }),
        }).catch((webhookError) => {
          console.warn("Không thể gửi webhook refund request:", webhookError);
        });
      }
    } catch (error) {
      const msg = error?.message || "Không thể gửi yêu cầu. Vui lòng thử lại.";
      Alert.alert("Lỗi", msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.heroCard}>
          <Text style={styles.heroEyebrow}>Hậu Mãi Đơn Hàng</Text>
          <Text style={styles.heroTitle}>Yêu cầu trả hàng</Text>
          <Text style={styles.heroText}>
            Chọn lý do phù hợp và gửi ảnh minh chứng nếu cần để đơn được xử lý nhanh hơn.
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Thông tin đơn hàng</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Mã đơn</Text>
            <Text style={styles.summaryValue}>#{orderId}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Sản phẩm</Text>
            <Text style={styles.summaryValue}>
              {Array.isArray(orderItems) ? orderItems.length : 0}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Giá trị tạm tính</Text>
            <Text style={styles.summaryTotal}>{formatPrice(totalRefundPreview)}</Text>
          </View>
        </View>

        {Array.isArray(orderItems) && orderItems.length > 0 ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Sản phẩm trong đơn</Text>
            {orderItems.map((item, index) => (
              <View key={item.id || `${item.productId}-${index}`} style={styles.itemRow}>
                <View style={styles.itemToken}>
                  <Text style={styles.itemTokenText}>#{item.productId}</Text>
                </View>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{resolveOrderItemName(item)}</Text>
                  <Text style={styles.itemMeta}>Số lượng {item.quantity || 1}</Text>
                </View>
                <Text style={styles.itemPrice}>
                  {formatPrice(Number(item.priceAtPurchase || 0) * Number(item.quantity || 1))}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Chọn lý do trả hàng</Text>
          {RETURN_REASONS.map((reason) => {
            const isSelected = selectedReason === reason.id;

            return (
              <TouchableOpacity
                key={reason.id}
                style={[styles.reasonRow, isSelected && styles.reasonRowSelected]}
                onPress={() => setSelectedReason(reason.id)}
                activeOpacity={0.88}
              >
                <View style={[styles.reasonBullet, isSelected && styles.reasonBulletSelected]}>
                  {isSelected ? <View style={styles.reasonBulletInner} /> : null}
                </View>
                <View style={styles.reasonContent}>
                  <Text style={[styles.reasonLabel, isSelected && styles.reasonLabelSelected]}>
                    {reason.label}
                  </Text>
                  {reason.requiresPhoto ? (
                    <Text style={styles.reasonHint}>Cần ảnh minh chứng</Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Mô tả thêm</Text>
          <TextInput
            style={styles.reasonInput}
            placeholder="Mô tả thêm tình trạng sản phẩm hoặc lý do trả hàng"
            placeholderTextColor="#9D9084"
            multiline
            numberOfLines={5}
            value={customReason}
            onChangeText={setCustomReason}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Ảnh minh chứng</Text>
            <Text style={styles.sectionHint}>{requiresPhoto ? "Bắt buộc" : "Tuỳ chọn"}</Text>
          </View>

          {selectedImage?.uri ? (
            <View style={styles.previewWrap}>
              <Image source={{ uri: selectedImage.uri }} style={styles.previewImage} />
              <TouchableOpacity
                style={styles.removePhotoBtn}
                onPress={() => setSelectedImage(null)}
              >
                <Text style={styles.removePhotoText}>×</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.photoActions}>
              <TouchableOpacity
                style={styles.photoBtn}
                onPress={handlePickImage}
                activeOpacity={0.88}
              >
                <Text style={styles.photoBtnIcon}>▣</Text>
                <Text style={styles.photoBtnText}>Chọn ảnh</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.photoBtn}
                onPress={handleTakePhoto}
                activeOpacity={0.88}
              >
                <Text style={styles.photoBtnIcon}>◎</Text>
                <Text style={styles.photoBtnText}>Chụp ảnh</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.88}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFDF9" size="small" />
          ) : (
            <Text style={styles.submitBtnText}>Gửi yêu cầu trả hàng</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
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
    color: "#1E1815",
    fontSize: 17,
    fontWeight: "800",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  sectionHint: {
    color: "#9B4B1F",
    fontSize: 12,
    fontWeight: "700",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
  },
  summaryLabel: {
    color: "#6D5D51",
    fontSize: 13,
  },
  summaryValue: {
    color: "#1E1815",
    fontSize: 13,
    fontWeight: "700",
  },
  summaryTotal: {
    color: "#9B4B1F",
    fontSize: 16,
    fontWeight: "900",
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 12,
  },
  itemToken: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#F5ECE3",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  itemTokenText: {
    color: "#9B4B1F",
    fontSize: 13,
    fontWeight: "800",
  },
  itemInfo: {
    flex: 1,
    marginRight: 12,
  },
  itemName: {
    color: "#241A13",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4,
  },
  itemMeta: {
    color: "#8A7B6F",
    fontSize: 12,
  },
  itemPrice: {
    color: "#9B4B1F",
    fontSize: 14,
    fontWeight: "800",
  },
  reasonRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F0E5D8",
  },
  reasonRowSelected: {
    backgroundColor: "#FCF9F4",
  },
  reasonBullet: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#D9C7B7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  reasonBulletSelected: {
    borderColor: "#9B4B1F",
  },
  reasonBulletInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#9B4B1F",
  },
  reasonContent: {
    flex: 1,
  },
  reasonLabel: {
    color: "#241A13",
    fontSize: 15,
  },
  reasonLabelSelected: {
    fontWeight: "700",
  },
  reasonHint: {
    color: "#9B4B1F",
    fontSize: 12,
    marginTop: 4,
  },
  reasonInput: {
    marginTop: 14,
    backgroundColor: "#FCF9F4",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: "#241A13",
    borderWidth: 1,
    borderColor: "#E7DBCF",
    minHeight: 120,
  },
  photoActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  photoBtn: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FCF9F4",
    borderWidth: 1,
    borderColor: "#E7DBCF",
  },
  photoBtnIcon: {
    color: "#9B4B1F",
    fontSize: 24,
    marginBottom: 8,
  },
  photoBtnText: {
    color: "#65574C",
    fontSize: 13,
    fontWeight: "700",
  },
  previewWrap: {
    marginTop: 4,
    position: "relative",
  },
  previewImage: {
    width: "100%",
    height: 220,
    borderRadius: 18,
    backgroundColor: "#EFE8E0",
  },
  removePhotoBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(30,24,21,0.72)",
  },
  removePhotoText: {
    color: "#FFFDF9",
    fontSize: 18,
    fontWeight: "800",
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
  submitBtn: {
    backgroundColor: "#1E1815",
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: "center",
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: "#FFFDF9",
    fontSize: 16,
    fontWeight: "800",
  },
});

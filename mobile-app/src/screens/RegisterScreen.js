/* eslint-disable react/prop-types */
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { COLORS } from "../constants/colors";

export default function RegisterScreen({ navigation }) {
  const { register, isLoading } = useAuth();

  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!form.fullName.trim()) newErrors.fullName = "Vui lòng nhập họ tên";
    if (form.fullName.trim().length < 2) newErrors.fullName = "Tên phải có ít nhất 2 ký tự";
    if (!form.phone.trim()) newErrors.phone = "Vui lòng nhập số điện thoại";
    if (!/^(0[3|5|7|8|9])+([0-9]{8})$/.test(form.phone.trim()))
      newErrors.phone = "Số điện thoại không hợp lệ (VD: 0901234567)";
    if (!form.email.trim()) newErrors.email = "Vui lòng nhập email";
    else if (!/\S+@\S+\.\S+/.test(form.email)) newErrors.email = "Email không hợp lệ";
    if (!form.password.trim()) newErrors.password = "Vui lòng nhập mật khẩu";
    else if (form.password.length < 8) newErrors.password = "Mật khẩu tối thiểu 8 ký tự";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    const result = await register(form);
    if (result.success) {
      navigation.replace("MainApp");
    } else {
      Alert.alert("Lỗi", "Đăng ký thất bại. Vui lòng thử lại.");
    }
  };

  const setField = (key, val) => {
    setForm((prev) => ({ ...prev, [key]: val }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: null }));
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bgPrimary} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Back button */}
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← Quay lại</Text>
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.headerSection}>
            <Text style={styles.title}>Tạo tài khoản ✨</Text>
            <Text style={styles.subtitle}>Điền thông tin để bắt đầu mua sắm</Text>
          </View>

          {/* Form */}
          <View style={styles.formCard}>
            <InputField
              label="Họ và tên *"
              placeholder="Nguyễn Quang Anh"
              value={form.fullName}
              onChangeText={(v) => setField("fullName", v)}
              error={errors.fullName}
            />
            <InputField
              label="Số điện thoại *"
              placeholder="0901234567"
              value={form.phone}
              onChangeText={(v) => setField("phone", v)}
              error={errors.phone}
              keyboardType="phone-pad"
            />
            <InputField
              label="Email *"
              placeholder="example@gmail.com"
              value={form.email}
              onChangeText={(v) => setField("email", v)}
              error={errors.email}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <InputField
              label="Mật khẩu *"
              placeholder="Tối thiểu 8 ký tự"
              value={form.password}
              onChangeText={(v) => setField("password", v)}
              error={errors.password}
              secureTextEntry
              autoCapitalize="none"
            />

            <View style={styles.noteBox}>
              <Text style={styles.noteText}>
                💡 Thông tin này sẽ được dùng để xác nhận đơn hàng và giao hàng.
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.registerBtn, isLoading && styles.btnDisabled]}
              onPress={handleRegister}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.registerBtnText}>Tạo tài khoản</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Login link */}
          <View style={styles.loginRow}>
            <Text style={styles.loginLabel}>Đã có tài khoản? </Text>
            <TouchableOpacity onPress={() => navigation.navigate("Login")}>
              <Text style={styles.loginLink}>Đăng nhập</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function InputField({ label, error, ...props }) {
  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, error && styles.inputError]}
        placeholderTextColor={COLORS.textMuted}
        {...props}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.bgSecondary },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 32 },

  backBtn: { paddingTop: 16, paddingBottom: 8 },
  backText: { fontSize: 15, color: COLORS.primary, fontWeight: "600" },

  headerSection: { paddingBottom: 28 },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  subtitle: { fontSize: 15, color: COLORS.textSecondary },

  formCard: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    marginBottom: 24,
  },

  fieldContainer: { marginBottom: 20 },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  input: {
    height: 52,
    backgroundColor: COLORS.bgInput,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingHorizontal: 16,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  inputError: { borderColor: COLORS.danger, backgroundColor: "#FFF5F5" },
  errorText: { fontSize: 12, color: COLORS.danger, marginTop: 4, marginLeft: 4 },

  noteBox: {
    backgroundColor: COLORS.primaryBg,
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  noteText: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 20 },

  registerBtn: {
    height: 56,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: COLORS.primary,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6,
  },
  btnDisabled: { opacity: 0.7 },
  registerBtnText: { color: "#fff", fontSize: 17, fontWeight: "700", letterSpacing: 0.3 },

  loginRow: { flexDirection: "row", justifyContent: "center", alignItems: "center" },
  loginLabel: { fontSize: 15, color: COLORS.textSecondary },
  loginLink: { fontSize: 15, fontWeight: "700", color: COLORS.primary },
});

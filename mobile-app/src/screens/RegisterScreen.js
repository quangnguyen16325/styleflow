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
import BackPillButton from "../components/BackPillButton";

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
    try {
      const result = await register(form);
      if (result.success) {
        Alert.alert("Thành công", "Tài khoản đã được tạo. Vui lòng đăng nhập để tiếp tục.", [
          { text: "OK", onPress: () => navigation.replace("Login") },
        ]);
      } else {
        Alert.alert("Lỗi", "Đăng ký thất bại. Vui lòng thử lại.");
      }
    } catch {
      Alert.alert("Lỗi", "Đăng ký thất bại. Vui lòng thử lại.");
    }
  };

  const setField = (key, val) => {
    setForm((prev) => ({ ...prev, [key]: val }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: null }));
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FCF9F4" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.backWrap}>
            <BackPillButton onPress={() => navigation.goBack()} />
          </View>

          {/* Header */}
          <View style={styles.headerSection}>
            <Text style={styles.title}>Trở thành thành viên.</Text>
            <Text style={styles.subtitle}>Đăng ký để trải nghiệm đặc quyền mua sắm cao cấp.</Text>
          </View>

          {/* Form */}
          <View style={styles.formCard}>
            <InputField
              label="Họ và tên *"
              placeholder="Nguyễn Văn A"
              value={form.fullName}
              onChangeText={(v) => setField("fullName", v)}
              error={errors.fullName}
            />
            <InputField
              label="Số điện thoại *"
              placeholder="0123456789"
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
            <Text style={styles.loginLabel}>Bạn đã là thành viên? </Text>
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
        placeholderTextColor="#8A7B6F"
        {...props}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FCF9F4" },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 32 },

  backWrap: { paddingTop: 16, paddingBottom: 8 },

  headerSection: { paddingBottom: 28 },
  title: {
    fontSize: 28,
    fontWeight: "900",
    color: "#1E1815",
    marginBottom: 6,
  },
  subtitle: { fontSize: 15, color: "#8A7B6F" },

  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#1E1815",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#E8DFD4",
  },

  fieldContainer: { marginBottom: 20 },
  label: {
    fontSize: 12,
    fontWeight: "800",
    color: "#8A7B6F",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  input: {
    height: 48,
    backgroundColor: "transparent",
    borderBottomWidth: 1,
    borderBottomColor: "#DCC4A8",
    paddingHorizontal: 4,
    fontSize: 16,
    color: "#271C15",
  },
  inputError: { borderBottomColor: "#C44A34" },
  errorText: { fontSize: 12, color: "#C44A34", marginTop: 6, marginLeft: 4 },

  registerBtn: {
    height: 56,
    backgroundColor: "#D99152",
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.7 },
  registerBtnText: { color: "#FFFDF9", fontSize: 17, fontWeight: "800" },

  loginRow: { flexDirection: "row", justifyContent: "center", alignItems: "center" },
  loginLabel: { fontSize: 15, color: "#8A7B6F" },
  loginLink: { fontSize: 15, fontWeight: "700", color: "#9E5E2F" },
});

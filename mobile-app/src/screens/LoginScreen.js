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
import AppImage from "../components/AppImage";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";

export default function LoginScreen({ navigation }) {
  const { login, isLoading } = useAuth();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!form.email.trim()) newErrors.email = "Vui lòng nhập email";
    else if (!/\S+@\S+\.\S+/.test(form.email)) newErrors.email = "Email không hợp lệ";
    if (!form.password.trim()) newErrors.password = "Vui lòng nhập mật khẩu";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    try {
      const result = await login(form);
      if (result.success) {
        return;
      }
    } catch (err) {
      Alert.alert("Lỗi", err.message || "Đăng nhập thất bại. Vui lòng thử lại.");
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
          {/* Fashion Hero Image */}
          <View style={styles.imageWrap}>
            <AppImage source={{ uri: null }} style={styles.headerImage} />
          </View>

          {/* Header */}
          <View style={styles.headerSection}>
            <Text style={styles.brandWordmark}>Ecloria</Text>
            <Text style={styles.title}>Chào mừng trở lại.</Text>
            <Text style={styles.subtitle}>Khám phá phong cách thời trang của bạn.</Text>
          </View>

          {/* Form */}
          <View style={styles.formCard}>
            <InputField
              label="Email"
              placeholder="example@gmail.com"
              value={form.email}
              onChangeText={(v) => setField("email", v)}
              error={errors.email}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <InputField
              label="Mật khẩu"
              placeholder="••••••••"
              value={form.password}
              onChangeText={(v) => setField("password", v)}
              error={errors.password}
              secureTextEntry
              autoCapitalize="none"
            />

            <TouchableOpacity style={styles.forgotBtn}>
              <Text style={styles.forgotText}>Quên mật khẩu?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.loginBtn, isLoading && styles.loginBtnDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.loginBtnText}>Đăng nhập</Text>
              )}
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>hoặc</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity style={styles.socialBtn} activeOpacity={0.8}>
              <Text style={styles.socialBtnText}>Tiếp tục với Google</Text>
            </TouchableOpacity>
          </View>

          {/* Register link */}
          <View style={styles.registerRow}>
            <Text style={styles.registerLabel}>Bạn chưa có tài khoản? </Text>
            <TouchableOpacity onPress={() => navigation.navigate("Register")}>
              <Text style={styles.registerLink}>Tham gia ngay</Text>
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

  imageWrap: {
    height: 180,
    marginTop: 12,
    marginBottom: 16,
    borderRadius: 24,
    overflow: "hidden",
  },
  headerImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },

  headerSection: {
    alignItems: "center",
    paddingBottom: 28,
  },
  brandWordmark: {
    color: "#1E1815",
    fontSize: 38,
    fontFamily: Platform.select({
      ios: "Georgia",
      android: "serif",
      default: "serif",
    }),
    fontWeight: "700",
    fontStyle: "italic",
    letterSpacing: 0.2,
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: "900",
    color: "#1E1815",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: "#8A7B6F",
  },

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

  fieldContainer: { marginBottom: 16 },
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
  inputError: {
    borderBottomColor: "#C44A34",
  },
  errorText: {
    fontSize: 12,
    color: "#C44A34",
    marginTop: 6,
    marginLeft: 4,
  },

  forgotBtn: {
    alignSelf: "flex-end",
    marginBottom: 20,
    paddingVertical: 4,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#9E5E2F",
  },

  loginBtn: {
    height: 52,
    backgroundColor: "#D99152",
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  loginBtnDisabled: { opacity: 0.7 },
  loginBtnText: {
    color: "#FFFDF9",
    fontSize: 16,
    fontWeight: "800",
  },

  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E8DFD4",
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 13,
    color: "#8A7B6F",
    textTransform: "uppercase",
    fontWeight: "700",
  },

  socialBtn: {
    height: 52,
    backgroundColor: "#FCF9F4",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E8DFD4",
    justifyContent: "center",
    alignItems: "center",
  },
  socialBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#211912",
  },

  registerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  registerLabel: { fontSize: 14, color: "#8A7B6F" },
  registerLink: {
    fontSize: 14,
    fontWeight: "800",
    color: "#9E5E2F",
  },
});

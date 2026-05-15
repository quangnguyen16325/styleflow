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
import Svg, { Path } from "react-native-svg";

const LOGIN_HERO_IMAGE =
  "https://images.pexels.com/photos/5709661/pexels-photo-5709661.jpeg?auto=compress&cs=tinysrgb&w=1200";

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
            <AppImage source={{ uri: LOGIN_HERO_IMAGE }} style={styles.headerImage} />
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
              <GoogleLogo />
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

function GoogleLogo() {
  return (
    <Svg width={20} height={20} viewBox="0 0 48 48">
      <Path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"
      />
      <Path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"
      />
      <Path
        fill="#4CAF50"
        d="M24 44c5.2 0 10-2 13.5-5.3l-6.2-5.2C29.3 35.1 26.8 36 24 36c-5.3 0-9.7-3.3-11.3-7.9l-6.5 5C9.4 39.5 16.1 44 24 44z"
      />
      <Path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.1 5.5l6.2 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.3-.4-3.5z"
      />
    </Svg>
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
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

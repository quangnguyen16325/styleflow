/* eslint-disable react/prop-types */
import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { loginApi, registerApi, getMeApi } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true); // Loading on mount

  // Check auth state on mount
  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        const storedToken = await AsyncStorage.getItem("authToken");
        if (storedToken) {
          setToken(storedToken);
          // Get /me if token exists
          try {
            const data = await getMeApi();
            setUser(data.customer || data);
          } catch (e) {
            console.warn("Mã thông báo không hợp lệ hoặc hết hạn", e);
            await AsyncStorage.removeItem("authToken");
            setToken(null);
            setUser(null);
          }
        }
      } catch (e) {
        console.warn("Restoring token failed", e);
      } finally {
        setIsLoading(false);
      }
    };
    bootstrapAsync();
  }, []);

  const login = useCallback(async ({ email, password }) => {
    setIsLoading(true);
    try {
      const data = await loginApi(email, password);
      const jwt = data.token;
      const customer = data.customer;

      if (jwt) {
        await AsyncStorage.setItem("authToken", jwt);
        setToken(jwt);
      }
      setUser(customer);
      return { success: true };
    } catch (err) {
      console.warn("Login failed:", err);
      // throw error to let UI catch it
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async ({ fullName, phone, email, password }) => {
    setIsLoading(true);
    try {
      const data = await registerApi(fullName, phone, email, password);
      // Backend /auth/register might not return token implicitly in contract v0.3
      // We might want to auto login afterwards or redirect to login.
      // Let's assume user needs to login after register, or we just set user.
      if (data.token) {
        await AsyncStorage.setItem("authToken", data.token);
        setToken(data.token);
      }
      setUser(data.customer);
      return { success: true };
    } catch (err) {
      console.warn("Register failed:", err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await AsyncStorage.removeItem("authToken");
      setToken(null);
      setUser(null);
    } catch (e) {
      console.warn("Logout failed", e);
    }
  }, []);

  const displayName = user?.fullName || "Khách";

  return (
    <AuthContext.Provider value={{ user, token, displayName, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

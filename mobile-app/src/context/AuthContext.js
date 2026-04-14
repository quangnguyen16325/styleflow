import React, { createContext, useContext, useState, useCallback } from 'react';

// ── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext(null);

// ── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }) {
  // user: { fullName, phone, email } | null
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Register — lưu thông tin người dùng vào state
   * Không có backend auth — dùng thông tin này khi tạo order
   */
  const register = useCallback(async ({ fullName, phone, email }) => {
    setIsLoading(true);
    try {
      // Simulate a brief delay (UX feedback)
      await new Promise((r) => setTimeout(r, 500));
      setUser({ fullName: fullName.trim(), phone: phone.trim(), email: email.trim() });
      return { success: true };
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Login — đơn giản: hỏi tên + phone, lưu state
   */
  const login = useCallback(async ({ fullName, phone, email }) => {
    setIsLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 500));
      setUser({
        fullName: fullName?.trim() || 'Quang Anh',
        phone: phone?.trim() || '',
        email: email?.trim() || '',
      });
      return { success: true };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
  }, []);

  /**
   * Lấy tên hiển thị:
   * - Nếu đã đăng nhập → tên từ form
   * - Nếu chưa → mặc định "Quang Anh"
   */
  const displayName = user?.fullName || 'Quang Anh';

  return (
    <AuthContext.Provider value={{ user, displayName, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

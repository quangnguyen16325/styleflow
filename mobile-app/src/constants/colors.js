// Ecloria Color System
// Palette: Vibrant Purple + Pink Accent — Premium Fashion App

export const COLORS = {
  // ── Primary Brand ────────────────────────────
  primary: '#6C3CE1',       // Tím đậm — nút chính, tab active
  primaryLight: '#8B5CF6',  // Tím nhạt — gradient points, hover
  primaryDark: '#4C1D95',   // Tím đậm nhất — pressed states
  primaryBg: '#F3F0FF',     // Nền chip, card tag

  // ── Accent / Highlight ───────────────────────
  accent: '#FF3B6B',        // Hồng đỏ — Flash Sale badge, Like ❤️ active
  accentOrange: '#FF6B35',  // Cam — "Hot" tag, warning badge
  accentGold: '#FFB800',    // Vàng — Rating stars, voucher expiry

  // ── Status ───────────────────────────────────
  danger: '#FF2D2D',        // Đỏ — badge số lượng giỏ hàng, "Hết hàng"
  success: '#00C48C',       // Xanh lá — Delivered, Order confirmed
  warning: '#FFB800',       // Vàng — cảnh báo, sắp hết hàng
  info: '#3B82F6',          // Xanh — thông tin trung tính

  // ── Text ─────────────────────────────────────
  textPrimary: '#1A1035',   // Tím đen — text chính, heading
  textSecondary: '#6B7280', // Xám — text phụ, placeholder
  textMuted: '#9CA3AF',     // Xám nhạt — disabled, caption
  textInverse: '#FFFFFF',   // Chữ trên nền tối

  // ── Background ───────────────────────────────
  bgPrimary: '#FFFFFF',     // Nền trang chính
  bgSecondary: '#F8F7FF',   // Nền tổng app (tím cực nhạt)
  bgCard: '#FFFFFF',        // Nền card sản phẩm
  bgInput: '#F3F0FF',       // Nền input field

  // ── Border / Divider ─────────────────────────
  border: '#E8E0FF',        // Border tím nhạt
  divider: '#F0EEFF',       // Đường kẻ phân cách nhẹ

  // ── Gradient stops ───────────────────────────
  gradientStart: '#6C3CE1',
  gradientEnd: '#FF3B6B',
};

export const GRADIENTS = {
  primary: ['#6C3CE1', '#8B5CF6'],
  hero: ['#6C3CE1', '#FF3B6B'],
  flashSale: ['#FF3B6B', '#FF6B35'],
  success: ['#00C48C', '#0EA5E9'],
};

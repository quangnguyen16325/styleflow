/* eslint-disable react/prop-types */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useCart } from '../context/CartContext';
import { COLORS } from '../constants/colors';

// Tab definitions — phải khớp với tên route trong navigator
const TABS = [
  { key: 'Home', label: 'Trang chủ', icon: '🏠', iconActive: '🏠' },
  { key: 'Wishlist', label: 'Yêu thích', icon: '🤍', iconActive: '❤️' },
  { key: 'Track', label: 'Đơn hàng', icon: '📦', iconActive: '📦', centerTab: true },
  { key: 'Cart', label: 'Giỏ hàng', icon: '🛍️', iconActive: '🛍️' },
  { key: 'Profile', label: 'Tôi', icon: '👤', iconActive: '👤' },
];

/**
 * BottomTabBar — custom, ghép vào bottom của MainApp
 * - Center tab (Track) nổi lên, màu accent
 * - Cart tab có badge đỏ hiển thị số lượng
 */
export default function BottomTabBar({ activeTab, onTabPress }) {
  const { totalCount } = useCart();

  return (
    <View style={styles.container}>
      {/* Line trên cùng */}
      <View style={styles.topLine} />

      <View style={styles.tabRow}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;

          if (tab.centerTab) {
            return (
              <TouchableOpacity
                key={tab.key}
                style={styles.centerTabBtn}
                onPress={() => onTabPress(tab.key)}
                activeOpacity={0.85}
              >
                <View style={[styles.centerCircle, isActive && styles.centerCircleActive]}>
                  <Text style={styles.centerIcon}>{isActive ? tab.iconActive : tab.icon}</Text>
                </View>
                <Text style={[styles.centerLabel, isActive && styles.centerLabelActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          }

          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.tabBtn}
              onPress={() => onTabPress(tab.key)}
              activeOpacity={0.7}
            >
              <View style={styles.iconWrapper}>
                <Text style={styles.tabIcon}>{isActive ? tab.iconActive : tab.icon}</Text>
                {/* Badge đỏ chỉ hiển thị trên tab Cart */}
                {tab.key === 'Cart' && totalCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{totalCount > 99 ? '99+' : totalCount}</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.bgPrimary,
    paddingBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },
  topLine: {
    height: 1,
    backgroundColor: COLORS.divider,
  },
  tabRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 4,
    paddingTop: 4,
  },

  // Normal tab
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
  },
  iconWrapper: {
    position: 'relative',
    marginBottom: 3,
  },
  tabIcon: {
    fontSize: 22,
  },
  tabLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  tabLabelActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },

  // Badge on cart
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: COLORS.danger,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: COLORS.bgPrimary,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // Center (floating) tab
  centerTabBtn: {
    flex: 1,
    alignItems: 'center',
    marginTop: -20, // Float lên trên
  },
  centerCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.bgPrimary,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.45,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
    marginBottom: 3,
  },
  centerCircleActive: {
    backgroundColor: COLORS.accent,
    shadowColor: COLORS.accent,
  },
  centerIcon: {
    fontSize: 22,
  },
  centerLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  centerLabelActive: {
    color: COLORS.accent,
    fontWeight: '700',
  },
});

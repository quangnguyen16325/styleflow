/* eslint-disable react/prop-types */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../constants/colors';

export default function WishlistScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>❤️</Text>
      <Text style={styles.title}>Sản phẩm yêu thích</Text>
      <Text style={styles.subtitle}>Bấm ❤️ trên sản phẩm để thêm vào đây</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bgSecondary, gap: 8 },
  icon: { fontSize: 56, marginBottom: 8 },
  title: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', paddingHorizontal: 40 },
});

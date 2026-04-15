/* eslint-disable react/prop-types */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../constants/colors';

export default function ProfileScreen() {
  const { displayName, user, logout } = useAuth();

  return (
    <View style={styles.container}>
      {/* Avatar */}
      <View style={styles.avatarCircle}>
        <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
      </View>
      <Text style={styles.name}>{displayName}</Text>
      {user?.email && <Text style={styles.email}>{user.email}</Text>}
      {user?.phone && <Text style={styles.phone}>{user.phone}</Text>}

      <Text style={styles.note}>Profile đầy đủ sẽ có ở Commit 5 (18/04)</Text>

      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Text style={styles.logoutText}>Đăng xuất</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', backgroundColor: COLORS.bgSecondary, paddingTop: 60, gap: 6 },
  avatarCircle: { width: 90, height: 90, borderRadius: 45, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 12, shadowColor: COLORS.primary, shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
  avatarText: { fontSize: 40, fontWeight: '800', color: '#fff' },
  name: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary },
  email: { fontSize: 14, color: COLORS.textSecondary },
  phone: { fontSize: 14, color: COLORS.textSecondary },
  note: { marginTop: 20, fontSize: 13, color: COLORS.textMuted, fontStyle: 'italic' },
  logoutBtn: { marginTop: 24, backgroundColor: COLORS.danger, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14 },
  logoutText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

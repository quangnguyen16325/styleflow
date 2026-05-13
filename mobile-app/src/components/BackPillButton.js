/* eslint-disable react/prop-types */
import React from "react";
import { StyleSheet, Text, TouchableOpacity } from "react-native";

export default function BackPillButton({ onPress, label = "Quay lại", compact = false }) {
  return (
    <TouchableOpacity
      style={[styles.button, compact && styles.buttonCompact]}
      onPress={onPress}
      activeOpacity={0.86}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Text style={styles.icon}>‹</Text>
      {!compact ? <Text style={styles.label}>{label}</Text> : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingLeft: 10,
    paddingRight: 14,
    paddingVertical: 9,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E6DBCE",
    shadowColor: "#201812",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  buttonCompact: {
    width: 42,
    height: 42,
    justifyContent: "center",
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  icon: {
    color: "#9B4B1F",
    fontSize: 28,
    lineHeight: 28,
    fontWeight: "900",
    marginTop: -2,
  },
  label: {
    color: "#241A13",
    fontSize: 14,
    fontWeight: "900",
    marginLeft: 4,
  },
});

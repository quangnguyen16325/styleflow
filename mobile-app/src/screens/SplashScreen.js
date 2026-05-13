import React from "react";
import { View, Text, StyleSheet, StatusBar, Platform } from "react-native";

export default function SplashScreen() {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1E1815" />

      <View style={styles.content}>
        <Text style={styles.brandWordmark}>Ecloria</Text>
        <Text style={styles.tagline}>Elevating your style</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1E1815",
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    alignItems: "center",
  },
  brandWordmark: {
    color: "#FCF9F4",
    fontSize: 56,
    fontFamily: Platform.select({
      ios: "Georgia",
      android: "serif",
      default: "serif",
    }),
    fontWeight: "700",
    fontStyle: "italic",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 12,
    color: "#DCC4A8",
    letterSpacing: 4,
    textTransform: "uppercase",
    fontWeight: "700",
  },
});

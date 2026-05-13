/* eslint-disable react/prop-types */
import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import AppIcon from "./AppIcon";

export default function AppImage({ source, style, ...props }) {
  // Determine if we have a valid source URI
  const isValidSource =
    source &&
    (typeof source === "number" ||
      (typeof source === "object" &&
        source.uri &&
        typeof source.uri === "string" &&
        source.uri.trim() !== "" &&
        !source.uri.includes("unsplash.com") &&
        !source.uri.includes("picsum.photos")));

  if (!isValidSource) {
    return (
      <View style={[styles.placeholderContainer, style]}>
        <AppIcon name="image" size={20} color="#AA9C8F" />
        <Text style={styles.placeholderText}>Chưa có ảnh</Text>
      </View>
    );
  }

  return <Image source={source} style={style} {...props} />;
}

const styles = StyleSheet.create({
  placeholderContainer: {
    backgroundColor: "#F1EBE4", // Earthy light gray/brown
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  placeholderText: {
    color: "#8A7B6F",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 6,
  },
});

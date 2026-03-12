import React from "react";
import { SafeAreaView, View, Text } from "react-native";

export default function App() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#ffffff" }}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
        <Text style={{ fontSize: 24, fontWeight: "700", marginBottom: 8 }}>Mobile App Base</Text>
        <Text style={{ textAlign: "center", color: "#6b7280" }}>Clean Expo base.</Text>
      </View>
    </SafeAreaView>
  );
}

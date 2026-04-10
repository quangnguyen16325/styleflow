/* eslint-disable react/prop-types */
import React from "react";
import { View, Text, Button } from "react-native";

export default function ProductListScreen({ navigation }) {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text style={{ fontSize: 24, fontWeight: "bold", marginBottom: 20 }}>
        Đây là màn hình DANH SÁCH
      </Text>

      <Button title="Xem Chi Tiết Sản Phẩm" onPress={() => navigation.navigate("ProductDetail")} />
    </View>
  );
}

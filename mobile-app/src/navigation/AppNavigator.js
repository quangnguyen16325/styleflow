import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

// Import 5 màn hình
import ProductListScreen from "../screens/ProductListScreen";
import ProductDetailScreen from "../screens/ProductDetailScreen";
import CartScreen from "../screens/CartScreen";
import CheckoutScreen from "../screens/CheckoutScreen";
import SuccessScreen from "../screens/SuccessScreen";

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <Stack.Navigator initialRouteName="ProductList">
      <Stack.Screen
        name="ProductList"
        component={ProductListScreen}
        options={{ title: "Cửa hàng" }}
      />
      <Stack.Screen
        name="ProductDetail"
        component={ProductDetailScreen}
        options={{ title: "Chi tiết sản phẩm" }}
      />
      <Stack.Screen name="Cart" component={CartScreen} options={{ title: "Giỏ hàng" }} />
      <Stack.Screen name="Checkout" component={CheckoutScreen} options={{ title: "Thanh toán" }} />
      <Stack.Screen name="Success" component={SuccessScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

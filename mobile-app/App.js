import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { AuthProvider } from "./src/context/AuthContext";
import { CartProvider } from "./src/context/CartContext";
import { WishlistProvider } from "./src/context/WishlistContext";
import AppNavigator from "./src/navigation/AppNavigator";

export default function App() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#ffffff" }}>
      <AuthProvider>
        <WishlistProvider>
          <CartProvider>
            <NavigationContainer>
              <AppNavigator />
            </NavigationContainer>
          </CartProvider>
        </WishlistProvider>
      </AuthProvider>
    </SafeAreaView>
  );
}

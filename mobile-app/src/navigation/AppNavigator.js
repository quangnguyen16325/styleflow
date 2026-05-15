/* eslint-disable react/prop-types */
import React, { useState, useCallback } from "react";
import { View, StyleSheet } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../context/AuthContext";

// Components
import BottomTabBar from "../components/BottomTabBar";

// Screens — Auth
import SplashScreen from "../screens/SplashScreen";
import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";

// Screens — Tab roots
import HomeScreen from "../screens/HomeScreen";
import WishlistScreen from "../screens/WishlistScreen";
import OrderTrackingScreen from "../screens/OrderTrackingScreen";
import CartScreen from "../screens/CartScreen";
import ProfileScreen from "../screens/ProfileScreen";

// Screens — Stack children
import ProductListScreen from "../screens/ProductListScreen";
import ProductDetailScreen from "../screens/ProductDetailScreen";
import CheckoutScreen from "../screens/CheckoutScreen";
import SuccessScreen from "../screens/SuccessScreen";
import OrderScreen from "../screens/OrderScreen";
import SettingsScreen from "../screens/SettingsScreen";
import AddressListScreen from "../screens/AddressListScreen";
import AddressFormScreen from "../screens/AddressFormScreen";
import ReturnRequestScreen from "../screens/ReturnRequestScreen";

const Stack = createNativeStackNavigator();

function createStackScreenOptions() {
  return {
    contentStyle: {
      backgroundColor: "#FCF9F4",
    },
    headerStyle: {
      backgroundColor: "#FCF9F4",
    },
    headerShadowVisible: false,
    headerTitleStyle: {
      color: "#241A13",
      fontSize: 18,
      fontWeight: "800",
    },
    headerBackTitle: "",
    headerBackTitleVisible: false,
    headerBackButtonDisplayMode: "minimal",
    headerTintColor: "#9B4B1F",
  };
}

// ── Auth Stack ───────────────────────────────────────────────────────────────

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

// ── Main App — wrapper với custom BottomTabBar ───────────────────────────────

const TAB_SCREENS = {
  Home: HomeScreen,
  Wishlist: WishlistScreen,
  Track: OrderScreen, // Dùng OrderScreen cho danh sách đơn hàng (Tab)
  Cart: CartScreen,
  Profile: ProfileScreen,
};

function MainTabsWithNavigation({ navigation }) {
  const [activeTab, setActiveTab] = useState("Home");

  const handleTabPress = useCallback(
    (tabKey) => {
      if (tabKey === "Cart") {
        // Cart vẫn dùng stack navigator để có header
        navigation.navigate("CartStack");
        return;
      }
      setActiveTab(tabKey);
    },
    [navigation],
  );

  const handleSettingsPress = useCallback(() => {
    navigation.navigate("Settings");
  }, [navigation]);

  const ActiveScreen = TAB_SCREENS[activeTab];

  return (
    <View style={styles.mainContainer}>
      {/* Render tab content */}
      <View style={styles.screenContainer}>
        <ActiveScreen
          navigation={navigation}
          onSettingsPress={handleSettingsPress}
          onTabSwitch={setActiveTab}
        />
      </View>

      {/* Custom Bottom Tab Bar */}
      <BottomTabBar activeTab={activeTab} onTabPress={handleTabPress} />
    </View>
  );
}

// ── Main App Stack (bao gồm tabs + overlay screens) ─────────────────────────

function MainAppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="MainTabs"
        component={MainTabsWithNavigation}
        options={{ title: "", headerBackTitle: "" }}
      />
      <Stack.Screen
        name="ProductList"
        component={ProductListScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ProductDetail"
        component={ProductDetailScreen}
        options={() => ({
          headerShown: true,
          title: "Chi tiết",
          ...createStackScreenOptions(),
        })}
      />
      <Stack.Screen
        name="CartStack"
        component={CartScreen}
        options={() => ({
          headerShown: true,
          title: "Giỏ hàng",
          ...createStackScreenOptions(),
        })}
      />
      <Stack.Screen
        name="Checkout"
        component={CheckoutScreen}
        options={() => ({
          headerShown: true,
          title: "Thanh toán",
          ...createStackScreenOptions(),
        })}
      />
      <Stack.Screen name="Success" component={SuccessScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="OrderTracking"
        component={OrderTrackingScreen}
        options={{
          headerShown: false, // Custom header internally
        }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={() => ({
          headerShown: true,
          title: "Cài đặt",
          ...createStackScreenOptions(),
        })}
      />
      <Stack.Screen
        name="AddressList"
        component={AddressListScreen}
        options={() => ({
          headerShown: true,
          title: "Sổ địa chỉ",
          ...createStackScreenOptions(),
        })}
      />
      <Stack.Screen
        name="AddressForm"
        component={AddressFormScreen}
        options={() => ({
          headerShown: true,
          title: "Thêm địa chỉ",
          ...createStackScreenOptions(),
        })}
      />
      <Stack.Screen
        name="ReturnRequest"
        component={ReturnRequestScreen}
        options={() => ({
          headerShown: true,
          title: "Yêu cầu trả hàng",
          ...createStackScreenOptions(),
        })}
      />
    </Stack.Navigator>
  );
}

// ── Root Navigator ────────────────────────────────────────────────────────────

const Root = createNativeStackNavigator();

export default function AppNavigator() {
  const { user, token, isLoading } = useAuth();
  const isAuthenticated = Boolean(token && user);

  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <Root.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <Root.Screen name="MainApp" component={MainAppStack} />
      ) : (
        <Root.Screen name="Auth" component={AuthStack} />
      )}
    </Root.Navigator>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: "#FCF9F4" },
  screenContainer: { flex: 1, backgroundColor: "#FCF9F4" },
});

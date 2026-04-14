import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Screens — Auth
import SplashScreen from '../screens/SplashScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';

// Screens — Main
import HomeScreen from '../screens/HomeScreen';
import ProductListScreen from '../screens/ProductListScreen';
import ProductDetailScreen from '../screens/ProductDetailScreen';
import CartScreen from '../screens/CartScreen';
import CheckoutScreen from '../screens/CheckoutScreen';
import SuccessScreen from '../screens/SuccessScreen';

const Stack = createNativeStackNavigator();

// ── Auth Stack (màn hình trước khi đăng nhập) ────────────────────────────────
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

// ── Main App Stack (sau khi đăng nhập) ──────────────────────────────────────
function MainAppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen
        name="ProductList"
        component={ProductListScreen}
        options={{ headerShown: true, title: 'Sản phẩm', headerTintColor: '#6C3CE1' }}
      />
      <Stack.Screen
        name="ProductDetail"
        component={ProductDetailScreen}
        options={{ headerShown: true, title: 'Chi tiết sản phẩm', headerTintColor: '#6C3CE1' }}
      />
      <Stack.Screen
        name="Cart"
        component={CartScreen}
        options={{ headerShown: true, title: 'Giỏ hàng', headerTintColor: '#6C3CE1' }}
      />
      <Stack.Screen
        name="Checkout"
        component={CheckoutScreen}
        options={{ headerShown: true, title: 'Thanh toán', headerTintColor: '#6C3CE1' }}
      />
      <Stack.Screen name="Success" component={SuccessScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

// ── Root Navigator ────────────────────────────────────────────────────────────
export default function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {/* Bắt đầu từ Auth — sau login sẽ replace sang MainApp */}
      <Stack.Screen name="Auth" component={AuthStack} />
      <Stack.Screen name="MainApp" component={MainAppStack} />
    </Stack.Navigator>
  );
}

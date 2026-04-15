import React, { useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Components
import BottomTabBar from '../components/BottomTabBar';

// Screens — Auth
import SplashScreen from '../screens/SplashScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';

// Screens — Tab roots
import HomeScreen from '../screens/HomeScreen';
import WishlistScreen from '../screens/WishlistScreen';
import OrderTrackingScreen from '../screens/OrderTrackingScreen';
import CartScreen from '../screens/CartScreen';
import ProfileScreen from '../screens/ProfileScreen';

// Screens — Stack children
import ProductListScreen from '../screens/ProductListScreen';
import ProductDetailScreen from '../screens/ProductDetailScreen';
import CheckoutScreen from '../screens/CheckoutScreen';
import SuccessScreen from '../screens/SuccessScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Stack = createNativeStackNavigator();

// ── Auth Stack ───────────────────────────────────────────────────────────────

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

// ── Main App — wrapper với custom BottomTabBar ───────────────────────────────

const TAB_SCREENS = {
  Home: HomeScreen,
  Wishlist: WishlistScreen,
  Track: OrderTrackingScreen,
  Cart: CartScreen,
  Profile: ProfileScreen,
};

function MainTabsWithNavigation({ navigation }) {
  const [activeTab, setActiveTab] = useState('Home');

  const handleTabPress = useCallback(
    (tabKey) => {
      if (tabKey === 'Cart') {
        // Cart vẫn dùng stack navigator để có header
        navigation.navigate('CartStack');
        return;
      }
      setActiveTab(tabKey);
    },
    [navigation]
  );

  const handleSettingsPress = useCallback(() => {
    navigation.navigate('Settings');
  }, [navigation]);

  const ActiveScreen = TAB_SCREENS[activeTab];

  return (
    <View style={styles.mainContainer}>
      {/* Render tab content */}
      <View style={styles.screenContainer}>
        <ActiveScreen
          navigation={navigation}
          onSettingsPress={handleSettingsPress}
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
      <Stack.Screen name="MainTabs" component={MainTabsWithNavigation} />
      <Stack.Screen
        name="ProductList"
        component={ProductListScreen}
        options={{ headerShown: true, title: 'Sản phẩm', headerTintColor: '#6C3CE1', headerBackTitle: 'Quay lại' }}
      />
      <Stack.Screen
        name="ProductDetail"
        component={ProductDetailScreen}
        options={{ headerShown: true, title: 'Chi tiết', headerTintColor: '#6C3CE1', headerBackTitle: 'Quay lại' }}
      />
      <Stack.Screen
        name="CartStack"
        component={CartScreen}
        options={{ headerShown: true, title: 'Giỏ hàng', headerTintColor: '#6C3CE1', headerBackTitle: 'Quay lại' }}
      />
      <Stack.Screen
        name="Checkout"
        component={CheckoutScreen}
        options={{ headerShown: true, title: 'Thanh toán', headerTintColor: '#6C3CE1', headerBackTitle: 'Quay lại' }}
      />
      <Stack.Screen name="Success" component={SuccessScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ headerShown: true, title: 'Cài đặt', headerTintColor: '#6C3CE1', headerBackTitle: 'Quay lại' }}
      />
    </Stack.Navigator>
  );
}

// ── Root Navigator ────────────────────────────────────────────────────────────

const Root = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <Root.Navigator screenOptions={{ headerShown: false }}>
      <Root.Screen name="Auth" component={AuthStack} />
      <Root.Screen name="MainApp" component={MainAppStack} />
    </Root.Navigator>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1 },
  screenContainer: { flex: 1 },
});

/* eslint-disable react/prop-types */
import React from "react";
import { View, StyleSheet } from "react-native";
import {
  Home,
  Heart,
  ListOrdered,
  ShoppingCart,
  User,
  Settings,
  Search,
  X,
  Check,
  Camera,
  Image as ImageIcon,
  MapPin,
  Building,
  MoreHorizontal,
  FileText,
  LogOut,
  ChevronDown,
  Shield,
  Bell,
  Circle,
} from "lucide-react-native";

const ICONS = {
  home: Home,
  heart: Heart,
  heartFilled: (props) => <Heart {...props} fill={props.color} />,
  orders: ListOrdered,
  cart: ShoppingCart,
  profile: User,
  settings: Settings,
  search: Search,
  close: X,
  check: Check,
  camera: Camera,
  image: ImageIcon,
  location: MapPin,
  office: Building,
  other: MoreHorizontal,
  note: FileText,
  logout: LogOut,
  chevronDown: ChevronDown,
  shield: Shield,
  bell: Bell,
};

export default function AppIcon({ name, size = 18, color = "#6F5847", style }) {
  const IconComponent = ICONS[name] || Circle;

  return (
    <View style={[styles.container, style]}>
      <IconComponent size={size} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
});

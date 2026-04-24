/* eslint-disable react/prop-types */
import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Image,
  StyleSheet,
  Dimensions,
} from "react-native";

const screenWidth = Dimensions.get("window").width;

const MOCK_PRODUCTS = [
  {
    id: "1",
    name: "Áo thun nam basic",
    price: "150.000đ",
    image: "https://via.placeholder.com/200/FF5733/FFFFFF?text=AoThun",
  },
  {
    id: "2",
    name: "Quần Jeans ống rộng",
    price: "350.000đ",
    image: "https://via.placeholder.com/200/33C1FF/FFFFFF?text=QuanJeans",
  },
  {
    id: "3",
    name: "Giày Sneaker thể thao",
    price: "650.000đ",
    image: "https://via.placeholder.com/200/75FF33/FFFFFF?text=Giay",
  },
  {
    id: "4",
    name: "Mũ lưỡi trai",
    price: "85.000đ",
    image: "https://via.placeholder.com/200/FFC300/FFFFFF?text=Mu",
  },
];

export default function ProductListScreen({ navigation }) {
  const renderProduct = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate("ProductDetail", { productId: item.id })}
      activeOpacity={0.8}
    >
      <Image source={{ uri: item.image }} style={styles.image} />
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={styles.price}>{item.price}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={MOCK_PRODUCTS}
        keyExtractor={(item) => item.id}
        renderItem={renderProduct}
        numColumns={2}
        contentContainerStyle={{ paddingHorizontal: 10, paddingBottom: 20 }}
        columnWrapperStyle={{ justifyContent: "space-between" }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    paddingTop: 10,
  },
  card: {
    backgroundColor: "#FFF",
    width: screenWidth / 2 - 15,
    marginBottom: 15,
    borderRadius: 8,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  image: {
    width: "100%",
    height: 170,
    resizeMode: "cover",
  },
  info: {
    padding: 10,
  },
  name: {
    fontSize: 14,
    color: "#333",
    marginBottom: 5,
    height: 40,
  },
  price: {
    fontSize: 16,
    color: "#EE4D2D",
    fontWeight: "bold",
  },
});

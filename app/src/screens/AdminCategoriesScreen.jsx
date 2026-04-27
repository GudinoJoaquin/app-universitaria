import React from "react";
import { View, StyleSheet, TouchableOpacity, Text, StatusBar } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import CategoriesListTab from "../components/management/CategoriesListTab";

export default function AdminCategoriesScreen({ navigation }) {
  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" />
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Gestionar Categorías</Text>
        <View style={{ width: 40 }} />
      </View>
      
      <View style={{ flex: 1 }}>
        <CategoriesListTab searchText="" />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "space-between", 
    paddingHorizontal: 20, 
    paddingTop: 60, 
    paddingBottom: 20, 
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9"
  },
  backBtn: { width: 40, height: 40, justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 18, fontWeight: "900", color: "#1E293B" },
});

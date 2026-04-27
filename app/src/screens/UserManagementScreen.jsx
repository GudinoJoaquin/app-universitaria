import React, { useState } from "react";
import { View, StyleSheet, TouchableOpacity, Text, StatusBar, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import UserListTab from "../components/management/UserListTab";

export default function UserManagementScreen({ navigation }) {
  const [searchText, setSearchText] = useState("");

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={["#1E3A8A", "#3B82F6"]} style={s.header}>
        <View style={s.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Gestión de Usuarios</Text>
        </View>
        
        <View style={s.searchContainer}>
          <View style={s.searchBar}>
            <Ionicons name="search" size={16} color="rgba(255,255,255,0.6)" />
            <TextInput 
              style={s.searchInput} 
              placeholder="Buscar por nombre o email..." 
              placeholderTextColor="rgba(255,255,255,0.5)" 
              value={searchText}
              onChangeText={setSearchText}
            />
          </View>
        </View>
      </LinearGradient>
      
      <View style={{ flex: 1 }}>
        {/* Usamos el componente pulido con los filtros y la jerarquía correcta */}
        <UserListTab searchText={searchText} filterRole={null} filterStateId={null} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: { 
    paddingTop: 60, 
    paddingBottom: 20, 
    borderBottomLeftRadius: 32, 
    borderBottomRightRadius: 32 
  },
  headerContent: { 
    flexDirection: "row", 
    alignItems: "center", 
    paddingHorizontal: 20, 
    marginBottom: 20 
  },
  backBtn: { width: 40, height: 40, justifyContent: "center", alignItems: "center", marginRight: 10 },
  headerTitle: { fontSize: 20, fontWeight: "900", color: "white" },
  searchContainer: { paddingHorizontal: 24 },
  searchBar: { 
    flexDirection: "row", 
    alignItems: "center", 
    backgroundColor: "rgba(255,255,255,0.15)", 
    borderRadius: 16, 
    paddingHorizontal: 16, 
    height: 48,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)"
  },
  searchInput: { flex: 1, color: "white", fontSize: 14, fontWeight: "600", marginLeft: 10 },
});

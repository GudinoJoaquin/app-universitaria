import React, { useState } from "react";
import { View, Text, StyleSheet, StatusBar, TextInput, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";

// Tabs components
import UserListTab from "../components/management/UserListTab";
import StatesListTab from "../components/management/StatesListTab";
import CategoriesListTab from "../components/management/CategoriesListTab";

export default function GestionScreen({ navigation }) {
  const { isAdmin } = useAuth();
  
  const TABS = isAdmin() ? ["Usuarios", "Estados", "Categorías"] : ["Usuarios"];
  const [activeTab, setActiveTab] = useState(0);
  const [searchText, setSearchText] = useState("");

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={["#1E3A8A", "#3B82F6"]} style={s.header}>
        <View style={s.headerContent}>
          <Text style={s.headerTitle}>Gestión Hub ⚙️</Text>
          <View style={s.searchBar}>
            <Ionicons name="search" size={16} color="white" style={{ opacity: 0.7 }} />
            <TextInput 
              style={s.searchInput} 
              placeholder={`Buscar en ${TABS[activeTab].toLowerCase()}...`} 
              placeholderTextColor="rgba(255,255,255,0.6)" 
              value={searchText}
              onChangeText={setSearchText}
            />
          </View>
        </View>

        {/* Tabs */}
        <View style={s.tabBar}>
          {TABS.map((tab, i) => (
            <Pressable key={tab} style={[s.tabItem, activeTab === i && s.tabItemActive]} onPress={() => { setActiveTab(i); setSearchText(""); }}>
              <Text style={[s.tabText, activeTab === i && s.tabTextActive]}>{tab}</Text>
            </Pressable>
          ))}
        </View>
      </LinearGradient>

      <View style={{ flex: 1 }}>
        {activeTab === 0 && <UserListTab searchText={searchText} />}
        {activeTab === 1 && <StatesListTab searchText={searchText} />}
        {activeTab === 2 && <CategoriesListTab searchText={searchText} />}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: { paddingTop: 60, paddingBottom: 0, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerContent: { paddingHorizontal: 24, marginBottom: 15 },
  headerTitle: { fontSize: 24, fontWeight: "900", color: "white", marginBottom: 15 },
  searchBar: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 16, paddingHorizontal: 15, height: 44 },
  searchInput: { flex: 1, color: "white", fontSize: 14, marginLeft: 10 },
  tabBar: { flexDirection: "row", marginTop: 5 },
  tabItem: { flex: 1, paddingVertical: 16, alignItems: "center", borderBottomWidth: 4, borderBottomColor: "transparent" },
  tabItemActive: { borderBottomColor: "white" },
  tabText: { fontSize: 13, fontWeight: "700", color: "rgba(255,255,255,0.6)" },
  tabTextActive: { color: "white", fontWeight: "900" },
});



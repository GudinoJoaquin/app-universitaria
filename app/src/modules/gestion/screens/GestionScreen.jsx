// GestionScreen.jsx - Versión rediseñada profesional
import React, { useState, useEffect } from "react";
import { 
  View, Text, StyleSheet, StatusBar,
  Pressable, Dimensions
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../auth/context/AuthContext";
import { getAllStates } from "../services/statesService";

// Tabs components
import UserListTab from "../components/UserListTab";
import StatesListTab from "../components/StatesListTab";
import CategoriesListTab from "../components/CategoriesListTab";

const { height, width } = Dimensions.get("window");

export default function GestionScreen({ navigation }) {
  const { isAdmin } = useAuth();
  
  const TABS = isAdmin() ? ["Usuarios", "Estados", "Categorías"] : ["Usuarios"];
  const [activeTab, setActiveTab] = useState(0);
  const [states, setStates] = useState([]);

  useEffect(() => {
    const loadStates = async () => {
      const res = await getAllStates();
      if (res.success) setStates(res.data);
    };
    loadStates();
  }, []);

  const getTabIcon = (tabName) => {
    switch(tabName) {
      case "Usuarios": return "people";
      case "Estados": return "layers";
      case "Categorías": return "grid";
      default: return "settings";
    }
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1E3A8A" />
      
      {/* Header ultra limpio */}
      <LinearGradient colors={["#0F172A", "#1E293B"]} style={s.header}>
        <View style={s.headerTop}>
          <View>
            <Text style={s.headerTitle}>Gestión</Text>
            <Text style={s.headerSubtitle}>
              Administra usuarios, estados y categorías
            </Text>
          </View>
        </View>
        
        {/* Tabs mejoradas */}
        <View style={s.tabBar}>
          {TABS.map((tab, i) => (
            <Pressable 
              key={tab} 
              style={[s.tabItem, activeTab === i && s.tabItemActive]} 
              onPress={() => setActiveTab(i)}
            >
              <Ionicons 
                name={getTabIcon(tab)} 
                size={18} 
                color={activeTab === i ? "white" : "rgba(255,255,255,0.6)"} 
                style={s.tabIcon}
              />
              <Text style={[s.tabText, activeTab === i && s.tabTextActive]}>
                {tab}
              </Text>
              {activeTab === i && <View style={s.tabIndicator} />}
            </Pressable>
          ))}
        </View>
      </LinearGradient>

      {/* Content */}
      <View style={s.content}>
        {activeTab === 0 && <UserListTab states={states} />}
        {activeTab === 1 && <StatesListTab />}
        {activeTab === 2 && <CategoriesListTab />}
      </View>

    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  
  // Header
  header: {
    paddingTop: 56,
    paddingBottom: 16,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "white",
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
  },
  
  // Tabs
  tabBar: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 4,
    gap: 8,
  },
  tabItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 30,
    gap: 8,
    position: "relative",
  },
  tabItemActive: {
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  tabIcon: {
    opacity: 0.8,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255,255,255,0.7)",
  },
  tabTextActive: {
    color: "white",
    fontWeight: "700",
  },
  tabIndicator: {
    position: "absolute",
    bottom: 0,
    left: "25%",
    right: "25%",
    height: 3,
    backgroundColor: "white",
    borderRadius: 2,
  },
  
  // Content
  content: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
});





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
import ModuleHeader from "../../shared/components/ModuleHeader";

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
      
      <ModuleHeader 
        title="Gestión"
        subtitle="Administra usuarios, estados y categorías"
        tabs={TABS}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        getTabIcon={getTabIcon}
      />

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
  
  // Content
  content: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
});





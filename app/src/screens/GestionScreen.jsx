// GestionScreen.jsx - Versión rediseñada profesional
import React, { useState, useEffect } from "react";
import { 
  View, Text, StyleSheet, StatusBar, TextInput, 
  Pressable, ScrollView, TouchableOpacity, Modal, 
  Dimensions, SafeAreaView 
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { getAllStates } from "../services/statesService";

// Tabs components
import UserListTab from "../components/management/UserListTab";
import StatesListTab from "../components/management/StatesListTab";
import CategoriesListTab from "../components/management/CategoriesListTab";

const { height, width } = Dimensions.get("window");

const ROLES = [
  { id: "Admin", label: "Administrador", color: "#EF4444", icon: "shield-checkmark" },
  { id: "Helper", label: "Helper", color: "#8B5CF6", icon: "briefcase" },
  { id: "Organizer", label: "Organizador", color: "#F59E0B", icon: "calendar" },
  { id: "User", label: "Usuario", color: "#3B82F6", icon: "person" },
];

export default function GestionScreen({ navigation }) {
  const { isAdmin } = useAuth();
  
  const TABS = isAdmin() ? ["Usuarios", "Estados", "Categorías"] : ["Usuarios"];
  const [activeTab, setActiveTab] = useState(0);
  const [searchText, setSearchText] = useState("");
  
  // Filters
  const [filterRole, setFilterRole] = useState(null);
  const [filterStateId, setFilterStateId] = useState(null);
  const [states, setStates] = useState([]);
  
  // Dropdowns state
  const [roleMenuVisible, setRoleMenuVisible] = useState(false);
  const [stateMenuVisible, setStateMenuVisible] = useState(false);

  useEffect(() => {
    const loadStates = async () => {
      const res = await getAllStates();
      if (res.success) setStates(res.data);
    };
    loadStates();
  }, []);

  const clearFilters = () => {
    setFilterRole(null);
    setFilterStateId(null);
    setSearchText("");
  };

  const selectedRole = ROLES.find(r => r.id === filterRole);
  const selectedState = states.find(s => s.id === filterStateId);

  const getTabIcon = (tabName) => {
    switch(tabName) {
      case "Usuarios": return "people";
      case "Estados": return "layers";
      case "Categorías": return "grid";
      default: return "settings";
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1E3A8A" />
      
      {/* Header mejorado */}
      <LinearGradient colors={["#1E3A8A", "#2563EB"]} style={s.header}>
        <View style={s.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={22} color="white" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Gestión</Text>
          <View style={{ width: 40 }} />
        </View>
        
        <Text style={s.headerSubtitle}>
          Administra usuarios, estados y categorías
        </Text>
        
        {/* Search Bar mejorada */}
        <View style={s.searchWrapper}>
          <View style={s.searchBar}>
            <Ionicons name="search-outline" size={20} color="#94A3B8" />
            <TextInput 
              style={s.searchInput} 
              placeholder={`Buscar en ${TABS[activeTab].toLowerCase()}...`} 
              placeholderTextColor="#94A3B8" 
              value={searchText}
              onChangeText={setSearchText}
            />
            {searchText !== "" && (
              <TouchableOpacity onPress={() => setSearchText("")}>
                <Ionicons name="close-circle" size={18} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>
          
          {(filterRole || filterStateId) && (
            <TouchableOpacity onPress={clearFilters} style={s.clearChip}>
              <Ionicons name="close" size={14} color="#EF4444" />
              <Text style={s.clearChipTxt}>Limpiar filtros</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Dropdowns Bar - Solo para usuarios */}
        {activeTab === 0 && (
          <View style={s.filtersRow}>
            <TouchableOpacity 
              style={[s.filterChip, filterRole && s.filterChipActive]} 
              onPress={() => setRoleMenuVisible(true)}
            >
              <Ionicons 
                name="people-outline" 
                size={16} 
                color={filterRole ? "white" : "#64748B"} 
              />
              <Text style={[s.filterChipTxt, filterRole && s.filterChipTxtActive]}>
                {selectedRole ? selectedRole.label : "Todos los roles"}
              </Text>
              <Ionicons 
                name="chevron-down" 
                size={14} 
                color={filterRole ? "white" : "#94A3B8"} 
              />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[s.filterChip, filterStateId && s.filterChipActive]} 
              onPress={() => setStateMenuVisible(true)}
            >
              <Ionicons 
                name="pricetags-outline" 
                size={16} 
                color={filterStateId ? "white" : "#64748B"} 
              />
              <Text style={[s.filterChipTxt, filterStateId && s.filterChipTxtActive]}>
                {selectedState ? selectedState.name : "Todos los estados"}
              </Text>
              <Ionicons 
                name="chevron-down" 
                size={14} 
                color={filterStateId ? "white" : "#94A3B8"} 
              />
            </TouchableOpacity>
          </View>
        )}

        {/* Tabs mejoradas */}
        <View style={s.tabBar}>
          {TABS.map((tab, i) => (
            <Pressable 
              key={tab} 
              style={[s.tabItem, activeTab === i && s.tabItemActive]} 
              onPress={() => { 
                setActiveTab(i); 
                setSearchText(""); 
              }}
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
        {activeTab === 0 && (
          <UserListTab 
            searchText={searchText} 
            filterRole={filterRole} 
            filterStateId={filterStateId} 
          />
        )}
        {activeTab === 1 && <StatesListTab searchText={searchText} />}
        {activeTab === 2 && <CategoriesListTab searchText={searchText} />}
      </View>

      {/* Bottom Sheets - Mejorados */}
      
      {/* Selector de Rol */}
      <Modal visible={roleMenuVisible} transparent animationType="slide" onRequestClose={() => setRoleMenuVisible(false)}>
        <View style={s.sheetOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setRoleMenuVisible(false)} />
          <View style={s.sheetContent}>
            <View style={s.sheetHandle} />
            
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>Filtrar por Rol</Text>
              <TouchableOpacity onPress={() => setRoleMenuVisible(false)}>
                <Ionicons name="close" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              <TouchableOpacity 
                style={[s.sheetItem, !filterRole && s.sheetItemActive]} 
                onPress={() => { setFilterRole(null); setRoleMenuVisible(false); }}
              >
                <View style={[s.sheetItemIcon, { backgroundColor: "#F1F5F9" }]}>
                  <Ionicons name="apps" size={20} color="#64748B" />
                </View>
                <Text style={[s.sheetItemTxt, !filterRole && s.sheetItemTxtActive]}>
                  Todos los roles
                </Text>
                {!filterRole && <Ionicons name="checkmark-circle" size={22} color="#3B82F6" />}
              </TouchableOpacity>

              {ROLES.map(r => (
                <TouchableOpacity 
                  key={r.id} 
                  style={[s.sheetItem, filterRole === r.id && { backgroundColor: r.color + "08" }]} 
                  onPress={() => { setFilterRole(r.id); setRoleMenuVisible(false); }}
                >
                  <View style={[s.sheetItemIcon, { backgroundColor: r.color + "15" }]}>
                    <Ionicons name={r.icon} size={20} color={r.color} />
                  </View>
                  <Text style={[s.sheetItemTxt, filterRole === r.id && { color: r.color, fontWeight: "700" }]}>
                    {r.label}
                  </Text>
                  {filterRole === r.id && <Ionicons name="checkmark-circle" size={22} color={r.color} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Selector de Estado */}
      <Modal visible={stateMenuVisible} transparent animationType="slide" onRequestClose={() => setStateMenuVisible(false)}>
        <View style={s.sheetOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setStateMenuVisible(false)} />
          <View style={[s.sheetContent, { maxHeight: height * 0.7 }]}>
            <View style={s.sheetHandle} />
            
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>Filtrar por Estado</Text>
              <TouchableOpacity onPress={() => setStateMenuVisible(false)}>
                <Ionicons name="close" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              <TouchableOpacity 
                style={[s.sheetItem, !filterStateId && s.sheetItemActive]} 
                onPress={() => { setFilterStateId(null); setStateMenuVisible(false); }}
              >
                <View style={[s.sheetItemIcon, { backgroundColor: "#F1F5F9" }]}>
                  <Ionicons name="layers" size={20} color="#64748B" />
                </View>
                <Text style={[s.sheetItemTxt, !filterStateId && s.sheetItemTxtActive]}>
                  Todos los estados
                </Text>
                {!filterStateId && <Ionicons name="checkmark-circle" size={22} color="#3B82F6" />}
              </TouchableOpacity>

              {states.map(st => (
                <TouchableOpacity 
                  key={st.id} 
                  style={[s.sheetItem, filterStateId === st.id && { backgroundColor: st.color + "08" }]} 
                  onPress={() => { setFilterStateId(st.id); setStateMenuVisible(false); }}
                >
                  <View style={[s.sheetItemIcon, { backgroundColor: st.color + "15" }]}>
                    <View style={[s.dotSmall, { backgroundColor: st.color }]} />
                  </View>
                  <Text style={[s.sheetItemTxt, filterStateId === st.id && { color: st.color, fontWeight: "700" }]}>
                    {st.name}
                  </Text>
                  {filterStateId === st.id && <Ionicons name="checkmark-circle" size={22} color={st.color} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  
  // Header
  header: {
    paddingTop: 12,
    paddingBottom: 0,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    shadowColor: "#1E3A8A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "white",
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  
  // Search
  searchWrapper: {
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 16,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    color: "white",
    fontSize: 15,
    fontWeight: "500",
  },
  clearChip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  clearChipTxt: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FEE2E2",
  },
  
  // Filters
  filtersRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 16,
  },
  filterChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 30,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  filterChipActive: {
    backgroundColor: "rgba(255,255,255,0.3)",
    borderColor: "rgba(255,255,255,0.5)",
  },
  filterChipTxt: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255,255,255,0.9)",
  },
  filterChipTxtActive: {
    color: "white",
  },
  
  // Tabs
  tabBar: {
    flexDirection: "row",
    marginTop: 4,
  },
  tabItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
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
  
  // Bottom Sheets
  sheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-end",
  },
  sheetContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 20,
  },
  sheetHandle: {
    width: 50,
    height: 5,
    backgroundColor: "#E2E8F0",
    borderRadius: 3,
    alignSelf: "center",
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E293B",
  },
  sheetItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    marginBottom: 8,
    gap: 14,
  },
  sheetItemActive: {
    backgroundColor: "#F0F9FF",
  },
  sheetItemIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  sheetItemTxt: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#334155",
  },
  sheetItemTxtActive: {
    color: "#3B82F6",
  },
  dotSmall: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});
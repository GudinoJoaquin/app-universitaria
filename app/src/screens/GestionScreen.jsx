import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, StatusBar, TextInput, Pressable, ScrollView, TouchableOpacity, Modal, Dimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { getAllStates } from "../services/statesService";

// Tabs components
import UserListTab from "../components/management/UserListTab";
import StatesListTab from "../components/management/StatesListTab";
import CategoriesListTab from "../components/management/CategoriesListTab";

const { height } = Dimensions.get("window");

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

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={["#1E3A8A", "#3B82F6"]} style={s.header}>
        <View style={s.headerContent}>
          <View style={s.titleRow}>
            <Text style={s.headerTitle}>Gestión Hub ⚙️</Text>
            {(filterRole || filterStateId || searchText !== "") && (
              <TouchableOpacity onPress={clearFilters} style={s.clearBtn}>
                <Ionicons name="close-circle" size={14} color="white" />
                <Text style={s.clearBtnTxt}>Limpiar</Text>
              </TouchableOpacity>
            )}
          </View>
          
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

        {/* Dropdowns Bar (Solo para Usuarios) */}
        {activeTab === 0 && (
          <View style={s.dropdownsBar}>
            <TouchableOpacity 
              style={[s.dropdownTrigger, filterRole && s.dropdownTriggerActive]} 
              onPress={() => setRoleMenuVisible(true)}
            >
              <Ionicons name="people-outline" size={14} color={filterRole ? "white" : "rgba(255,255,255,0.7)"} />
              <Text style={[s.dropdownTriggerTxt, filterRole && s.dropdownTriggerTxtActive]} numberOfLines={1}>
                {selectedRole ? selectedRole.label : "Rol: Todos"}
              </Text>
              <Ionicons name="chevron-down" size={12} color="white" style={{ opacity: 0.6 }} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[s.dropdownTrigger, filterStateId && s.dropdownTriggerActive]} 
              onPress={() => setStateMenuVisible(true)}
            >
              <Ionicons name="pricetags-outline" size={14} color={filterStateId ? "white" : "rgba(255,255,255,0.7)"} />
              <Text style={[s.dropdownTriggerTxt, filterStateId && s.dropdownTriggerTxtActive]} numberOfLines={1}>
                {selectedState ? selectedState.name : "Estado: Todos"}
              </Text>
              <Ionicons name="chevron-down" size={12} color="white" style={{ opacity: 0.6 }} />
            </TouchableOpacity>
          </View>
        )}

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
        {activeTab === 0 && <UserListTab searchText={searchText} filterRole={filterRole} filterStateId={filterStateId} />}
        {activeTab === 1 && <StatesListTab searchText={searchText} />}
        {activeTab === 2 && <CategoriesListTab searchText={searchText} />}
      </View>

      {/* --- BOTTOM SHEETS --- */}

      {/* Selector de Rol */}
      <Modal visible={roleMenuVisible} transparent animationType="slide" onRequestClose={() => setRoleMenuVisible(false)}>
        <View style={s.sheetOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setRoleMenuVisible(false)} />
          <View style={s.sheetContent}>
            <View style={s.sheetHandle} />
            <Text style={s.sheetHeaderTitle}>Filtrar por Rol</Text>
            
            <TouchableOpacity 
              style={[s.sheetItem, !filterRole && s.sheetItemActive]} 
              onPress={() => { setFilterRole(null); setRoleMenuVisible(false); }}
            >
              <View style={[s.sheetItemIcon, { backgroundColor: "#F1F5F9" }]}>
                <Ionicons name="apps" size={20} color="#64748B" />
              </View>
              <Text style={[s.sheetItemTxt, !filterRole && s.sheetItemTxtActive]}>Todos los roles</Text>
              {!filterRole && <Ionicons name="checkmark-circle" size={24} color="#3B82F6" />}
            </TouchableOpacity>

            {ROLES.map(r => (
              <TouchableOpacity 
                key={r.id} 
                style={[s.sheetItem, filterRole === r.id && { backgroundColor: r.color + "08", borderColor: r.color + "20" }]} 
                onPress={() => { setFilterRole(r.id); setRoleMenuVisible(false); }}
              >
                <View style={[s.sheetItemIcon, { backgroundColor: r.color + "15" }]}>
                  <Ionicons name={r.icon} size={20} color={r.color} />
                </View>
                <Text style={[s.sheetItemTxt, filterRole === r.id && { color: r.color, fontWeight: "800" }]}>{r.label}</Text>
                {filterRole === r.id && <Ionicons name="checkmark-circle" size={24} color={r.color} />}
              </TouchableOpacity>
            ))}
            <View style={{ height: 40 }} />
          </View>
        </View>
      </Modal>

      {/* Selector de Estado */}
      <Modal visible={stateMenuVisible} transparent animationType="slide" onRequestClose={() => setStateMenuVisible(false)}>
        <View style={s.sheetOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setStateMenuVisible(false)} />
          <View style={[s.sheetContent, { maxHeight: height * 0.7 }]}>
            <View style={s.sheetHandle} />
            <Text style={s.sheetHeaderTitle}>Filtrar por Estado</Text>
            
            <TouchableOpacity 
              style={[s.sheetItem, !filterStateId && s.sheetItemActive]} 
              onPress={() => { setFilterStateId(null); setStateMenuVisible(false); }}
            >
              <View style={[s.sheetItemIcon, { backgroundColor: "#F1F5F9" }]}>
                <Ionicons name="layers" size={20} color="#64748B" />
              </View>
              <Text style={[s.sheetItemTxt, !filterStateId && s.sheetItemTxtActive]}>Todos los estados</Text>
              {!filterStateId && <Ionicons name="checkmark-circle" size={24} color="#3B82F6" />}
            </TouchableOpacity>

            <ScrollView showsVerticalScrollIndicator={false}>
              {states.map(st => (
                <TouchableOpacity 
                  key={st.id} 
                  style={[s.sheetItem, filterStateId === st.id && { backgroundColor: st.color + "08", borderColor: st.color + "20" }]} 
                  onPress={() => { setFilterStateId(st.id); setStateMenuVisible(false); }}
                >
                  <View style={[s.sheetItemIcon, { backgroundColor: st.color + "15" }]}>
                    <View style={[s.dotSmall, { backgroundColor: st.color }]} />
                  </View>
                  <Text style={[s.sheetItemTxt, filterStateId === st.id && { color: st.color, fontWeight: "800" }]}>{st.name}</Text>
                  {filterStateId === st.id && <Ionicons name="checkmark-circle" size={24} color={st.color} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={{ height: 40 }} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: { paddingTop: 60, paddingBottom: 0, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  headerContent: { paddingHorizontal: 24, marginBottom: 15 },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 15 },
  headerTitle: { fontSize: 24, fontWeight: "900", color: "white", letterSpacing: -0.5 },
  clearBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.25)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 6 },
  clearBtnTxt: { fontSize: 11, fontWeight: "800", color: "white", textTransform: "uppercase" },
  searchBar: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.18)", borderRadius: 16, paddingHorizontal: 16, height: 48 },
  searchInput: { flex: 1, color: "white", fontSize: 15, fontWeight: "600", marginLeft: 10 },
  
  dropdownsBar: { flexDirection: "row", paddingHorizontal: 24, gap: 12, marginBottom: 18 },
  dropdownTrigger: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 14, paddingHorizontal: 12, paddingVertical: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.15)", gap: 8 },
  dropdownTriggerActive: { backgroundColor: "rgba(255,255,255,0.3)", borderColor: "white" },
  dropdownTriggerTxt: { fontSize: 13, fontWeight: "700", color: "rgba(255,255,255,0.8)" },
  dropdownTriggerTxtActive: { color: "white" },

  tabBar: { flexDirection: "row", marginTop: 5 },
  tabItem: { flex: 1, paddingVertical: 16, alignItems: "center", borderBottomWidth: 4, borderBottomColor: "transparent" },
  tabItemActive: { borderBottomColor: "white" },
  tabText: { fontSize: 13, fontWeight: "700", color: "rgba(255,255,255,0.6)" },
  tabTextActive: { color: "white", fontWeight: "900" },

  // Bottom Sheet Styles
  sheetOverlay: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.7)", justifyContent: "flex-end" },
  sheetContent: { backgroundColor: "white", borderTopLeftRadius: 36, borderTopRightRadius: 36, padding: 24, shadowColor: "#000", shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 20 },
  sheetHandle: { width: 40, height: 6, backgroundColor: "#E2E8F0", borderRadius: 3, alignSelf: "center", marginBottom: 20 },
  sheetHeaderTitle: { fontSize: 20, fontWeight: "900", color: "#0F172A", marginBottom: 25, textAlign: "center" },
  
  sheetItem: { flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 24, borderWidth: 2, borderColor: "#F8FAFC", marginBottom: 12, gap: 16 },
  sheetItemActive: { backgroundColor: "#F0F7FF", borderColor: "#3B82F630" },
  sheetItemIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  sheetItemTxt: { flex: 1, fontSize: 16, fontWeight: "700", color: "#64748B" },
  sheetItemTxtActive: { color: "#3B82F6" },
  dotSmall: { width: 10, height: 10, borderRadius: 5 },
});

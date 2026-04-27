import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, Alert,
  StatusBar, ActivityIndicator, StyleSheet, RefreshControl, Modal, TextInput,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { getAllUsers, updateUserRole } from "../services/usersService";
import { getAllStates, assignStateToUser, removeStateFromUser } from "../services/statesService";

// Helper solo puede cambiar User <-> Organizer, no puede tocar Admin/Helper
const ALLOWED_ROLE_CHANGES = { User: ["Organizer"], Organizer: ["User"] };
const ROLE_CONFIG = {
  Admin:     { color: "#EF4444", bg: "#FEF2F2", label: "Admin" },
  Helper:    { color: "#8B5CF6", bg: "#F5F3FF", label: "Helper" },
  Organizer: { color: "#F59E0B", bg: "#FFFBEB", label: "Organizador" },
  User:      { color: "#3B82F6", bg: "#EFF6FF", label: "Usuario" },
};

export default function HelperDashboardScreen({ navigation }) {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [states, setStates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchText, setSearchText] = useState("");

  const loadData = useCallback(async () => {
    const [usersRes, statesRes] = await Promise.all([getAllUsers(), getAllStates()]);
    if (usersRes.success) setUsers(usersRes.data);
    if (statesRes.success) setStates(statesRes.data);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { loadData(); }, []);
  const onRefresh = () => { setRefreshing(true); loadData(); };

  const canEditUser = (targetUser) =>
    targetUser.id !== user?.id && !["Admin", "Helper"].includes(targetUser.role);

  const handleChangeRole = (targetUser) => {
    if (!canEditUser(targetUser)) {
      Alert.alert("Sin permisos", "No puedes modificar Admin, Helper ni tu propio rol.");
      return;
    }
    const allowed = ALLOWED_ROLE_CHANGES[targetUser.role] ?? [];
    if (allowed.length === 0) {
      Alert.alert("Sin cambios disponibles", "No hay roles alternativos disponibles.");
      return;
    }
    Alert.alert(
      `Cambiar rol de ${targetUser.name}`,
      `Actual: ${targetUser.role}`,
      [
        ...allowed.map(r => ({
          text: r,
          onPress: async () => {
            const res = await updateUserRole(targetUser.id, r);
            if (res.success) { Alert.alert("✅", `Rol → ${r}`); loadData(); }
            else Alert.alert("Error", res.error);
          },
        })),
        { text: "Cancelar", style: "cancel" },
      ]
    );
  };

  const handleToggleState = async (state) => {
    if (!selectedUser) return;
    const has = selectedUser.states?.some(s => s.id === state.id);
    const fn = has ? removeStateFromUser : assignStateToUser;
    const res = await fn(selectedUser.id, state.id);
    if (!res.success) { Alert.alert("Error", res.error); return; }
    const newStates = has
      ? selectedUser.states.filter(s => s.id !== state.id)
      : [...(selectedUser.states ?? []), state];
    setSelectedUser(prev => ({ ...prev, states: newStates }));
    setUsers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, states: newStates } : u));
  };

  const filteredUsers = users.filter(u =>
    u.name?.toLowerCase().includes(searchText.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchText.toLowerCase())
  );

  if (loading) return <View style={s.centered}><ActivityIndicator size="large" color="#8B5CF6" /></View>;

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={["#4C1D95", "#8B5CF6"]} style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>🤝 Dashboard Helper</Text>
          <Text style={s.headerSub}>{users.length} usuarios · {states.length} estados</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate("AdminStates")} style={s.iconBtn}>
          <Ionicons name="layers" size={24} color="white" />
        </TouchableOpacity>
      </LinearGradient>

      <View style={s.quickActions}>
        {[
          { label: "Crear Evento", icon: "add-circle", color: "#2563EB", bg: "#EFF6FF", screen: "CreateEvent" },
          { label: "Estados", icon: "settings", color: "#8B5CF6", bg: "#F5F3FF", screen: "AdminStates" },
          { label: "Ver Eventos", icon: "calendar", color: "#10B981", bg: "#ECFDF5", screen: "EventsTab" },
        ].map(item => (
          <TouchableOpacity key={item.label} style={[s.quickBtn, { backgroundColor: item.bg }]}
            onPress={() => navigation.navigate(item.screen, item.screen === "CreateEvent" ? { event: null } : undefined)}>
            <Ionicons name={item.icon} size={22} color={item.color} />
            <Text style={[s.quickBtnText, { color: item.color }]}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={s.infoBanner}>
        <Ionicons name="information-circle" size={18} color="#8B5CF6" />
        <Text style={s.infoText}>Puedes cambiar User ↔ Organizer y gestionar estados. No puedes modificar Admin/Helper.</Text>
      </View>

      <View style={s.searchBox}>
        <Ionicons name="search" size={18} color="#9CA3AF" style={{ marginRight: 8 }} />
        <TextInput style={s.searchInput} placeholder="Buscar usuario..." value={searchText}
          onChangeText={setSearchText} placeholderTextColor="#9CA3AF" />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <Text style={s.sectionLabel}>USUARIOS ({filteredUsers.length})</Text>
        {filteredUsers.map(u => {
          const ri = ROLE_CONFIG[u.role] ?? ROLE_CONFIG.User;
          const editable = canEditUser(u);
          return (
            <View key={u.id} style={[s.userCard, !editable && { opacity: 0.65 }]}>
              <View style={s.userRow}>
                <View style={[s.avatar, { backgroundColor: ri.color }]}>
                  {u.avatar_url
                    ? <Image source={{ uri: u.avatar_url }} style={StyleSheet.absoluteFill} contentFit="cover" />
                    : <Text style={s.avatarTxt}>{u.name?.charAt(0)?.toUpperCase() || "?"}</Text>}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.userName}>{u.name || "—"}</Text>
                  <Text style={s.userEmail}>{u.email}</Text>
                  <View style={s.statesRow}>
                    {(u.states ?? []).map(st => (
                      <View key={st.id} style={[s.statePill, { backgroundColor: st.color + "25", borderColor: st.color }]}>
                        <Text style={[s.statePillTxt, { color: st.color }]}>{st.name}</Text>
                      </View>
                    ))}
                  </View>
                </View>
                <View style={[s.rolePill, { backgroundColor: ri.bg }]}>
                  <Text style={[s.roleTxt, { color: ri.color }]}>{ri.label}</Text>
                </View>
              </View>
              {editable && (
                <View style={s.actions}>
                  <TouchableOpacity style={s.actionBtn} onPress={() => handleChangeRole(u)}>
                    <Ionicons name="swap-horizontal" size={15} color="#6366F1" />
                    <Text style={[s.actionTxt, { color: "#6366F1" }]}>Cambiar rol</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.actionBtn} onPress={() => { setSelectedUser(u); setModalVisible(true); }}>
                    <Ionicons name="layers" size={15} color="#F59E0B" />
                    <Text style={[s.actionTxt, { color: "#F59E0B" }]}>Estados</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Estados · {selectedUser?.name}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>
            {states.map(state => {
              const has = selectedUser?.states?.some(s => s.id === state.id);
              return (
                <TouchableOpacity key={state.id}
                  style={[s.stateRow, has && { backgroundColor: state.color + "15" }]}
                  onPress={() => handleToggleState(state)}>
                  <View style={[s.dot, { backgroundColor: state.color }]} />
                  <Text style={s.stateName}>{state.name}</Text>
                  {state.is_default && <Text style={s.defaultTag}>default</Text>}
                  <Ionicons name={has ? "checkmark-circle" : "ellipse-outline"} size={22}
                    color={has ? state.color : "#D1D5DB"} />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { paddingTop: 50, paddingBottom: 16, paddingHorizontal: 16, flexDirection: "row", alignItems: "center" },
  backBtn: { padding: 8, marginRight: 8 },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "white" },
  headerSub: { fontSize: 12, color: "rgba(255,255,255,0.8)" },
  iconBtn: { padding: 8 },
  quickActions: { flexDirection: "row", padding: 14, gap: 8 },
  quickBtn: { flex: 1, alignItems: "center", paddingVertical: 12, borderRadius: 14, gap: 4 },
  quickBtnText: { fontSize: 11, fontWeight: "600" },
  infoBanner: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    backgroundColor: "#F5F3FF", marginHorizontal: 14, marginBottom: 8,
    padding: 10, borderRadius: 10, borderLeftWidth: 3, borderLeftColor: "#8B5CF6",
  },
  infoText: { flex: 1, fontSize: 12, color: "#6D28D9", lineHeight: 18 },
  searchBox: {
    flexDirection: "row", alignItems: "center", marginHorizontal: 14, marginBottom: 8,
    backgroundColor: "white", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: "#E5E7EB",
  },
  searchInput: { flex: 1, fontSize: 14, color: "#1F2937" },
  sectionLabel: { fontSize: 11, fontWeight: "700", color: "#9CA3AF", marginHorizontal: 14, marginBottom: 6, marginTop: 4 },
  userCard: { backgroundColor: "white", marginHorizontal: 14, marginBottom: 8, borderRadius: 16, padding: 14, elevation: 2 },
  userRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  avatar: { width: 42, height: 42, borderRadius: 21, justifyContent: "center", alignItems: "center", marginRight: 10, overflow: "hidden" },
  avatarTxt: { color: "white", fontSize: 16, fontWeight: "bold" },
  userName: { fontSize: 14, fontWeight: "700", color: "#1F2937" },
  userEmail: { fontSize: 11, color: "#9CA3AF" },
  statesRow: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 4 },
  statePill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, borderWidth: 1 },
  statePillTxt: { fontSize: 10, fontWeight: "600" },
  rolePill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  roleTxt: { fontSize: 11, fontWeight: "700" },
  actions: { flexDirection: "row", gap: 8, borderTopWidth: 1, borderTopColor: "#F3F4F6", paddingTop: 8 },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 8, backgroundColor: "#F9FAFB", borderRadius: 10 },
  actionTxt: { fontSize: 12, fontWeight: "600" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalBox: { backgroundColor: "white", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: "70%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: { fontSize: 17, fontWeight: "700", color: "#1F2937" },
  stateRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 10, borderRadius: 12, marginBottom: 6 },
  dot: { width: 12, height: 12, borderRadius: 6, marginRight: 12 },
  stateName: { flex: 1, fontSize: 15, color: "#1F2937", fontWeight: "500" },
  defaultTag: { fontSize: 10, color: "#9CA3AF", marginRight: 8 },
});

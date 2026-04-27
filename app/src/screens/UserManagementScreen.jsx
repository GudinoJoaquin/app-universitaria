import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, ScrollView, FlatList, TouchableOpacity, Alert,
  RefreshControl, StatusBar, ActivityIndicator, StyleSheet, Modal, TextInput,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useAuth } from "../context/AuthContext";
import { getAllUsers, updateUserRole } from "../services/usersService";
import { getAllStates, assignStateToUser, removeStateFromUser } from "../services/statesService";

const ROLE_CONFIG = {
  Admin:     { color: "#EF4444", bg: "#FEF2F2", label: "Admin" },
  Helper:    { color: "#8B5CF6", bg: "#F5F3FF", label: "Helper" },
  Organizer: { color: "#F59E0B", bg: "#FFFBEB", label: "Organizador" },
  User:      { color: "#3B82F6", bg: "#EFF6FF", label: "Usuario" },
};

export default function UserManagementScreen({ navigation }) {
  const { user, isAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [states, setStates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [statesModalVisible, setStatesModalVisible] = useState(false);

  const isHelper = user?.role === "Helper";

  const canEdit = (target) => {
    if (target.id === user?.id) return false;
    if (isAdmin()) return true;
    return !["Admin", "Helper"].includes(target.role);
  };

  const availableRoles = (target) => {
    if (isAdmin()) return ["Admin", "Helper", "Organizer", "User"].filter(r => r !== target.role);
    return ["User", "Organizer"].filter(r => r !== target.role);
  };

  const loadData = useCallback(async () => {
    const [usersRes, statesRes] = await Promise.all([getAllUsers(), getAllStates()]);
    if (usersRes.success) setUsers(usersRes.data);
    if (statesRes.success) setStates(statesRes.data);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  const onRefresh = () => { setRefreshing(true); loadData(); };

  const handleRoleChange = (target) => {
    if (!canEdit(target)) {
      Alert.alert("Sin permisos", "No tenés autorización para editar este usuario.");
      return;
    }
    const roles = availableRoles(target);
    Alert.alert(`Cambiar rol — ${target.name}`, `Rol actual: ${target.role}`, [
      ...roles.map(r => ({
        text: `→ ${r}`,
        onPress: async () => {
          const res = await updateUserRole(target.id, r);
          if (res.success) { loadData(); }
          else Alert.alert("Error", res.error);
        },
      })),
      { text: "Cancelar", style: "cancel" },
    ]);
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
    setSelectedUser(p => ({ ...p, states: newStates }));
    setUsers(p => p.map(u => u.id === selectedUser.id ? { ...u, states: newStates } : u));
  };

  const filtered = users.filter(u =>
    u.name?.toLowerCase().includes(searchText.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchText.toLowerCase())
  );

  const renderUser = ({ item }) => {
    const ri = ROLE_CONFIG[item.role] ?? ROLE_CONFIG.User;
    const editable = canEdit(item);
    return (
      <View style={[s.userCard, !editable && { opacity: 0.6 }]}>
        <View style={s.userRow}>
          <View style={[s.avatar, { backgroundColor: ri.color }]}>
            {item.avatar_url
              ? <Image source={{ uri: item.avatar_url }} style={StyleSheet.absoluteFill} contentFit="cover" />
              : <Text style={s.avatarTxt}>{item.name?.charAt(0)?.toUpperCase() || "?"}</Text>}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.userName}>{item.name || "—"}</Text>
            <Text style={s.userEmail}>{item.email}</Text>
            <View style={s.statesRow}>
              {(item.states ?? []).map(st => (
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
          <View style={s.actionRow}>
            <TouchableOpacity style={s.actionBtn} onPress={() => handleRoleChange(item)}>
              <Ionicons name="swap-horizontal" size={14} color="#6366F1" />
              <Text style={[s.actionTxt, { color: "#6366F1" }]}>Rol</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.actionBtn} onPress={() => { setSelectedUser(item); setStatesModalVisible(true); }}>
              <Ionicons name="layers" size={14} color="#F59E0B" />
              <Text style={[s.actionTxt, { color: "#F59E0B" }]}>Estados</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={isAdmin() ? ["#1E3A8A", "#4F46E5"] : ["#4C1D95", "#8B5CF6"]} style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <View>
          <Text style={s.headerTitle}>Gestión de Usuarios</Text>
          <Text style={s.headerSub}>{filtered.length} registrados</Text>
        </View>
      </LinearGradient>

      <View style={s.searchBox}>
        <Ionicons name="search" size={17} color="#9CA3AF" style={{ marginRight: 8 }} />
        <TextInput style={s.searchInput} placeholder="Buscar..." value={searchText} onChangeText={setSearchText} />
      </View>

      {loading ? <ActivityIndicator size="large" color="#4F46E5" style={{ marginTop: 50 }} /> : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={renderUser}
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}

      <Modal visible={statesModalVisible} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Estados · {selectedUser?.name}</Text>
              <TouchableOpacity onPress={() => setStatesModalVisible(false)}><Ionicons name="close" size={24} color="#374151" /></TouchableOpacity>
            </View>
            <ScrollView>
              {states.map(state => {
                const has = selectedUser?.states?.some(s => s.id === state.id);
                return (
                  <TouchableOpacity key={state.id} style={[s.stateRow, has && { backgroundColor: state.color + "15" }]} onPress={() => handleToggleState(state)}>
                    <View style={[s.stateDot, { backgroundColor: state.color }]} />
                    <Text style={s.stateName}>{state.name}</Text>
                    <Ionicons name={has ? "checkmark-circle" : "ellipse-outline"} size={22} color={has ? state.color : "#D1D5DB"} />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: { paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20, flexDirection: "row", alignItems: "center" },
  backBtn: { padding: 8, marginRight: 12 },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "white" },
  headerSub: { fontSize: 12, color: "rgba(255,255,255,0.8)" },
  searchBox: { flexDirection: "row", alignItems: "center", backgroundColor: "white", margin: 16, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: "#E5E7EB" },
  searchInput: { flex: 1, fontSize: 14 },
  list: { paddingHorizontal: 16, paddingBottom: 50 },
  userCard: { backgroundColor: "white", borderRadius: 16, marginBottom: 10, padding: 14, elevation: 2 },
  userRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, justifyContent: "center", alignItems: "center", marginRight: 12, overflow: "hidden" },
  avatarTxt: { color: "white", fontSize: 16, fontWeight: "bold" },
  userName: { fontSize: 14, fontWeight: "700" },
  userEmail: { fontSize: 11, color: "#9CA3AF" },
  statesRow: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 5 },
  statePill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
  statePillTxt: { fontSize: 9, fontWeight: "600" },
  rolePill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  roleTxt: { fontSize: 10, fontWeight: "800" },
  actionRow: { flexDirection: "row", gap: 8, borderTopWidth: 1, borderTopColor: "#F3F4F6", paddingTop: 10 },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 8, backgroundColor: "#F9FAFB", borderRadius: 10 },
  actionTxt: { fontSize: 11, fontWeight: "600" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalBox: { backgroundColor: "white", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: "70%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  modalTitle: { fontSize: 16, fontWeight: "800" },
  stateRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 10, borderRadius: 12, marginBottom: 6 },
  stateDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  stateName: { flex: 1, fontSize: 14, fontWeight: "500" },
});

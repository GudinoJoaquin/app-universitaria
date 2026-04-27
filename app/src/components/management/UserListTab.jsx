import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, FlatList, TouchableOpacity, Alert,
  RefreshControl, ActivityIndicator, StyleSheet, Modal, TextInput, ScrollView
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { getAllUsers, updateUserRole } from "../../services/usersService";
import { getAllStates, assignStateToUser, removeStateFromUser } from "../../services/statesService";
import { useAuth } from "../../context/AuthContext";

const ROLE_CONFIG = {
  Admin:     { color: "#EF4444", bg: "#FEF2F2", label: "Admin" },
  Helper:    { color: "#8B5CF6", bg: "#F5F3FF", label: "Helper" },
  Organizer: { color: "#F59E0B", bg: "#FFFBEB", label: "Org" },
  User:      { color: "#3B82F6", bg: "#EFF6FF", label: "User" },
};

export default function UserListTab({ searchText }) {
  const { user, isAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [states, setStates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [statesModalVisible, setStatesModalVisible] = useState(false);

  const isHelper = user?.role === "Helper";

  const canEdit = (target) => {
    if (isAdmin()) return true; // El admin puede todo
    if (target.id === user?.id) return false; // Otros no pueden editarse a sí mismos
    return !["Admin", "Helper"].includes(target.role); // Helper solo User/Org
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    const [usersRes, statesRes] = await Promise.all([getAllUsers(), getAllStates()]);
    if (usersRes.success) setUsers(usersRes.data);
    if (statesRes.success) setStates(statesRes.data);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = users.filter(u =>
    u.name?.toLowerCase().includes(searchText.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchText.toLowerCase())
  );

  const handleRoleChange = (target) => {
    if (!canEdit(target)) {
      Alert.alert("Sin permisos", "No tenés autorización para editar este usuario.");
      return;
    }
    const roles = isAdmin() 
      ? ["Admin", "Helper", "Organizer", "User"] 
      : ["User", "Organizer"];
    
    Alert.alert(`Rol de ${target.name}`, `Actual: ${target.role}`, [
      ...roles.filter(r => r !== target.role).map(r => ({
        text: r,
        onPress: async () => {
          console.log(`🔄 Cambiando rol de ${target.id} a ${r}...`);
          const res = await updateUserRole(target.id, r);
          if (res.success) {
            console.log("✅ Rol actualizado en DB");
            Alert.alert("Éxito", "Rol actualizado correctamente");
            loadData();
          } else {
            console.error("❌ Error actualizando rol:", res.error);
            Alert.alert("Error", res.error);
          }
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
                <View key={st.id} style={[s.statePill, { backgroundColor: st.color + "20", borderColor: st.color }]}>
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

  if (loading) return <ActivityIndicator size="large" color="#3B82F6" style={{ marginTop: 50 }} />;

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={renderUser}
        contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
        ListEmptyComponent={<Text style={s.empty}>No se encontraron usuarios.</Text>}
      />

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
                  <TouchableOpacity key={state.id} style={[s.stateRow, has && { backgroundColor: state.color + "10" }]} onPress={() => handleToggleState(state)}>
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
  list: { padding: 16, paddingBottom: 100 },
  userCard: { backgroundColor: "white", borderRadius: 20, marginBottom: 12, padding: 16, elevation: 3, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10 },
  userRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, justifyContent: "center", alignItems: "center", marginRight: 12, overflow: "hidden" },
  avatarTxt: { color: "white", fontSize: 18, fontWeight: "800" },
  userName: { fontSize: 15, fontWeight: "800", color: "#1F2937" },
  userEmail: { fontSize: 12, color: "#6B7280" },
  statesRow: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginTop: 6 },
  statePill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, borderWidth: 1 },
  statePillTxt: { fontSize: 9, fontWeight: "700" },
  rolePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  roleTxt: { fontSize: 10, fontWeight: "900" },
  actionRow: { flexDirection: "row", gap: 10, borderTopWidth: 1, borderTopColor: "#F3F4F6", paddingTop: 12 },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, backgroundColor: "#F9FAFB", borderRadius: 12 },
  actionTxt: { fontSize: 12, fontWeight: "700" },
  empty: { textAlign: "center", marginTop: 40, color: "#9CA3AF" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalBox: { backgroundColor: "white", borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, maxHeight: "80%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#1F2937" },
  stateRow: { flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 12, borderRadius: 16, marginBottom: 8 },
  stateDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  stateName: { flex: 1, fontSize: 15, fontWeight: "600", color: "#374151" },
});

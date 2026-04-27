import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View, Text, FlatList, TouchableOpacity, Alert,
  RefreshControl, ActivityIndicator, StyleSheet, Modal, ScrollView
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { getAllUsers, updateUserRole } from "../../services/usersService";
import { getAllStates, assignStateToUser, removeStateFromUser } from "../../services/statesService";
import { useAuth } from "../../context/AuthContext";

const ROLE_CONFIG = {
  Admin:     { color: "#EF4444", bg: "#FEF2F2", label: "Admin", icon: "shield-checkmark", power: 4 },
  Helper:    { color: "#8B5CF6", bg: "#F5F3FF", label: "Helper", icon: "briefcase", power: 3 },
  Organizer: { color: "#F59E0B", bg: "#FFFBEB", label: "Organizador", icon: "calendar", power: 2 },
  User:      { color: "#3B82F6", bg: "#EFF6FF", label: "Usuario", icon: "person", power: 1 },
};

export default function UserListTab({ searchText, filterRole, filterStateId }) {
  const { user: currentUser, isAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [states, setStates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Modals state
  const [selectedUser, setSelectedUser] = useState(null);
  const [statesModalVisible, setStatesModalVisible] = useState(false);
  const [roleModalVisible, setRoleModalVisible] = useState(false);

  const currentUserPower = ROLE_CONFIG[currentUser?.role]?.power || 0;

  // Lógica para determinar si se puede editar el ROL
  const canEditRole = (target) => {
    if (!target) return false;
    // 1. Nadie puede cambiarse su propio ROL
    if (target.id === currentUser?.id) return false;
    
    // 2. Solo se puede editar si el rango es ESTRICTAMENTE MAYOR al del objetivo
    const targetPower = ROLE_CONFIG[target.role]?.power || 0;
    return currentUserPower > targetPower;
  };

  // Lógica para determinar si se puede editar los ESTADOS
  const canEditStates = (target) => {
    if (!target) return false;
    // 1. Siempre se puede editar los estados propios
    if (target.id === currentUser?.id) return true;
    
    // 2. Se puede editar estados de cualquiera con rango ESTRICTAMENTE MENOR
    const targetPower = ROLE_CONFIG[target.role]?.power || 0;
    return currentUserPower > targetPower;
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

  // Filtering Logic
  const filtered = useMemo(() => {
    return users.filter(u => {
      const matchSearch = 
        u.name?.toLowerCase().includes(searchText.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchText.toLowerCase());
      
      const matchRole = !filterRole || u.role === filterRole;
      const matchState = !filterStateId || u.states?.some(s => s.id === filterStateId);
      
      return matchSearch && matchRole && matchState;
    });
  }, [users, searchText, filterRole, filterStateId]);

  const handleUpdateRole = async (newRole) => {
    if (!selectedUser) return;
    setRoleModalVisible(false);
    
    const res = await updateUserRole(selectedUser.id, newRole);
    if (res.success) {
      Alert.alert("Éxito", "Rol actualizado correctamente");
      loadData();
    } else {
      Alert.alert("Acceso Denegado", res.error);
    }
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
    const isSelf = item.id === currentUser?.id;
    const roleEditable = canEditRole(item);
    const statesEditable = canEditStates(item);
    
    return (
      <View style={[s.userCard, !roleEditable && !statesEditable && s.userCardDisabled]}>
        <View style={s.userRow}>
          <View style={[s.avatar, { backgroundColor: ri.color }]}>
            {item.avatar_url
              ? <Image source={{ uri: item.avatar_url }} style={StyleSheet.absoluteFill} contentFit="cover" />
              : <Text style={s.avatarTxt}>{item.name?.charAt(0)?.toUpperCase() || "?"}</Text>}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.userName}>{item.name || "—"} {isSelf && "(Tú)"}</Text>
            <Text style={s.userEmail}>{item.email}</Text>
            <View style={s.statesRow}>
              {(item.states ?? []).map(st => (
                <View key={st.id} style={[s.statePill, { backgroundColor: st.color + "15", borderColor: st.color }]}>
                  <Text style={[s.statePillTxt, { color: st.color }]}>{st.name}</Text>
                </View>
              ))}
            </View>
          </View>
          <View style={[s.roleBadge, { backgroundColor: ri.bg }]}>
            <Ionicons name={ri.icon} size={10} color={ri.color} style={{ marginRight: 4 }} />
            <Text style={[s.roleBadgeTxt, { color: ri.color }]}>{ri.label}</Text>
          </View>
        </View>
        
        <View style={s.actionRow}>
          {/* Botón de Rol: Solo si es editable */}
          {roleEditable ? (
            <TouchableOpacity style={s.actionBtn} onPress={() => { setSelectedUser(item); setRoleModalVisible(true); }}>
              <Ionicons name="swap-horizontal" size={14} color="#6366F1" />
              <Text style={[s.actionTxt, { color: "#6366F1" }]}>Rol</Text>
            </TouchableOpacity>
          ) : (
            <View style={[s.actionBtn, s.actionBtnDisabled]}>
              <Ionicons name="lock-closed-outline" size={12} color="#94A3B8" />
              <Text style={s.actionTxtDisabled}>Rol bloqueado</Text>
            </View>
          )}

          {/* Botón de Estados: Siempre si es uno mismo o alguien de rango inferior */}
          {statesEditable ? (
            <TouchableOpacity style={s.actionBtn} onPress={() => { setSelectedUser(item); setStatesModalVisible(true); }}>
              <Ionicons name="layers" size={14} color="#F59E0B" />
              <Text style={[s.actionTxt, { color: "#F59E0B" }]}>Estados</Text>
            </TouchableOpacity>
          ) : (
            <View style={[s.actionBtn, s.actionBtnDisabled]}>
              <Ionicons name="lock-closed-outline" size={12} color="#94A3B8" />
              <Text style={s.actionTxtDisabled}>Estados bloqueados</Text>
            </View>
          )}
        </View>
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
        ListEmptyComponent={<View style={s.emptyContainer}><Ionicons name="search-outline" size={40} color="#CBD5E1" /><Text style={s.empty}>No se encontraron usuarios.</Text></View>}
      />

      {/* Modal Cambio de Rol */}
      <Modal visible={roleModalVisible} transparent animationType="slide" onRequestClose={() => setRoleModalVisible(false)}>
        <View style={s.modalOverlay}>
          <View style={[s.modalBox, s.bottomSheet]}>
            <View style={s.sheetHandle} />
            <View style={s.modalHeader}>
              <View>
                <Text style={s.modalTitle}>Cambiar Rol</Text>
                <Text style={s.modalSub}>{selectedUser?.name}</Text>
              </View>
              <TouchableOpacity onPress={() => setRoleModalVisible(false)}><Ionicons name="close" size={24} color="#374151" /></TouchableOpacity>
            </View>
            
            <View style={s.rolesGrid}>
              {/* Solo permitimos asignar roles INFERIORES al del usuario actual */}
              {Object.keys(ROLE_CONFIG)
                .filter(r => ROLE_CONFIG[r].power < currentUserPower)
                .filter(r => r !== selectedUser?.role)
                .map(roleKey => {
                  const config = ROLE_CONFIG[roleKey];
                  return (
                    <TouchableOpacity 
                      key={roleKey} 
                      style={[s.roleCard, { backgroundColor: config.bg, borderColor: config.color + "30" }]}
                      onPress={() => handleUpdateRole(roleKey)}
                    >
                      <View style={[s.roleIconCircle, { backgroundColor: config.color }]}>
                        <Ionicons name={config.icon} size={24} color="white" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[s.roleCardLabel, { color: config.color }]}>{config.label}</Text>
                        <Text style={s.roleCardDesc}>Asignar permisos de {config.label.toLowerCase()}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color={config.color} />
                    </TouchableOpacity>
                  );
                })}
            </View>
            <View style={{ height: 40 }} />
          </View>
        </View>
      </Modal>

      {/* Modal Estados */}
      <Modal visible={statesModalVisible} transparent animationType="slide" onRequestClose={() => setStatesModalVisible(false)}>
        <View style={s.modalOverlay}>
          <View style={[s.modalBox, s.bottomSheet]}>
            <View style={s.sheetHandle} />
            <View style={s.modalHeader}>
              <View>
                <Text style={s.modalTitle}>Gestionar Estados</Text>
                <Text style={s.modalSub}>{selectedUser?.name}</Text>
              </View>
              <TouchableOpacity onPress={() => setStatesModalVisible(false)}><Ionicons name="close" size={24} color="#374151" /></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {states.map(state => {
                const has = selectedUser?.states?.some(s => s.id === state.id);
                return (
                  <TouchableOpacity 
                    key={state.id} 
                    style={[s.stateRow, has && { backgroundColor: state.color + "10", borderColor: state.color + "30" }]} 
                    onPress={() => handleToggleState(state)}
                  >
                    <View style={[s.stateDot, { backgroundColor: state.color }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[s.stateName, has && { color: state.color }]}>{state.name}</Text>
                    </View>
                    <Ionicons name={has ? "checkmark-circle" : "ellipse-outline"} size={22} color={has ? state.color : "#D1D5DB"} />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity style={s.doneBtn} onPress={() => setStatesModalVisible(false)}>
              <Text style={s.doneBtnTxt}>Guardar Cambios</Text>
            </TouchableOpacity>
            <View style={{ height: 20 }} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  list: { padding: 16, paddingBottom: 120 },
  userCard: { backgroundColor: "white", borderRadius: 24, marginBottom: 16, padding: 16, elevation: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 15 },
  userCardDisabled: { opacity: 0.8 },
  userRow: { flexDirection: "row", alignItems: "center", marginBottom: 15 },
  avatar: { width: 50, height: 50, borderRadius: 25, justifyContent: "center", alignItems: "center", marginRight: 12, overflow: "hidden" },
  avatarTxt: { color: "white", fontSize: 20, fontWeight: "900" },
  userName: { fontSize: 16, fontWeight: "800", color: "#1F2937" },
  userEmail: { fontSize: 13, color: "#9CA3AF" },
  statesRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  statePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 1 },
  statePillTxt: { fontSize: 10, fontWeight: "700" },
  roleBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, position: "absolute", top: -5, right: -5 },
  roleBadgeTxt: { fontSize: 11, fontWeight: "900", textTransform: "uppercase" },
  actionRow: { flexDirection: "row", gap: 12, borderTopWidth: 1, borderTopColor: "#F3F4F6", paddingTop: 15 },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, backgroundColor: "#F9FAFB", borderRadius: 16 },
  actionBtnDisabled: { backgroundColor: "#F1F5F9", opacity: 0.7 },
  actionTxt: { fontSize: 13, fontWeight: "700" },
  actionTxtDisabled: { fontSize: 11, fontWeight: "600", color: "#94A3B8" },

  emptyContainer: { alignItems: "center", marginTop: 60 },
  empty: { textAlign: "center", marginTop: 10, color: "#9CA3AF", fontSize: 14, fontWeight: "500" },
  
  modalOverlay: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.6)", justifyContent: "flex-end" },
  modalBox: { backgroundColor: "white", borderTopLeftRadius: 36, borderTopRightRadius: 36, padding: 24, maxHeight: "85%" },
  sheetHandle: { width: 40, height: 6, backgroundColor: "#E2E8F0", borderRadius: 3, alignSelf: "center", marginBottom: 15 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 25 },
  modalTitle: { fontSize: 22, fontWeight: "900", color: "#0F172A" },
  modalSub: { fontSize: 14, color: "#64748B", marginTop: 2 },
  
  rolesGrid: { gap: 12 },
  roleCard: { flexDirection: "row", alignItems: "center", padding: 18, borderRadius: 24, borderWidth: 1.5, gap: 16 },
  roleIconCircle: { width: 52, height: 52, borderRadius: 20, justifyContent: "center", alignItems: "center" },
  roleCardLabel: { fontSize: 18, fontWeight: "800" },
  roleCardDesc: { fontSize: 13, color: "#94A3B8", marginTop: 2 },
  
  stateRow: { flexDirection: "row", alignItems: "center", padding: 16, borderRadius: 20, borderWidth: 1.5, borderColor: "#F8FAFC", marginBottom: 10 },
  stateDot: { width: 12, height: 12, borderRadius: 6, marginRight: 15 },
  stateName: { fontSize: 16, fontWeight: "700", color: "#334155" },
  
  doneBtn: { backgroundColor: "#0F172A", paddingVertical: 18, borderRadius: 20, alignItems: "center", marginTop: 15 },
  doneBtnTxt: { color: "white", fontSize: 16, fontWeight: "800" },
});

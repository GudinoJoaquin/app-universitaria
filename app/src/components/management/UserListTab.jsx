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
    if (!target || !currentUser) return false;
    if (target.id === currentUser.id) return false;
    
    // Admin puede editar a cualquiera que no sea Admin
    if (currentUser.role === 'Admin') return target.role !== 'Admin';
    
    // Helper puede editar solo a Organizadores y Usuarios
    if (currentUser.role === 'Helper') return target.role === 'Organizer' || target.role === 'User';

    return false;
  };

  // Lógica para determinar si se puede editar los ESTADOS
  const canEditStates = (target) => {
    if (!target || !currentUser) return false;
    if (target.id === currentUser.id) return true;
    
    if (currentUser.role === 'Admin') return target.role !== 'Admin';
    if (currentUser.role === 'Helper') return target.role === 'Organizer' || target.role === 'User';

    return false;
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
      // Si soy Helper, SOLO veo a Organizadores y Usuarios (nadie más de mi rango o superior)
      if (currentUser?.role === 'Helper') {
        if (u.role !== 'Organizer' && u.role !== 'User') return false;
      }
      
      // Si soy Admin, no veo a otros Admins
      if (currentUser?.role === 'Admin' && u.role === 'Admin') {
        if (u.id !== currentUser.id) return false;
      }

      const matchSearch = 
        u.name?.toLowerCase().includes(searchText?.toLowerCase() || "") ||
        u.email?.toLowerCase().includes(searchText?.toLowerCase() || "");
      
      const matchRole = !filterRole || u.role === filterRole;
      const matchState = !filterStateId || u.states?.some(s => s.id === filterStateId);
      
      return matchSearch && matchRole && matchState;
    });
  }, [users, searchText, filterRole, filterStateId, currentUser]);

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
              {Object.keys(ROLE_CONFIG)
                .filter(r => {
                  if (currentUser?.role === 'Admin') return r !== 'Admin';
                  if (currentUser?.role === 'Helper') return r === 'Organizer' || r === 'User';
                  return false;
                })
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
  userCard: { backgroundColor: "white", borderRadius: 28, marginBottom: 18, padding: 18, elevation: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12 },
  userCardDisabled: { opacity: 0.9 },
  userRow: { flexDirection: "row", alignItems: "center", marginBottom: 18 },
  avatar: { width: 56, height: 56, borderRadius: 24, justifyContent: "center", alignItems: "center", marginRight: 15, overflow: "hidden" },
  avatarTxt: { color: "white", fontSize: 22, fontWeight: "900" },
  userName: { fontSize: 17, fontWeight: "900", color: "#1E293B" },
  userEmail: { fontSize: 13, color: "#64748B", marginTop: 1 },
  statesRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  statePill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12, borderWidth: 1 },
  statePillTxt: { fontSize: 11, fontWeight: "800" },
  roleBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, position: "absolute", top: -10, right: -5, elevation: 5, shadowColor: "#000", shadowOpacity: 0.1 },
  roleBadgeTxt: { fontSize: 10, fontWeight: "900", textTransform: "uppercase" },
  actionRow: { flexDirection: "row", gap: 14, borderTopWidth: 1.5, borderTopColor: "#F1F5F9", paddingTop: 18 },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, backgroundColor: "#F8FAFC", borderRadius: 18, borderWidth: 1, borderColor: "#F1F5F9" },
  actionBtnDisabled: { backgroundColor: "#F1F5F9", opacity: 0.6 },
  actionTxt: { fontSize: 13, fontWeight: "800", color: "#334155" },
  actionTxtDisabled: { fontSize: 12, fontWeight: "700", color: "#94A3B8" },

  emptyContainer: { alignItems: "center", marginTop: 80 },
  empty: { textAlign: "center", marginTop: 15, color: "#94A3B8", fontSize: 15, fontWeight: "600" },
  
  modalOverlay: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.75)", justifyContent: "flex-end" },
  modalBox: { backgroundColor: "white", borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 25, maxHeight: "90%" },
  sheetHandle: { width: 45, height: 6, backgroundColor: "#E2E8F0", borderRadius: 3, alignSelf: "center", marginBottom: 20 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 },
  modalTitle: { fontSize: 24, fontWeight: "900", color: "#0F172A" },
  modalSub: { fontSize: 14, color: "#64748B", marginTop: 4, fontWeight: "600" },
  closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#F8FAFC", justifyContent: "center", alignItems: "center" },
  
  rolesGrid: { gap: 14 },
  roleCard: { flexDirection: "row", alignItems: "center", padding: 20, borderRadius: 26, borderWidth: 2, gap: 18 },
  roleIconCircle: { width: 56, height: 56, borderRadius: 22, justifyContent: "center", alignItems: "center", elevation: 5 },
  roleCardLabel: { fontSize: 19, fontWeight: "900" },
  roleCardDesc: { fontSize: 13, color: "#64748B", marginTop: 3, fontWeight: "500" },
  
  stateRow: { flexDirection: "row", alignItems: "center", padding: 18, borderRadius: 22, borderWidth: 2, borderColor: "#F1F5F9", marginBottom: 12 },
  stateDot: { width: 14, height: 14, borderRadius: 7, marginRight: 18 },
  stateName: { fontSize: 17, fontWeight: "800", color: "#334155" },
  
  doneBtn: { backgroundColor: "#0F172A", paddingVertical: 20, borderRadius: 22, alignItems: "center", marginTop: 20, elevation: 10 },
  doneBtnTxt: { color: "white", fontSize: 17, fontWeight: "900" },
});

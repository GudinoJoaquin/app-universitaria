import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View, Text, FlatList, TouchableOpacity, Alert,
  RefreshControl, ActivityIndicator, StyleSheet, Modal, ScrollView
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import SearchBar from "../../shared/components/SearchBar";
import FilterChip from "../../shared/components/FilterChip";
import { getAllUsers, updateUserRole } from "../services/usersService";
import { assignStateToUser, removeStateFromUser } from "../services/statesService";
import { useAuth } from "../../auth/context/AuthContext";

const ROLE_CONFIG = {
  Admin:     { color: "#EF4444", bg: "#FEF2F2", label: "Admin", icon: "shield-checkmark", power: 4 },
  Helper:    { color: "#8B5CF6", bg: "#F5F3FF", label: "Helper", icon: "briefcase", power: 3 },
  Organizer: { color: "#F59E0B", bg: "#FFFBEB", label: "Organizador", icon: "calendar", power: 2 },
  User:      { color: "#3B82F6", bg: "#EFF6FF", label: "Usuario", icon: "person", power: 1 },
};

const ROLES_LIST = [
  { id: "Admin", label: "Administrador", color: "#EF4444", icon: "shield-checkmark" },
  { id: "Helper", label: "Helper", color: "#8B5CF6", icon: "briefcase" },
  { id: "Organizer", label: "Organizador", color: "#F59E0B", icon: "calendar" },
  { id: "User", label: "Usuario", color: "#3B82F6", icon: "person" },
];

export default function UserListTab({ states }) {
  const { user: currentUser, isAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Search and Filter State
  const [searchText, setSearchText] = useState("");
  const [filterRole, setFilterRole] = useState(null);
  const [filterStateId, setFilterStateId] = useState(null);
  
  // Filter Menus
  const [filterRoleMenuVisible, setFilterRoleMenuVisible] = useState(false);
  const [filterStateMenuVisible, setFilterStateMenuVisible] = useState(false);

  // Edit Modals state
  const [selectedUser, setSelectedUser] = useState(null);
  const [statesModalVisible, setStatesModalVisible] = useState(false);
  const [roleModalVisible, setRoleModalVisible] = useState(false);

  const canEditRole = (target) => {
    if (!target || !currentUser) return false;
    if (target.id === currentUser.id) return false;
    if (currentUser.role === 'Admin') return target.role !== 'Admin';
    if (currentUser.role === 'Helper') return target.role === 'Organizer' || target.role === 'User';
    return false;
  };

  const canEditStates = (target) => {
    if (!target || !currentUser) return false;
    if (target.id === currentUser.id) return true;
    if (currentUser.role === 'Admin') return target.role !== 'Admin';
    if (currentUser.role === 'Helper') return target.role === 'Organizer' || target.role === 'User';
    return false;
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    const usersRes = await getAllUsers();
    if (usersRes.success) setUsers(usersRes.data);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = useMemo(() => {
    return users.filter(u => {
      if (currentUser?.role === 'Helper') {
        if (u.role !== 'Organizer' && u.role !== 'User') return false;
      }
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

  const selectedRoleObj = ROLES_LIST.find(r => r.id === filterRole);
  const selectedStateObj = states?.find(s => s.id === filterStateId);

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

  const renderHeader = () => (
    <View style={s.controls}>
      <View style={s.searchRow}>
        <SearchBar 
          value={searchText} 
          onChangeText={setSearchText} 
          placeholder="Buscar usuario..." 
        />
        {(filterRole || filterStateId) && (
          <TouchableOpacity onPress={() => { setFilterRole(null); setFilterStateId(null); }} style={s.clearBtn}>
            <Ionicons name="refresh-outline" size={20} color="#EF4444" />
          </TouchableOpacity>
        )}
      </View>
      
      <View style={s.filtersRow}>
        <FilterChip 
          icon="people-outline"
          label={selectedRoleObj ? selectedRoleObj.label : "Rol"}
          isActive={!!filterRole}
          activeColor="#3B82F6"
          onPress={() => setFilterRoleMenuVisible(true)}
        />
        <FilterChip 
          icon="pricetags-outline"
          label={selectedStateObj ? selectedStateObj.name : "Estado"}
          isActive={!!filterStateId}
          activeColor="#F59E0B"
          onPress={() => setFilterStateMenuVisible(true)}
        />
      </View>
    </View>
  );

  if (loading) return <ActivityIndicator size="large" color="#3B82F6" style={{ marginTop: 50 }} />;

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={renderUser}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
        ListEmptyComponent={<View style={s.emptyContainer}><Ionicons name="search-outline" size={40} color="#CBD5E1" /><Text style={s.empty}>No se encontraron usuarios.</Text></View>}
      />

      {/* Filter Role Menu */}
      <Modal visible={filterRoleMenuVisible} transparent animationType="slide" onRequestClose={() => setFilterRoleMenuVisible(false)}>
        <View style={s.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setFilterRoleMenuVisible(false)} />
          <View style={[s.modalBox, s.bottomSheet]}>
            <View style={s.sheetHandle} />
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Filtrar por Rol</Text>
              <TouchableOpacity onPress={() => setFilterRoleMenuVisible(false)}><Ionicons name="close" size={24} color="#374151" /></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <TouchableOpacity style={[s.sheetItem, !filterRole && s.sheetItemActive]} onPress={() => { setFilterRole(null); setFilterRoleMenuVisible(false); }}>
                <View style={[s.sheetItemIcon, { backgroundColor: "#F1F5F9" }]}><Ionicons name="apps" size={20} color="#64748B" /></View>
                <Text style={[s.sheetItemTxt, !filterRole && s.sheetItemTxtActive]}>Todos los roles</Text>
                {!filterRole && <Ionicons name="checkmark-circle" size={22} color="#3B82F6" />}
              </TouchableOpacity>
              {ROLES_LIST.map(r => (
                <TouchableOpacity key={r.id} style={[s.sheetItem, filterRole === r.id && { backgroundColor: r.color + "08" }]} onPress={() => { setFilterRole(r.id); setFilterRoleMenuVisible(false); }}>
                  <View style={[s.sheetItemIcon, { backgroundColor: r.color + "15" }]}><Ionicons name={r.icon} size={20} color={r.color} /></View>
                  <Text style={[s.sheetItemTxt, filterRole === r.id && { color: r.color, fontWeight: "700" }]}>{r.label}</Text>
                  {filterRole === r.id && <Ionicons name="checkmark-circle" size={22} color={r.color} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Filter State Menu */}
      <Modal visible={filterStateMenuVisible} transparent animationType="slide" onRequestClose={() => setFilterStateMenuVisible(false)}>
        <View style={s.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setFilterStateMenuVisible(false)} />
          <View style={[s.modalBox, s.bottomSheet, { maxHeight: "70%" }]}>
            <View style={s.sheetHandle} />
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Filtrar por Estado</Text>
              <TouchableOpacity onPress={() => setFilterStateMenuVisible(false)}><Ionicons name="close" size={24} color="#374151" /></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <TouchableOpacity style={[s.sheetItem, !filterStateId && s.sheetItemActive]} onPress={() => { setFilterStateId(null); setFilterStateMenuVisible(false); }}>
                <View style={[s.sheetItemIcon, { backgroundColor: "#F1F5F9" }]}><Ionicons name="layers" size={20} color="#64748B" /></View>
                <Text style={[s.sheetItemTxt, !filterStateId && s.sheetItemTxtActive]}>Todos los estados</Text>
                {!filterStateId && <Ionicons name="checkmark-circle" size={22} color="#3B82F6" />}
              </TouchableOpacity>
              {(states || []).map(st => (
                <TouchableOpacity key={st.id} style={[s.sheetItem, filterStateId === st.id && { backgroundColor: st.color + "08" }]} onPress={() => { setFilterStateId(st.id); setFilterStateMenuVisible(false); }}>
                  <View style={[s.sheetItemIcon, { backgroundColor: st.color + "15" }]}><View style={[s.dotSmall, { backgroundColor: st.color }]} /></View>
                  <Text style={[s.sheetItemTxt, filterStateId === st.id && { color: st.color, fontWeight: "700" }]}>{st.name}</Text>
                  {filterStateId === st.id && <Ionicons name="checkmark-circle" size={22} color={st.color} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

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
              {(states || []).map(state => {
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
  
  // Controls Header
  controls: { 
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  searchRow: { 
    flexDirection: "row", 
    gap: 10, 
    marginBottom: 12 
  },
  clearBtn: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
  },
  filtersRow: { 
    flexDirection: "row", 
    gap: 10 
  },

  // User Card
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
  
  // Modals
  modalOverlay: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.6)", justifyContent: "flex-end" },
  modalBox: { backgroundColor: "white", borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, maxHeight: "80%" },
  sheetHandle: { width: 40, height: 5, backgroundColor: "#E2E8F0", borderRadius: 3, alignSelf: "center", marginBottom: 20 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 },
  modalTitle: { fontSize: 24, fontWeight: "900", color: "#0F172A" },
  modalSub: { fontSize: 14, color: "#64748B", marginTop: 4, fontWeight: "600" },
  closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#F8FAFC", justifyContent: "center", alignItems: "center" },
  
  sheetItem: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 16, marginBottom: 8, gap: 14 },
  sheetItemActive: { backgroundColor: "#F0F9FF" },
  sheetItemIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  sheetItemTxt: { flex: 1, fontSize: 15, fontWeight: "600", color: "#334155" },
  sheetItemTxtActive: { color: "#3B82F6" },
  dotSmall: { width: 12, height: 12, borderRadius: 6 },

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

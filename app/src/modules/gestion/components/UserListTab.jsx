import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View, Text, FlatList, TouchableOpacity, Alert,
  RefreshControl, ActivityIndicator, StyleSheet, Modal, ScrollView,
  Pressable, Dimensions
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import SearchBar from "../../shared/components/SearchBar";
import FilterChip from "../../shared/components/FilterChip";
import { getAllUsers, updateUserRole } from "../services/usersService";
import { assignStateToUser, removeStateFromUser } from "../services/statesService";
import { useAuth } from "../../auth/context/AuthContext";

const { height } = Dimensions.get("window");

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
    const ri = ROLE_CONFIG[item.role] || ROLE_CONFIG.User;
    const isSelf = item.id === currentUser?.id;
    const roleEditable = canEditRole(item);
    const statesEditable = canEditStates(item);

    return (
      <View style={[s.userCard, !roleEditable && !statesEditable && s.userCardDisabled]}>
        {/* Role Badge integrated into the card header area */}
        <View style={s.userRow}>
          <View style={[s.avatar, { backgroundColor: ri.color }]}>
            {item.avatar_url
              ? <Image source={{ uri: item.avatar_url }} style={StyleSheet.absoluteFill} contentFit="cover" />
              : <Text style={s.avatarTxt}>{item.name?.charAt(0)?.toUpperCase() || "?"}</Text>}
          </View>
          <View style={{ flex: 1 }}>
            <View style={s.nameRow}>
              <Text style={s.userName} numberOfLines={1}>{item.name || "—"}</Text>
              {isSelf && <View style={s.selfBadge}><Text style={s.selfBadgeTxt}>TÚ</Text></View>}
            </View>
            <Text style={s.userEmail} numberOfLines={1}>{item.email}</Text>
          </View>
          <View style={[s.roleBadge, { backgroundColor: ri.bg }]}>
            <Ionicons name={ri.icon} size={12} color={ri.color} style={{ marginRight: 4 }} />
            <Text style={[s.roleBadgeTxt, { color: ri.color }]}>{ri.label}</Text>
          </View>
        </View>

        <View style={s.statesRow}>
          {(item.states ?? []).length > 0 ? (
            (item.states ?? []).map(st => (
              <View key={st.id} style={[s.statePill, { backgroundColor: st.color + "10", borderColor: st.color + "30" }]}>
                <View style={[s.dotSmall, { backgroundColor: st.color, marginRight: 6 }]} />
                <Text style={[s.statePillTxt, { color: st.color }]}>{st.name}</Text>
              </View>
            ))
          ) : (
            <Text style={s.noStatesTxt}>Sin estados asignados</Text>
          )}
        </View>
        
        <View style={s.actionRow}>
          {roleEditable ? (
            <TouchableOpacity style={s.actionBtn} onPress={() => { setSelectedUser(item); setRoleModalVisible(true); }}>
              <Ionicons name="swap-horizontal" size={16} color="#6366F1" />
              <Text style={[s.actionTxt, { color: "#6366F1" }]}>Cambiar Rol</Text>
            </TouchableOpacity>
          ) : (
            <View style={[s.actionBtn, s.actionBtnDisabled]}>
              <Ionicons name="lock-closed-outline" size={14} color="#94A3B8" />
              <Text style={s.actionTxtDisabled}>Rol bloqueado</Text>
            </View>
          )}

          {statesEditable ? (
            <TouchableOpacity style={s.actionBtn} onPress={() => { setSelectedUser(item); setStatesModalVisible(true); }}>
              <Ionicons name="layers-outline" size={16} color="#F59E0B" />
              <Text style={[s.actionTxt, { color: "#F59E0B" }]}>Estados</Text>
            </TouchableOpacity>
          ) : (
            <View style={[s.actionBtn, s.actionBtnDisabled]}>
              <Ionicons name="lock-closed-outline" size={14} color="#94A3B8" />
              <Text style={s.actionTxtDisabled}>Solo lectura</Text>
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
      </View>
      
      <View style={s.filtersRow}>
        <FilterChip 
          icon="shield-checkmark-outline"
          label={selectedRoleObj ? selectedRoleObj.label : "Rol"}
          isActive={!!filterRole}
          onPress={() => setFilterRoleMenuVisible(true)}
        />
        <FilterChip 
          icon="layers-outline"
          label={selectedStateObj ? selectedStateObj.name : "Estado"}
          isActive={!!filterStateId}
          onPress={() => setFilterStateMenuVisible(true)}
        />
        {(filterRole || filterStateId) && (
          <TouchableOpacity onPress={() => { setFilterRole(null); setFilterStateId(null); }} style={s.clearBtnSmall}>
            <Ionicons name="close-circle" size={20} color="#EF4444" />
          </TouchableOpacity>
        )}
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
      <Modal visible={filterRoleMenuVisible} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setFilterRoleMenuVisible(false)} />
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <Text style={s.modalSheetTitle}>Filtrar por rol</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <TouchableOpacity 
                style={[s.modalItem, !filterRole && s.modalItemActive]} 
                onPress={() => { setFilterRole(null); setFilterRoleMenuVisible(false); }}
              >
                <Ionicons name="apps-outline" size={20} color={!filterRole ? "#3B82F6" : "#94A3B8"} />
                <Text style={[s.modalItemTxt, !filterRole && s.modalItemTxtActive]}>Todos los roles</Text>
                {!filterRole && <Ionicons name="checkmark" size={20} color="#3B82F6" />}
              </TouchableOpacity>
              {ROLES_LIST.map(r => (
                <TouchableOpacity 
                  key={r.id} 
                  style={[s.modalItem, filterRole === r.id && s.modalItemActive]} 
                  onPress={() => { setFilterRole(r.id); setFilterRoleMenuVisible(false); }}
                >
                  <Ionicons name={r.icon} size={20} color={filterRole === r.id ? "#3B82F6" : "#94A3B8"} />
                  <Text style={[s.modalItemTxt, filterRole === r.id && s.modalItemTxtActive]}>{r.label}</Text>
                  {filterRole === r.id && <Ionicons name="checkmark" size={20} color="#3B82F6" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Filter State Menu */}
      <Modal visible={filterStateMenuVisible} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setFilterStateMenuVisible(false)} />
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <Text style={s.modalSheetTitle}>Filtrar por estado</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <TouchableOpacity 
                style={[s.modalItem, !filterStateId && s.modalItemActive]} 
                onPress={() => { setFilterStateId(null); setFilterStateMenuVisible(false); }}
              >
                <Ionicons name="apps-outline" size={20} color={!filterStateId ? "#3B82F6" : "#94A3B8"} />
                <Text style={[s.modalItemTxt, !filterStateId && s.modalItemTxtActive]}>Todos los estados</Text>
                {!filterStateId && <Ionicons name="checkmark" size={20} color="#3B82F6" />}
              </TouchableOpacity>
              {(states || []).map(st => (
                <TouchableOpacity 
                  key={st.id} 
                  style={[s.modalItem, filterStateId === st.id && s.modalItemActive]} 
                  onPress={() => { setFilterStateId(st.id); setFilterStateMenuVisible(false); }}
                >
                  <View style={[s.dotSmall, { backgroundColor: st.color, marginRight: 4 }]} />
                  <Text style={[s.modalItemTxt, filterStateId === st.id && s.modalItemTxtActive]}>{st.name}</Text>
                  {filterStateId === st.id && <Ionicons name="checkmark" size={20} color="#3B82F6" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal Cambio de Rol */}
      <Modal visible={roleModalVisible} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setRoleModalVisible(false)} />
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <Text style={s.modalSheetTitle}>Cambiar rol</Text>
            <Text style={s.modalSub}>{selectedUser?.name}</Text>
            
            <View style={s.rolesListCompact}>
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
                      style={s.compactActionRow}
                      onPress={() => handleUpdateRole(roleKey)}
                    >
                      <View style={[s.compactIcon, { backgroundColor: config.color + "15" }]}>
                        <Ionicons name={config.icon} size={16} color={config.color} />
                      </View>
                      <Text style={[s.compactLabel, { color: "#1E293B" }]}>{config.label}</Text>
                      <Ionicons name="chevron-forward" size={14} color="#CBD5E1" />
                    </TouchableOpacity>
                  );
                })}
            </View>
            <View style={{ height: 20 }} />
          </View>
        </View>
      </Modal>

      {/* Modal Estados */}
      <Modal visible={statesModalVisible} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setStatesModalVisible(false)} />
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <Text style={s.modalSheetTitle}>Gestionar estados</Text>
            <Text style={s.modalSub}>{selectedUser?.name}</Text>
            
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: height * 0.4 }}>
              {(states || []).map(state => {
                const has = selectedUser?.states?.some(s => s.id === state.id);
                return (
                  <TouchableOpacity 
                    key={state.id} 
                    style={[s.compactActionRow, has && { backgroundColor: "#F8FAFC" }]} 
                    onPress={() => handleToggleState(state)}
                  >
                    <View style={[s.dotSmall, { backgroundColor: state.color, marginRight: 4 }]} />
                    <Text style={[s.compactLabel, has && { color: state.color, fontWeight: "700" }]}>{state.name}</Text>
                    <Ionicons 
                      name={has ? "checkbox" : "square-outline"} 
                      size={18} 
                      color={has ? state.color : "#CBD5E1"} 
                    />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <TouchableOpacity style={s.doneBtn} onPress={() => setStatesModalVisible(false)}>
              <Text style={s.doneBtnTxt}>Guardar cambios</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  list: { padding: 16, paddingBottom: 100 },
  
  controls: { 
    backgroundColor: "white", 
    paddingHorizontal: 14, 
    paddingVertical: 10,
    borderRadius: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  searchRow: { 
    flexDirection: "row", 
    alignItems: "center",
    gap: 8, 
    marginBottom: 10 
  },
  filtersRow: { 
    flexDirection: "row", 
    alignItems: "center",
    gap: 6,
  },
  clearBtnSmall: {
    padding: 4,
  },

  // User Card
  userCard: { 
    backgroundColor: "white", 
    borderRadius: 22, 
    marginBottom: 14, 
    padding: 14, 
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#0F172A", 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.04, 
    shadowRadius: 8, 
    elevation: 2 
  },
  userCardDisabled: { opacity: 0.8 },
  userRow: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  avatar: { width: 48, height: 48, borderRadius: 14, justifyContent: "center", alignItems: "center", marginRight: 12, overflow: "hidden" },
  avatarTxt: { color: "white", fontSize: 18, fontWeight: "800" },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  userName: { fontSize: 15, fontWeight: "800", color: "#1E293B", flexShrink: 1 },
  selfBadge: { backgroundColor: "#F1F5F9", paddingHorizontal: 5, paddingVertical: 2, borderRadius: 5 },
  selfBadgeTxt: { fontSize: 8, fontWeight: "800", color: "#64748B" },
  userEmail: { fontSize: 12, color: "#94A3B8", marginTop: 1 },
  
  statesRow: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginBottom: 14 },
  statePill: { 
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8, 
    paddingVertical: 3, 
    borderRadius: 8, 
    borderWidth: 1 
  },
  statePillTxt: { fontSize: 10, fontWeight: "700" },
  noStatesTxt: { fontSize: 11, color: "#CBD5E1", fontStyle: "italic" },
  
  roleBadge: { 
    flexDirection: "row", 
    alignItems: "center", 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 8,
  },
  roleBadgeTxt: { fontSize: 10, fontWeight: "800", textTransform: "capitalize" },
  
  actionRow: { 
    flexDirection: "row", 
    gap: 8, 
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#F8FAFC",
  },
  actionBtn: { 
    flex: 1, 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "center", 
    gap: 5, 
    paddingVertical: 10, 
    backgroundColor: "#F8FAFC", 
    borderRadius: 12, 
    borderWidth: 1, 
    borderColor: "#F1F5F9" 
  },
  actionBtnDisabled: { backgroundColor: "#F1F5F9", borderColor: "transparent" },
  actionTxt: { fontSize: 12, fontWeight: "700" },
  actionTxtDisabled: { fontSize: 11, fontWeight: "600", color: "#94A3B8" },

  emptyContainer: { alignItems: "center", marginTop: 80, gap: 10 },
  empty: { textAlign: "center", color: "#94A3B8", fontSize: 14, fontWeight: "500" },
  
  // Modals Premium
  modalOverlay: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.4)", justifyContent: "flex-end" },
  modalSheet: { 
    backgroundColor: "white", 
    borderTopLeftRadius: 28, 
    borderTopRightRadius: 28, 
    padding: 20, 
    paddingTop: 12,
  },
  modalHandle: { 
    width: 36, 
    height: 4, 
    backgroundColor: "#E2E8F0", 
    borderRadius: 2, 
    alignSelf: "center", 
    marginBottom: 16 
  },
  modalSheetTitle: { 
    fontSize: 16, 
    fontWeight: "800", 
    color: "#1E293B", 
    marginBottom: 14 
  },
  modalItem: { 
    flexDirection: "row", 
    alignItems: "center", 
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 2,
  },
  modalItemActive: {
    backgroundColor: "#F8FAFC",
  },
  modalItemTxt: { 
    flex: 1,
    fontSize: 13, 
    fontWeight: "500", 
    color: "#64748B" 
  },
  modalItemTxtActive: { 
    color: "#3B82F6",
    fontWeight: "600",
  },
  modalSub: { fontSize: 12, color: "#94A3B8", marginTop: -10, marginBottom: 14, fontWeight: "500" },
  
  dotSmall: { width: 6, height: 6, borderRadius: 3 },

  rolesListCompact: { gap: 2 },
  compactActionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    gap: 12,
  },
  compactIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  compactLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    color: "#475569",
  },
  
  doneBtn: { 
    backgroundColor: "#0F172A", 
    paddingVertical: 12, 
    borderRadius: 12, 
    alignItems: "center", 
    marginTop: 10,
  },
  doneBtnTxt: { color: "white", fontSize: 13, fontWeight: "800" },
});

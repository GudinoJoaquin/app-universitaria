import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, FlatList, TouchableOpacity, Alert,
  RefreshControl, ActivityIndicator, StyleSheet, Modal, TextInput, ScrollView,
  Dimensions, Pressable
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import SearchBar from "../../shared/components/SearchBar";
import { getAllStates, deleteState, createState, updateState } from "../services/statesService";

const { height, width } = Dimensions.get("window");

const PRESET_COLORS = [
  "#3B82F6", "#EF4444", "#10B981", "#F59E0B", 
  "#8B5CF6", "#64748B", "#EC4899", "#06B6D4",
  "#1E293B", "#F43F5E", "#84CC16", "#D946EF"
];

export default function StatesListTab() {
  const [searchText, setSearchText] = useState("");
  const [states, setStates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingState, setEditingState] = useState(null);
  const [form, setForm] = useState({ name: "", color: "#3B82F6" });

  const loadData = useCallback(async () => {
    const res = await getAllStates();
    if (res.success) setStates(res.data);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSave = async () => {
    if (!form.name.trim()) return Alert.alert("Error", "Nombre requerido");
    const res = editingState 
      ? await updateState(editingState.id, { name: form.name.trim(), color: form.color, is_default: editingState.is_default })
      : await createState(form.name.trim(), form.color);
    
    if (res.success) {
      setModalVisible(false);
      loadData();
    } else Alert.alert("Error", res.error);
  };

  const handleDelete = (id) => {
    Alert.alert("Eliminar", "¿Eliminar este estado?", [
      { text: "No", style: "cancel" },
      { text: "Sí", style: "destructive", onPress: async () => {
        const res = await deleteState(id);
        if (res.success) loadData();
        else Alert.alert("Error", res.error);
      }},
    ]);
  };

  const filtered = states.filter(s => s.name?.toLowerCase().includes(searchText.toLowerCase()));

  const renderState = ({ item }) => (
    <View style={s.card}>
      <View style={[s.colorIndicator, { backgroundColor: item.color }]} />
      <View style={s.cardContent}>
        <View style={s.cardHeader}>
          <Text style={s.name}>{item.name}</Text>
          {item.is_default && (
            <View style={[s.defaultBadge, { backgroundColor: item.color + "20" }]}>
              <Text style={[s.defaultTxt, { color: item.color }]}>DEFAULT</Text>
            </View>
          )}
        </View>
        <Text style={s.colorCode}>{item.color.toUpperCase()}</Text>
      </View>
      <View style={s.actions}>
        <TouchableOpacity style={s.actionBtn} onPress={() => { setEditingState(item); setForm({ name: item.name, color: item.color }); setModalVisible(true); }}>
          <Ionicons name="pencil-outline" size={18} color="#64748B" />
        </TouchableOpacity>
        <TouchableOpacity style={s.actionBtn} onPress={() => handleDelete(item.id)}>
          <Ionicons name="trash-outline" size={18} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) return <ActivityIndicator size="large" color="#3B82F6" style={{ marginTop: 50 }} />;

  const renderHeader = () => (
    <View style={s.controls}>
      <SearchBar 
        value={searchText} 
        onChangeText={setSearchText} 
        placeholder="Buscar estado..." 
      />
    </View>
  );

  return (
    <View style={s.container}>
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={renderState}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
        ListEmptyComponent={<View style={s.empty}><Ionicons name="layers-outline" size={48} color="#CBD5E1" /><Text style={s.emptyTxt}>No se encontraron estados.</Text></View>}
      />
      <TouchableOpacity style={s.fab} onPress={() => { setEditingState(null); setForm({ name: "", color: "#3B82F6" }); setModalVisible(true); }}>
        <LinearGradient colors={["#3B82F6", "#2563EB"]} style={s.fabGradient}>
          <Ionicons name="add" size={32} color="white" />
        </LinearGradient>
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setModalVisible(false)} />
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <Text style={s.modalSheetTitle}>{editingState ? "Editar estado" : "Nuevo estado"}</Text>
            
            <Text style={s.label}>Nombre del estado</Text>
            <TextInput 
              style={s.input} 
              placeholder="Ej: Estudiante, Egresado..." 
              placeholderTextColor="#94A3B8"
              value={form.name} 
              onChangeText={t => setForm({ ...form, name: t })} 
            />
            
            <Text style={s.label}>Color de identificación</Text>
            <View style={s.colorGrid}>
              {PRESET_COLORS.map(c => (
                <TouchableOpacity 
                  key={c} 
                  style={[s.colorOption, { backgroundColor: c }]} 
                  onPress={() => setForm({ ...form, color: c })}
                >
                  {form.color === c && (
                    <View style={s.colorCheck}>
                      <Ionicons name="checkmark" size={20} color="white" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
            
            <View style={s.modalActions}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={s.cancelBtnTxt}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.saveBtn} onPress={handleSave}>
                <LinearGradient colors={["#0F172A", "#1E293B"]} style={s.saveBtnGradient}>
                  <Text style={s.saveBtnTxt}>{editingState ? "Guardar cambios" : "Crear estado"}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
            <View style={{ height: 20 }} />
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
  card: { 
    backgroundColor: "white", 
    borderRadius: 18, 
    marginBottom: 10, 
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#0F172A", 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.04, 
    shadowRadius: 8, 
    elevation: 2 
  },
  colorIndicator: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  cardContent: { flex: 1 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  name: { fontSize: 15, fontWeight: "800", color: "#1E293B" },
  colorCode: { fontSize: 10, color: "#94A3B8", marginTop: 1, fontWeight: "600", letterSpacing: 0.5 },
  defaultBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  defaultTxt: { fontSize: 8, fontWeight: "900" },
  actions: { flexDirection: "row", gap: 6 },
  actionBtn: { 
    width: 34, 
    height: 34, 
    borderRadius: 10, 
    backgroundColor: "#F8FAFC", 
    justifyContent: "center", 
    alignItems: "center", 
    borderWidth: 1, 
    borderColor: "#F1F5F9" 
  },
  fab: { 
    position: "absolute", 
    bottom: 24, 
    right: 20, 
    width: 54, 
    height: 54, 
    borderRadius: 18, 
    elevation: 6,
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  fabGradient: { flex: 1, borderRadius: 18, justifyContent: "center", alignItems: "center" },
  
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
    fontSize: 17, 
    fontWeight: "900", 
    color: "#0F172A", 
    marginBottom: 18 
  },
  label: { fontSize: 10, fontWeight: "800", color: "#64748B", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  input: { 
    backgroundColor: "#F8FAFC", 
    padding: 12, 
    borderRadius: 12, 
    marginBottom: 18, 
    fontSize: 13, 
    fontWeight: "600", 
    color: "#1E293B",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  colorGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 },
  colorOption: { 
    width: (width - 64) / 4, 
    height: 38, 
    borderRadius: 10, 
    justifyContent: "center", 
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  colorCheck: {
    backgroundColor: "rgba(0,0,0,0.15)",
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },
  modalActions: { flexDirection: "row", gap: 8 },
  cancelBtn: { flex: 1, padding: 12, alignItems: "center", borderRadius: 12, backgroundColor: "#F1F5F9" },
  cancelBtnTxt: { fontWeight: "800", fontSize: 12, color: "#64748B" },
  saveBtn: { flex: 2, height: 44, borderRadius: 12, overflow: "hidden" },
  saveBtnGradient: { flex: 1, justifyContent: "center", alignItems: "center" },
  saveBtnTxt: { color: "white", fontWeight: "800", fontSize: 13 },
  empty: { alignItems: "center", marginTop: 80, gap: 14 },
  emptyTxt: { fontSize: 14, color: "#94A3B8", fontWeight: "600" },
});




import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, FlatList, TouchableOpacity, Alert,
  RefreshControl, ActivityIndicator, StyleSheet, Modal, TextInput, ScrollView,
  Dimensions
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { getAllStates, createState, updateState, deleteState } from "../../services/statesService";

const { height, width } = Dimensions.get("window");

const PRESET_COLORS = [
  "#3B82F6", "#EF4444", "#10B981", "#F59E0B", 
  "#8B5CF6", "#64748B", "#EC4899", "#06B6D4",
  "#1E293B", "#F43F5E", "#84CC16", "#D946EF"
];

export default function StatesListTab({ searchText }) {
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
      <LinearGradient 
        colors={[item.color + "15", item.color + "05"]} 
        start={{x: 0, y: 0}} end={{x: 1, y: 0}} 
        style={s.cardGradient}
      >
        <View style={[s.colorIndicator, { backgroundColor: item.color }]} />
        <View style={s.cardContent}>
          <View style={s.cardHeader}>
            <Text style={s.name}>{item.name}</Text>
            {item.is_default && (
              <View style={[s.defaultBadge, { backgroundColor: item.color }]}>
                <Text style={s.defaultTxt}>DEFAULT</Text>
              </View>
            )}
          </View>
          <Text style={s.colorCode}>{item.color}</Text>
        </View>
        <View style={s.actions}>
          <TouchableOpacity style={s.actionBtn} onPress={() => { setEditingState(item); setForm({ name: item.name, color: item.color }); setModalVisible(true); }}>
            <Ionicons name="pencil-outline" size={20} color="#64748B" />
          </TouchableOpacity>
          <TouchableOpacity style={s.actionBtn} onPress={() => handleDelete(item.id)}>
            <Ionicons name="trash-outline" size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );

  if (loading) return <ActivityIndicator size="large" color="#3B82F6" style={{ marginTop: 50 }} />;

  return (
    <View style={s.container}>
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={renderState}
        contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
        ListEmptyComponent={<View style={s.empty}><Ionicons name="layers-outline" size={48} color="#CBD5E1" /><Text style={s.emptyTxt}>No se encontraron estados.</Text></View>}
      />
      <TouchableOpacity style={s.fab} onPress={() => { setEditingState(null); setForm({ name: "", color: "#3B82F6" }); setModalVisible(true); }}>
        <LinearGradient colors={["#3B82F6", "#2563EB"]} style={s.fabGradient}>
          <Ionicons name="add" size={32} color="white" />
        </LinearGradient>
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={s.modalOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setModalVisible(false)} />
          <View style={s.modalBox}>
            <View style={s.sheetHandle} />
            <Text style={s.modalTitle}>{editingState ? "Editar Estado" : "Nuevo Estado"}</Text>
            
            <Text style={s.label}>Nombre</Text>
            <TextInput style={s.input} placeholder="Ej: Estudiante, Egresado..." value={form.name} onChangeText={t => setForm({ ...form, name: t })} />
            
            <Text style={s.label}>Color</Text>
            <View style={s.colorGrid}>
              {PRESET_COLORS.map(c => (
                <TouchableOpacity key={c} style={[s.colorOption, { backgroundColor: c }, form.color === c && s.colorActive]} onPress={() => setForm({ ...form, color: c })}>
                  {form.color === c && <Ionicons name="checkmark" size={20} color="white" />}
                </TouchableOpacity>
              ))}
            </View>
            
            <View style={s.modalActions}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={s.cancelBtnTxt}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.saveBtn} onPress={handleSave}>
                <LinearGradient colors={["#3B82F6", "#2563EB"]} style={s.saveBtnGradient}>
                  <Text style={s.saveBtnTxt}>Guardar</Text>
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
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  list: { padding: 16, paddingBottom: 100 },
  card: { backgroundColor: "white", borderRadius: 20, marginBottom: 12, overflow: "hidden", elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10 },
  cardGradient: { flexDirection: "row", alignItems: "center", padding: 16 },
  colorIndicator: { width: 10, height: 10, borderRadius: 5, marginRight: 15 },
  cardContent: { flex: 1 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  name: { fontSize: 16, fontWeight: "800", color: "#1F2937" },
  colorCode: { fontSize: 10, color: "#94A3B8", marginTop: 2, fontWeight: "600" },
  defaultBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  defaultTxt: { fontSize: 7, fontWeight: "900", color: "white" },
  actions: { flexDirection: "row", gap: 5 },
  actionBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: "white", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "#F1F5F9" },
  fab: { position: "absolute", bottom: 20, right: 20, width: 60, height: 60, borderRadius: 30, elevation: 5 },
  fabGradient: { flex: 1, borderRadius: 30, justifyContent: "center", alignItems: "center" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.6)", justifyContent: "flex-end" },
  modalBox: { backgroundColor: "white", borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, maxHeight: height * 0.8 },
  sheetHandle: { width: 40, height: 6, backgroundColor: "#E2E8F0", borderRadius: 3, alignSelf: "center", marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: "900", color: "#0F172A", marginBottom: 25 },
  label: { fontSize: 12, fontWeight: "800", color: "#64748B", marginBottom: 8, textTransform: "uppercase" },
  input: { backgroundColor: "#F9FAFB", padding: 14, borderRadius: 12, marginBottom: 20, fontSize: 15, fontWeight: "600", color: "#1F2937" },
  colorGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 25 },
  colorOption: { width: (width - 88) / 4, height: 44, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  colorActive: { borderWidth: 3, borderColor: "rgba(0,0,0,0.1)" },
  modalActions: { flexDirection: "row", gap: 10 },
  cancelBtn: { flex: 1, padding: 16, alignItems: "center", borderRadius: 16, backgroundColor: "#F1F5F9" },
  cancelBtnTxt: { fontWeight: "800", fontSize: 14, color: "#64748B" },
  saveBtn: { flex: 2, height: 52, borderRadius: 16, overflow: "hidden" },
  saveBtnGradient: { flex: 1, justifyContent: "center", alignItems: "center" },
  saveBtnTxt: { color: "white", fontWeight: "800", fontSize: 15 },
  empty: { alignItems: "center", marginTop: 60, gap: 12 },
  emptyTxt: { fontSize: 14, color: "#94A3B8", fontWeight: "600" },
});

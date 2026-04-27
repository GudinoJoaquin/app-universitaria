import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, FlatList, TouchableOpacity, Alert,
  RefreshControl, ActivityIndicator, StyleSheet, Modal, TextInput, ScrollView
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getAllStates, createState, updateState, deleteState, setDefaultState } from "../../services/statesService";

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
      Alert.alert("Éxito", `Estado ${editingState ? "actualizado" : "creado"} correctamente`);
      setModalVisible(false);
      loadData();
    } else Alert.alert("Error", res.error);
  };

  const handleDelete = (id) => {
    Alert.alert("Eliminar", "¿Eliminar este estado?", [
      { text: "No", style: "cancel" },
      { text: "Sí", style: "destructive", onPress: async () => {
        const res = await deleteState(id);
        if (res.success) {
          Alert.alert("Éxito", "Estado eliminado");
          loadData();
        } else Alert.alert("Error", res.error);
      }},
    ]);
  };

  const filtered = states.filter(s => s.name?.toLowerCase().includes(searchText.toLowerCase()));

  const renderState = ({ item }) => (
    <View style={s.card}>
      <View style={[s.colorBox, { backgroundColor: item.color }]} />
      <View style={{ flex: 1 }}>
        <Text style={s.name}>{item.name}</Text>
        {item.is_default && <View style={s.defaultBadge}><Text style={s.defaultTxt}>DEFAULT</Text></View>}
      </View>
      <View style={s.actions}>
        <TouchableOpacity onPress={() => { setEditingState(item); setForm({ name: item.name, color: item.color }); setModalVisible(true); }}>
          <Ionicons name="pencil" size={20} color="#6B7280" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDelete(item.id)}>
          <Ionicons name="trash" size={20} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) return <ActivityIndicator size="large" color="#3B82F6" style={{ marginTop: 50 }} />;

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={renderState}
        contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
      />
      <TouchableOpacity style={s.fab} onPress={() => { setEditingState(null); setForm({ name: "", color: "#3B82F6" }); setModalVisible(true); }}>
        <Ionicons name="add" size={30} color="white" />
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>{editingState ? "Editar Estado" : "Nuevo Estado"}</Text>
            <TextInput style={s.input} placeholder="Nombre del estado" value={form.name} onChangeText={t => setForm({ ...form, name: t })} />
            <View style={s.colorGrid}>
              {["#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6", "#64748B", "#EC4899", "#06B6D4"].map(c => (
                <TouchableOpacity key={c} style={[s.colorOption, { backgroundColor: c }, form.color === c && s.colorActive]} onPress={() => setForm({ ...form, color: c })} />
              ))}
            </View>
            <View style={s.modalActions}>
              <TouchableOpacity style={s.cancel} onPress={() => setModalVisible(false)}><Text style={s.btnTxt}>Cancelar</Text></TouchableOpacity>
              <TouchableOpacity style={s.save} onPress={handleSave}><Text style={[s.btnTxt, { color: "white" }]}>Guardar</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  list: { padding: 16, paddingBottom: 100 },
  card: { flexDirection: "row", alignItems: "center", backgroundColor: "white", borderRadius: 16, marginBottom: 10, padding: 14, elevation: 2 },
  colorBox: { width: 14, height: 14, borderRadius: 7, marginRight: 12 },
  name: { fontSize: 15, fontWeight: "700", color: "#1F2937" },
  defaultBadge: { backgroundColor: "#F3F4F6", alignSelf: "flex-start", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 4 },
  defaultTxt: { fontSize: 8, fontWeight: "900", color: "#6B7280" },
  actions: { flexDirection: "row", gap: 15 },
  fab: { position: "absolute", bottom: 20, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: "#3B82F6", justifyContent: "center", alignItems: "center", elevation: 5 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 20 },
  modalBox: { backgroundColor: "white", borderRadius: 24, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#1F2937", marginBottom: 20 },
  input: { backgroundColor: "#F9FAFB", padding: 12, borderRadius: 12, marginBottom: 16, fontSize: 15 },
  colorGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 },
  colorOption: { width: 40, height: 40, borderRadius: 20 },
  colorActive: { borderWidth: 3, borderColor: "rgba(0,0,0,0.2)" },
  modalActions: { flexDirection: "row", gap: 12 },
  cancel: { flex: 1, padding: 14, alignItems: "center", borderRadius: 12, backgroundColor: "#F3F4F6" },
  save: { flex: 1, padding: 14, alignItems: "center", borderRadius: 12, backgroundColor: "#3B82F6" },
  btnTxt: { fontWeight: "700", fontSize: 14 },
});

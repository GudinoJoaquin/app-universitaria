import React, { useState, useEffect } from "react";
import {
  View, Text, FlatList, TouchableOpacity, Alert,
  StatusBar, ActivityIndicator, StyleSheet, TextInput, Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { categoriesService } from "../services/categoriesService";

const COLORS = ["#3B82F6", "#EF4444", "#F59E0B", "#8B5CF6", "#10B981", "#64748B", "#EC4899", "#06B6D4"];

export default function AdminCategoriesScreen({ navigation }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState("");
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);

  useEffect(() => { loadCategories(); }, []);

  const loadCategories = async () => {
    const res = await categoriesService.getAll();
    if (res.success) setCategories(res.data);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const res = await categoriesService.create(newName.trim(), selectedColor);
    if (res.success) {
      setNewName("");
      setModalVisible(false);
      loadCategories();
    } else {
      Alert.alert("Error", res.error);
    }
  };

  const handleDelete = (id, name) => {
    Alert.alert("Eliminar", `¿Eliminar categoría "${name}"? Esto la quitará de todos los eventos.`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Eliminar", style: "destructive", onPress: async () => {
          const res = await categoriesService.delete(id);
          if (res.success) loadCategories();
          else Alert.alert("Error", res.error);
        }
      },
    ]);
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="dark-content" />
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color="#1F2937" /></TouchableOpacity>
        <Text style={s.headerTitle}>Gestionar Categorías</Text>
        <TouchableOpacity onPress={() => setModalVisible(true)}><Ionicons name="add-circle" size={30} color="#3B82F6" /></TouchableOpacity>
      </View>

      {loading ? <ActivityIndicator size="large" color="#3B82F6" style={{ marginTop: 50 }} /> : (
        <FlatList
          data={categories}
          keyExtractor={item => item.id}
          contentContainerStyle={s.list}
          renderItem={({ item }) => (
            <View style={s.card}>
              <View style={[s.dot, { backgroundColor: item.color }]} />
              <Text style={s.name}>{item.name}</Text>
              <TouchableOpacity onPress={() => handleDelete(item.id, item.name)}><Ionicons name="trash-outline" size={20} color="#EF4444" /></TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={<Text style={s.empty}>No hay categorías creadas.</Text>}
        />
      )}

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <Text style={s.modalTitle}>Nueva Categoría</Text>
            <TextInput style={s.input} placeholder="Nombre..." value={newName} onChangeText={setNewName} />
            <Text style={s.label}>Color:</Text>
            <View style={s.colorRow}>
              {COLORS.map(c => (
                <TouchableOpacity key={c} style={[s.colorCircle, { backgroundColor: c }, selectedColor === c && s.colorActive]} onPress={() => setSelectedColor(c)} />
              ))}
            </View>
            <View style={s.modalActions}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setModalVisible(false)}><Text>Cancelar</Text></TouchableOpacity>
              <TouchableOpacity style={s.saveBtn} onPress={handleCreate}><Text style={{ color: "white", fontWeight: "700" }}>Crear</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 50, paddingBottom: 20, backgroundColor: "white" },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#1F2937" },
  list: { padding: 20 },
  card: { flexDirection: "row", alignItems: "center", backgroundColor: "white", padding: 16, borderRadius: 16, marginBottom: 10, elevation: 2 },
  dot: { width: 12, height: 12, borderRadius: 6, marginRight: 15 },
  name: { flex: 1, fontSize: 16, fontWeight: "600", color: "#1F2937" },
  empty: { textAlign: "center", color: "#9CA3AF", marginTop: 40 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 20 },
  modalBox: { backgroundColor: "white", borderRadius: 24, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: "800", marginBottom: 20 },
  input: { backgroundColor: "#F1F5F9", borderRadius: 12, padding: 14, fontSize: 16, marginBottom: 20 },
  label: { fontSize: 14, fontWeight: "700", color: "#64748B", marginBottom: 10 },
  colorRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 30 },
  colorCircle: { width: 34, height: 34, borderRadius: 17 },
  colorActive: { borderWidth: 3, borderColor: "#1F2937" },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 12 },
  cancelBtn: { paddingVertical: 12, paddingHorizontal: 20 },
  saveBtn: { backgroundColor: "#3B82F6", paddingVertical: 12, paddingHorizontal: 25, borderRadius: 12 },
});

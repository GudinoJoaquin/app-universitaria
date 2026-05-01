import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, FlatList, TouchableOpacity, Alert,
  RefreshControl, ActivityIndicator, StyleSheet, Modal, TextInput, ScrollView,
  Dimensions, Pressable
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import SearchBar from "../../shared/components/SearchBar";
import { categoriesService } from "../services/categoriesService";

const { height, width } = Dimensions.get("window");

const PRESET_COLORS = [
  "#64748B", "#EF4444", "#3B82F6", "#10B981", 
  "#F59E0B", "#8B5CF6", "#EC4899", "#06B6D4",
  "#1E293B", "#F43F5E", "#84CC16", "#D946EF"
];

export default function CategoriesListTab() {
  const [searchText, setSearchText] = useState("");
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCat, setEditingCat] = useState(null);
  const [form, setForm] = useState({ name: "", color: "#64748B" });

  const loadData = useCallback(async () => {
    const res = await categoriesService.getAll();
    if (res.success) setCategories(res.data);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSave = async () => {
    if (!form.name.trim()) return Alert.alert("Error", "Nombre requerido");
    const res = editingCat 
      ? await categoriesService.update(editingCat.id, form)
      : await categoriesService.create(form);
    
    if (res.success) {
      setModalVisible(false);
      loadData();
    } else Alert.alert("Error", res.error);
  };

  const handleDelete = (id) => {
    Alert.alert("Eliminar", "¿Eliminar esta categoría?", [
      { text: "No", style: "cancel" },
      { text: "Sí", style: "destructive", onPress: async () => {
        const res = await categoriesService.delete(id);
        if (res.success) loadData();
        else Alert.alert("Error", res.error);
      }},
    ]);
  };

  const filtered = categories.filter(c => c.name?.toLowerCase().includes(searchText.toLowerCase()));

  const renderItem = ({ item }) => (
    <View style={s.card}>
      <View style={[s.colorIndicator, { backgroundColor: item.color }]} />
      <View style={s.cardContent}>
        <Text style={s.name}>{item.name}</Text>
        <Text style={s.colorCode}>{item.color.toUpperCase()}</Text>
      </View>
      <View style={s.actions}>
        <TouchableOpacity style={s.actionBtn} onPress={() => { setEditingCat(item); setForm({ name: item.name, color: item.color }); setModalVisible(true); }}>
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
        placeholder="Buscar categoría..." 
      />
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
        ListEmptyComponent={<View style={s.empty}><Ionicons name="grid-outline" size={48} color="#CBD5E1" /><Text style={s.emptyTxt}>No hay categorías.</Text></View>}
      />
      <TouchableOpacity style={s.fab} onPress={() => { setEditingCat(null); setForm({ name: "", color: "#64748B" }); setModalVisible(true); }}>
        <LinearGradient 
          colors={["rgba(30, 27, 75, 0.85)", "rgba(49, 46, 129, 0.85)"]} 
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.fabGradient}
        >
          <Ionicons name="add" size={32} color="rgba(255, 255, 255, 0.9)" />
        </LinearGradient>
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setModalVisible(false)} />
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <Text style={s.modalSheetTitle}>{editingCat ? "Editar categoría" : "Nueva categoría"}</Text>
            
            <Text style={s.label}>Nombre de la categoría</Text>
            <TextInput 
              style={s.input} 
              placeholder="Ej: Deportes, Cultura..." 
              placeholderTextColor="#94A3B8"
              value={form.name} 
              onChangeText={t => setForm({ ...form, name: t })} 
            />
            
            <Text style={s.label}>Color temático</Text>
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
                  <Text style={s.saveBtnTxt}>{editingCat ? "Guardar cambios" : "Crear categoría"}</Text>
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
  name: { fontSize: 15, fontWeight: "800", color: "#1E293B" },
  colorCode: { fontSize: 10, color: "#94A3B8", marginTop: 1, fontWeight: "600", letterSpacing: 0.5 },
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
    width: 60, 
    height: 60, 
    borderRadius: 30,
    shadowColor: "#1E1B4B",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  fabGradient: { 
    flex: 1, 
    borderRadius: 30, 
    justifyContent: "center", 
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.25)",
  },
  
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




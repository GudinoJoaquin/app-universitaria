import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View, Text, FlatList, TouchableOpacity, Alert,
  RefreshControl, StatusBar, ActivityIndicator, StyleSheet, Modal, ScrollView, TextInput,
  Dimensions, Platform, Pressable
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../services/supabase";
import { eventsService } from "../services/eventsService";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Notification from "../components/Notification";
import {
  registerToEvent, unregisterFromEvent,
  getMyRegistrations,
  getEventParticipants,
} from "../services/eventsRegistrationService";
import { categoriesService } from "../services/categoriesService";
import { Image } from "expo-image";

const { height, width } = Dimensions.get("window");

const parseDate = (d) => {
  if (!d) return new Date(0);
  const clean = d.replace(/[\s]*[+-]\d{2}:\d{2}$/, "").replace(/Z$/, "").trim();
  return new Date(clean.replace(" ", "T") + "Z");
};

const formatTimeRange = (start, end) => {
  if (!start) return "Todo el día";
  const s = start.includes("T") ? start.split("T")[1].slice(0, 5) : start.slice(0, 5);
  if (!end) return `${s} hs`;
  const e = end.includes("T") ? end.split("T")[1].slice(0, 5) : end.slice(0, 5);
  return `${s} - ${e} hs`;
};

const getEventStatus = (eventDateStr, startTimeStr, endTimeStr) => {
  const now = new Date();
  const eventDate = parseDate(eventDateStr);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetDate = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());

  if (targetDate < today) return { id: "past", label: "Finalizado", color: "#94A3B8", bg: "#F1F5F9" };
  if (targetDate > today) return { id: "scheduled", label: "Programado", color: "#3B82F6", bg: "#EFF6FF" };

  if (targetDate.getTime() === today.getTime()) {
    if (!startTimeStr) return { id: "ongoing", label: "En Proceso", color: "#10B981", bg: "#ECFDF5" };
    const getMinutes = (timeStr) => {
      const part = timeStr.includes("T") ? timeStr.split("T")[1] : timeStr;
      const [h, m] = part.split(":");
      return parseInt(h) * 60 + parseInt(m);
    };
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const startMinutes = getMinutes(startTimeStr);
    if (nowMinutes < startMinutes) return { id: "scheduled", label: "Programado", color: "#3B82F6", bg: "#EFF6FF" };
    if (endTimeStr) {
      const endMinutes = getMinutes(endTimeStr);
      if (nowMinutes > endMinutes) return { id: "past", label: "Finalizado", color: "#94A3B8", bg: "#F1F5F9" };
    }
    return { id: "ongoing", label: "En Proceso", color: "#10B981", bg: "#ECFDF5" };
  }
  return { id: "scheduled", label: "Programado", color: "#3B82F6", bg: "#EFF6FF" };
};

export default function EventDashboardScreen({ navigation }) {
  const { user, isAdmin, isHelper } = useAuth();
  const showManageTab = isAdmin() || isHelper() || user?.role === "Organizer";
  const TABS = showManageTab ? ["Explorar", "Inscrito", "Organizar"] : ["Explorar", "Inscrito"];
  const [activeTab, setActiveTab] = useState(0);

  const [allEvents, setAllEvents] = useState([]);
  const [myInscribedEvents, setMyInscribedEvents] = useState([]);
  const [myManagedEvents, setMyManagedEvents] = useState([]);
  const [registeredIds, setRegisteredIds] = useState(new Set());
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState({});
  const [sortBy, setSortBy] = useState("newest");
  const [searchText, setSearchText] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState([]);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);

  // Participants Modal (nuevo de la rama main)
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [participantsLoading, setParticipantsLoading] = useState(false);

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    try {
      const catRes = await categoriesService.getAll();
      if (catRes.success) setCategories(catRes.data);

      const { data: eventsData, error } = await supabase
        .from("events")
        .select("*, profiles(name, role, id), event_categories_junction(categories(*))")
        .order("date", { ascending: sortBy === "newest" ? false : true });

      if (error) throw error;

      const normalized = (eventsData ?? []).map(e => ({
        ...e,
        categories: (e.event_categories_junction ?? []).map(j => j.categories).filter(Boolean),
      }));

      setAllEvents(normalized.filter(e => e.created_by !== user.id));
      
      let managed = [];
      if (isAdmin()) managed = normalized;
      else if (isHelper()) managed = normalized.filter(e => e.profiles?.role !== "Admin");
      else managed = normalized.filter(e => e.created_by === user.id);
      setMyManagedEvents(managed);

      const myRes = await getMyRegistrations(user.id);
      if (myRes.success) {
        setMyInscribedEvents(myRes.data.map(e => ({ ...e, ...normalized.find(ne => ne.id === e.id) })));
        setRegisteredIds(new Set(myRes.data.map(e => e.id)));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, isAdmin, isHelper, sortBy]);

  useEffect(() => { loadData(); }, [loadData]);
  const onRefresh = () => { setRefreshing(true); loadData(); };

  const filteredData = useMemo(() => {
    let base = activeTab === 0 ? allEvents : activeTab === 1 ? myInscribedEvents : myManagedEvents;
    return base.filter(item => {
      const matchesSearch = item.title?.toLowerCase().includes(searchText.toLowerCase()) || item.location?.toLowerCase().includes(searchText.toLowerCase());
      const matchesCategory = selectedCategoryIds.length === 0 || item.categories?.some(c => selectedCategoryIds.includes(c.id));
      const status = getEventStatus(item.date, item.start_time, item.end_time);
      const matchesStatus = filterStatus === "all" || (filterStatus === "past" && status.id === "past") || (filterStatus === "ongoing" && status.id === "ongoing") || (filterStatus === "upcoming" && status.id === "scheduled");
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [activeTab, allEvents, myInscribedEvents, myManagedEvents, searchText, selectedCategoryIds, filterStatus]);

  const handleDeleteEvent = (id) => {
    Alert.alert("Eliminar Evento", "¿Estás seguro de eliminar este evento permanentemente?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Eliminar", style: "destructive", onPress: async () => {
          const res = await eventsService.deleteEvent(id);
          if (res.success) {
            loadData();
            Alert.alert("Listo", "Evento eliminado.");
          } else Alert.alert("Error", res.error);
        }
      }
    ]);
  };

  const handleViewParticipants = async (event) => {
    setSelectedEvent(event);
    setModalVisible(true);
    setParticipantsLoading(true);
    const res = await getEventParticipants(event.id);
    setParticipants(res.success ? res.data : []);
    setParticipantsLoading(false);
  };

  const renderItem = ({ item }) => {
    const status = getEventStatus(item.date, item.start_time, item.end_time);
    const isOwner = item.created_by === user.id || isAdmin();

    return (
      <TouchableOpacity style={s.card} activeOpacity={0.9} onPress={() => navigation.navigate("EventDetails", { event: item })}>
        <View style={s.cardImgBox}>
          {item.image_url ? (
            <Image source={{ uri: item.image_url }} style={s.cardImg} contentFit="cover" />
          ) : (
            <LinearGradient colors={["#312E81", "#1E1B4B"]} style={s.cardImg} />
          )}
          <LinearGradient colors={["transparent", "rgba(0,0,0,0.6)"]} style={StyleSheet.absoluteFill} />
          <View style={s.cardTopOverlay}>
            <View style={[s.statusTag, { backgroundColor: status.bg }]}>
              <Text style={[s.statusTagTxt, { color: status.color }]}>{status.label}</Text>
            </View>
            <View style={{flexDirection: 'row', gap: 8}}>
              {isOwner && activeTab === 2 && (
                <TouchableOpacity style={[s.circleBtn, {backgroundColor: 'rgba(59, 130, 246, 0.8)'}]} onPress={() => handleViewParticipants(item)}>
                  <Ionicons name="people" size={16} color="white" />
                </TouchableOpacity>
              )}
              {isOwner && activeTab === 2 && (
                <TouchableOpacity style={[s.circleBtn, {backgroundColor: 'rgba(239, 68, 68, 0.8)'}]} onPress={() => handleDeleteEvent(item.id)}>
                  <Ionicons name="trash" size={16} color="white" />
                </TouchableOpacity>
              )}
            </View>
          </View>
          <View style={s.cardDateTag}>
            <Text style={s.cardDateDay}>{parseDate(item.date).getUTCDate()}</Text>
            <Text style={s.cardDateMonth}>{parseDate(item.date).toLocaleDateString("es-ES", { month: "short", timeZone: "UTC" }).toUpperCase()}</Text>
          </View>
        </View>
        <View style={s.cardInfo}>
          {item.categories?.[0] && (
            <View style={[s.catChip, { backgroundColor: item.categories[0].color + '20' }]}>
              <Text style={[s.catChipTxt, { color: item.categories[0].color }]}>{item.categories[0].name.toUpperCase()}</Text>
            </View>
          )}
          <Text style={s.cardTitle} numberOfLines={2}>{item.title}</Text>
          <View style={s.cardMeta}>
            <View style={s.metaItem}><Ionicons name="location" size={14} color="#64748B" /><Text style={s.metaTxt} numberOfLines={1}>{item.location}</Text></View>
            <View style={s.metaItem}><Ionicons name="time" size={14} color="#64748B" /><Text style={s.metaTxt}>{formatTimeRange(item.start_time, item.end_time)}</Text></View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={["#0F172A", "#1E293B"]} style={s.header}>
        <Text style={s.headerLogo}>EventosHub</Text>
        <View style={s.tabBar}>
          {TABS.map((tab, i) => (
            <TouchableOpacity key={`tab-${i}`} style={[s.tabItem, activeTab === i && s.tabItemActive]} onPress={() => setActiveTab(i)}>
              <Text style={[s.tabTxt, activeTab === i && s.tabTxtActive]}>{tab}</Text>
              {activeTab === i && <View style={s.tabLine} />}
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      <View style={s.controls}>
        <View style={s.searchRow}>
          <View style={s.searchBar}>
            <Ionicons name="search" size={20} color="#94A3B8" />
            <TextInput style={s.searchInput} placeholder="Buscar por título o lugar..." value={searchText} onChangeText={setSearchText} />
          </View>
          <TouchableOpacity style={s.filterBtn} onPress={() => setSortBy(p => p === "newest" ? "oldest" : "newest")}>
            <Ionicons name={sortBy === "newest" ? "swap-vertical" : "swap-vertical"} size={20} color="#1E1B4B" />
          </TouchableOpacity>
        </View>
        <View style={s.filterRow}>
          <TouchableOpacity style={s.dropdown} onPress={() => setStatusModalVisible(true)}>
            <Text style={s.dropdownTxt}>{filterStatus === "all" ? "Estado: Todos" : `Estado: ${filterStatus}`}</Text>
            <Ionicons name="chevron-down" size={16} color="#64748B" />
          </TouchableOpacity>
          <TouchableOpacity style={s.dropdown} onPress={() => setCategoryModalVisible(true)}>
            <Text style={s.dropdownTxt}>{selectedCategoryIds.length === 0 ? "Categoría: Todas" : "Filtro activo"}</Text>
            <Ionicons name="chevron-down" size={16} color="#64748B" />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={s.centered}><ActivityIndicator size="large" color="#1E1B4B" /></View>
      ) : (
        <FlatList
          data={filteredData}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={<View style={s.empty}><Ionicons name="calendar-outline" size={60} color="#E2E8F0" /><Text style={s.emptyTxt}>No hay eventos disponibles</Text></View>}
        />
      )}

      {activeTab === 2 && (
        <TouchableOpacity style={s.fab} onPress={() => navigation.navigate("CreateEvent", { event: null })}>
          <LinearGradient colors={["#1E1B4B", "#312E81"]} style={s.fabGradient}><Ionicons name="add" size={36} color="white" /></LinearGradient>
        </TouchableOpacity>
      )}

      {/* Participants Modal */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={s.modalOverlayCenter}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setModalVisible(false)} />
          <View style={s.modalBox}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle} numberOfLines={1}>Asistentes · {selectedEvent?.title}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}><Ionicons name="close" size={24} color="#1F2937" /></TouchableOpacity>
            </View>
            {participantsLoading ? <ActivityIndicator size="large" color="#3B82F6" style={{ margin: 40 }} /> : (
              <ScrollView>
                {participants.length === 0 ? <Text style={s.emptyP}>Aún no hay inscritos.</Text> : participants.map((p) => (
                  <View key={p.id} style={s.pRow}>
                    <View style={s.pAvatar}><Text style={s.pAvatarTxt}>{p.name?.[0] || "?"}</Text></View>
                    <View><Text style={s.pName}>{p.name}</Text><Text style={s.pEmail}>{p.email}</Text></View>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Status Modal */}
      <Modal visible={statusModalVisible} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setStatusModalVisible(false)} />
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>Filtrar por Estado</Text>
            {[{id: "all", l: "Todos"}, {id: "upcoming", l: "Programado"}, {id: "ongoing", l: "En Proceso"}, {id: "past", l: "Terminado"}].map(st => (
              <TouchableOpacity key={st.id} style={s.modalItem} onPress={() => { setFilterStatus(st.id); setStatusModalVisible(false); }}>
                <Text style={[s.modalItemTxt, filterStatus === st.id && s.modalItemTxtActive]}>{st.l}</Text>
                {filterStatus === st.id && <Ionicons name="checkmark" size={20} color="#1E1B4B" />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Category Modal */}
      <Modal visible={categoryModalVisible} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setCategoryModalVisible(false)} />
          <View style={[s.modalSheet, { maxHeight: height * 0.7 }]}>
            <View style={s.modalHandle} />
            <Text style={s.modalTitle}>Filtrar por Categoría</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {categories.map(cat => (
                <TouchableOpacity key={cat.id} style={s.modalItem} onPress={() => setSelectedCategoryIds(p => p.includes(cat.id) ? p.filter(id => id !== cat.id) : [...p, cat.id])}>
                  <Text style={[s.modalItemTxt, selectedCategoryIds.includes(cat.id) && s.modalItemTxtActive]}>{cat.name}</Text>
                  <Ionicons name={selectedCategoryIds.includes(cat.id) ? "checkbox" : "square-outline"} size={22} color={selectedCategoryIds.includes(cat.id) ? "#1E1B4B" : "#CBD5E1"} />
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={s.applyBtn} onPress={() => setCategoryModalVisible(false)}><Text style={s.applyBtnTxt}>Aplicar Filtros</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { paddingTop: 60, paddingBottom: 10, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, elevation: 10 },
  headerLogo: { fontSize: 28, fontWeight: "900", color: "white", textAlign: "center", marginBottom: 20 },
  tabBar: { flexDirection: "row", justifyContent: "center", gap: 30 },
  tabItem: { paddingVertical: 10, position: "relative" },
  tabTxt: { fontSize: 14, fontWeight: "700", color: "rgba(255,255,255,0.4)" },
  tabTxtActive: { color: "white" },
  tabLine: { position: "absolute", bottom: 0, left: 0, right: 0, height: 3, backgroundColor: "white", borderRadius: 2 },
  
  controls: { backgroundColor: "white", padding: 15, elevation: 2 },
  searchRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  searchBar: { flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: "#F1F5F9", borderRadius: 15, paddingHorizontal: 15, height: 48 },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 14, fontWeight: "600", color: "#1E293B" },
  filterBtn: { width: 48, height: 48, backgroundColor: "#EEF2FF", borderRadius: 15, justifyContent: "center", alignItems: "center" },
  filterRow: { flexDirection: "row", gap: 10 },
  dropdown: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "white", borderRadius: 12, paddingHorizontal: 12, height: 40, borderWidth: 1, borderColor: "#E2E8F0" },
  dropdownTxt: { fontSize: 12, fontWeight: "700", color: "#64748B" },
  
  listContent: { padding: 20, paddingBottom: 100 },
  card: { backgroundColor: "white", borderRadius: 28, marginBottom: 25, elevation: 8, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 15, overflow: "hidden" },
  cardImgBox: { height: 200, position: "relative" },
  cardImg: { ...StyleSheet.absoluteFillObject },
  cardTopOverlay: { ...StyleSheet.absoluteFillObject, padding: 15, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  statusTag: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  statusTagTxt: { fontSize: 10, fontWeight: "900" },
  circleBtn: { width: 32, height: 32, borderRadius: 16, justifyContent: "center", alignItems: "center" },
  cardDateTag: { position: "absolute", bottom: 15, right: 15, backgroundColor: "white", padding: 8, borderRadius: 15, alignItems: "center", minWidth: 55 },
  cardDateDay: { fontSize: 20, fontWeight: "900", color: "#1E1B4B" },
  cardDateMonth: { fontSize: 10, fontWeight: "800", color: "#64748B" },
  
  cardInfo: { padding: 20 },
  catChip: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginBottom: 10 },
  catChipTxt: { fontSize: 10, fontWeight: "900" },
  cardTitle: { fontSize: 22, fontWeight: "900", color: "#1E293B", marginBottom: 12, lineHeight: 28 },
  cardMeta: { flexDirection: "row", gap: 15 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1 },
  metaTxt: { fontSize: 13, color: "#64748B", fontWeight: "600" },
  
  fab: { position: "absolute", bottom: 35, right: 25, width: 65, height: 65, borderRadius: 32, elevation: 12 },
  fabGradient: { flex: 1, borderRadius: 32, justifyContent: "center", alignItems: "center" },
  
  empty: { height: 300, justifyContent: "center", alignItems: "center", gap: 15 },
  emptyTxt: { fontSize: 16, color: "#94A3B8", fontWeight: "700" },
  
  modalOverlay: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.6)", justifyContent: "flex-end" },
  modalOverlayCenter: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.6)", justifyContent: "center", padding: 20 },
  modalSheet: { backgroundColor: "white", borderTopLeftRadius: 35, borderTopRightRadius: 35, padding: 25, shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 20 },
  modalBox: { backgroundColor: "white", borderRadius: 24, padding: 20, maxHeight: height * 0.8 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  modalHandle: { width: 40, height: 5, backgroundColor: "#E2E8F0", borderRadius: 3, alignSelf: "center", marginBottom: 25 },
  modalTitle: { fontSize: 18, fontWeight: "900", color: "#1E293B", flex: 1 },
  modalItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: "#F8FAFC" },
  modalItemTxt: { fontSize: 16, fontWeight: "700", color: "#64748B" },
  modalItemTxtActive: { color: "#1E1B4B" },
  applyBtn: { backgroundColor: "#1E1B4B", padding: 18, borderRadius: 20, alignItems: "center", marginTop: 25 },
  applyBtnTxt: { color: "white", fontWeight: "900", fontSize: 16 },
  
  pRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  pAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#EFF6FF", justifyContent: "center", alignItems: "center" },
  pAvatarTxt: { fontWeight: "900", color: "#3B82F6" },
  pName: { fontSize: 15, fontWeight: "700", color: "#1F2937" },
  pEmail: { fontSize: 12, color: "#6B7280" },
  emptyP: { textAlign: "center", color: "#94A3B8", marginVertical: 20 },
});

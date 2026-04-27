import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View, Text, FlatList, TouchableOpacity, Alert,
  RefreshControl, StatusBar, ActivityIndicator, StyleSheet, Pressable, Modal, ScrollView, TextInput,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../services/supabase";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import {
  registerToEvent, unregisterFromEvent,
  getMyRegistrations, getEventParticipants,
} from "../services/eventsRegistrationService";

import { categoriesService } from "../services/categoriesService";

const parseDate = (d) => {
  if (!d) return new Date(0);
  const clean = d.replace(/[\s]*[+-]\d{2}:\d{2}$/, "").replace(/Z$/, "").trim();
  return new Date(clean.replace(" ", "T") + "Z");
};

const formatEventDate = (d) => {
  const dt = parseDate(d);
  return {
    date: dt.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }),
    time: dt.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" }),
    day:  dt.toLocaleDateString("es-ES", { weekday: "long", timeZone: "UTC" }),
  };
};

const getEventStatus = (d) => {
  const diff = (parseDate(d) - new Date()) / 86400000;
  if (diff < 0) return { label: "Finalizado",   color: "#6B7280", bg: "#F3F4F6" };
  if (diff <= 1) return { label: "Hoy/Mañana",  color: "#DC2626", bg: "#FEE2E2" };
  if (diff <= 7) return { label: "Esta semana", color: "#D97706", bg: "#FEF3C7" };
  return { label: "Programado",  color: "#059669", bg: "#D1FAE5" };
};

export default function EventDashboardScreen({ navigation }) {
  const { user, isAdmin, isHelper } = useAuth();
  
  // Tabs logic
  const showManageTab = isAdmin() || isHelper() || user?.role === "Organizer";
  const TABS = showManageTab ? ["Explorar", "Inscrito", "Organizar"] : ["Explorar", "Inscrito"];
  const [activeTab, setActiveTab] = useState(0);

  // Filters & Search
  const [allEvents, setAllEvents] = useState([]);
  const [myInscribedEvents, setMyInscribedEvents] = useState([]);
  const [myManagedEvents, setMyManagedEvents] = useState([]);
  const [registeredIds, setRegisteredIds] = useState(new Set());
  const [categories, setCategories] = useState([]);
  const [activeCategoryId, setActiveCategoryId] = useState(null); 
  const [searchText, setSearchText] = useState(""); // También faltaba searchText
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState({});

  // Modal participants states
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    try {
      // Cargar categorías primero
      const catRes = await categoriesService.getAll();
      if (catRes.success) setCategories(catRes.data);

      const { data: eventsData } = await supabase
        .from("events")
        .select("*, profiles(name, role, id), event_categories_junction(categories(name, color, id))")
        .order("date", { ascending: true });

      const normalizedEvents = (eventsData ?? []).map(e => ({
        ...e,
        created_by_name: e.profiles?.name ?? "Desconocido",
        created_by_role: e.profiles?.role ?? "User",
        categories: (e.event_categories_junction ?? []).map(j => j.categories).filter(Boolean),
        profiles: undefined,
        event_categories_junction: undefined
      }));

      const available = normalizedEvents.filter(e => e.created_by !== user.id);
      setAllEvents(available);

      let managed = [];
      if (isAdmin()) managed = normalizedEvents;
      else if (isHelper()) managed = normalizedEvents.filter(e => !["Admin", "Helper"].includes(e.created_by_role));
      else if (user?.role === "Organizer") managed = normalizedEvents.filter(e => e.created_by === user.id);
      setMyManagedEvents(managed);

      const myRes = await getMyRegistrations(user.id);
      if (myRes.success) {
        setMyInscribedEvents(myRes.data.map(e => ({
          ...e,
          ...normalizedEvents.find(ne => ne.id === e.id)
        })));
        setRegisteredIds(new Set(myRes.data.map(e => e.id)));
      }
    } catch (e) {
      console.error("Error loading events hub:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, isAdmin, isHelper]);

  useEffect(() => { loadData(); }, [loadData]);
  const onRefresh = () => { setRefreshing(true); loadData(); };

  // --- Filtering Logic ---
  const filteredData = useMemo(() => {
    let baseData = [];
    if (activeTab === 0) baseData = allEvents;
    else if (activeTab === 1) baseData = myInscribedEvents;
    else baseData = myManagedEvents;

    return baseData.filter(item => {
      const matchesSearch = item.title?.toLowerCase().includes(searchText.toLowerCase()) || 
                           item.location?.toLowerCase().includes(searchText.toLowerCase());
      
      const matchesCategory = !activeCategoryId || 
                             item.categories?.some(c => c.id === activeCategoryId);
      
      // Si estamos en Explorar (tab 0), ocultar los que ya estoy inscripto
      const notInscribed = activeTab === 0 ? !registeredIds.has(item.id) : true;

      return matchesSearch && matchesCategory && notInscribed;
    });
  }, [activeTab, allEvents, myInscribedEvents, myManagedEvents, searchText, activeCategoryId, registeredIds]);

  // --- Handlers ---
  const handleRegister = async (event) => {
    const alreadyReg = registeredIds.has(event.id);
    setActionLoading(p => ({ ...p, [event.id]: true }));
    if (alreadyReg) {
      Alert.alert("Cancelar", "¿Cancelar inscripción?", [
        { text: "No", style: "cancel" },
        { text: "Sí", style: "destructive", onPress: async () => {
            const res = await unregisterFromEvent(user.id, event.id);
            if (res.success) {
              setRegisteredIds(p => { const n = new Set(p); n.delete(event.id); return n; });
              setMyInscribedEvents(p => p.filter(e => e.id !== event.id));
            } else Alert.alert("Error", res.error);
            setActionLoading(p => ({ ...p, [event.id]: false }));
          }
        },
      ]);
    } else {
      const res = await registerToEvent(user.id, event.id);
      if (res.success) {
        setRegisteredIds(p => new Set([...p, event.id]));
        setMyInscribedEvents(p => [{ ...event, registered_at: new Date().toISOString() }, ...p]);
      } else Alert.alert("Error", res.error);
      setActionLoading(p => ({ ...p, [event.id]: false }));
    }
  };

  const handleViewParticipants = async (event) => {
    setSelectedEvent(event);
    setModalVisible(true);
    setParticipantsLoading(true);
    const res = await getEventParticipants(event.id);
    setParticipants(res.success ? res.data : []);
    setParticipantsLoading(false);
  };

  const handleDelete = (event) => {
    Alert.alert("Eliminar", "¿Eliminar este evento?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Eliminar", style: "destructive", onPress: async () => {
          const { error } = await supabase.from("events").delete().eq("id", event.id);
          if (error) Alert.alert("Error", error.message);
          else loadData();
        }
      },
    ]);
  };

  // --- Renders ---
  const renderEvent = ({ item }) => {
    const { date, time } = formatEventDate(item.date);
    const status = getEventStatus(item.date);
    const registered = registeredIds.has(item.id);
    const opLoading = actionLoading[item.id];
    const isManaged = activeTab === 2;

    return (
      <TouchableOpacity style={s.card} onPress={() => navigation.navigate("EventDetails", { event: item })} activeOpacity={0.9}>
        <View style={[s.cardHeader, { backgroundColor: status.bg }]}>
          <View style={[s.statusDot, { backgroundColor: status.color }]} />
          <Text style={[s.statusText, { color: status.color }]}>{status.label}</Text>
          <View style={s.catRow}>
            {item.categories?.map(cat => (
              <View key={cat.id} style={[s.catBadge, { backgroundColor: cat.color + "20" }]}>
                <Text style={[s.catBadgeText, { color: cat.color }]}>{cat.name}</Text>
              </View>
            ))}
          </View>
        </View>
        
        <View style={s.cardBody}>
          <Text style={s.cardTitle}>{item.title}</Text>
          <View style={s.metaRow}>
            <Ionicons name="calendar-outline" size={14} color="#6366F1" />
            <Text style={s.metaText}>{date} · {time}</Text>
          </View>
          <View style={s.metaRow}>
            <Ionicons name="location-outline" size={14} color="#EF4444" />
            <Text style={s.metaText} numberOfLines={1}>{item.location}</Text>
          </View>
        </View>

        {isManaged ? (
          <View style={s.manageActions}>
            <TouchableOpacity style={[s.mBtn, { backgroundColor: "#EFF6FF" }]} onPress={() => handleViewParticipants(item)}>
              <Ionicons name="people" size={15} color="#2563EB" />
              <Text style={[s.mBtnTxt, { color: "#2563EB" }]}>Inscritos</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.mBtn, { backgroundColor: "#FFFBEB" }]} onPress={() => navigation.navigate("CreateEvent", { event: item })}>
              <Ionicons name="pencil" size={15} color="#D97706" />
              <Text style={[s.mBtnTxt, { color: "#D97706" }]}>Editar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.mBtn, { backgroundColor: "#FEF2F2" }]} onPress={() => handleDelete(item)}>
              <Ionicons name="trash" size={15} color="#EF4444" />
              <Text style={[s.mBtnTxt, { color: "#EF4444" }]}>Borrar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          status.label !== "Finalizado" && (
            <TouchableOpacity style={[s.regBtn, registered && s.regBtnOut]} onPress={() => handleRegister(item)} disabled={opLoading}>
              {opLoading ? <ActivityIndicator size="small" color={registered ? "#EF4444" : "white"} /> : (
                <>
                  <Ionicons name={registered ? "close-circle" : "add-circle"} size={18} color={registered ? "#EF4444" : "white"} />
                  <Text style={[s.regBtnTxt, registered && { color: "#EF4444" }]}>{registered ? "Cancelar" : "Inscribirse"}</Text>
                </>
              )}
            </TouchableOpacity>
          )
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={["#1E3A8A", "#3B82F6"]} style={s.header}>
        <View style={s.headerContent}>
          <Text style={s.headerTitle}>EventosHub 📅</Text>
          <View style={s.searchBar}>
            <Ionicons name="search" size={16} color="white" style={{ opacity: 0.7 }} />
            <TextInput 
              style={s.searchInput} 
              placeholder="Buscar eventos..." 
              placeholderTextColor="rgba(255,255,255,0.6)" 
              value={searchText}
              onChangeText={setSearchText}
            />
          </View>
        </View>

        {/* Tabs */}
        <View style={s.tabBar}>
          {TABS.map((tab, i) => (
            <Pressable key={tab} style={[s.tabItem, activeTab === i && s.tabItemActive]} onPress={() => setActiveTab(i)}>
              <Text style={[s.tabText, activeTab === i && s.tabTextActive]}>{tab}</Text>
            </Pressable>
          ))}
        </View>
      </LinearGradient>

      {/* Categories Scroller */}
      <View style={s.catContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
          <TouchableOpacity 
            style={[s.catChip, !activeCategoryId && s.catChipActive]} 
            onPress={() => setActiveCategoryId(null)}
          >
            <Text style={[s.catChipTxt, !activeCategoryId && s.catChipTxtActive]}>Todos</Text>
          </TouchableOpacity>
          {categories.map(cat => (
            <TouchableOpacity 
              key={cat.id} 
              style={[s.catChip, activeCategoryId === cat.id && s.catChipActive]} 
              onPress={() => setActiveCategoryId(cat.id)}
            >
              <Text style={[s.catChipTxt, activeCategoryId === cat.id && s.catChipTxtActive]}>{cat.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={s.centered}><ActivityIndicator size="large" color="#3B82F6" /></View>
      ) : (
        <View style={{ flex: 1 }}>
          <FlatList
            data={filteredData}
            keyExtractor={item => item.id}
            renderItem={renderEvent}
            contentContainerStyle={s.list}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            ListEmptyComponent={
              <View style={s.empty}>
                <Ionicons name="search-outline" size={60} color="#D1D5DB" />
                <Text style={s.emptyTitle}>No se encontraron eventos.</Text>
              </View>
            }
          />
          {activeTab === 2 && (
            <TouchableOpacity style={s.fab} onPress={() => navigation.navigate("CreateEvent", { event: null })}>
              <Ionicons name="add" size={30} color="white" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Modal Inscriptos */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle} numberOfLines={1}>Asistentes · {selectedEvent?.title}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}><Ionicons name="close" size={24} color="#1F2937" /></TouchableOpacity>
            </View>
            {participantsLoading ? <ActivityIndicator size="large" color="#3B82F6" style={{ margin: 40 }} /> : (
              <ScrollView>
                {participants.length === 0 ? <Text style={s.emptyP}>Aún no hay inscritos.</Text> : participants.map(p => (
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
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { paddingTop: 50, paddingBottom: 0, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerContent: { paddingHorizontal: 20, marginBottom: 10 },
  headerTitle: { fontSize: 22, fontWeight: "900", color: "white", marginBottom: 12 },
  searchBar: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 12, paddingHorizontal: 12, height: 40 },
  searchInput: { flex: 1, color: "white", fontSize: 14, marginLeft: 8 },
  tabBar: { flexDirection: "row", marginTop: 4 },
  tabItem: { flex: 1, paddingVertical: 14, alignItems: "center", borderBottomWidth: 3, borderBottomColor: "transparent" },
  tabItemActive: { borderBottomColor: "white" },
  tabText: { fontSize: 13, fontWeight: "600", color: "rgba(255,255,255,0.6)" },
  tabTextActive: { color: "white", fontWeight: "800" },
  catContainer: { paddingVertical: 14, backgroundColor: "white" },
  catChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: "#F1F5F9", marginRight: 8, borderWidth: 1, borderColor: "#E2E8F0" },
  catChipActive: { backgroundColor: "#3B82F6", borderColor: "#3B82F6" },
  catChipTxt: { fontSize: 12, fontWeight: "700", color: "#64748B" },
  catChipTxtActive: { color: "white" },
  list: { padding: 16, paddingBottom: 100 },
  card: { backgroundColor: "white", borderRadius: 20, marginBottom: 14, overflow: "hidden", elevation: 3, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10 },
  cardHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 8, gap: 6 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 11, fontWeight: "700", flex: 1 },
  catBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginRight: 4 },
  catBadgeText: { fontSize: 9, fontWeight: "800", textTransform: "uppercase" },
  catRow: { flexDirection: "row", flexWrap: "wrap", flex: 1, justifyContent: "flex-end" },
  cardBody: { padding: 14, paddingTop: 4 },
  cardTitle: { fontSize: 17, fontWeight: "800", color: "#1F2937", marginBottom: 8 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 5 },
  metaText: { fontSize: 13, color: "#6B7280", flex: 1 },
  regBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#3B82F6", paddingVertical: 12, margin: 12, marginTop: 0, borderRadius: 14 },
  regBtnOut: { backgroundColor: "#FEF2F2" },
  regBtnTxt: { color: "white", fontSize: 14, fontWeight: "700" },
  manageActions: { flexDirection: "row", gap: 6, paddingHorizontal: 12, paddingBottom: 12 },
  mBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingVertical: 9, borderRadius: 10 },
  mBtnTxt: { fontSize: 11, fontWeight: "700" },
  fab: { position: "absolute", bottom: 20, right: 20, width: 60, height: 60, borderRadius: 30, backgroundColor: "#3B82F6", justifyContent: "center", alignItems: "center", elevation: 8, shadowColor: "#3B82F6", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10 },
  empty: { alignItems: "center", marginTop: 80 },
  emptyTitle: { marginTop: 16, color: "#9CA3AF" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 20 },
  modalBox: { backgroundColor: "white", borderRadius: 24, padding: 20, maxHeight: "80%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 15 },
  modalTitle: { fontSize: 16, fontWeight: "800", color: "#1F2937", flex: 1, marginRight: 10 },
  pRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  pAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#EFF6FF", justifyContent: "center", alignItems: "center", marginRight: 12 },
  pAvatarTxt: { color: "#3B82F6", fontWeight: "bold" },
  pName: { fontSize: 14, fontWeight: "700" },
  pEmail: { fontSize: 12, color: "#9CA3AF" },
  emptyP: { textAlign: "center", margin: 20, color: "#9CA3AF" },
});

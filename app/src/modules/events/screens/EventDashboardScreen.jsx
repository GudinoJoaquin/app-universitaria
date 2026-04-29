// EventScreens.jsx - Versión rediseñada elegante y profesional
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View, Text, FlatList, TouchableOpacity, Alert,
  RefreshControl, StatusBar, ActivityIndicator, StyleSheet, Modal, ScrollView, TextInput,
  Dimensions, Platform, Pressable
} from "react-native";
import { useAuth } from "../../auth/context/AuthContext";
import { useFocusEffect } from "@react-navigation/native";
import { supabase } from "../../shared/services/supabase";
import { eventsService } from "../services/eventsService";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import {
  registerToEvent, unregisterFromEvent,
  getMyRegistrations,
  getEventParticipants,
} from "../services/eventsRegistrationService";
import { categoriesService } from "../../gestion/services/categoriesService";
import { Image } from "expo-image";
import SearchBar from "../../shared/components/SearchBar";
import FilterChip from "../../shared/components/FilterChip";
import ModuleHeader from "../../shared/components/ModuleHeader";

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

  if (targetDate < today) return { id: "past", label: "Finalizado", color: "#94A3B8", bg: "#F1F5F9", borderColor: "#E2E8F0" };
  if (targetDate > today) return { id: "scheduled", label: "Próximo", color: "#3B82F6", bg: "#EFF6FF", borderColor: "#BFDBFE" };

  if (targetDate.getTime() === today.getTime()) {
    if (!startTimeStr) return { id: "ongoing", label: "Activo", color: "#10B981", bg: "#ECFDF5", borderColor: "#A7F3D0" };
    const getMinutes = (timeStr) => {
      const part = timeStr.includes("T") ? timeStr.split("T")[1] : timeStr;
      const [h, m] = part.split(":");
      return parseInt(h) * 60 + parseInt(m);
    };
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const startMinutes = getMinutes(startTimeStr);
    if (nowMinutes < startMinutes) return { id: "scheduled", label: "Próximo", color: "#3B82F6", bg: "#EFF6FF", borderColor: "#BFDBFE" };
    if (endTimeStr) {
      const endMinutes = getMinutes(endTimeStr);
      if (nowMinutes > endMinutes) return { id: "past", label: "Finalizado", color: "#94A3B8", bg: "#F1F5F9", borderColor: "#E2E8F0" };
    }
    return { id: "ongoing", label: "En curso", color: "#10B981", bg: "#ECFDF5", borderColor: "#A7F3D0" };
  }
  return { id: "scheduled", label: "Próximo", color: "#3B82F6", bg: "#EFF6FF", borderColor: "#BFDBFE" };
};

const getTabIcon = (tabName) => {
  switch(tabName) {
    case "Explorar": return "compass";
    case "Mis eventos": return "calendar";
    case "Organizar": return "create";
    default: return "list";
  }
};

export default function EventDashboardScreen({ navigation }) {
  const { user, isAdmin, isHelper } = useAuth();
  const showManageTab = isAdmin() || isHelper() || user?.role === "Organizer";
  const TABS = showManageTab ? ["Explorar", "Mis eventos", "Organizar"] : ["Explorar", "Mis eventos"];
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
  const [sortModalVisible, setSortModalVisible] = useState(false);
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

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const filteredData = useMemo(() => {
    // Definimos la base según la pestaña
    let base = [];
    if (activeTab === 0) {
      // EXPLORAR: Ocultamos los eventos donde YA estamos inscritos
      base = allEvents.filter(e => !registeredIds.has(e.id));
    } else if (activeTab === 1) {
      // INSCRITO: Solo los eventos donde estamos inscritos
      base = myInscribedEvents;
    } else {
      // ORGANIZAR: Eventos que gestionamos
      base = myManagedEvents;
    }

    return base.filter(item => {
      const matchesSearch = item.title?.toLowerCase().includes(searchText.toLowerCase()) || item.location?.toLowerCase().includes(searchText.toLowerCase());
      const matchesCategory = selectedCategoryIds.length === 0 || item.categories?.some(c => selectedCategoryIds.includes(c.id));
      const status = getEventStatus(item.date, item.start_time, item.end_time);
      const matchesStatus = filterStatus === "all" || (filterStatus === "past" && status.id === "past") || (filterStatus === "ongoing" && status.id === "ongoing") || (filterStatus === "upcoming" && status.id === "scheduled");
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [activeTab, allEvents, myInscribedEvents, myManagedEvents, registeredIds, searchText, selectedCategoryIds, filterStatus]);

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
    const formattedDate = parseDate(item.date);
    const day = formattedDate.getUTCDate();
    const month = formattedDate.toLocaleDateString("es-ES", { month: "short", timeZone: "UTC" }).toUpperCase().replace(".", "");

    return (
      <TouchableOpacity 
        style={s.card} 
        activeOpacity={0.9} 
        onPress={() => navigation.navigate("EventDetails", { event: item })}
      >
        <View style={s.cardImgBox}>
          {item.image_url ? (
            <Image source={{ uri: item.image_url }} style={s.cardImg} contentFit="cover" />
          ) : (
            <LinearGradient colors={["#1E293B", "#0F172A"]} style={s.cardImg} />
          )}
          <LinearGradient 
            colors={["transparent", "rgba(0,0,0,0.7)"]} 
            style={StyleSheet.absoluteFill} 
          />
          
          <View style={[s.statusTag, { backgroundColor: status.bg, borderColor: status.borderColor }]}>
            <View style={[s.statusDot, { backgroundColor: status.color }]} />
            <Text style={[s.statusTagTxt, { color: status.color }]}>{status.label}</Text>
          </View>
          
          <View style={s.cardActions}>
            {isOwner && activeTab === 2 && (
              <TouchableOpacity style={s.cardActionBtn} onPress={() => handleViewParticipants(item)}>
                <Ionicons name="people-outline" size={16} color="white" />
              </TouchableOpacity>
            )}
            {isOwner && activeTab === 2 && (
              <TouchableOpacity style={[s.cardActionBtn, s.cardActionBtnDanger]} onPress={() => handleDeleteEvent(item.id)}>
                <Ionicons name="trash-outline" size={16} color="#FEE2E2" />
              </TouchableOpacity>
            )}
          </View>
          
          <View style={s.dateBadge}>
            <Text style={s.dateDay}>{day}</Text>
            <Text style={s.dateMonth}>{month}</Text>
          </View>
        </View>
        
        <View style={s.cardInfo}>
          <View style={s.cardHeader}>
            {item.categories?.[0] && (
              <View style={[s.catChip, { backgroundColor: item.categories[0].color + '15' }]}>
                <View style={[s.catChipDot, { backgroundColor: item.categories[0].color }]} />
                <Text style={[s.catChipTxt, { color: item.categories[0].color }]}>
                  {item.categories[0].name}
                </Text>
              </View>
            )}
          </View>
          
          <Text style={s.cardTitle} numberOfLines={2}>{item.title}</Text>
          
          <View style={s.cardMeta}>
            <View style={s.metaItem}>
              <Ionicons name="location-outline" size={14} color="#94A3B8" />
              <Text style={s.metaTxt} numberOfLines={1}>{item.location}</Text>
            </View>
            <View style={s.metaItem}>
              <Ionicons name="time-outline" size={14} color="#94A3B8" />
              <Text style={s.metaTxt}>{formatTimeRange(item.start_time, item.end_time)}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />
      
      <ModuleHeader 
        title="EventHub"
        subtitle="Descubre eventos cerca de ti"
        tabs={TABS}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        getTabIcon={getTabIcon}
      />

      <View style={s.controls}>
        <View style={s.searchRow}>
          <SearchBar 
            value={searchText} 
            onChangeText={setSearchText} 
            placeholder="Buscar eventos o lugares..." 
          />
          <TouchableOpacity 
            style={[s.compactSortBtn, sortBy !== "newest" && s.compactSortBtnActive]}
            onPress={() => setSortModalVisible(true)}
          >
            <Ionicons 
              name={sortBy === "newest" ? "arrow-up" : "arrow-down"} 
              size={18} 
              color={sortBy !== "newest" ? "#3B82F6" : "#64748B"} 
            />
          </TouchableOpacity>
        </View>
        
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={s.filtersScroll}
          style={s.filtersContainer}
        >
          <FilterChip 
            icon="options-outline"
            label={filterStatus === "all" ? "Estado" : 
                   filterStatus === "upcoming" ? "Próximos" : 
                   filterStatus === "ongoing" ? "En curso" : "Pasados"}
            isActive={filterStatus !== "all"}
            onPress={() => setStatusModalVisible(true)}
          />
          <FilterChip 
            icon="grid-outline"
            label={selectedCategoryIds.length > 0 ? `${selectedCategoryIds.length} Categorías` : "Categorías"}
            isActive={selectedCategoryIds.length > 0}
            onPress={() => setCategoryModalVisible(true)}
          />
        </ScrollView>
      </View>

      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={s.loadingText}>Cargando eventos...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredData}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />}
          ListEmptyComponent={
            <View style={s.empty}>
              <View style={s.emptyIcon}>
                <Ionicons name="calendar-outline" size={48} color="#CBD5E1" />
              </View>
              <Text style={s.emptyTitle}>No hay eventos disponibles</Text>
              <Text style={s.emptySubtitle}>
                {activeTab === 0 ? "Pronto habrá nuevos eventos" : 
                 activeTab === 1 ? "Aún no te has inscrito a ningún evento" : 
                 "Crea tu primer evento desde el botón +"}
              </Text>
              {activeTab === 2 && (
                <TouchableOpacity style={s.emptyBtn} onPress={() => navigation.navigate("CreateEvent", { event: null })}>
                  <Ionicons name="add-circle-outline" size={18} color="white" />
                  <Text style={s.emptyBtnTxt}>Crear evento</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}

      {activeTab === 2 && (
        <TouchableOpacity style={s.fab} onPress={() => navigation.navigate("CreateEvent", { event: null })}>
          <LinearGradient 
            colors={["#3B82F6", "#2563EB"]} 
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.fabGradient}
          >
            <Ionicons name="add" size={28} color="white" />
          </LinearGradient>
        </TouchableOpacity>
      )}

      {/* Modal Participantes */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={s.modalOverlayCenter}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setModalVisible(false)} />
          <View style={s.modalBox}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle} numberOfLines={1}>Asistentes · {selectedEvent?.title}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>
            {participantsLoading ? (
              <ActivityIndicator size="large" color="#3B82F6" style={{ margin: 40 }} />
            ) : participants.length === 0 ? (
              <View style={s.emptyModal}>
                <Ionicons name="people-outline" size={48} color="#CBD5E1" />
                <Text style={s.emptyModalTxt}>Aún no hay inscritos</Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                {participants.map((p) => (
                  <View key={p.id} style={s.pRow}>
                    <View style={[s.pAvatar, { backgroundColor: "#EFF6FF" }]}>
                      <Text style={s.pAvatarTxt}>{p.name?.[0]?.toUpperCase() || "?"}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.pName}>{p.name}</Text>
                      <Text style={s.pEmail}>{p.email}</Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal Estado */}
      <Modal visible={statusModalVisible} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setStatusModalVisible(false)} />
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <Text style={s.modalSheetTitle}>Filtrar por estado</Text>
            { [
              { id: "all", label: "Todos los eventos", icon: "apps-outline" },
              { id: "upcoming", label: "Próximos", icon: "calendar-outline" },
              { id: "ongoing", label: "En curso", icon: "play-outline" },
              { id: "past", label: "Finalizados", icon: "checkmark-done-outline" }
            ].map(st => (
              <TouchableOpacity 
                key={st.id} 
                style={[s.modalItem, filterStatus === st.id && s.modalItemActive]} 
                onPress={() => { setFilterStatus(st.id); setStatusModalVisible(false); }}
              >
                <Ionicons name={st.icon} size={20} color={filterStatus === st.id ? "#3B82F6" : "#94A3B8"} />
                <Text style={[s.modalItemTxt, filterStatus === st.id && s.modalItemTxtActive]}>{st.label}</Text>
                {filterStatus === st.id && <Ionicons name="checkmark" size={20} color="#3B82F6" />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Modal Categorías */}
      <Modal visible={categoryModalVisible} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setCategoryModalVisible(false)} />
          <View style={[s.modalSheet, { maxHeight: height * 0.7 }]}>
            <View style={s.modalHandle} />
            <Text style={s.modalSheetTitle}>Filtrar por categoría</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {categories.map(cat => (
                <TouchableOpacity 
                  key={cat.id} 
                  style={[s.modalItem, selectedCategoryIds.includes(cat.id) && s.modalItemActive]} 
                  onPress={() => setSelectedCategoryIds(p => 
                    p.includes(cat.id) ? p.filter(id => id !== cat.id) : [...p, cat.id]
                  )}
                >
                  <View style={[s.modalColorDot, { backgroundColor: cat.color }]} />
                  <Text style={[s.modalItemTxt, selectedCategoryIds.includes(cat.id) && s.modalItemTxtActive]}>
                    {cat.name}
                  </Text>
                  <Ionicons 
                    name={selectedCategoryIds.includes(cat.id) ? "checkbox" : "square-outline"} 
                    size={20} 
                    color={selectedCategoryIds.includes(cat.id) ? "#3B82F6" : "#CBD5E1"} 
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal Ordenar */}
      <Modal visible={sortModalVisible} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setSortModalVisible(false)} />
          <View style={s.modalSheet}>
            <View style={s.modalHandle} />
            <Text style={s.modalSheetTitle}>Ordenar por</Text>
            {[
              { id: "newest", label: "Más recientes primero", icon: "arrow-down-outline" },
              { id: "oldest", label: "Más antiguos primero", icon: "arrow-up-outline" }
            ].map(opt => (
              <TouchableOpacity 
                key={opt.id} 
                style={[s.modalItem, sortBy === opt.id && s.modalItemActive]} 
                onPress={() => { setSortBy(opt.id); setSortModalVisible(false); }}
              >
                <Ionicons name={opt.icon} size={20} color={sortBy === opt.id ? "#3B82F6" : "#94A3B8"} />
                <Text style={[s.modalItemTxt, sortBy === opt.id && s.modalItemTxtActive]}>{opt.label}</Text>
                {sortBy === opt.id && <Ionicons name="checkmark" size={20} color="#3B82F6" />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  loadingText: { fontSize: 14, color: "#94A3B8", fontWeight: "500" },
  
  controls: { 
    backgroundColor: "white", 
    paddingHorizontal: 16, 
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  searchRow: { 
    flexDirection: "row", 
    alignItems: "center",
    gap: 12, 
    marginBottom: 12 
  },
  filtersContainer: {
    marginHorizontal: -16, 
  },
  filtersScroll: {
    paddingHorizontal: 16,
    gap: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  compactSortBtn: {
    width: 46,
    height: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "white",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  compactSortBtnActive: {
    backgroundColor: "#F8FAFC",
    borderColor: "#CBD5E1",
  },

  listContent: { 
    padding: 16, 
    paddingBottom: 100 
  },
  card: { 
    backgroundColor: "white", 
    borderRadius: 24, 
    marginBottom: 24, 
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 4,
  },
  cardImgBox: { 
    height: 200, 
    position: "relative" 
  },
  cardImg: { 
    ...StyleSheet.absoluteFillObject 
  },
  statusTag: { 
    position: "absolute",
    top: 16,
    left: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.9)",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusTagTxt: { 
    fontSize: 11, 
    fontWeight: "700" 
  },
  cardActions: {
    position: "absolute",
    top: 12,
    right: 12,
    flexDirection: "row",
    gap: 8,
  },
  cardActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  cardActionBtnDanger: {
    backgroundColor: "rgba(239,68,68,0.8)",
  },
  dateBadge: { 
    position: "absolute", 
    bottom: 12, 
    right: 12, 
    backgroundColor: "white", 
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12, 
    alignItems: "center",
    minWidth: 50,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  dateDay: { 
    fontSize: 18, 
    fontWeight: "800", 
    color: "#1E293B",
    lineHeight: 22,
  },
  dateMonth: { 
    fontSize: 9, 
    fontWeight: "700", 
    color: "#64748B",
    letterSpacing: 0.5,
  },
  cardInfo: { 
    padding: 16 
  },
  cardHeader: {
    flexDirection: "row",
    marginBottom: 8,
  },
  catChip: { 
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10, 
    paddingVertical: 4, 
    borderRadius: 12,
  },
  catChipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  catChipTxt: { 
    fontSize: 10, 
    fontWeight: "800" 
  },
  cardTitle: { 
    fontSize: 20, 
    fontWeight: "800", 
    color: "#0F172A", 
    marginBottom: 12, 
    lineHeight: 28,
    letterSpacing: -0.5,
  },
  cardMeta: { 
    flexDirection: "row", 
    gap: 12,
    flexWrap: "wrap",
  },
  metaItem: { 
    flexDirection: "row", 
    alignItems: "center", 
    gap: 5,
    flexShrink: 1,
  },
  metaTxt: { 
    fontSize: 13, 
    color: "#64748B", 
    fontWeight: "600",
    flexShrink: 1,
  },
  
  fab: { 
    position: "absolute", 
    bottom: 24, 
    right: 20, 
    width: 56, 
    height: 56, 
    borderRadius: 28,
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  fabGradient: { 
    flex: 1, 
    borderRadius: 28, 
    justifyContent: "center", 
    alignItems: "center" 
  },
  
  empty: { 
    alignItems: "center", 
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  emptyTitle: { 
    fontSize: 18, 
    fontWeight: "700", 
    color: "#1E293B",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#94A3B8",
    textAlign: "center",
    marginBottom: 24,
  },
  emptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#3B82F6",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 30,
  },
  emptyBtnTxt: {
    color: "white",
    fontWeight: "600",
    fontSize: 14,
  },
  
  modalOverlay: { 
    flex: 1, 
    backgroundColor: "rgba(15, 23, 42, 0.6)", 
    justifyContent: "flex-end" 
  },
  modalOverlayCenter: { 
    flex: 1, 
    backgroundColor: "rgba(15, 23, 42, 0.6)", 
    justifyContent: "center", 
    padding: 20 
  },
  modalSheet: { 
    backgroundColor: "white", 
    borderTopLeftRadius: 32, 
    borderTopRightRadius: 32, 
    padding: 24,
    paddingTop: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 20,
  },
  modalBox: { 
    backgroundColor: "white", 
    borderRadius: 32, 
    padding: 24, 
    maxHeight: height * 0.8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center", 
    marginBottom: 20 
  },
  modalHandle: { 
    width: 50, 
    height: 5, 
    backgroundColor: "#E2E8F0", 
    borderRadius: 3, 
    alignSelf: "center", 
    marginBottom: 20 
  },
  modalSheetTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 20,
  },
  modalTitle: { 
    fontSize: 16, 
    fontWeight: "700", 
    color: "#1E293B", 
    flex: 1 
  },
  modalItem: { 
    flexDirection: "row", 
    alignItems: "center", 
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginBottom: 6,
  },
  modalItemActive: {
    backgroundColor: "#EFF6FF",
  },
  modalItemTxt: { 
    flex: 1,
    fontSize: 15, 
    fontWeight: "500", 
    color: "#64748B" 
  },
  modalItemTxtActive: { 
    color: "#3B82F6",
    fontWeight: "600",
  },
  modalColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  applyBtn: { 
    backgroundColor: "#1E293B", 
    padding: 16, 
    borderRadius: 16, 
    alignItems: "center", 
    marginTop: 20 
  },
  applyBtnTxt: { 
    color: "white", 
    fontWeight: "700", 
    fontSize: 15 
  },
  
  pRow: { 
    flexDirection: "row", 
    alignItems: "center", 
    gap: 12, 
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  pAvatar: { 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    justifyContent: "center", 
    alignItems: "center" 
  },
  pAvatarTxt: { 
    fontWeight: "800", 
    color: "#3B82F6",
    fontSize: 16,
  },
  pName: { 
    fontSize: 15, 
    fontWeight: "600", 
    color: "#1F2937" 
  },
  pEmail: { 
    fontSize: 12, 
    color: "#94A3B8" 
  },
  emptyModal: { 
    alignItems: "center", 
    paddingVertical: 40,
    gap: 12,
  },
  emptyModalTxt: { 
    fontSize: 14, 
    color: "#94A3B8" 
  },
});




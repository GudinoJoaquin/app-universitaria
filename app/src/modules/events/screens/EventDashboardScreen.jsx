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
    case "Inscritos": return "calendar";
    case "Organizar": return "create";
    default: return "list";
  }
};

export default function EventDashboardScreen({ navigation, route }) {
  const { user, isAdmin, isHelper } = useAuth();
  const showManageTab = isAdmin() || isHelper() || user?.role === "Organizer";
  const TABS = showManageTab ? ["Explorar", "Inscritos", "Organizar"] : ["Explorar", "Inscritos"];
  const [activeTab, setActiveTab] = useState(route.params?.initialTab ?? 0);

  // Sincronizar pestaña si cambia por navegación externa
  useEffect(() => {
    if (route.params?.initialTab !== undefined) {
      setActiveTab(route.params.initialTab);
    }
  }, [route.params?.initialTab]);

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
  const [filterStatus, setFilterStatus] = useState("upcoming");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState([]);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [sortModalVisible, setSortModalVisible] = useState(false);

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    try {
      const catRes = await categoriesService.getAll();
      if (catRes.success) setCategories(catRes.data);

      const { data: eventsData, error } = await supabase
        .from("events")
        .select("*, profiles(name, role, id, avatar_url, user_states(states(name, color))), event_categories_junction(categories(*))")
        .order("date", { ascending: sortBy === "newest" ? false : true });

      if (error) throw error;

      const normalized = (eventsData ?? []).map(e => ({
        ...e,
        profiles: e.profiles ? {
          ...e.profiles,
          states: e.profiles.user_states?.map(us => us.states).filter(Boolean) ?? []
        } : null,
        categories: (e.event_categories_junction ?? []).map(j => j.categories).filter(Boolean),
      }));

      setAllEvents(normalized.filter(e => e.created_by !== user?.id));
      
      let managed = [];
      if (isAdmin()) managed = normalized;
      else if (isHelper()) managed = normalized.filter(e => e.profiles?.role !== "Admin");
      else managed = normalized.filter(e => e.created_by === user?.id);
      setMyManagedEvents(managed);

      const myRes = await getMyRegistrations(user?.id);
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



  const renderItem = ({ item }) => {
    const status = getEventStatus(item.date, item.start_time, item.end_time);
    const isOwner = item.created_by === user?.id || isAdmin();
    const formattedDate = parseDate(item.date);
    const day = formattedDate.getUTCDate();
    const month = formattedDate.toLocaleDateString("es-ES", { month: "short", timeZone: "UTC" }).toUpperCase().replace(".", "");

    return (
      <TouchableOpacity 
        style={s.card} 
        activeOpacity={0.9} 
        onPress={() => navigation.navigate("EventDetails", { event: item })}
      >
        {/* IMAGEN Y OVERLAYS */}
        <View style={s.cardImgBox}>
          {item.image_url ? (
            <Image source={{ uri: item.image_url }} style={s.cardImg} contentFit="cover" />
          ) : (
            <LinearGradient colors={["#1E1B4B", "#312E81"]} style={s.cardImg} />
          )}
          
          <LinearGradient 
            colors={["rgba(0,0,0,0.4)", "transparent", "rgba(0,0,0,0.8)"]} 
            style={StyleSheet.absoluteFill} 
          />
          
          {/* Badge de Estado (Glassmorphism style) */}
          <View style={[s.statusTag, { backgroundColor: status.bg + 'CC', borderColor: status.borderColor }]}>
            <View style={[s.statusDot, { backgroundColor: status.color }]} />
            <Text style={[s.statusTagTxt, { color: status.color }]}>{status.label}</Text>
          </View>

          {/* Fecha y Hora dentro de la imagen (Mismo estilo que el estado) */}
          <View style={[s.imageDateTime, { backgroundColor: status.bg + 'CC', borderColor: status.borderColor }]}>
            <Ionicons name="calendar-outline" size={10} color={status.color} />
            <Text style={[s.imageDateTimeTxt, { color: status.color }]}>{day} {month}</Text>
            <View style={[s.dateTimeSeparator, { backgroundColor: status.color + '40' }]} />
            <Ionicons name="time-outline" size={10} color={status.color} />
            <Text style={[s.imageDateTimeTxt, { color: status.color }]}>{formatTimeRange(item.start_time, item.end_time)}</Text>
          </View>

          {/* Categorías dentro de la imagen (Súper Translúcidas) */}
          <View style={s.imageCategories}>
            {item.categories?.map((cat) => (
              <View key={cat.id} style={[s.imageCat, { backgroundColor: cat.color + '66', borderColor: cat.color }]}>
                <Text style={s.imageCatTxt}>{cat.name}</Text>
              </View>
            ))}
          </View>
        </View>
        
        {/* INFORMACIÓN */}
        <View style={s.cardInfo}>
          <Text style={s.cardTitle} numberOfLines={2}>{item.title}</Text>
          <View style={s.locationRow}>
            <Ionicons name="location-outline" size={12} color="#94A3B8" />
            <Text style={s.locationTxt} numberOfLines={1}>{item.location}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />
      
      <ModuleHeader 
        title="Eventos"
        subtitle="Descubre eventos cerca de ti"
        tabs={TABS}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        getTabIcon={getTabIcon}
      />

      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={s.loadingText}>Cargando eventos...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredData}
          keyExtractor={item => item.id}
          ListHeaderComponent={
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
                  label={filterStatus === "all" ? "Todos" : 
                         filterStatus === "upcoming" ? "Próximos" : 
                         filterStatus === "ongoing" ? "En curso" : "Pasados"}
                  isActive={filterStatus !== "upcoming"}
                  onPress={() => setStatusModalVisible(true)}
                />
                <FilterChip 
                  icon="grid-outline"
                  label={selectedCategoryIds.length > 0 ? `${selectedCategoryIds.length} Categorías` : "Categorías"}
                  isActive={selectedCategoryIds.length > 0}
                  onPress={() => setCategoryModalVisible(true)}
                />
                {(filterStatus !== "upcoming" || selectedCategoryIds.length > 0) && (
                  <TouchableOpacity 
                    onPress={() => { setFilterStatus("upcoming"); setSelectedCategoryIds([]); }} 
                    style={s.clearBtnSmall}
                  >
                    <Ionicons name="close-circle" size={20} color="#EF4444" />
                  </TouchableOpacity>
                )}
              </ScrollView>
            </View>
          }
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
            colors={["rgba(30, 27, 75, 0.85)", "rgba(49, 46, 129, 0.85)"]} 
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.fabGradient}
          >
            <Ionicons name="add" size={32} color="rgba(255, 255, 255, 0.9)" />
          </LinearGradient>
        </TouchableOpacity>
      )}



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
  filtersContainer: {
    marginHorizontal: 0, 
  },
  filtersScroll: {
    paddingHorizontal: 0,
    gap: 6,
    flexDirection: "row",
    alignItems: "center",
  },
  clearBtnSmall: {
    padding: 4,
  },
  compactSortBtn: {
    width: 44,
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "white",
    borderRadius: 12,
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
    borderRadius: 28, 
    marginBottom: 24, 
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  cardImgBox: { 
    height: 190, 
    position: "relative" 
  },
  cardImg: { 
    ...StyleSheet.absoluteFillObject 
  },
  statusTag: { 
    position: "absolute",
    top: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  statusTagTxt: { 
    fontSize: 9, 
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.5
  },
  cardDeleteBtn: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(239, 68, 68, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  premiumDateBadge: { 
    position: "absolute", 
    top: 12, 
    right: 12, 
    backgroundColor: "rgba(15, 23, 42, 0.75)", 
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14, 
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  premiumDateDay: { 
    fontSize: 18, 
    fontWeight: "900", 
    color: "white",
    lineHeight: 20,
  },
  premiumDateMonth: { 
    fontSize: 8, 
    fontWeight: "800", 
    color: "#818CF8",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginTop: -1
  },
  imageDateTime: {
    position: "absolute",
    top: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 10,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  imageDateTimeTxt: {
    color: "white",
    fontSize: 9,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  dateTimeSeparator: {
    width: 1,
    height: 8,
    backgroundColor: "rgba(255,255,255,0.4)",
    marginHorizontal: 1,
  },
  imageCategories: {
    position: "absolute",
    bottom: 12,
    left: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    maxWidth: '70%',
  },
  imageCat: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  imageCatTxt: {
    fontSize: 8,
    fontWeight: "900",
    color: "white",
    textTransform: "uppercase",
  },
  organizerFloating: {
    position: "absolute",
    bottom: -18,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "white",
    padding: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
    zIndex: 10,
  },
  organizerAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 19,
  },
  organizerPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  organizerInitials: {
    color: 'white',
    fontWeight: '900',
    fontSize: 16,
  },
  cardInfo: { 
    padding: 18,
    paddingTop: 22,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  categoryList: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  compactCat: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  compactCatTxt: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  moreCats: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94A3B8",
  },
  cardTitle: { 
    fontSize: 24, 
    fontWeight: "900", 
    color: "#0F172A", 
    lineHeight: 30,
    letterSpacing: -0.8,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  locationTxt: {
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: "600",
  },
  cardFooter: { 
    flexDirection: "row", 
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  footerItem: { 
    flexDirection: "row", 
    alignItems: "center", 
    gap: 6,
    flexShrink: 1,
  },
  footerTxt: { 
    fontSize: 12, 
    color: "#64748B", 
    fontWeight: "700",
    flexShrink: 1,
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
  modalHandle: { 
    width: 50, 
    height: 5, 
    backgroundColor: "#E2E8F0", 
    borderRadius: 3, 
    alignSelf: "center", 
    marginBottom: 20 
  },
  modalHeaderDetailed: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 25,
    paddingHorizontal: 5 
  },
  modalHeaderTitleDetailed: { fontSize: 22, fontWeight: '900', color: '#1E293B' },
  modalHeaderSubDetailed: { fontSize: 13, color: '#94A3B8', fontWeight: '600' },
  participantsCountBadge: { backgroundColor: '#3B82F6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  participantsCountTxt: { color: 'white', fontWeight: '900', fontSize: 14 },
  
  participantCardDetailed: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 14, 
    borderBottomWidth: 1, 
    borderBottomColor: '#F1F5F9',
    gap: 15 
  },
  pAvatarDetailed: { width: 50, height: 50, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  pAvatarTxtDetailed: { fontSize: 18, fontWeight: '900' },
  pInfoDetailed: { flex: 1, gap: 4 },
  pNameRowDetailed: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pNameDetailed: { fontSize: 15, fontWeight: '800', color: '#1E293B' },
  roleBadgeDetailed: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  roleBadgeTxtDetailed: { fontSize: 9, fontWeight: '900', textTransform: 'uppercase' },
  pEmailDetailed: { fontSize: 12, color: '#94A3B8', fontWeight: '600' },
  pActionBtnDetailed: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
  
  modalLoading: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 15 },
  modalLoadingTxt: { fontSize: 14, color: '#94A3B8', fontWeight: '600' },
  
  emptyModalDetailed: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyModalIconBox: { width: 80, height: 80, borderRadius: 30, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyModalTitleDetailed: { fontSize: 18, fontWeight: '800', color: '#1E293B', marginBottom: 8 },
  emptyModalSubDetailed: { fontSize: 14, color: '#94A3B8', textAlign: 'center', fontWeight: '500' },
  
  modalCloseBtnDetailed: { backgroundColor: '#0F172A', height: 56, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  modalCloseBtnTxtDetailed: { color: 'white', fontWeight: '900', fontSize: 16 },

  participantControls: { marginBottom: 20, gap: 12 },
  pSearchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', paddingHorizontal: 12, height: 44, borderRadius: 12, borderWidth: 1, borderColor: '#F1F5F9', gap: 10 },
  pSearchInput: { flex: 1, fontSize: 14, fontWeight: '600', color: '#1E293B' },
  pFilterScroll: { gap: 8, paddingHorizontal: 2 },
  pFilterPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: 'transparent' },
  pFilterPillActive: { backgroundColor: '#EFF6FF', borderColor: '#3B82F6' },
  pFilterPillTxt: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  pFilterPillTxtActive: { color: '#3B82F6' },

  modalSheetTitle: { fontSize: 18, fontWeight: "800", color: "#1E293B", marginBottom: 20 },
  modalItem: { 
    flexDirection: "row", 
    alignItems: "center", 
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginBottom: 6,
  },
  modalItemActive: { backgroundColor: "#EFF6FF" },
  modalItemTxt: { fontSize: 15, fontWeight: "500", color: "#64748B", flex: 1 },
  modalItemTxtActive: { color: "#3B82F6", fontWeight: "600" },
  modalColorDot: { width: 12, height: 12, borderRadius: 6 },
});




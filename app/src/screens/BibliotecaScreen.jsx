/**
 * BibliotecaScreen — Tab para Organizer, Helper, Admin
 * Organizer: solo sus eventos
 * Helper: todos los eventos excepto los de Admin
 * Admin: todos los eventos sin restricción
 */
import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, FlatList, TouchableOpacity, Alert,
  RefreshControl, StatusBar, ActivityIndicator, StyleSheet, Modal, ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../services/supabase";
import { getEventParticipants } from "../services/eventsRegistrationService";

const parseDate = (d) => {
  if (!d) return new Date(0);
  const clean = d.replace(/[\s]*[+-]\d{2}:\d{2}$/, "").replace(/Z$/, "").trim();
  return new Date(clean.replace(" ", "T") + "Z");
};
const formatDate = (d) => {
  const dt = parseDate(d);
  return dt.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
};
const getStatus = (d) => {
  const diff = (parseDate(d) - new Date()) / 86400000;
  if (diff < 0) return { label: "Finalizado", color: "#6B7280", bg: "#F3F4F6" };
  if (diff <= 1) return { label: "Hoy/Mañana", color: "#DC2626", bg: "#FEE2E2" };
  if (diff <= 7) return { label: "Esta semana", color: "#D97706", bg: "#FEF3C7" };
  return { label: "Programado", color: "#059669", bg: "#D1FAE5" };
};

export default function BibliotecaScreen({ navigation }) {
  const { user, isAdmin, isHelper } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const canManageEvent = (event) => {
    if (isAdmin()) return true; // Admin: todo
    if (isHelper()) return event.created_by_role !== "Admin"; // Helper: todos excepto de Admin
    return event.created_by === user?.id; // Organizer: solo los suyos
  };

  const headerTitle = isAdmin() ? "📚 Biblioteca — Admin"
    : isHelper() ? "📚 Biblioteca — Helper"
    : "📚 Mis Eventos";

  const headerSub = isAdmin()
    ? "Gestión completa de todos los eventos"
    : isHelper()
    ? "Todos los eventos (excepto los de Admin)"
    : "Tus eventos creados";

  const loadEvents = useCallback(async () => {
    let query = supabase
      .from("events")
      .select("*, profiles(name, role, id)")
      .order("date", { ascending: false });

    // Organizer: solo sus eventos
    if (!isAdmin() && !isHelper()) {
      query = query.eq("created_by", user?.id);
    }

    const { data, error } = await query;
    if (!error) {
      let filtered = (data ?? []).map(e => ({
        ...e,
        created_by_name: e.profiles?.name ?? "Desconocido",
        created_by_role: e.profiles?.role ?? "User",
        profiles: undefined,
      }));

      // Helper: filtrar eventos de Admin
      if (isHelper() && !isAdmin()) {
        filtered = filtered.filter(e => e.created_by_role !== "Admin");
      }
      setEvents(filtered);
    }
    setLoading(false);
    setRefreshing(false);
  }, [user?.id, isAdmin, isHelper]);

  useEffect(() => { loadEvents(); }, [loadEvents]);
  const onRefresh = () => { setRefreshing(true); loadEvents(); };

  const handleDelete = (event) => {
    Alert.alert("Eliminar evento", `¿Eliminar "${event.title}"?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar", style: "destructive",
        onPress: async () => {
          const { error } = await supabase.from("events").delete().eq("id", event.id);
          if (error) Alert.alert("Error", error.message);
          else { Alert.alert("✅", "Evento eliminado"); loadEvents(); }
        },
      },
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
    const status = getStatus(item.date);
    const canEdit = canManageEvent(item);
    const isOwn = item.created_by === user?.id;

    return (
      <View style={s.card}>
        <View style={[s.cardStatusBar, { backgroundColor: status.bg }]}>
          <View style={[s.dot, { backgroundColor: status.color }]} />
          <Text style={[s.statusTxt, { color: status.color }]}>{status.label}</Text>
          {isOwn && <View style={s.ownPill}><Text style={s.ownPillTxt}>Tuyo</Text></View>}
          {!isOwn && (isAdmin() || isHelper()) && (
            <View style={[s.ownPill, { backgroundColor: "#EDE9FE" }]}>
              <Text style={[s.ownPillTxt, { color: "#7C3AED" }]}>{item.created_by_name}</Text>
            </View>
          )}
        </View>

        <TouchableOpacity onPress={() => navigation.navigate("EventDetails", { event: item })} style={s.cardBody}>
          <Text style={s.cardTitle} numberOfLines={2}>{item.title}</Text>
          <View style={s.metaRow}>
            <Ionicons name="calendar-outline" size={13} color="#6366F1" />
            <Text style={s.metaTxt}>{formatDate(item.date)}</Text>
          </View>
          <View style={s.metaRow}>
            <Ionicons name="location-outline" size={13} color="#EF4444" />
            <Text style={s.metaTxt} numberOfLines={1}>{item.location}</Text>
          </View>
        </TouchableOpacity>

        <View style={s.actions}>
          <TouchableOpacity style={[s.actionBtn, { backgroundColor: "#EFF6FF" }]}
            onPress={() => handleViewParticipants(item)}>
            <Ionicons name="people" size={15} color="#2563EB" />
            <Text style={[s.actionTxt, { color: "#2563EB" }]}>Inscritos</Text>
          </TouchableOpacity>
          {canEdit && (
            <>
              <TouchableOpacity style={[s.actionBtn, { backgroundColor: "#FFFBEB" }]}
                onPress={() => navigation.navigate("CreateEvent", { event: item })}>
                <Ionicons name="pencil" size={15} color="#D97706" />
                <Text style={[s.actionTxt, { color: "#D97706" }]}>Editar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.actionBtn, { backgroundColor: "#FEF2F2" }]}
                onPress={() => handleDelete(item)}>
                <Ionicons name="trash" size={15} color="#EF4444" />
                <Text style={[s.actionTxt, { color: "#EF4444" }]}>Eliminar</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={isAdmin() ? ["#1E3A8A", "#3B82F6"] : isHelper() ? ["#4C1D95", "#8B5CF6"] : ["#92400E", "#F59E0B"]}
        style={s.header}
      >
        <View style={s.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>{headerTitle}</Text>
            <Text style={s.headerSub}>{events.length} evento(s) · {headerSub}</Text>
          </View>
          <TouchableOpacity
            style={s.createBtn}
            onPress={() => navigation.navigate("CreateEvent", { event: null })}
          >
            <Ionicons name="add" size={26} color="white" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {loading ? (
        <View style={s.centered}><ActivityIndicator size="large" color="#3B82F6" /></View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="library-outline" size={64} color="#D1D5DB" />
              <Text style={s.emptyTitle}>Sin eventos creados</Text>
              <TouchableOpacity style={s.createEmptyBtn}
                onPress={() => navigation.navigate("CreateEvent", { event: null })}>
                <Ionicons name="add-circle" size={18} color="white" />
                <Text style={s.createEmptyTxt}>Crear primer evento</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Modal participantes */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle} numberOfLines={1}>Inscritos · {selectedEvent?.title}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>
            {participantsLoading ? (
              <ActivityIndicator size="large" color="#3B82F6" style={{ marginVertical: 24 }} />
            ) : participants.length === 0 ? (
              <View style={s.emptyModal}>
                <Ionicons name="people-outline" size={44} color="#D1D5DB" />
                <Text style={s.emptyModalTxt}>Sin inscriptos</Text>
              </View>
            ) : (
              <ScrollView>
                <Text style={s.participantCount}>{participants.length} inscripto(s)</Text>
                {participants.map(p => (
                  <View key={p.id} style={s.participantRow}>
                    <View style={s.partAvatar}>
                      {p.avatar_url
                        ? <Image source={{ uri: p.avatar_url }} style={StyleSheet.absoluteFill} contentFit="cover" />
                        : <Text style={s.partAvatarTxt}>{p.name?.charAt(0)?.toUpperCase() || "?"}</Text>}
                    </View>
                    <View>
                      <Text style={s.partName}>{p.name}</Text>
                      <Text style={s.partEmail}>{p.email}</Text>
                    </View>
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
  header: { paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerRow: { flexDirection: "row", alignItems: "center" },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "white" },
  headerSub: { fontSize: 12, color: "rgba(255,255,255,0.8)", marginTop: 2 },
  createBtn: { padding: 10, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 20 },
  list: { padding: 16, paddingBottom: 100 },
  card: { backgroundColor: "white", borderRadius: 18, marginBottom: 12, overflow: "hidden", elevation: 2 },
  cardStatusBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 7, gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  statusTxt: { fontSize: 11, fontWeight: "700", flex: 1 },
  ownPill: { backgroundColor: "#FEF3C7", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  ownPillTxt: { fontSize: 10, fontWeight: "700", color: "#D97706" },
  cardBody: { paddingHorizontal: 14, paddingVertical: 10 },
  cardTitle: { fontSize: 16, fontWeight: "800", color: "#1F2937", marginBottom: 8 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  metaTxt: { fontSize: 12, color: "#6B7280", flex: 1 },
  actions: { flexDirection: "row", gap: 6, paddingHorizontal: 10, paddingBottom: 10 },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 9, borderRadius: 10 },
  actionTxt: { fontSize: 12, fontWeight: "600" },
  empty: { alignItems: "center", paddingVertical: 60 },
  emptyTitle: { fontSize: 16, color: "#9CA3AF", marginTop: 14, marginBottom: 16 },
  createEmptyBtn: { flexDirection: "row", backgroundColor: "#3B82F6", paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14, gap: 8, alignItems: "center" },
  createEmptyTxt: { color: "white", fontWeight: "700" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalBox: { backgroundColor: "white", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: "70%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  modalTitle: { fontSize: 16, fontWeight: "700", color: "#1F2937", flex: 1, marginRight: 8 },
  participantCount: { fontSize: 13, color: "#6B7280", marginBottom: 10 },
  participantRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  partAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#3B82F6", justifyContent: "center", alignItems: "center", marginRight: 12, overflow: "hidden" },
  partAvatarTxt: { color: "white", fontWeight: "bold", fontSize: 16 },
  partName: { fontSize: 14, fontWeight: "600", color: "#1F2937" },
  partEmail: { fontSize: 12, color: "#9CA3AF" },
  emptyModal: { alignItems: "center", paddingVertical: 30 },
  emptyModalTxt: { color: "#9CA3AF", marginTop: 10, fontSize: 14 },
});

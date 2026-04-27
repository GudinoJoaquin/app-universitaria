import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, Alert,
  StatusBar, ActivityIndicator, StyleSheet, RefreshControl, Modal,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../services/supabase";
import { getEventParticipants } from "../services/eventsRegistrationService";

export default function OrganizerDashboardScreen({ navigation }) {
  const { user } = useAuth();
  const [myEvents, setMyEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const loadMyEvents = useCallback(async () => {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("created_by", user?.id)
      .order("date", { ascending: false });
    if (!error) setMyEvents(data ?? []);
    setLoading(false);
    setRefreshing(false);
  }, [user?.id]);

  useEffect(() => { loadMyEvents(); }, []);
  const onRefresh = () => { setRefreshing(true); loadMyEvents(); };

  const handleViewParticipants = async (event) => {
    setSelectedEvent(event);
    setParticipantsLoading(true);
    setModalVisible(true);
    const res = await getEventParticipants(event.id);
    if (res.success) setParticipants(res.data);
    setParticipantsLoading(false);
  };

  const handleDeleteEvent = (event) => {
    Alert.alert("Eliminar evento", `¿Eliminar "${event.title}"?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar", style: "destructive",
        onPress: async () => {
          const { error } = await supabase.from("events").delete().eq("id", event.id);
          if (error) Alert.alert("Error", error.message);
          else { Alert.alert("✅", "Evento eliminado"); loadMyEvents(); }
        },
      },
    ]);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  if (loading) return <View style={s.centered}><ActivityIndicator size="large" color="#F59E0B" /></View>;

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={["#92400E", "#F59E0B"]} style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>📋 Dashboard Organizador</Text>
          <Text style={s.headerSub}>{myEvents.length} evento(s) creado(s)</Text>
        </View>
        <TouchableOpacity style={s.createBtn}
          onPress={() => navigation.navigate("CreateEvent", { event: null, onEventCreated: loadMyEvents })}>
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>

        {myEvents.length === 0 ? (
          <View style={s.emptyCard}>
            <Ionicons name="calendar-outline" size={60} color="#FCD34D" />
            <Text style={s.emptyTitle}>Sin eventos creados</Text>
            <Text style={s.emptySub}>Crea tu primer evento para empezar</Text>
            <TouchableOpacity style={s.createEventBtn}
              onPress={() => navigation.navigate("CreateEvent", { event: null })}>
              <Ionicons name="add-circle" size={20} color="white" />
              <Text style={s.createEventBtnTxt}>Crear Evento</Text>
            </TouchableOpacity>
          </View>
        ) : (
          myEvents.map(event => (
            <View key={event.id} style={s.eventCard}>
              <View style={s.eventHeader}>
                <View style={s.eventIconBox}>
                  <Ionicons name="calendar" size={24} color="#F59E0B" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.eventTitle}>{event.title}</Text>
                  <Text style={s.eventDate}>{formatDate(event.date)}</Text>
                  <Text style={s.eventLocation}>📍 {event.location}</Text>
                </View>
              </View>
              {event.description ? (
                <Text style={s.eventDesc} numberOfLines={2}>{event.description}</Text>
              ) : null}
              <View style={s.eventActions}>
                <TouchableOpacity style={[s.eventBtn, { backgroundColor: "#EFF6FF" }]}
                  onPress={() => handleViewParticipants(event)}>
                  <Ionicons name="people" size={16} color="#2563EB" />
                  <Text style={[s.eventBtnTxt, { color: "#2563EB" }]}>Participantes</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.eventBtn, { backgroundColor: "#FFFBEB" }]}
                  onPress={() => navigation.navigate("CreateEvent", { event })}>
                  <Ionicons name="pencil" size={16} color="#D97706" />
                  <Text style={[s.eventBtnTxt, { color: "#D97706" }]}>Editar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.eventBtn, { backgroundColor: "#FEF2F2" }]}
                  onPress={() => handleDeleteEvent(event)}>
                  <Ionicons name="trash" size={16} color="#EF4444" />
                  <Text style={[s.eventBtnTxt, { color: "#EF4444" }]}>Eliminar</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Modal Participantes */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Participantes · {selectedEvent?.title}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#374151" />
              </TouchableOpacity>
            </View>
            {participantsLoading ? (
              <ActivityIndicator size="large" color="#F59E0B" style={{ marginVertical: 20 }} />
            ) : participants.length === 0 ? (
              <View style={s.emptyParticipants}>
                <Ionicons name="people-outline" size={40} color="#D1D5DB" />
                <Text style={s.emptyPartTxt}>Sin participantes registrados</Text>
              </View>
            ) : (
              <ScrollView>
                <Text style={s.partCount}>{participants.length} inscripto(s)</Text>
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
  header: { paddingTop: 50, paddingBottom: 16, paddingHorizontal: 16, flexDirection: "row", alignItems: "center" },
  backBtn: { padding: 8, marginRight: 8 },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "white" },
  headerSub: { fontSize: 12, color: "rgba(255,255,255,0.8)" },
  createBtn: { padding: 8, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 20 },
  emptyCard: { backgroundColor: "white", borderRadius: 24, padding: 40, alignItems: "center", marginTop: 20, elevation: 2 },
  emptyTitle: { fontSize: 18, fontWeight: "bold", color: "#1F2937", marginTop: 16, marginBottom: 8 },
  emptySub: { fontSize: 14, color: "#9CA3AF", textAlign: "center", marginBottom: 20 },
  createEventBtn: { flexDirection: "row", backgroundColor: "#F59E0B", paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14, gap: 8, alignItems: "center" },
  createEventBtnTxt: { color: "white", fontWeight: "700", fontSize: 15 },
  eventCard: { backgroundColor: "white", borderRadius: 16, padding: 16, marginBottom: 12, elevation: 2 },
  eventHeader: { flexDirection: "row", alignItems: "flex-start", marginBottom: 8 },
  eventIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#FFFBEB", justifyContent: "center", alignItems: "center", marginRight: 12 },
  eventTitle: { fontSize: 16, fontWeight: "700", color: "#1F2937" },
  eventDate: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  eventLocation: { fontSize: 12, color: "#9CA3AF", marginTop: 2 },
  eventDesc: { fontSize: 13, color: "#6B7280", marginBottom: 10, lineHeight: 18 },
  eventActions: { flexDirection: "row", gap: 8, borderTopWidth: 1, borderTopColor: "#F3F4F6", paddingTop: 10 },
  eventBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 8, borderRadius: 10 },
  eventBtnTxt: { fontSize: 12, fontWeight: "600" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalBox: { backgroundColor: "white", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: "70%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  modalTitle: { fontSize: 16, fontWeight: "700", color: "#1F2937", flex: 1, marginRight: 8 },
  partCount: { fontSize: 13, color: "#6B7280", marginBottom: 10 },
  participantRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  partAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#F59E0B", justifyContent: "center", alignItems: "center", marginRight: 12, overflow: "hidden" },
  partAvatarTxt: { color: "white", fontWeight: "bold", fontSize: 16 },
  partName: { fontSize: 14, fontWeight: "600", color: "#1F2937" },
  partEmail: { fontSize: 12, color: "#9CA3AF" },
  emptyParticipants: { alignItems: "center", paddingVertical: 30 },
  emptyPartTxt: { color: "#9CA3AF", marginTop: 10, fontSize: 14 },
});

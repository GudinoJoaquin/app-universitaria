import React, { useState, useEffect } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, Alert,
  StatusBar, StyleSheet, Dimensions, ActivityIndicator
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { eventsService } from "../services/eventsService";
import { getEventParticipants, registerToEvent, unregisterFromEvent, getMyRegistrations } from "../services/eventsRegistrationService";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";

const { width, height } = Dimensions.get("window");

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

export default function EventDetailsScreen({ route, navigation }) {
  const { event } = route.params;
  const { user, isAdmin } = useAuth();
  const [participants, setParticipants] = useState([]);
  const [loadingParticipants, setLoadingParticipants] = useState(true);
  const [isRegistered, setIsRegistered] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      const [pRes, myRes] = await Promise.all([
        getEventParticipants(event.id),
        getMyRegistrations(user.id)
      ]);
      if (pRes.success) setParticipants(pRes.data);
      if (myRes.success) setIsRegistered(myRes.data.some(e => e.id === event.id));
      setLoadingParticipants(false);
    };
    loadData();
  }, [event.id, user.id]);

  const handleToggleRegistration = async () => {
    setActionLoading(true);
    if (isRegistered) {
      Alert.alert("Cancelar Inscripción", "¿Seguro?", [
        { text: "No", style: "cancel", onPress: () => setActionLoading(false) },
        { text: "Sí", style: "destructive", onPress: async () => {
            const res = await unregisterFromEvent(user.id, event.id);
            if (res.success) {
              setIsRegistered(false);
              setParticipants(p => p.filter(u => u.id !== user.id));
            } else Alert.alert("Error", res.error);
            setActionLoading(false);
          }
        }
      ]);
    } else {
      const res = await registerToEvent(user.id, event.id);
      if (res.success) {
        setIsRegistered(true);
        setParticipants(p => [...p, { id: user.id, name: user.name, email: user.email, role: user.role }]);
      } else Alert.alert("Error", res.error);
      setActionLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = parseDate(dateString);
    return date.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  };

  const getStatus = (dateStr, sTime, eTime) => {
    const now = new Date();
    const eventDate = parseDate(dateStr);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const target = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());

    if (target < today) return { label: "FINALIZADO", color: "#64748B", bg: "#F1F5F9" };
    if (target > today) return { label: "PROGRAMADO", color: "#3B82F6", bg: "#EFF6FF" };
    return { label: "EN PROCESO", color: "#10B981", bg: "#ECFDF5" };
  };

  const status = getStatus(event.date, event.start_time, event.end_time);

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>
        {/* Cinematic Hero */}
        <View style={s.hero}>
          {event.image_url ? (
            <Image source={{ uri: event.image_url }} style={s.heroImg} contentFit="cover" />
          ) : (
            <LinearGradient colors={["#1E1B4B", "#0F172A"]} style={s.heroImg} />
          )}
          <LinearGradient colors={["rgba(0,0,0,0.4)", "transparent", "rgba(15, 23, 42, 0.9)"]} style={StyleSheet.absoluteFill} />
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <View style={s.heroMeta}>
            <View style={[s.statusBadge, { backgroundColor: status.bg }]}>
              <Text style={[s.statusTxt, { color: status.color }]}>{status.label}</Text>
            </View>
            <Text style={s.title}>{event.title}</Text>
          </View>
        </View>

        {/* Dynamic Content */}
        <View style={s.body}>
          <View style={s.infoGrid}>
            <View style={s.infoCard}>
              <View style={[s.iconBox, { backgroundColor: "#EFF6FF" }]}><Ionicons name="calendar" size={20} color="#3B82F6" /></View>
              <View><Text style={s.infoLabel}>FECHA</Text><Text style={s.infoVal}>{formatDate(event.date)}</Text></View>
            </View>
            <View style={s.infoCard}>
              <View style={[s.iconBox, { backgroundColor: "#FEF2F2" }]}><Ionicons name="time" size={20} color="#EF4444" /></View>
              <View><Text style={s.infoLabel}>HORARIO</Text><Text style={s.infoVal}>{formatTimeRange(event.start_time, event.end_time)}</Text></View>
            </View>
          </View>

          <View style={s.locationCard}>
            <View style={[s.iconBox, { backgroundColor: "#ECFDF5" }]}><Ionicons name="location" size={20} color="#10B981" /></View>
            <View style={{ flex: 1 }}><Text style={s.infoLabel}>UBICACIÓN</Text><Text style={s.infoVal}>{event.location}</Text></View>
          </View>

          <View style={s.section}>
            <Text style={s.sectionTitle}>Sobre el evento</Text>
            <Text style={s.desc}>{event.description || "Sin descripción proporcionada."}</Text>
          </View>

          <View style={s.section}>
            <Text style={s.sectionTitle}>Categorías</Text>
            <View style={s.catRow}>
              {event.categories?.map(c => (
                <View key={c.id} style={[s.catTag, { borderColor: c.color }]}>
                  <Text style={[s.catTagTxt, { color: c.color }]}>{c.name}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={s.section}>
            <View style={s.pHeader}>
              <Text style={s.sectionTitle}>Participantes</Text>
              <Text style={s.pCount}>{participants.length} inscritos</Text>
            </View>
            {loadingParticipants ? <ActivityIndicator size="small" /> : (
              <View style={s.pList}>
                {participants.slice(0, 6).map((p, i) => (
                  <View key={p.id} style={[s.pAvatar, { marginLeft: i === 0 ? 0 : -15, zIndex: 10 - i }]}>
                    <Text style={s.pAvatarTxt}>{p.name?.[0]?.toUpperCase()}</Text>
                  </View>
                ))}
                {participants.length > 6 && <View style={s.pMore}><Text style={s.pMoreTxt}>+{participants.length - 6}</Text></View>}
              </View>
            )}
          </View>
        </View>
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Glass ActionBar */}
      <View style={s.actionBar}>
        <LinearGradient colors={["rgba(255,255,255,0)", "white", "white"]} style={s.actionBarBg} />
        <View style={s.actionRow}>
          {(isAdmin() || user?.id === event.created_by) && (
            <TouchableOpacity style={s.editBtn} onPress={() => navigation.navigate("CreateEvent", { event })}>
              <Ionicons name="create-outline" size={24} color="#F59E0B" />
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            style={[s.mainBtn, isRegistered && s.mainBtnReg]} 
            onPress={handleToggleRegistration} 
            disabled={actionLoading || status.label === "FINALIZADO"}
          >
            <LinearGradient colors={isRegistered ? ["#F1F5F9", "#E2E8F0"] : ["#1E1B4B", "#312E81"]} style={s.btnGradient}>
              {actionLoading ? <ActivityIndicator color={isRegistered ? "#1E1B4B" : "white"} /> : (
                <>
                  <Ionicons name={isRegistered ? "checkmark-circle" : "calendar"} size={22} color={isRegistered ? "#3B82F6" : "white"} style={{ marginRight: 10 }} />
                  <Text style={[s.btnTxt, isRegistered && { color: "#1E293B" }]}>{isRegistered ? "Inscrito" : "Inscribirme"}</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "white" },
  scrollContent: { paddingBottom: 20 },
  hero: { height: height * 0.45, justifyContent: "flex-end", padding: 25 },
  heroImg: { ...StyleSheet.absoluteFillObject },
  backBtn: { position: "absolute", top: 60, left: 25, width: 48, height: 48, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center" },
  heroMeta: { gap: 10 },
  statusBadge: { alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  statusTxt: { fontSize: 11, fontWeight: "900" },
  title: { fontSize: 34, fontWeight: "900", color: "white", letterSpacing: -1, lineHeight: 40 },
  
  body: { paddingHorizontal: 25, marginTop: -30 },
  infoGrid: { flexDirection: "row", gap: 15 },
  infoCard: { flex: 1, backgroundColor: "white", borderRadius: 24, padding: 18, elevation: 15, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 20, flexDirection: "row", alignItems: "center", gap: 12 },
  iconBox: { width: 44, height: 44, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  infoLabel: { fontSize: 10, fontWeight: "900", color: "#94A3B8" },
  infoVal: { fontSize: 13, fontWeight: "800", color: "#1E293B" },
  
  locationCard: { backgroundColor: "white", borderRadius: 24, padding: 18, elevation: 15, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 20, flexDirection: "row", alignItems: "center", gap: 12, marginTop: 15 },
  
  section: { marginTop: 35 },
  sectionTitle: { fontSize: 20, fontWeight: "900", color: "#1E293B", marginBottom: 15 },
  desc: { fontSize: 16, color: "#475569", lineHeight: 26, fontWeight: "500" },
  catRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  catTag: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1.5 },
  catTagTxt: { fontSize: 12, fontWeight: "800" },
  
  pHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 15 },
  pCount: { fontSize: 14, fontWeight: "700", color: "#3B82F6" },
  pList: { flexDirection: "row", alignItems: "center" },
  pAvatar: { width: 45, height: 45, borderRadius: 20, borderWidth: 3, borderColor: "white", backgroundColor: "#EEF2FF", justifyContent: "center", alignItems: "center" },
  pAvatarTxt: { fontWeight: "900", color: "#4F46E5", fontSize: 16 },
  pMore: { width: 45, height: 45, borderRadius: 20, backgroundColor: "#F8FAFC", justifyContent: "center", alignItems: "center", marginLeft: -15, borderWidth: 1, borderColor: "#E2E8F0" },
  pMoreTxt: { fontSize: 12, fontWeight: "800", color: "#64748B" },
  
  actionBar: { position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: 25, paddingBottom: 40 },
  actionBarBg: { position: "absolute", bottom: 0, left: 0, right: 0, height: 160 },
  actionRow: { flexDirection: "row", gap: 15 },
  editBtn: { width: 60, height: 60, borderRadius: 22, backgroundColor: "white", elevation: 10, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "#F1F5F9" },
  mainBtn: { flex: 1, height: 60, borderRadius: 22, overflow: "hidden", elevation: 10 },
  btnGradient: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center" },
  btnTxt: { color: "white", fontSize: 17, fontWeight: "900" },
});

// EventDetailsScreen.jsx - Versión corregida
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
      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={s.scrollContent}
      >
        {/* Hero Image */}
        <View style={s.hero}>
          {event.image_url ? (
            <Image source={{ uri: event.image_url }} style={s.heroImg} contentFit="cover" />
          ) : (
            <LinearGradient colors={["#1E1B4B", "#0F172A"]} style={s.heroImg} />
          )}
          <LinearGradient 
            colors={["rgba(0,0,0,0.5)", "transparent", "rgba(15, 23, 42, 0.95)"]} 
            style={StyleSheet.absoluteFill} 
          />
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <View style={s.heroMeta}>
            <View style={[s.statusBadge, { backgroundColor: status.bg }]}>
              <Text style={[s.statusTxt, { color: status.color }]}>{status.label}</Text>
            </View>
            <Text style={s.title} numberOfLines={3}>{event.title}</Text>
          </View>
        </View>

        {/* Contenido */}
        <View style={s.body}>
          {/* Grid de info - corregido */}
          <View style={s.infoGrid}>
            <View style={s.infoCard}>
              <View style={[s.iconBox, { backgroundColor: "#EFF6FF" }]}>
                <Ionicons name="calendar" size={20} color="#3B82F6" />
              </View>
              <View style={s.infoTextContainer}>
                <Text style={s.infoLabel}>FECHA</Text>
                <Text style={s.infoVal} numberOfLines={2}>{formatDate(event.date)}</Text>
              </View>
            </View>
            <View style={s.infoCard}>
              <View style={[s.iconBox, { backgroundColor: "#FEF2F2" }]}>
                <Ionicons name="time" size={20} color="#EF4444" />
              </View>
              <View style={s.infoTextContainer}>
                <Text style={s.infoLabel}>HORARIO</Text>
                <Text style={s.infoVal} numberOfLines={2}>{formatTimeRange(event.start_time, event.end_time)}</Text>
              </View>
            </View>
          </View>

          {/* Ubicación */}
          <View style={s.locationCard}>
            <View style={[s.iconBox, { backgroundColor: "#ECFDF5" }]}>
              <Ionicons name="location" size={20} color="#10B981" />
            </View>
            <View style={s.locationTextContainer}>
              <Text style={s.infoLabel}>UBICACIÓN</Text>
              <Text style={s.infoVal} numberOfLines={3}>{event.location}</Text>
            </View>
          </View>

          {/* Descripción */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Sobre el evento</Text>
            <Text style={s.desc}>
              {event.description || "Sin descripción proporcionada."}
            </Text>
          </View>

          {/* Categorías */}
          {event.categories?.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Categorías</Text>
              <View style={s.catRow}>
                {event.categories.map(c => (
                  <View key={c.id} style={[s.catTag, { borderColor: c.color, backgroundColor: c.color + "10" }]}>
                    <Text style={[s.catTagTxt, { color: c.color }]}>{c.name}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Participantes */}
          <View style={s.section}>
            <View style={s.pHeader}>
              <Text style={s.sectionTitle}>Participantes</Text>
              <Text style={s.pCount}>{participants.length} inscritos</Text>
            </View>
            {loadingParticipants ? (
              <ActivityIndicator size="small" color="#3B82F6" />
            ) : participants.length > 0 ? (
              <View style={s.pList}>
                {participants.slice(0, 5).map((p, i) => (
                  <View 
                    key={p.id} 
                    style={[
                      s.pAvatar, 
                      { marginLeft: i === 0 ? 0 : -12, zIndex: participants.length - i }
                    ]}
                  >
                    <Text style={s.pAvatarTxt}>{p.name?.[0]?.toUpperCase() || "?"}</Text>
                  </View>
                ))}
                {participants.length > 5 && (
                  <View style={[s.pMore, { marginLeft: -12 }]}>
                    <Text style={s.pMoreTxt}>+{participants.length - 5}</Text>
                  </View>
                )}
              </View>
            ) : (
              <Text style={s.noParticipants}>Aún no hay participantes inscritos.</Text>
            )}
          </View>
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Action Bar fijo */}
      <View style={s.actionBar}>
        <LinearGradient colors={["rgba(255,255,255,0)", "white", "white"]} style={s.actionBarBg} />
        <View style={s.actionRow}>
          {(isAdmin() || user?.id === event.created_by) && (
            <TouchableOpacity 
              style={s.editBtn} 
              onPress={() => navigation.navigate("CreateEvent", { event })}
            >
              <Ionicons name="create-outline" size={24} color="#F59E0B" />
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            style={[s.mainBtn, isRegistered && s.mainBtnReg]} 
            onPress={handleToggleRegistration} 
            disabled={actionLoading || status.label === "FINALIZADO"}
          >
            <LinearGradient 
              colors={isRegistered ? ["#F1F5F9", "#E2E8F0"] : ["#1E1B4B", "#312E81"]} 
              style={s.btnGradient}
            >
              {actionLoading ? (
                <ActivityIndicator color={isRegistered ? "#1E1B4B" : "white"} />
              ) : (
                <>
                  <Ionicons 
                    name={isRegistered ? "checkmark-circle" : "calendar"} 
                    size={22} 
                    color={isRegistered ? "#3B82F6" : "white"} 
                    style={{ marginRight: 10 }} 
                  />
                  <Text style={[s.btnTxt, isRegistered && { color: "#1E293B" }]}>
                    {isRegistered ? "Inscrito" : "Inscribirme"}
                  </Text>
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
  
  hero: { 
    height: height * 0.45, 
    justifyContent: "flex-end", 
    padding: 20,
    position: "relative",
  },
  heroImg: { ...StyleSheet.absoluteFillObject },
  backBtn: { 
    position: "absolute", 
    top: 60, 
    left: 20, 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    backgroundColor: "rgba(255,255,255,0.2)", 
    justifyContent: "center", 
    alignItems: "center",
    zIndex: 10,
  },
  heroMeta: { gap: 12, marginBottom: 20 },
  statusBadge: { 
    alignSelf: "flex-start", 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 20,
  },
  statusTxt: { fontSize: 11, fontWeight: "900" },
  title: { 
    fontSize: 28, 
    fontWeight: "900", 
    color: "white", 
    letterSpacing: -0.5, 
    lineHeight: 36,
  },
  
  body: { paddingHorizontal: 20, marginTop: -25, backgroundColor: "white", borderTopLeftRadius: 25, borderTopRightRadius: 25, paddingTop: 20 },
  
  infoGrid: { flexDirection: "row", gap: 12, marginBottom: 12 },
  infoCard: { 
    flex: 1, 
    backgroundColor: "white", 
    borderRadius: 20, 
    padding: 14, 
    flexDirection: "row", 
    alignItems: "center", 
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  iconBox: { width: 42, height: 42, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  infoTextContainer: { flex: 1 },
  infoLabel: { fontSize: 10, fontWeight: "900", color: "#94A3B8", letterSpacing: 0.5, marginBottom: 4 },
  infoVal: { fontSize: 13, fontWeight: "700", color: "#1E293B", lineHeight: 18 },
  
  locationCard: { 
    backgroundColor: "white", 
    borderRadius: 20, 
    padding: 14, 
    flexDirection: "row", 
    alignItems: "center", 
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    marginBottom: 8,
  },
  locationTextContainer: { flex: 1 },
  
  section: { marginTop: 24 },
  sectionTitle: { fontSize: 18, fontWeight: "900", color: "#1E293B", marginBottom: 12 },
  desc: { fontSize: 15, color: "#475569", lineHeight: 24, fontWeight: "500" },
  
  catRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  catTag: { 
    paddingHorizontal: 14, 
    paddingVertical: 7, 
    borderRadius: 20, 
    borderWidth: 1.5,
  },
  catTagTxt: { fontSize: 13, fontWeight: "700" },
  
  pHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  pCount: { fontSize: 13, fontWeight: "700", color: "#3B82F6", backgroundColor: "#EFF6FF", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  pList: { flexDirection: "row", alignItems: "center", flexWrap: "wrap" },
  pAvatar: { 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    borderWidth: 2, 
    borderColor: "white", 
    backgroundColor: "#EEF2FF", 
    justifyContent: "center", 
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  pAvatarTxt: { fontWeight: "900", color: "#4F46E5", fontSize: 16 },
  pMore: { 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    backgroundColor: "#F8FAFC", 
    justifyContent: "center", 
    alignItems: "center", 
    borderWidth: 2, 
    borderColor: "#E2E8F0",
  },
  pMoreTxt: { fontSize: 12, fontWeight: "800", color: "#64748B" },
  noParticipants: { fontSize: 14, color: "#94A3B8", textAlign: "center", paddingVertical: 20 },
  
  actionBar: { 
    position: "absolute", 
    bottom: 0, 
    left: 0, 
    right: 0, 
    paddingHorizontal: 20, 
    paddingBottom: 30,
    paddingTop: 10,
  },
  actionBarBg: { position: "absolute", bottom: 0, left: 0, right: 0, height: 130 },
  actionRow: { flexDirection: "row", gap: 12 },
  editBtn: { 
    width: 56, 
    height: 56, 
    borderRadius: 28, 
    backgroundColor: "white", 
    justifyContent: "center", 
    alignItems: "center", 
    borderWidth: 1, 
    borderColor: "#F1F5F9",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  mainBtn: { flex: 1, height: 56, borderRadius: 28, overflow: "hidden", elevation: 5 },
  mainBtnReg: { elevation: 2 },
  btnGradient: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center" },
  btnTxt: { color: "white", fontSize: 16, fontWeight: "900" },
});
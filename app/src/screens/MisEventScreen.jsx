import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, Alert,
  StatusBar, ActivityIndicator, StyleSheet, RefreshControl, FlatList,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../services/supabase";
import { getMyRegistrations, registerToEvent, unregisterFromEvent, isRegistered } from "../services/eventsRegistrationService";

export default function MisEventScreen({ navigation }) {
  const { user } = useAuth();
  const [myEvents, setMyEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(null);

  useEffect(() => { if (user?.avatar_url) setAvatarUrl(user.avatar_url); }, [user?.avatar_url]);

  const loadMyEvents = useCallback(async () => {
    if (!user?.id) return;
    const res = await getMyRegistrations(user.id);
    if (res.success) setMyEvents(res.data);
    setLoading(false);
    setRefreshing(false);
  }, [user?.id]);

  useEffect(() => { loadMyEvents(); }, [loadMyEvents]);
  const onRefresh = () => { setRefreshing(true); loadMyEvents(); };

  const handleUnregister = (event) => {
    Alert.alert("Cancelar inscripción", `¿Cancelar inscripción a "${event.title}"?`, [
      { text: "No", style: "cancel" },
      {
        text: "Sí, cancelar", style: "destructive",
        onPress: async () => {
          const res = await unregisterFromEvent(user.id, event.id);
          if (res.success) { Alert.alert("✅", "Inscripción cancelada"); loadMyEvents(); }
          else Alert.alert("Error", res.error);
        },
      },
    ]);
  };

  const formatDate = (d) => {
    if (!d) return "";
    return new Date(d).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1E3A8A" />
      <LinearGradient colors={["#1E3A8A", "#3B82F6"]} style={s.header}>
        <View style={s.headerContent}>
          <Text style={s.headerTitle}>Mis Eventos 🏷️</Text>
          <TouchableOpacity onPress={() => navigation.navigate("ProfileTab")} style={s.avatarBtn}>
            {avatarUrl
              ? <Image source={{ uri: avatarUrl }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
              : <Text style={s.avatarTxt}>{user?.name?.charAt(0)?.toUpperCase() || "U"}</Text>}
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : myEvents.length === 0 ? (
        <ScrollView contentContainerStyle={s.emptyContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
          <View style={s.emptyCard}>
            <View style={s.emptyIcon}>
              <Ionicons name="bookmarks-outline" size={60} color="#3B82F6" />
            </View>
            <Text style={s.emptyTitle}>Sin eventos inscritos</Text>
            <Text style={s.emptySub}>Explora los eventos disponibles y regístrate en los que te interesen.</Text>
            <TouchableOpacity style={s.exploreBtn} onPress={() => navigation.navigate("AllEventsTab")}>
              <Ionicons name="search" size={18} color="white" />
              <Text style={s.exploreBtnTxt}>Explorar eventos</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        <FlatList
          data={myEvents}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={({ item }) => (
            <TouchableOpacity style={s.eventCard}
              onPress={() => navigation.navigate("EventDetails", { event: item })}>
              <View style={s.eventIconBox}>
                <Ionicons name="calendar" size={26} color="#3B82F6" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.eventTitle}>{item.title}</Text>
                <Text style={s.eventDate}>{formatDate(item.date)}</Text>
                <Text style={s.eventLocation} numberOfLines={1}>📍 {item.location}</Text>
                {item.registered_at && (
                  <Text style={s.registeredAt}>Inscripto el {formatDate(item.registered_at)}</Text>
                )}
              </View>
              <TouchableOpacity style={s.unregBtn} onPress={() => handleUnregister(item)}>
                <Ionicons name="close-circle" size={22} color="#EF4444" />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
          ListHeaderComponent={
            <Text style={s.sectionLabel}>INSCRIPCIONES ({myEvents.length})</Text>
          }
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { paddingTop: 60, paddingBottom: 20, paddingHorizontal: 24, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerContent: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerTitle: { color: "white", fontSize: 24, fontWeight: "800" },
  avatarBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.2)", overflow: "hidden", justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: "rgba(255,255,255,0.4)" },
  avatarTxt: { color: "white", fontSize: 18, fontWeight: "bold" },
  emptyContent: { flex: 1, padding: 24, justifyContent: "center" },
  emptyCard: { backgroundColor: "white", borderRadius: 32, padding: 40, alignItems: "center", elevation: 4 },
  emptyIcon: { width: 100, height: 100, borderRadius: 50, backgroundColor: "#EFF6FF", justifyContent: "center", alignItems: "center", marginBottom: 20 },
  emptyTitle: { fontSize: 20, fontWeight: "bold", color: "#1F2937", marginBottom: 10, textAlign: "center" },
  emptySub: { fontSize: 14, color: "#6B7280", textAlign: "center", lineHeight: 22, marginBottom: 24 },
  exploreBtn: { flexDirection: "row", backgroundColor: "#3B82F6", paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14, gap: 8, alignItems: "center" },
  exploreBtnTxt: { color: "white", fontWeight: "700", fontSize: 15 },
  sectionLabel: { fontSize: 11, fontWeight: "700", color: "#9CA3AF", marginBottom: 10, textTransform: "uppercase" },
  eventCard: { backgroundColor: "white", borderRadius: 16, padding: 14, marginBottom: 10, flexDirection: "row", alignItems: "flex-start", elevation: 2 },
  eventIconBox: { width: 48, height: 48, borderRadius: 14, backgroundColor: "#EFF6FF", justifyContent: "center", alignItems: "center", marginRight: 12 },
  eventTitle: { fontSize: 15, fontWeight: "700", color: "#1F2937", marginBottom: 2 },
  eventDate: { fontSize: 13, color: "#6B7280" },
  eventLocation: { fontSize: 12, color: "#9CA3AF", marginTop: 2 },
  registeredAt: { fontSize: 11, color: "#3B82F6", marginTop: 4 },
  unregBtn: { padding: 4, marginLeft: 8 },
});

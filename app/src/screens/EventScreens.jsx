import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  StatusBar,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { eventsService } from "../services/eventsService";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { supabase } from "../services/supabase";

export default function EventsScreen({ navigation }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const { user, logout } = useAuth();

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    if (user?.avatar_url) {
      setAvatarUrl(user.avatar_url);
    }
  }, [user?.avatar_url]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const response = await eventsService.getEvents();
      setEvents(response.events || []);
    } catch (error) {
      Alert.alert(
        "Error",
        error.message || "No se pudieron cargar los eventos"
      );
      console.log("Error loading events:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadEvents();
  };

  const handleLogout = () => {
    Alert.alert("Cerrar Sesión", "¿Estás seguro de que quieres salir?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Salir",
        onPress: logout,
        style: "destructive",
      },
    ]);
  };

  const getRoleInfo = (role) => {
    switch (role) {
      case "admin": return { name: "Admin", emoji: "👑", color: "#EF4444", bg: "#FEE2E2" };
      case "teacher": return { name: "Docente", emoji: "👨‍🏫", color: "#3B82F6", bg: "#DBEAFE" };
      case "student": return { name: "Estudiante", emoji: "", color: "#4B5563", bg: "#F3F4F6" };
      default: return { name: role || "Usuario", emoji: "", color: "#6B7280", bg: "#F3F4F6" };
    }
  };

  const formatEventDate = (dateString) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString("es-ES", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
      time: date.toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      day: date.toLocaleDateString("es-ES", { weekday: "long" }),
    };
  };

  const getEventStatus = (eventDate) => {
    const date = new Date(eventDate);
    const now = new Date();
    const timeDiff = date.getTime() - now.getTime();
    const daysDiff = timeDiff / (1000 * 3600 * 24);

    if (daysDiff < 0)
      return { status: "past", label: "Finalizado", color: "#6B7280" };
    if (daysDiff <= 1)
      return { status: "urgent", label: "Próximamente", color: "#DC2626" };
    if (daysDiff <= 7)
      return { status: "upcoming", label: "Esta semana", color: "#D97706" };
    return { status: "scheduled", label: "Programado", color: "#059669" };
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingContent}>
          <Text style={styles.loadingText}>Cargando eventos...</Text>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      </View>
    );
  }

  const roleInfo = getRoleInfo(user?.role);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1E3A8A" />

      {/* Header Estandarizado */}
      <LinearGradient colors={["#1E3A8A", "#3B82F6"]} style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.userInfo}>
            <TouchableOpacity 
              onPress={() => navigation.navigate("ProfileTab")}
              style={[styles.avatar, { padding: 0, overflow: 'hidden' }]}
            >
              {avatarUrl ? (
                <Image
                  source={{ uri: avatarUrl }}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="cover"
                  transition={200}
                />
              ) : (
                <Text style={styles.avatarText}>
                  {user?.name?.charAt(0)?.toUpperCase() || "U"}
                </Text>
              )}
            </TouchableOpacity>
            <View style={styles.userDetails}>
              <Text style={styles.welcomeText}>¡Hola, {user?.name?.split(" ")[0] || "Usuario"}! 👋</Text>
              <View style={[styles.roleBadge, { backgroundColor: roleInfo.bg }]}>
                <Text style={[styles.roleBadgeText, { color: roleInfo.color }]}>
                  {roleInfo.emoji ? `${roleInfo.emoji} ` : ""}{roleInfo.name}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* Contenido Principal */}
      <View style={styles.content}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Descubre Eventos 🌟</Text>
          <Text style={styles.sectionSubtitle}>
            Actividades y talleres para la comunidad
          </Text>
        </View>

        <FlatList
          data={events}
          keyExtractor={(item) =>
            item.id?.toString() || Math.random().toString()
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#3B82F6"]}
              tintColor="#3B82F6"
            />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const { date, time, day } = formatEventDate(item.date);
            const status = getEventStatus(item.date);

            return (
              <TouchableOpacity
                style={styles.eventCard}
                onPress={() =>
                  navigation.navigate("EventDetails", { event: item })
                }
              >
                {/* Header de la tarjeta con estado */}
                <View style={styles.eventHeader}>
                  <View style={styles.eventTitleContainer}>
                    <Text style={styles.eventTitle} numberOfLines={2}>{item.title}</Text>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: `${status.color}15` },
                      ]}
                    >
                      <View style={[styles.statusDot, { backgroundColor: status.color }]} />
                      <Text style={[styles.statusText, { color: status.color }]}>
                        {status.label}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Línea divisora */}
                <View style={styles.divider} />

                {/* Detalles del evento */}
                <View style={styles.eventDetails}>
                  <View style={styles.detailRow}>
                    <View style={styles.detailIconBox}>
                      <Ionicons name="calendar-outline" size={18} color="#6366F1" />
                    </View>
                    <View style={styles.detailTextContainer}>
                      <Text style={styles.detailValueBold}>{day}</Text>
                      <Text style={styles.detailValueSub}>{date} • {time}</Text>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <View style={styles.detailIconBox}>
                      <Ionicons name="location-outline" size={18} color="#EF4444" />
                    </View>
                    <View style={styles.detailTextContainer}>
                      <Text style={styles.detailValueBold} numberOfLines={1}>{item.location}</Text>
                      <Text style={styles.detailValueSub}>Ubicación</Text>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <View style={styles.detailIconBox}>
                      <Ionicons name="person-outline" size={18} color="#10B981" />
                    </View>
                    <View style={styles.detailTextContainer}>
                      <Text style={styles.detailValueBold} numberOfLines={1}>{item.created_by_name}</Text>
                      <Text style={styles.detailValueSub}>Organizador</Text>
                    </View>
                  </View>
                </View>

                {/* Descripción */}
                {item.description && (
                  <View style={styles.descriptionContainer}>
                    <Text style={styles.descriptionText} numberOfLines={2}>
                      {item.description}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="calendar-clear-outline" size={64} color="#9CA3AF" />
              </View>
              <Text style={styles.emptyTitle}>No hay eventos programados</Text>
              <Text style={styles.emptyDescription}>
                {user?.role === "admin" || user?.role === "teacher"
                  ? "¡Sé el primero en programar una actividad tocando el botón +!"
                  : "Los eventos aparecerán aquí cuando sean publicados. ¡Vuelve pronto!"}
              </Text>
            </View>
          }
        />
      </View>

      {/* FAB para crear eventos */}
      {(user?.role === "admin" || user?.role === "teacher") && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate("CreateEvent", { event: null })}
        >
          <Ionicons name="add" size={32} color="white" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 30,
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  headerContent: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  userInfo: { flexDirection: "row", alignItems: "center" },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.4)"
  },
  avatarText: { color: "white", fontSize: 24, fontWeight: "bold" },
  userDetails: { justifyContent: "center" },
  welcomeText: { color: "white", fontSize: 22, fontWeight: "bold", marginBottom: 4 },
  roleBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, alignSelf: "flex-start" },
  roleBadgeText: { fontSize: 12, fontWeight: "bold" },
  content: { flex: 1, paddingTop: 16 },
  sectionHeader: { paddingHorizontal: 24, marginBottom: 16 },
  sectionTitle: { fontSize: 22, fontWeight: "800", color: "#1F2937", marginBottom: 4 },
  sectionSubtitle: { fontSize: 14, color: "#6B7280" },
  listContent: { paddingHorizontal: 24, paddingBottom: 100 },
  eventCard: {
    backgroundColor: "white",
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#F1F5F9"
  },
  eventHeader: { marginBottom: 16 },
  eventTitleContainer: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  eventTitle: { flex: 1, fontSize: 18, fontWeight: "bold", color: "#1F2937", marginRight: 12, lineHeight: 24 },
  statusBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  statusText: { fontSize: 12, fontWeight: "700" },
  divider: { height: 1, backgroundColor: "#F3F4F6", marginBottom: 16 },
  eventDetails: { gap: 16 },
  detailRow: { flexDirection: "row", alignItems: "center" },
  detailIconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: "#F8FAFC", justifyContent: "center", alignItems: "center", marginRight: 12 },
  detailTextContainer: { flex: 1 },
  detailValueBold: { fontSize: 14, fontWeight: "700", color: "#374151", marginBottom: 2 },
  detailValueSub: { fontSize: 12, color: "#9CA3AF" },
  descriptionContainer: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: "#F3F4F6" },
  descriptionText: { fontSize: 14, color: "#6B7280", lineHeight: 20 },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#3B82F6",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 60, paddingHorizontal: 32 },
  emptyIconContainer: { width: 120, height: 120, borderRadius: 60, backgroundColor: "#F3F4F6", justifyContent: "center", alignItems: "center", marginBottom: 24 },
  emptyTitle: { fontSize: 18, fontWeight: "bold", color: "#1F2937", marginBottom: 12, textAlign: "center" },
  emptyDescription: { fontSize: 14, color: "#6B7280", textAlign: "center", lineHeight: 22 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F8FAFC" },
  loadingContent: { alignItems: "center", backgroundColor: "white", padding: 32, borderRadius: 24, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  loadingText: { fontSize: 16, fontWeight: "600", color: "#4B5563", marginBottom: 16 }
});

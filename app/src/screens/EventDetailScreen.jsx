import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  StatusBar,
  StyleSheet,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { eventsService } from "../services/eventsService";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

export default function EventDetailsScreen({ route, navigation }) {
  const { event } = route.params;
  const { user } = useAuth();

  const handleDeleteEvent = () => {
    if (!event.id) {
      Alert.alert("Error", "No se puede eliminar este evento");
      return;
    }

    Alert.alert(
      "Eliminar Evento",
      "¿Estás seguro de que quieres eliminar este evento? Esta acción no se puede deshacer.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              await eventsService.deleteEvent(event.id);
              Alert.alert("Éxito", "Evento eliminado correctamente");
              navigation.goBack();
            } catch (error) {
              Alert.alert("Error", "No se pudo eliminar el evento");
            }
          },
        },
      ]
    );
  };

  const handleAddToCalendar = () => {
    Alert.alert(
      "Agregar a Calendario",
      "¿Quieres agregar este evento a tu calendario?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Agregar",
          onPress: () => Alert.alert("Éxito", "Evento agregado a tu calendario"),
        },
      ]
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" }),
      time: date.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }),
      day: date.toLocaleDateString("es-ES", { weekday: "long" }),
    };
  };

  const getEventStatus = (eventDate) => {
    const date = new Date(eventDate);
    const now = new Date();
    const timeDiff = date.getTime() - now.getTime();
    const daysDiff = timeDiff / (1000 * 3600 * 24);

    if (daysDiff < 0) return { status: "past", label: "FINALIZADO", color: "#6B7280", bg: "#F3F4F6", icon: "time-outline" };
    if (daysDiff <= 1) return { status: "urgent", label: "PRÓXIMAMENTE", color: "#DC2626", bg: "#FEE2E2", icon: "alert-circle-outline" };
    if (daysDiff <= 7) return { status: "upcoming", label: "ESTA SEMANA", color: "#D97706", bg: "#FEF3C7", icon: "calendar-outline" };
    return { status: "scheduled", label: "PROGRAMADO", color: "#059669", bg: "#D1FAE5", icon: "checkmark-circle-outline" };
  };

  const eventDate = formatDate(event.date);
  const status = getEventStatus(event.date);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#3B82F6" />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Header Blend with Navigation Bar */}
        <LinearGradient colors={["#3B82F6", "#1E3A8A"]} style={styles.heroSection}>
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <Ionicons name={status.icon} size={16} color={status.color} style={{ marginRight: 6 }} />
            <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
          </View>
          <Text style={styles.title}>{event.title}</Text>
        </LinearGradient>

        {/* Floating Details Card */}
        <View style={styles.floatingCardContainer}>
          <View style={styles.floatingCard}>
            <View style={styles.detailRow}>
              <View style={[styles.detailIconBox, { backgroundColor: "#EFF6FF" }]}>
                <Ionicons name="calendar" size={24} color="#3B82F6" />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Fecha</Text>
                <Text style={styles.detailValue}>{eventDate.day}, {eventDate.date}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.detailRow}>
              <View style={[styles.detailIconBox, { backgroundColor: "#FEF2F2" }]}>
                <Ionicons name="time" size={24} color="#EF4444" />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Hora</Text>
                <Text style={styles.detailValue}>{eventDate.time} hrs</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.detailRow}>
              <View style={[styles.detailIconBox, { backgroundColor: "#ECFDF5" }]}>
                <Ionicons name="location" size={24} color="#10B981" />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Ubicación</Text>
                <Text style={styles.detailValue}>{event.location}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Descripción */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Acerca del Evento</Text>
          <View style={styles.infoCard}>
            <Text style={styles.descriptionText}>
              {event.description || "No hay descripción detallada disponible para este evento. Asiste para descubrir más."}
            </Text>
          </View>
        </View>

        {/* Información Adicional */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detalles de Organización</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="person-circle-outline" size={22} color="#6B7280" style={{ width: 30 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.infoLabel}>Organizador</Text>
                <Text style={styles.infoValue}>{event.created_by_name || "Administración Universitaria"}</Text>
              </View>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.infoRow}>
              <Ionicons name="bookmark-outline" size={22} color="#6B7280" style={{ width: 30 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.infoLabel}>Categoría</Text>
                <Text style={styles.infoValue}>{event.type === "academico" ? "Evento Académico" : "Evento Universitario"}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Botones de Acción */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.primaryButton} onPress={handleAddToCalendar}>
            <Ionicons name="calendar-number" size={20} color="white" style={{ marginRight: 10 }} />
            <Text style={styles.primaryButtonText}>Agregar a mi Calendario</Text>
          </TouchableOpacity>

          {(user?.role === "admin" || user?.id === event.created_by) && (
            <View style={styles.adminActions}>
              <TouchableOpacity 
                style={styles.secondaryButton} 
                onPress={() => navigation.navigate("CreateEvent", { event })}
              >
                <Ionicons name="create-outline" size={20} color="#3B82F6" style={{ marginRight: 8 }} />
                <Text style={styles.secondaryButtonText}>Editar</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.dangerButton} onPress={handleDeleteEvent}>
                <Ionicons name="trash-outline" size={20} color="#EF4444" style={{ marginRight: 8 }} />
                <Text style={styles.dangerButtonText}>Eliminar</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  heroSection: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 60, // Espacio extra para que la tarjeta flote arriba
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    alignItems: "flex-start",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  statusText: { fontSize: 12, fontWeight: "bold", textTransform: "uppercase" },
  title: { fontSize: 28, fontWeight: "900", color: "white", marginBottom: 8, lineHeight: 34 },
  floatingCardContainer: {
    paddingHorizontal: 20,
    marginTop: -40, // Sube la tarjeta para que pise el LinearGradient
  },
  floatingCard: {
    backgroundColor: "white",
    borderRadius: 24,
    padding: 20,
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  detailRow: { flexDirection: "row", alignItems: "center", marginVertical: 8 },
  detailIconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  detailContent: { flex: 1 },
  detailLabel: { fontSize: 12, color: "#6B7280", textTransform: "uppercase", fontWeight: "bold", marginBottom: 2 },
  detailValue: { fontSize: 16, fontWeight: "700", color: "#1F2937" },
  divider: { height: 1, backgroundColor: "#F3F4F6", marginVertical: 8 },
  section: { paddingHorizontal: 24, marginTop: 32 },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: "#1F2937", marginBottom: 16 },
  infoCard: {
    backgroundColor: "white",
    borderRadius: 24,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  descriptionText: { fontSize: 15, color: "#4B5563", lineHeight: 24 },
  infoRow: { flexDirection: "row", alignItems: "center", marginVertical: 8 },
  infoLabel: { fontSize: 12, color: "#6B7280", textTransform: "uppercase", fontWeight: "bold", marginBottom: 2 },
  infoValue: { fontSize: 15, fontWeight: "600", color: "#1F2937" },
  actionsContainer: { paddingHorizontal: 24, marginTop: 40 },
  primaryButton: {
    backgroundColor: "#3B82F6",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 20,
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 16,
  },
  primaryButtonText: { color: "white", fontSize: 16, fontWeight: "bold" },
  adminActions: { flexDirection: "row", justifyContent: "space-between" },
  secondaryButton: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 16,
    marginRight: 8,
  },
  secondaryButtonText: { color: "#3B82F6", fontSize: 15, fontWeight: "bold" },
  dangerButton: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 16,
    marginLeft: 8,
  },
  dangerButtonText: { color: "#EF4444", fontSize: 15, fontWeight: "bold" },
});

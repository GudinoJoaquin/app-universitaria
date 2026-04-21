import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  StatusBar,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { eventsService } from "../services/eventsService";
import styles from "../styles/EventDetailScreenStyle";

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
          onPress: () =>
            Alert.alert("Éxito", "Evento agregado a tu calendario"),
        },
      ]
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return {
      full: date.toLocaleDateString("es-ES", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
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
      return { status: "past", label: "EVENTO FINALIZADO", color: "#6B7280" };
    if (daysDiff <= 1)
      return { status: "urgent", label: "PRÓXIMAMENTE", color: "#DC2626" };
    if (daysDiff <= 7)
      return { status: "upcoming", label: "ESTA SEMANA", color: "#D97706" };
    return { status: "scheduled", label: "PROGRAMADO", color: "#059669" };
  };

  const eventDate = formatDate(event.date);
  const status = getEventStatus(event.date);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1E40AF" />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Header con información principal */}
        <View style={styles.heroSection}>
          <View style={styles.heroContent}>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: `${status.color}20` },
              ]}
            >
              <Text style={[styles.statusText, { color: status.color }]}>
                {status.label}
              </Text>
            </View>
            <Text style={styles.title}>{event.title}</Text>

            <View style={styles.heroDetails}>
              <View style={styles.detailRow}>
                <View style={styles.detailIcon} />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>FECHA</Text>
                  <Text style={styles.detailValue}>
                    {eventDate.day}, {eventDate.date}
                  </Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <View style={styles.detailIcon} />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>HORA</Text>
                  <Text style={styles.detailValue}>{eventDate.time}</Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <View style={styles.detailIcon} />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>UBICACIÓN</Text>
                  <Text style={styles.detailValue}>{event.location}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Contenido Principal */}
        <View style={styles.content}>
          {/* Descripción */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Descripción del Evento</Text>
            <View style={styles.descriptionCard}>
              <Text style={styles.description}>
                {event.description ||
                  "No hay descripción disponible para este evento."}
              </Text>
            </View>
          </View>

          {/* Información Detallada */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Información del Evento</Text>
            <View style={styles.infoCard}>
              <View style={styles.infoItem}>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>ORGANIZADOR</Text>
                  <Text style={styles.infoValue}>
                    {event.created_by_name || "Administración Universitaria"}
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.infoItem}>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>FECHA DE CREACIÓN</Text>
                  <Text style={styles.infoValue}>
                    {new Date(event.created_at).toLocaleDateString("es-ES", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.infoItem}>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>CATEGORÍA</Text>
                  <Text style={styles.infoValue}>
                    {event.type === "academico"
                      ? "Evento Académico"
                      : "Evento Universitario"}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Acciones */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Acciones</Text>
            <View style={styles.actionsCard}>
              <TouchableOpacity
                style={styles.calendarButton}
                onPress={handleAddToCalendar}
              >
                <View style={styles.buttonContent}>
                  <Text style={styles.calendarButtonTitle}>
                    Agregar a Calendario
                  </Text>
                  <Text style={styles.calendarButtonSubtitle}>
                    Guardar en tu agenda personal
                  </Text>
                </View>
              </TouchableOpacity>

              {(user?.role === "admin" || user?.id === event.created_by) && (
                <View style={styles.adminActions}>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() =>
                      navigation.navigate("CreateEvent", { event })
                    }
                  >
                    <View style={styles.buttonContent}>
                      <Text style={styles.editButtonTitle}>Editar Evento</Text>
                      <Text style={styles.editButtonSubtitle}>
                        Modificar información del evento
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={handleDeleteEvent}
                  >
                    <View style={styles.buttonContent}>
                      <Text style={styles.deleteButtonTitle}>
                        Eliminar Evento
                      </Text>
                      <Text style={styles.deleteButtonSubtitle}>
                        Eliminar permanentemente
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

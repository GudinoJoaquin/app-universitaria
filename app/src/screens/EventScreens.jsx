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
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { eventsService } from "../services/eventsService";
import styles from "../styles/EventScreenStyle";

export default function EventsScreen({ navigation }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user, logout } = useAuth();

  useEffect(() => {
    loadEvents();
  }, []);

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

  const getRoleDisplayName = (role) => {
    const roles = {
      admin: "Administrador",
      teacher: "Docente",
      student: "Estudiante",
    };
    return roles[role] || role;
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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.userInfo}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.name?.charAt(0)?.toUpperCase() || "U"}
              </Text>
            </View>
            <View style={styles.userDetails}>
              <Text style={styles.welcomeText}>Bienvenido</Text>
              <Text style={styles.userName}>{user?.name || "Usuario"}</Text>
              <Text style={styles.userRole}>
                {getRoleDisplayName(user?.role)}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Contenido Principal */}
      <View style={styles.content}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Eventos Universitarios</Text>
          <Text style={styles.sectionSubtitle}>
            Próximos eventos y actividades académicas
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
                    <Text style={styles.eventTitle}>{item.title}</Text>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: `${status.color}15` },
                      ]}
                    >
                      <Text
                        style={[styles.statusText, { color: status.color }]}
                      >
                        {status.label}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Línea divisora */}
                <View style={styles.divider} />

                {/* Detalles del evento */}
                <View style={styles.eventDetails}>
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>FECHA Y HORA</Text>
                    <Text style={styles.detailValue}>{day}</Text>
                    <Text style={styles.detailValue}>
                      {date} • {time}
                    </Text>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>UBICACIÓN</Text>
                    <Text style={styles.detailValue}>{item.location}</Text>
                  </View>

                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>ORGANIZADOR</Text>
                    <Text style={styles.detailValue}>
                      {item.created_by_name}
                    </Text>
                  </View>
                </View>

                {/* Descripción */}
                {item.description && (
                  <View style={styles.descriptionContainer}>
                    <Text style={styles.descriptionLabel}>DESCRIPCIÓN</Text>
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
              <View style={styles.emptyIllustration} />
              <Text style={styles.emptyTitle}>No hay eventos programados</Text>
              <Text style={styles.emptyDescription}>
                {user?.role === "admin" || user?.role === "teacher"
                  ? "Comienza creando el primer evento para la comunidad universitaria"
                  : "Los eventos aparecerán aquí cuando sean programados por los organizadores"}
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
          <Text style={styles.fabIcon}>+</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

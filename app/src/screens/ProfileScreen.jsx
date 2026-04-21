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
import styles from "../styles/ProfileScreenStyle";

export default function ProfileScreen({ navigation }) {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      "Cerrar Sesión",
      "¿Estás seguro de que quieres salir de la aplicación?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Salir",
          onPress: logout,
          style: "destructive",
        },
      ]
    );
  };

  const getRoleDisplayName = (role) => {
    const roles = {
      admin: "Administrador",
      teacher: "Docente",
      student: "Estudiante",
    };
    return roles[role] || role;
  };

  const getRoleColor = (role) => {
    const colors = {
      admin: "#DC2626",
      teacher: "#2563EB",
      student: "#16A34A",
    };
    return colors[role] || "#6B7280";
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1E40AF" />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header con información del usuario */}
        <View style={styles.heroSection}>
          <View style={styles.heroContent}>
            <View style={styles.avatarContainer}>
              <View
                style={[
                  styles.avatar,
                  { backgroundColor: getRoleColor(user?.role) },
                ]}
              >
                <Text style={styles.avatarText}>
                  {user?.name?.charAt(0)?.toUpperCase() || "U"}
                </Text>
              </View>
              <View
                style={[
                  styles.roleBadge,
                  { backgroundColor: getRoleColor(user?.role) },
                ]}
              >
                <Text style={styles.roleBadgeText}>
                  {getRoleDisplayName(user?.role)}
                </Text>
              </View>
            </View>

            <Text style={styles.userName}>{user?.name || "Usuario"}</Text>
            <Text style={styles.userEmail}>
              {user?.email || "usuario@universidad.edu"}
            </Text>
          </View>
        </View>

        {/* Información de la cuenta */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Información de la Cuenta</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>ROL DE USUARIO</Text>
                <Text style={styles.infoValue}>
                  {getRoleDisplayName(user?.role)}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>ESTADO DE CUENTA</Text>
                <Text style={[styles.infoValue, styles.statusActive]}>
                  Activa
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>FECHA DE REGISTRO</Text>
                <Text style={styles.infoValue}>
                  {new Date().toLocaleDateString("es-ES", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Acciones rápidas para administradores/docentes */}
        {(user?.role === "admin" || user?.role === "teacher") && (
          <View style={styles.actionsSection}>
            <Text style={styles.sectionTitle}>Acciones Rápidas</Text>
            <View style={styles.actionsCard}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() =>
                  navigation.navigate("CreateEvent", { event: null })
                }
              >
                <View style={styles.buttonContent}>
                  <Text style={styles.actionButtonTitle}>
                    Crear Nuevo Evento
                  </Text>
                  <Text style={styles.actionButtonSubtitle}>
                    Programar un nuevo evento universitario
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Información de la app y logout */}
        <View style={styles.footerSection}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

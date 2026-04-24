import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  StatusBar,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { decode } from "base64-arraybuffer";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../services/supabase";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

export default function ProfileScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(null);

  useEffect(() => {
    if (user?.avatar_url) {
      setAvatarUrl(user.avatar_url);
    }
  }, [user?.avatar_url]);

  const uploadAvatar = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (result.canceled) return;

      setUploading(true);
      const file = result.assets[0];
      const base64 = file.base64;

      const filePath = `${user.id}/avatar.png`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, decode(base64), {
          contentType: "image/png",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const newAvatarUrl = `${publicUrl}?t=${new Date().getTime()}`;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: newAvatarUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      setAvatarUrl(newAvatarUrl);
      Alert.alert("¡Listo!", "Tu foto de perfil se ha actualizado.");
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "No se pudo actualizar la foto de perfil.");
    } finally {
      setUploading(false);
    }
  };

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

  const getRoleInfo = (role) => {
    switch (role) {
      case "admin": return { name: "Administrador", emoji: "👑", color: "#EF4444", bg: "#FEE2E2" };
      case "teacher": return { name: "Docente", emoji: "👨‍🏫", color: "#3B82F6", bg: "#DBEAFE" };
      case "student": return { name: "Estudiante", emoji: "", color: "#4B5563", bg: "#F3F4F6" };
      default: return { name: role || "Usuario", emoji: "", color: "#6B7280", bg: "#F3F4F6" };
    }
  };

  const roleInfo = getRoleInfo(user?.role);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1E3A8A" />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header con información del usuario */}
        <LinearGradient colors={["#1E3A8A", "#3B82F6"]} style={styles.heroSection}>
          <View style={styles.heroContent}>
            <View style={styles.avatarContainer}>
              <TouchableOpacity onPress={uploadAvatar} disabled={uploading}>
                <View
                  style={[
                    styles.avatar,
                    !avatarUrl && { backgroundColor: roleInfo.color },
                  ]}
                >
                  {uploading ? (
                    <ActivityIndicator size="large" color="#ffffff" />
                  ) : avatarUrl ? (
                    <Image
                      source={{ uri: avatarUrl }}
                      style={styles.avatarImage}
                      contentFit="cover"
                      transition={200}
                    />
                  ) : (
                    <Text style={styles.avatarText}>
                      {user?.name?.charAt(0)?.toUpperCase() || "U"}
                    </Text>
                  )}
                  <View style={styles.editBadge}>
                    <Ionicons name="camera" size={16} color="#3B82F6" />
                  </View>
                </View>
              </TouchableOpacity>
              
              <View style={[styles.roleBadge, { backgroundColor: roleInfo.bg }]}>
                <Text style={[styles.roleBadgeText, { color: roleInfo.color }]}>
                  {roleInfo.emoji ? `${roleInfo.emoji} ` : ""}{roleInfo.name}
                </Text>
              </View>
            </View>

            <Text style={styles.userName}>{user?.name || "Usuario"}</Text>
            <Text style={styles.userEmail}>{user?.email || "usuario@universidad.edu"}</Text>
          </View>
        </LinearGradient>

        {/* Información de la cuenta */}
        <View style={styles.infoSection}>
          <Text style={styles.sectionTitle}>Mi Cuenta</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.iconBox}>
                <Ionicons name="shield-checkmark" size={24} color="#10B981" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Estado de Cuenta</Text>
                <Text style={styles.infoValueActive}>Activa y Verificada</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={styles.iconBox}>
                <Ionicons name="calendar" size={24} color="#6366F1" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Miembro desde</Text>
                <Text style={styles.infoValue}>
                  {new Date().toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Acciones rápidas para administradores/docentes */}
        {(user?.role === "admin" || user?.role === "teacher") && (
          <View style={styles.actionsSection}>
            <Text style={styles.sectionTitle}>Administración 🛠️</Text>
            <View style={styles.actionsCard}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => navigation.navigate("CreateEvent", { event: null })}
              >
                <View style={styles.actionIconBox}>
                  <Ionicons name="add-circle" size={28} color="#2563EB" />
                </View>
                <View style={styles.buttonContent}>
                  <Text style={styles.actionButtonTitle}>Crear Nuevo Evento</Text>
                  <Text style={styles.actionButtonSubtitle}>Programa una nueva actividad para la comunidad</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Información de la app y logout */}
        <View style={styles.footerSection}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="#EF4444" style={{marginRight: 8}} />
            <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
          </TouchableOpacity>
          <Text style={styles.versionText}>App Universidad v1.0.0</Text>
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
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 10,
  },
  heroContent: { alignItems: "center" },
  avatarContainer: { alignItems: "center", marginBottom: 20 },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 4,
    borderColor: "rgba(255,255,255,0.3)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  avatarImage: { width: "100%", height: "100%", borderRadius: 55 },
  avatarText: { color: "white", fontSize: 40, fontWeight: "bold" },
  editBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "white",
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  roleBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: -8,
  },
  roleBadgeText: { fontSize: 13, fontWeight: "bold", textTransform: "uppercase" },
  userName: { fontSize: 26, fontWeight: "bold", color: "white", marginBottom: 4, textAlign: "center" },
  userEmail: { fontSize: 15, color: "rgba(255, 255, 255, 0.8)", textAlign: "center" },
  infoSection: { paddingHorizontal: 24, paddingTop: 32 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#1F2937", marginBottom: 16 },
  infoCard: {
    backgroundColor: "white",
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  infoRow: { flexDirection: "row", padding: 20, alignItems: "center" },
  iconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#F3F4F6", justifyContent: "center", alignItems: "center", marginRight: 16 },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 12, color: "#6B7280", marginBottom: 4, textTransform: "uppercase", fontWeight: "600" },
  infoValue: { fontSize: 16, fontWeight: "600", color: "#1F2937" },
  infoValueActive: { fontSize: 16, fontWeight: "600", color: "#10B981" },
  divider: { height: 1, backgroundColor: "#F3F4F6", marginHorizontal: 20 },
  actionsSection: { paddingHorizontal: 24, paddingTop: 32 },
  actionsCard: {
    backgroundColor: "white",
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  actionButton: { flexDirection: "row", padding: 20, alignItems: "center" },
  actionIconBox: { width: 48, height: 48, borderRadius: 16, backgroundColor: "#EFF6FF", justifyContent: "center", alignItems: "center", marginRight: 16 },
  buttonContent: { flex: 1 },
  actionButtonTitle: { fontSize: 16, fontWeight: "bold", color: "#1F2937", marginBottom: 2 },
  actionButtonSubtitle: { fontSize: 13, color: "#6B7280" },
  footerSection: { paddingHorizontal: 24, paddingTop: 40, alignItems: "center" },
  logoutButton: {
    flexDirection: "row",
    backgroundColor: "#FEF2F2",
    width: "100%",
    paddingVertical: 16,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  logoutButtonText: { color: "#EF4444", fontSize: 16, fontWeight: "bold" },
  versionText: { color: "#9CA3AF", fontSize: 12, fontWeight: "500" },
});

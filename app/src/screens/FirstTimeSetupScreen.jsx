import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { decode } from "base64-arraybuffer";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../services/supabase";

export default function FirstTimeSetupScreen({ navigation }) {
  const { user, updateUserProfileLocally } = useAuth();
  
  // Dividir el nombre completo de Google en nombre y apellido como valor por defecto
  const fullName = user?.name || "";
  const nameParts = fullName.split(" ");
  const defaultFirstName = nameParts[0] || "";
  const defaultLastName = nameParts.slice(1).join(" ") || "";

  const [firstName, setFirstName] = useState(defaultFirstName);
  const [lastName, setLastName] = useState(defaultLastName);
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleUploadAvatar = async () => {
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

      setAvatarUrl(`${publicUrl}?t=${new Date().getTime()}`);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "No se pudo subir la foto.");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (isSkipping = false) => {
    // Si no está saltando, requerimos el nombre. Si salta, usamos lo que haya o el default.
    if (!isSkipping && (!firstName.trim() || !lastName.trim())) {
      Alert.alert("Campos incompletos", "Por favor ingresa tu nombre y apellido.");
      return;
    }

    setLoading(true);
    try {
      const updatedName = `${firstName.trim()} ${lastName.trim()}`.trim();

      // Usamos upsert por si el usuario borró el perfil manualmente pero no de auth.users
      const { error } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          email: user.email,
          role: 'student',
          name: updatedName,
          avatar_url: avatarUrl,
        });

      if (error) throw error;

      // Marcar que ya completó el setup en los metadatos de autenticación
      const { error: authError } = await supabase.auth.updateUser({
        data: { has_completed_setup: true }
      });

      if (authError) throw authError;

      // Actualizar el estado global en AuthContext inmediatamente para que la UI reaccione
      // sin depender del fetchProfileAndSetUser
      if (updateUserProfileLocally) {
        updateUserProfileLocally({
          name: updatedName,
          avatar_url: avatarUrl,
          has_completed_setup: true
        });
      }

      // AppNavigator redirigirá automáticamente sin mostrar alertas molestas

    } catch (error) {
      console.error(error);
      Alert.alert("Error", "No se pudieron guardar los cambios");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1E3A8A" />
      <LinearGradient colors={["#1E3A8A", "#3B82F6"]} style={styles.header}>
        <Ionicons name="sparkles" size={40} color="white" style={{ marginBottom: 16 }} />
        <Text style={styles.title}>¡Bienvenido/a!</Text>
        <Text style={styles.subtitle}>
          Por ser tu primera vez, por favor revisa y confirma tus datos personales.
        </Text>
      </LinearGradient>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.card}>
            {/* Selector de Avatar */}
            <View style={styles.avatarSection}>
              <TouchableOpacity onPress={handleUploadAvatar} disabled={uploading}>
                <View style={styles.avatarContainer}>
                  {uploading ? (
                    <ActivityIndicator size="large" color="#3B82F6" />
                  ) : avatarUrl ? (
                    <Image source={{ uri: avatarUrl }} style={styles.avatar} contentFit="cover" />
                  ) : (
                    <View style={[styles.avatar, styles.avatarPlaceholder]}>
                      <Text style={styles.avatarText}>{firstName.charAt(0) || "U"}</Text>
                    </View>
                  )}
                  <View style={styles.editBadge}>
                    <Ionicons name="camera" size={16} color="white" />
                  </View>
                </View>
              </TouchableOpacity>
              <Text style={styles.avatarHint}>Toca para cambiar tu foto</Text>
            </View>

            {/* Formulario */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nombre</Text>
              <TextInput
                style={styles.input}
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Tu nombre"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Apellido</Text>
              <TextInput
                style={styles.input}
                value={lastName}
                onChangeText={setLastName}
                placeholder="Tu apellido"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <TouchableOpacity
              style={[styles.saveButton, (!isSkippingEnabled && !firstName.trim() || loading) && styles.saveButtonDisabled]}
              onPress={() => handleSave(false)}
              disabled={(!firstName.trim() || loading)}
            >
              {loading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <>
                  <Text style={styles.saveButtonText}>Guardar y Continuar</Text>
                  <Ionicons name="arrow-forward" size={20} color="white" />
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.logoutButton}
              onPress={async () => {
                await supabase.auth.signOut();
              }}
              disabled={loading}
            >
              <Text style={styles.logoutButtonText}>Cerrar sesión o cancelar</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const isSkippingEnabled = true;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    alignItems: "center",
  },
  title: { fontSize: 28, fontWeight: "900", color: "white", marginBottom: 8 },
  subtitle: { fontSize: 15, color: "rgba(255,255,255,0.9)", textAlign: "center", lineHeight: 22 },
  scrollContent: { padding: 24, paddingBottom: 60 },
  card: {
    backgroundColor: "white",
    borderRadius: 24,
    padding: 24,
    marginTop: -40,
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  avatarSection: { alignItems: "center", marginBottom: 32 },
  avatarContainer: { position: "relative" },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#F3F4F6",
  },
  avatarPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#DBEAFE",
  },
  avatarText: { fontSize: 40, fontWeight: "bold", color: "#3B82F6" },
  editBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "#3B82F6",
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "white",
  },
  avatarHint: { fontSize: 13, color: "#6B7280", marginTop: 12 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: "700", color: "#4B5563", marginBottom: 8, textTransform: "uppercase" },
  input: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#1F2937",
  },
  saveButton: {
    backgroundColor: "#3B82F6",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 12,
  },
  saveButtonDisabled: { backgroundColor: "#93C5FD" },
  saveButtonText: { color: "white", fontSize: 16, fontWeight: "bold", marginRight: 8 },
  logoutButton: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: "center",
  },
  logoutButtonText: {
    color: "#EF4444",
    fontSize: 14,
    fontWeight: "600",
  },
});

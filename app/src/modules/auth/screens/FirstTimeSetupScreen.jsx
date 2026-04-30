import React, { useState, useEffect } from "react";
import {
  View, Text, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StatusBar
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { decode } from "base64-arraybuffer";
import { supabase } from "../../shared/services/supabase";
import { useAuth } from "../../auth/context/AuthContext";
import { LinearGradient } from "expo-linear-gradient";

export default function FirstTimeSetupScreen() {
  const { user, updateUserProfileLocally } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || null);

  useEffect(() => {
    if (user?.name) {
      const parts = user.name.split(" ");
      setFirstName(parts[0] || "");
      setLastName(parts.slice(1).join(" ") || "");
    }
  }, [user]);

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert("Campos incompletos", "Por favor ingresa tu nombre y apellido");
      return;
    }
    setLoading(true);
    try {
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
      
      // 1. Actualizar perfil en DB
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ name: fullName, avatar_url: avatarUrl })
        .eq("id", user.id);

      if (profileError) throw profileError;

      // 2. Marcar setup como completado en Auth Metadata
      const { error: authError } = await supabase.auth.updateUser({
        data: { has_completed_setup: true }
      });

      if (authError) throw authError;

      // 3. Actualizar localmente para que AppNavigator cambie de pantalla
      if (updateUserProfileLocally) {
        updateUserProfileLocally({
          name: fullName,
          avatar_url: avatarUrl,
          has_completed_setup: true
        });
      }
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  };

  const uploadAvatar = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (result.canceled) return;

      setUploading(true);
      const base64 = result.assets[0].base64;
      const filePath = `${user.id}/avatar_setup.png`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, decode(base64), { contentType: "image/png", upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(filePath);
      setAvatarUrl(publicUrl);
    } catch (e) {
      Alert.alert("Error", "No se pudo subir la imagen");
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={["#0F172A", "#1E3A8A"]} style={s.header}>
        <Ionicons name="sparkles" size={40} color="white" style={{ marginBottom: 12 }} />
        <Text style={s.title}>¡Bienvenido!</Text>
        <Text style={s.subtitle}>Configura tu perfil para empezar a usar la comunidad.</Text>
      </LinearGradient>

      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"} 
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={s.card}>
            <View style={s.avatarSection}>
              <TouchableOpacity onPress={uploadAvatar} style={s.avatarContainer} disabled={uploading}>
                <View style={s.avatarShadow}>
                  {avatarUrl ? (
                    <Image source={{ uri: avatarUrl }} style={s.avatar} contentFit="cover" />
                  ) : (
                    <View style={s.avatarPlaceholder}>
                      <Text style={s.avatarPlaceholderTxt}>{firstName?.[0]?.toUpperCase() || "U"}</Text>
                    </View>
                  )}
                </View>
                <View style={s.cameraIcon}>
                  {uploading ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Ionicons name="camera" size={16} color="white" />
                  )}
                </View>
              </TouchableOpacity>
              <Text style={s.avatarHint}>Toca para subir tu foto</Text>
            </View>

            <View style={s.form}>
              <View style={s.inputGroup}>
                <Text style={s.label}>Nombre</Text>
                <TextInput 
                  style={s.input}
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="Ej: Juan"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <View style={s.inputGroup}>
                <Text style={s.label}>Apellido</Text>
                <TextInput 
                  style={s.input}
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Ej: Pérez"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <View style={s.infoBox}>
                <Ionicons name="mail-outline" size={16} color="#94A3B8" />
                <Text style={s.infoBoxTxt}>{user?.email}</Text>
              </View>

              <TouchableOpacity 
                style={[s.saveBtn, loading && s.saveBtnDisabled]} 
                onPress={handleSave}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Text style={s.saveBtnTxt}>Completar Registro</Text>
                    <Ionicons name="arrow-forward" size={18} color="white" />
                  </>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={s.logoutBtn} 
                onPress={() => supabase.auth.signOut()}
              >
                <Text style={s.logoutBtnTxt}>Cancelar y salir</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: { 
    paddingTop: 60, 
    paddingBottom: 60, 
    paddingHorizontal: 24, 
    alignItems: "center" 
  },
  title: { fontSize: 32, fontWeight: "900", color: "white" },
  subtitle: { fontSize: 15, color: "rgba(255,255,255,0.7)", textAlign: "center", marginTop: 8, paddingHorizontal: 20 },
  
  scrollContent: { padding: 24, paddingBottom: 60 },
  card: {
    backgroundColor: "white",
    borderRadius: 32,
    padding: 24,
    marginTop: -40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },

  avatarSection: { alignItems: "center", marginBottom: 32 },
  avatarContainer: { position: "relative" },
  avatarShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  avatar: { width: 110, height: 110, borderRadius: 55, borderWidth: 4, borderColor: "white" },
  avatarPlaceholder: { 
    width: 110, 
    height: 110, 
    borderRadius: 55, 
    backgroundColor: "#6366F1", 
    justifyContent: "center", 
    alignItems: "center",
    borderWidth: 4,
    borderColor: "white"
  },
  avatarPlaceholderTxt: { fontSize: 40, fontWeight: "800", color: "white" },
  cameraIcon: { 
    position: "absolute", 
    bottom: 0, 
    right: 0, 
    backgroundColor: "#0F172A", 
    width: 34, 
    height: 34, 
    borderRadius: 17, 
    justifyContent: "center", 
    alignItems: "center",
    borderWidth: 3,
    borderColor: "white",
  },
  avatarHint: { fontSize: 13, color: "#94A3B8", marginTop: 12, fontWeight: "600" },

  form: { gap: 18 },
  inputGroup: { gap: 6 },
  label: { fontSize: 12, fontWeight: "800", color: "#64748B", textTransform: "uppercase", marginLeft: 4 },
  input: { 
    backgroundColor: "#F8FAFC", 
    borderRadius: 16, 
    paddingHorizontal: 16, 
    paddingVertical: 14, 
    fontSize: 16, 
    color: "#1E293B",
    fontWeight: "600",
    borderWidth: 1,
    borderColor: "#F1F5F9"
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F8FAFC",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  infoBoxTxt: { fontSize: 14, color: "#94A3B8", fontWeight: "500" },
  saveBtn: { 
    backgroundColor: "#0F172A", 
    paddingVertical: 18, 
    borderRadius: 18, 
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    marginTop: 8
  },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnTxt: { color: "white", fontSize: 16, fontWeight: "800" },
  logoutBtn: { paddingVertical: 12, alignItems: "center" },
  logoutBtnTxt: { color: "#EF4444", fontSize: 14, fontWeight: "700" }
});

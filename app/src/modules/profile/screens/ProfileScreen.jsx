/**
 * ProfileScreen — simplificado, sin shortcuts de dashboard (ahora están en tabs)
 */
import React, { useState, useEffect } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, Alert,
  StatusBar, ActivityIndicator, StyleSheet,
} from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { decode } from "base64-arraybuffer";
import { useAuth } from "../../auth/context/AuthContext";
import { supabase } from "../../shared/services/supabase";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const ROLE_CONFIG = {
  Admin:     { label: "Admin",       color: "#EF4444", bg: "#FEF2F2", emoji: "🛡️", grad: ["#7F1D1D", "#EF4444"] },
  Helper:    { label: "Helper",      color: "#8B5CF6", bg: "#F5F3FF", emoji: "🤝", grad: ["#4C1D95", "#8B5CF6"] },
  Organizer: { label: "Organizador", color: "#F59E0B", bg: "#FFFBEB", emoji: "📋", grad: ["#78350F", "#F59E0B"] },
  User:      { label: "Usuario",     color: "#3B82F6", bg: "#EFF6FF", emoji: "👤", grad: ["#1E3A8A", "#3B82F6"] },
};

export default function ProfileScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(null);

  useEffect(() => { if (user?.avatar_url) setAvatarUrl(user.avatar_url); }, [user?.avatar_url]);

  const uploadAvatar = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.5, base64: true,
      });
      if (result.canceled) return;
      setUploading(true);
      const base64 = result.assets[0].base64;
      const filePath = `${user.id}/avatar.png`;
      const { error: uploadError } = await supabase.storage
        .from("avatars").upload(filePath, decode(base64), { contentType: "image/png", upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const newUrl = `${publicUrl}?t=${Date.now()}`;
      await supabase.from("profiles").update({ avatar_url: newUrl }).eq("id", user.id);
      setAvatarUrl(newUrl);
      Alert.alert("✅", "Foto actualizada.");
    } catch {
      Alert.alert("Error", "No se pudo actualizar la foto.");
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert("Cerrar Sesión", "¿Estás seguro?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Salir", onPress: logout, style: "destructive" },
    ]);
  };

  const roleInfo = ROLE_CONFIG[user?.role] ?? ROLE_CONFIG.User;
  const states = user?.states ?? [];

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <LinearGradient colors={["#0F172A", "#1E293B"]} style={s.hero}>
          <TouchableOpacity onPress={uploadAvatar} disabled={uploading} style={s.avatarWrap}>
            <View style={s.avatar}>
              {uploading
                ? <ActivityIndicator size="large" color="white" />
                : avatarUrl
                  ? <Image source={{ uri: avatarUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
                  : <Text style={s.avatarTxt}>{user?.name?.charAt(0)?.toUpperCase() || "U"}</Text>}
            </View>
            <View style={s.cameraBadge}>
              <Ionicons name="camera" size={13} color={roleInfo.color} />
            </View>
          </TouchableOpacity>
          <Text style={s.userName}>{user?.name || "Usuario"}</Text>
          <Text style={s.userEmail}>{user?.email}</Text>

          {/* Rol */}
          <View style={s.rolePill}>
            <Text style={s.rolePillTxt}>{roleInfo.emoji} {roleInfo.label}</Text>
          </View>

          {/* Estados */}
          {states.length > 0 && (
            <View style={s.statesRow}>
              {states.map(st => (
                <View key={st.id} style={[s.stateBadge, { borderColor: `${st.color}80` }]}>
                  <View style={[s.stateDot, { backgroundColor: st.color }]} />
                  <Text style={[s.stateTxt, { color: st.color === "#FFFFFF" ? "#1F2937" : st.color }]}>{st.name}</Text>
                </View>
              ))}
            </View>
          )}
        </LinearGradient>

        {/* Cuenta */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Mi Cuenta</Text>
          <View style={s.card}>
            <View style={s.infoRow}>
              <View style={[s.iconBox, { backgroundColor: "#ECFDF5" }]}>
                <Ionicons name="shield-checkmark" size={20} color="#10B981" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.infoLabel}>Estado</Text>
                <Text style={[s.infoValue, { color: "#10B981" }]}>Activa y Verificada</Text>
              </View>
            </View>
            <View style={s.divider} />
            <View style={s.infoRow}>
              <View style={[s.iconBox, { backgroundColor: roleInfo.bg }]}>
                <Ionicons name="person-circle" size={20} color={roleInfo.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.infoLabel}>Rol</Text>
                <Text style={s.infoValue}>{roleInfo.emoji} {roleInfo.label}</Text>
              </View>
            </View>
            {states.length > 0 && (
              <>
                <View style={s.divider} />
                <View style={s.infoRow}>
                  <View style={[s.iconBox, { backgroundColor: "#FEF3C7" }]}>
                    <Ionicons name="layers" size={20} color="#F59E0B" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.infoLabel}>Estados</Text>
                    <Text style={s.infoValue}>{states.map(s => s.name).join(" · ")}</Text>
                  </View>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Ajustes */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Ajustes</Text>
          <View style={s.card}>
            <TouchableOpacity style={s.infoRow} onPress={uploadAvatar}>
              <View style={[s.iconBox, { backgroundColor: "#EFF6FF" }]}>
                <Ionicons name="image" size={20} color="#3B82F6" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.actionTitle}>Cambiar foto de perfil</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Cerrar sesión */}
        <View style={s.section}>
          <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="#EF4444" />
            <Text style={s.logoutTxt}>Cerrar Sesión</Text>
          </TouchableOpacity>
          <Text style={s.version}>App Universidad · v1.0</Text>
        </View>

      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  hero: { alignItems: "center", paddingTop: 70, paddingBottom: 40, paddingHorizontal: 20, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, elevation: 15, shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 20 },
  avatarWrap: { marginBottom: 18, position: "relative", elevation: 12, shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 15 },
  avatar: { width: 110, height: 110, borderRadius: 55, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center", borderWidth: 4, borderColor: "rgba(255,255,255,0.4)", overflow: "hidden" },
  avatarTxt: { color: "white", fontSize: 44, fontWeight: "900", letterSpacing: -1 },
  cameraBadge: { position: "absolute", bottom: 2, right: 2, backgroundColor: "white", width: 32, height: 32, borderRadius: 16, justifyContent: "center", alignItems: "center", elevation: 8, shadowColor: "#000", shadowOpacity: 0.2 },
  userName: { fontSize: 26, fontWeight: "900", color: "white", marginBottom: 6, letterSpacing: -0.5 },
  userEmail: { fontSize: 14, color: "rgba(255,255,255,0.8)", marginBottom: 15, fontWeight: "500" },
  rolePill: { backgroundColor: "rgba(255,255,255,0.25)", paddingHorizontal: 16, paddingVertical: 6, borderRadius: 25, marginBottom: 15, borderWidth: 1, borderColor: "rgba(255,255,255,0.3)" },
  rolePillTxt: { color: "white", fontSize: 14, fontWeight: "800", textTransform: "uppercase" },
  statesRow: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8 },
  stateBadge: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,0.15)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 18, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" },
  stateDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  stateTxt: { fontSize: 13, fontWeight: "700", color: "white" },
  
  section: { paddingHorizontal: 22, paddingTop: 28 },
  sectionTitle: { fontSize: 14, fontWeight: "900", color: "#64748B", textTransform: "uppercase", marginBottom: 14, letterSpacing: 1.2, marginLeft: 4 },
  card: { backgroundColor: "white", borderRadius: 28, elevation: 5, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 15, overflow: "hidden" },
  infoRow: { flexDirection: "row", alignItems: "center", padding: 18 },
  iconBox: { width: 48, height: 48, borderRadius: 16, justifyContent: "center", alignItems: "center", marginRight: 15 },
  infoLabel: { fontSize: 11, color: "#94A3B8", fontWeight: "800", textTransform: "uppercase", marginBottom: 3 },
  infoValue: { fontSize: 16, fontWeight: "800", color: "#1E293B" },
  actionTitle: { fontSize: 16, fontWeight: "700", color: "#1E293B" },
  divider: { height: 1.5, backgroundColor: "#F1F5F9", marginHorizontal: 18 },
  
  logoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: "#FFF1F2", paddingVertical: 20, borderRadius: 24, marginBottom: 15, borderWidth: 1, borderColor: "#FFE4E6" },
  logoutTxt: { color: "#E11D48", fontSize: 17, fontWeight: "900" },
  version: { textAlign: "center", color: "#CBD5E1", fontSize: 13, fontWeight: "600", paddingBottom: 40 },
});




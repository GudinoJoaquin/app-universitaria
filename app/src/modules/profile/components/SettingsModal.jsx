import React, { useState, useEffect } from "react";
import {
  View, Text, Modal, TouchableOpacity, TextInput,
  StyleSheet, Pressable, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { decode } from "base64-arraybuffer";
import { supabase } from "../../shared/services/supabase";

export default function SettingsModal({ visible, onClose, user, onUpdate }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (visible && user?.name) {
      const parts = user.name.split(" ");
      setFirstName(parts[0] || "");
      setLastName(parts.slice(1).join(" ") || "");
    }
  }, [visible, user]);

  const handleSave = async () => {
    if (!firstName.trim()) {
      Alert.alert("Error", "El nombre es obligatorio");
      return;
    }
    setLoading(true);
    try {
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
      const { error } = await supabase
        .from("profiles")
        .update({ name: fullName })
        .eq("id", user.id);

      if (error) throw error;
      onUpdate({ ...user, name: fullName });
      onClose();
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
      const filePath = `${user.id}/avatar_${Date.now()}.png`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, decode(base64), { contentType: "image/png", upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(filePath);
      
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      onUpdate({ ...user, avatar_url: publicUrl });
    } catch (e) {
      Alert.alert("Error", "No se pudo subir la imagen");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"} 
        style={{ flex: 1 }}
      >
        <View style={s.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
          <View style={s.sheet}>
            <View style={s.handle} />
            
            <View style={s.header}>
              <Text style={s.title}>Ajustes de Perfil</Text>
              <TouchableOpacity onPress={onClose} style={s.closeBtn}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              <View style={s.avatarSection}>
                <TouchableOpacity onPress={uploadAvatar} style={s.avatarContainer} disabled={uploading}>
                  <View style={s.avatarShadow}>
                    {user?.avatar_url ? (
                      <Image source={{ uri: user.avatar_url }} style={s.avatar} contentFit="cover" />
                    ) : (
                      <View style={s.avatarPlaceholder}>
                        <Text style={s.avatarPlaceholderTxt}>{firstName?.[0]?.toUpperCase() || "?"}</Text>
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
              </View>

              <View style={s.form}>
                <View style={s.row}>
                  <View style={[s.inputGroup, { flex: 1 }]}>
                    <Text style={s.label}>Nombre</Text>
                    <TextInput 
                      style={s.input}
                      value={firstName}
                      onChangeText={setFirstName}
                      placeholder="Ej: Juan"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                  <View style={[s.inputGroup, { flex: 1 }]}>
                    <Text style={s.label}>Apellido</Text>
                    <TextInput 
                      style={s.input}
                      value={lastName}
                      onChangeText={setLastName}
                      placeholder="Ej: Pérez"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
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
                  {loading ? <ActivityIndicator color="white" /> : <Text style={s.saveBtnTxt}>Guardar cambios</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.6)", justifyContent: "flex-end" },
  sheet: { 
    backgroundColor: "white", 
    borderTopLeftRadius: 32, 
    borderTopRightRadius: 32, 
    padding: 24, 
    paddingTop: 12,
    maxHeight: "90%"
  },
  handle: { 
    width: 40, 
    height: 4, 
    backgroundColor: "#E2E8F0", 
    borderRadius: 2, 
    alignSelf: "center", 
    marginBottom: 20 
  },
  header: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center", 
    marginBottom: 20 
  },
  title: { fontSize: 20, fontWeight: "800", color: "#1E293B" },
  closeBtn: { 
    width: 36, 
    height: 36, 
    borderRadius: 18, 
    backgroundColor: "#F1F5F9", 
    justifyContent: "center", 
    alignItems: "center" 
  },
  
  avatarSection: { alignItems: "center", marginBottom: 24 },
  avatarContainer: { position: "relative" },
  avatarShadow: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  avatar: { width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: "white" },
  avatarPlaceholder: { 
    width: 90, 
    height: 90, 
    borderRadius: 45, 
    backgroundColor: "#6366F1", 
    justifyContent: "center", 
    alignItems: "center",
    borderWidth: 3,
    borderColor: "white"
  },
  avatarPlaceholderTxt: { fontSize: 32, fontWeight: "800", color: "white" },
  cameraIcon: { 
    position: "absolute", 
    bottom: 0, 
    right: 0, 
    backgroundColor: "#0F172A", 
    width: 30, 
    height: 30, 
    borderRadius: 15, 
    justifyContent: "center", 
    alignItems: "center",
    borderWidth: 2,
    borderColor: "white",
  },

  form: { gap: 16 },
  row: { flexDirection: "row", gap: 12 },
  inputGroup: { gap: 6 },
  label: { fontSize: 12, fontWeight: "800", color: "#64748B", textTransform: "uppercase", marginLeft: 4 },
  input: { 
    backgroundColor: "#F8FAFC", 
    borderRadius: 14, 
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    fontSize: 15, 
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
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  infoBoxTxt: { fontSize: 13, color: "#94A3B8", fontWeight: "500" },
  saveBtn: { 
    backgroundColor: "#0F172A", 
    paddingVertical: 16, 
    borderRadius: 16, 
    alignItems: "center",
    marginTop: 8
  },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnTxt: { color: "white", fontSize: 15, fontWeight: "800" },
});

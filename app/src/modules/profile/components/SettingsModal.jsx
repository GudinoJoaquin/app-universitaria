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
import { useAuth } from "../../auth/context/AuthContext";

export default function SettingsModal({ visible, onClose, user, onUpdate }) {
  const { logout } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [provider, setProvider] = useState("email");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session?.user?.app_metadata?.provider) {
        setProvider(data.session.user.app_metadata.provider);
      }
    });
  }, []);

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
    if (showPasswordSection && (currentPassword || newPassword || confirmPassword)) {
      if (!currentPassword) {
        Alert.alert("Error", "Debes ingresar tu contraseña actual para hacer cambios.");
        return;
      }
      if (!newPassword) {
        Alert.alert("Error", "Debes ingresar una nueva contraseña.");
        return;
      }
      if (newPassword !== confirmPassword) {
        Alert.alert("Error", "Las contraseñas nuevas no coinciden.");
        return;
      }
      if (newPassword.length < 6) {
        Alert.alert("Error", "La nueva contraseña debe tener al menos 6 caracteres.");
        return;
      }
    }
    setLoading(true);
    try {
      if (showPasswordSection && newPassword) {
        // Verificar la contraseña actual haciendo un login silencioso
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: user.email,
          password: currentPassword,
        });

        if (signInError) {
          throw new Error("La contraseña actual es incorrecta.");
        }

        // Si es correcta, actualizar a la nueva
        const { error: pwdError } = await supabase.auth.updateUser({ password: newPassword });
        if (pwdError) throw pwdError;
      }

      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
      const { error } = await supabase
        .from("profiles")
        .update({ name: fullName })
        .eq("id", user.id);

      if (error) throw error;

      if (showPasswordSection && newPassword) {
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setShowPasswordSection(false);
        Alert.alert("¡Éxito!", "La contraseña ha sido actualizada correctamente.");
      }

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

                {provider === "email" && (
                  <View style={s.passwordSection}>
                    <TouchableOpacity 
                      style={s.passwordToggle} 
                      onPress={() => setShowPasswordSection(!showPasswordSection)}
                      activeOpacity={0.7}
                    >
                      <View style={s.passwordToggleLeft}>
                        <Ionicons name="lock-closed-outline" size={18} color="#6366F1" />
                        <Text style={s.passwordToggleTxt}>Cambiar contraseña</Text>
                      </View>
                      <Ionicons name={showPasswordSection ? "chevron-up" : "chevron-down"} size={18} color="#94A3B8" />
                    </TouchableOpacity>

                    {showPasswordSection && (
                      <View style={s.passwordFields}>
                        <View style={s.inputGroup}>
                          <Text style={s.label}>Contraseña actual</Text>
                          <View style={s.passwordInputWrap}>
                            <TextInput 
                              style={s.inputWithIcon}
                              value={currentPassword}
                              onChangeText={setCurrentPassword}
                              placeholder="Tu contraseña actual"
                              placeholderTextColor="#94A3B8"
                              secureTextEntry={!showCurrentPwd}
                            />
                            <TouchableOpacity style={s.eyeIcon} onPress={() => setShowCurrentPwd(!showCurrentPwd)}>
                              <Ionicons name={showCurrentPwd ? "eye-off" : "eye"} size={20} color="#94A3B8" />
                            </TouchableOpacity>
                          </View>
                        </View>
                        <View style={s.inputGroup}>
                          <Text style={s.label}>Nueva contraseña</Text>
                          <View style={s.passwordInputWrap}>
                            <TextInput 
                              style={s.inputWithIcon}
                              value={newPassword}
                              onChangeText={setNewPassword}
                              placeholder="Mínimo 6 caracteres"
                              placeholderTextColor="#94A3B8"
                              secureTextEntry={!showNewPwd}
                            />
                            <TouchableOpacity style={s.eyeIcon} onPress={() => setShowNewPwd(!showNewPwd)}>
                              <Ionicons name={showNewPwd ? "eye-off" : "eye"} size={20} color="#94A3B8" />
                            </TouchableOpacity>
                          </View>
                        </View>
                        <View style={s.inputGroup}>
                          <Text style={s.label}>Confirmar contraseña</Text>
                          <View style={s.passwordInputWrap}>
                            <TextInput 
                              style={s.inputWithIcon}
                              value={confirmPassword}
                              onChangeText={setConfirmPassword}
                              placeholder="Repite la nueva contraseña"
                              placeholderTextColor="#94A3B8"
                              secureTextEntry={!showConfirmPwd}
                            />
                            <TouchableOpacity style={s.eyeIcon} onPress={() => setShowConfirmPwd(!showConfirmPwd)}>
                              <Ionicons name={showConfirmPwd ? "eye-off" : "eye"} size={20} color="#94A3B8" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    )}
                  </View>
                )}

                <TouchableOpacity 
                  style={[s.saveBtn, loading && s.saveBtnDisabled]} 
                  onPress={handleSave}
                  disabled={loading}
                >
                  {loading ? <ActivityIndicator color="white" /> : <Text style={s.saveBtnTxt}>Guardar cambios</Text>}
                </TouchableOpacity>

                <TouchableOpacity 
                  style={s.logoutBtn} 
                  onPress={() => {
                    Alert.alert("Cerrar Sesión", "¿Salir?", [
                      { text: "No", style: "cancel" }, 
                      { text: "Sí", onPress: logout, style: "destructive" }
                    ]);
                  }}
                >
                  <Ionicons name="log-out-outline" size={20} color="#EF4444" />
                  <Text style={s.logoutTxt}>Cerrar Sesión</Text>
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
  passwordInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC", 
    borderRadius: 14, 
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  inputWithIcon: {
    flex: 1,
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    fontSize: 15, 
    color: "#1E293B",
    fontWeight: "600",
  },
  eyeIcon: {
    padding: 12,
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
  
  passwordSection: {
    backgroundColor: "white",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
  },
  passwordToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    backgroundColor: "#F8FAFC",
  },
  passwordToggleLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  passwordToggleTxt: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E293B",
  },
  passwordFields: {
    padding: 14,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  
  saveBtn: { 
    backgroundColor: "#0F172A", 
    paddingVertical: 16, 
    borderRadius: 16, 
    alignItems: "center",
    marginTop: 8
  },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnTxt: { color: "white", fontSize: 15, fontWeight: "800" },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEF2F2",
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#FEE2E2",
  },
  logoutTxt: { color: "#EF4444", fontSize: 15, fontWeight: "800" },
});

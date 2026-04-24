import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import styles from "../styles/RegisterScreenStyle";

export default function RegisterScreen({ navigation }) {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [focusedInput, setFocusedInput] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const loginContext = useAuth();

  const validateForm = () => {
    const newErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = "El nombre es requerido";
    } else if (formData.firstName.trim().length < 2) {
      newErrors.firstName = "El nombre debe tener al menos 2 caracteres";
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = "El apellido es requerido";
    } else if (formData.lastName.trim().length < 2) {
      newErrors.lastName = "El apellido debe tener al menos 2 caracteres";
    }

    if (!formData.email.trim()) {
      newErrors.email = "El email es requerido";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "El email no es válido";
    }

    if (!formData.password) {
      newErrors.password = "La contraseña es requerida";
    } else if (formData.password.length < 6) {
      newErrors.password = "La contraseña debe tener al menos 6 caracteres";
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Las contraseñas no coinciden";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const fullName = `${formData.firstName.trim()} ${formData.lastName.trim()}`;
      const result = await loginContext.register(
        fullName, 
        formData.email.toLowerCase().trim(), 
        formData.password
      );

      if (result.success) {
        if (result.session) {
          // Supabase auto-loguea al usuario si no hay confirmación de email.
          // AppNavigator detectará el cambio en AuthContext y cambiará de pantalla automáticamente.
          // No hacemos nada para evitar errores de navegación manual.
        } else {
          Alert.alert(
            "¡Registro Exitoso!",
            "Tu cuenta ha sido creada correctamente. Ya puedes iniciar sesión.",
            [
              {
                text: "OK",
                onPress: () => {
                  navigation.navigate("Login");
                },
              },
            ]
          );
        }
      } else {
        Alert.alert("Error", result.message || "Error en el registro");
      }
    } catch (error) {
      console.error(" Error completo en registro:", error);
      Alert.alert("Error", error.message || "Error en el registro");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    // Limpiar error del campo cuando el usuario escribe
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: "",
      }));
    }
  };

  const getInputStyle = (fieldName) => {
    const style = [styles.input];
    if (focusedInput === fieldName) {
      style.push(styles.inputFocused);
    }
    if (errors[fieldName]) {
      style.push(styles.inputError);
    }
    return style;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Creando tu cuenta...</Text>
      </View>
    );
  }

  return (
    <LinearGradient colors={["#0f172a", "#1e3a8a", "#3b82f6"]} style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 40, paddingBottom: 60 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Botón flotante para volver (solo en pantallas con navegación) */}
          {navigation.canGoBack() && (
            <TouchableOpacity 
              style={{ position: "absolute", top: 40, left: 24, zIndex: 10, width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.2)", justifyContent: "center", alignItems: "center" }}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
          )}

          {/* Header */}
          <View style={{ alignItems: "center", marginBottom: 32, marginTop: 60 }}>
            <View style={{ backgroundColor: "rgba(255,255,255,0.2)", padding: 16, borderRadius: 50, marginBottom: 16 }}>
              <Ionicons name="person-add" size={48} color="white" />
            </View>
            <Text style={{ fontSize: 32, fontWeight: "bold", color: "white", textAlign: "center" }}>
              Crear Cuenta
            </Text>
            <Text style={{ color: "#BFDBFE", textAlign: "center", marginTop: 8, fontSize: 16 }}>
              Únete a la comunidad de Eventos
            </Text>
          </View>

          {/* Formulario */}
          <View style={{ backgroundColor: "white", borderRadius: 24, padding: 24, shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 15, elevation: 10, marginBottom: 24 }}>
            <Text style={{ fontSize: 20, fontWeight: "bold", color: "#1F2937", marginBottom: 24, textAlign: "center", borderBottomWidth: 1, borderBottomColor: "#F3F4F6", paddingBottom: 16 }}>
              Información Personal
            </Text>

            {/* Campo Nombre */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Nombre</Text>
              <TextInput
                style={getInputStyle("firstName")}
                placeholder="Ej. Juan"
                placeholderTextColor="#9CA3AF"
                value={formData.firstName}
                onChangeText={(value) => handleChange("firstName", value)}
                onFocus={() => setFocusedInput("firstName")}
                onBlur={() => setFocusedInput(null)}
                editable={!loading}
              />
              {errors.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}
            </View>

            {/* Campo Apellido */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Apellido</Text>
              <TextInput
                style={getInputStyle("lastName")}
                placeholder="Ej. Pérez"
                placeholderTextColor="#9CA3AF"
                value={formData.lastName}
                onChangeText={(value) => handleChange("lastName", value)}
                onFocus={() => setFocusedInput("lastName")}
                onBlur={() => setFocusedInput(null)}
                editable={!loading}
              />
              {errors.lastName && <Text style={styles.errorText}>{errors.lastName}</Text>}
            </View>

            {/* Campo Email */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Correo Electrónico</Text>
              <TextInput
                style={getInputStyle("email")}
                placeholder="tu.correo@universidad.edu"
                placeholderTextColor="#9CA3AF"
                value={formData.email}
                onChangeText={(value) => handleChange("email", value)}
                onFocus={() => setFocusedInput("email")}
                onBlur={() => setFocusedInput(null)}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!loading}
              />
              {errors.email && (
                <Text style={styles.errorText}>{errors.email}</Text>
              )}
            </View>

            {/* Campo Contraseña */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Contraseña</Text>
              <View style={[
                { flexDirection: "row", alignItems: "center", backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 16, paddingRight: 16 },
                focusedInput === "password" && { borderColor: "#3B82F6", backgroundColor: "#EFF6FF" },
                errors.password && { borderColor: "#EF4444", backgroundColor: "#FEF2F2" }
              ]}>
                <TextInput
                  style={[styles.input, { flex: 1, borderWidth: 0, backgroundColor: "transparent" }]}
                  placeholder="Mínimo 6 caracteres"
                  placeholderTextColor="#9CA3AF"
                  value={formData.password}
                  onChangeText={(value) => handleChange("password", value)}
                  onFocus={() => setFocusedInput("password")}
                  onBlur={() => setFocusedInput(null)}
                  secureTextEntry={!showPassword}
                  editable={!loading}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 4 }}>
                  <Ionicons name={showPassword ? "eye-off" : "eye"} size={22} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
              {errors.password && (
                <Text style={styles.errorText}>{errors.password}</Text>
              )}
            </View>

            {/* Campo Confirmar Contraseña */}
            <View style={{ marginBottom: 32 }}>
              <Text style={styles.label}>Confirmar contraseña</Text>
              <View style={[
                { flexDirection: "row", alignItems: "center", backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 16, paddingRight: 16 },
                focusedInput === "confirmPassword" && { borderColor: "#3B82F6", backgroundColor: "#EFF6FF" },
                (errors.confirmPassword || (formData.confirmPassword.length > 0 && formData.password !== formData.confirmPassword)) && { borderColor: "#EF4444", backgroundColor: "#FEF2F2" }
              ]}>
                <TextInput
                  style={[styles.input, { flex: 1, borderWidth: 0, backgroundColor: "transparent" }]}
                  placeholder="Repite tu contraseña"
                  placeholderTextColor="#9CA3AF"
                  value={formData.confirmPassword}
                  onChangeText={(value) => handleChange("confirmPassword", value)}
                  onFocus={() => setFocusedInput("confirmPassword")}
                  onBlur={() => setFocusedInput(null)}
                  secureTextEntry={!showConfirmPassword}
                  editable={!loading}
                />
                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={{ padding: 4 }}>
                  <Ionicons name={showConfirmPassword ? "eye-off" : "eye"} size={22} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
              {(errors.confirmPassword || (formData.confirmPassword.length > 0 && formData.password !== formData.confirmPassword)) && (
                <Text style={[styles.errorText, {color: "#EF4444", marginTop: 4, marginLeft: 4}]}>Las contraseñas no coinciden</Text>
              )}
            </View>

            {/* Botón de Registro */}
            <TouchableOpacity
              style={[
                { backgroundColor: "#2563EB", paddingVertical: 16, borderRadius: 16, alignItems: "center", flexDirection: "row", justifyContent: "center" },
                (loading || !formData.firstName || !formData.lastName || !formData.email || !formData.password || formData.password !== formData.confirmPassword || !/\S+@\S+\.\S+/.test(formData.email)) && { backgroundColor: "#93C5FD", opacity: 0.8 }
              ]}
              onPress={handleRegister}
              disabled={loading || !formData.firstName || !formData.lastName || !formData.email || !formData.password || formData.password !== formData.confirmPassword || !/\S+@\S+\.\S+/.test(formData.email)}
            >
              <Text style={{ color: "white", fontSize: 18, fontWeight: "bold", marginRight: 8 }}>
                {loading ? "Creando cuenta..." : "Crear cuenta"}
              </Text>
              {!loading && <Ionicons name="person-add" size={20} color="white" />}
            </TouchableOpacity>

            <View style={{ flexDirection: "row", alignItems: "center", marginVertical: 24 }}>
              <View style={{ flex: 1, height: 1, backgroundColor: "#E5E7EB" }} />
              <Text style={{ marginHorizontal: 16, color: "#9CA3AF", fontWeight: "500" }}>O usa</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: "#E5E7EB" }} />
            </View>

            <TouchableOpacity
              style={{ backgroundColor: "white", paddingVertical: 16, borderRadius: 16, alignItems: "center", flexDirection: "row", justifyContent: "center", borderWidth: 1, borderColor: "#E5E7EB" }}
              onPress={async () => {
                const res = await loginContext.loginWithGoogle();
                if(!res.success) Alert.alert("Aviso", res.message);
              }}
              disabled={loading}
            >
              <Ionicons name="logo-google" size={20} color="#DB4437" />
              <Text style={{ color: "#374151", fontSize: 16, fontWeight: "bold", marginLeft: 12 }}>
                Registrarse con Google
              </Text>
            </TouchableOpacity>

            {/* Enlace para login */}
            <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 32 }}>
              <Text style={{ color: "#6B7280", fontSize: 14 }}>¿Ya tienes cuenta? </Text>
              <TouchableOpacity onPress={() => navigation.navigate("Login")} disabled={loading}>
                <Text style={{ color: "#2563EB", fontSize: 14, fontWeight: "bold" }}>Inicia sesión aquí</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

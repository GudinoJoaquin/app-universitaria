import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import styles from "../styles/LoginScreenStyle";

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null);
  const [errors, setErrors] = useState({});
  const { login, loginWithGoogle, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);

  const validateForm = () => {
    const newErrors = {};

    if (!email.trim()) {
      newErrors.email = "El email es requerido";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "El email no es válido";
    }

    if (!password) {
      newErrors.password = "La contraseña es requerida";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      console.log("Iniciando login con:", { email, password });

      const result = await login(email, password);

      console.log("Resultado del login:", result);

      if (!result.success) {
        Alert.alert("Error", result.message || "Credenciales incorrectas");
      }
      // La navegación se maneja automáticamente en el AuthContext
    } catch (error) {
      console.error("Error en login:", error);
      Alert.alert("Error", "Error de conexión con el servidor");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    if (field === "email") setEmail(value);
    if (field === "password") setPassword(value);

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

  const isLoading = loading || authLoading;

  return (
    <LinearGradient
      colors={["#0f172a", "#1e3a8a", "#3b82f6"]}
      style={{ flex: 1 }}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            padding: 24,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View
            style={{ alignItems: "center", marginBottom: 40, marginTop: 40 }}
          >
            <View
              style={{
                backgroundColor: "rgba(255,255,255,0.2)",
                padding: 16,
                borderRadius: 50,
                marginBottom: 16,
              }}
            >
              <Ionicons name="school" size={48} color="white" />
            </View>
            <Text
              style={{
                fontSize: 32,
                fontWeight: "bold",
                color: "white",
                textAlign: "center",
              }}
            >
              Eventos Universidad
            </Text>
            <Text
              style={{
                color: "#BFDBFE",
                textAlign: "center",
                marginTop: 8,
                fontSize: 16,
              }}
            >
              Conecta con tu comunidad académica
            </Text>
          </View>

          {/* Formulario */}
          <View
            style={{
              backgroundColor: "white",
              borderRadius: 24,
              padding: 24,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.2,
              shadowRadius: 15,
              elevation: 10,
            }}
          >
            <Text
              style={{
                fontSize: 24,
                fontWeight: "bold",
                color: "#1F2937",
                marginBottom: 24,
                textAlign: "center",
              }}
            >
              Bienvenido de nuevo
            </Text>

            {/* Campo Email */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Correo Electrónico</Text>
              <TextInput
                style={getInputStyle("email")}
                placeholder="tu.correo@universidad.edu"
                placeholderTextColor="#9CA3AF"
                value={email}
                onChangeText={(value) => handleChange("email", value)}
                onFocus={() => setFocusedInput("email")}
                onBlur={() => setFocusedInput(null)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                editable={!isLoading}
              />
              {errors.email && (
                <Text style={styles.errorText}>{errors.email}</Text>
              )}
            </View>

            {/* Campo Contraseña */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Contraseña</Text>
              <View
                style={[
                  {
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: "#F9FAFB",
                    borderWidth: 1,
                    borderColor: "#E5E7EB",
                    borderRadius: 16,
                    paddingRight: 16,
                  },
                  focusedInput === "password" && {
                    borderColor: "#3B82F6",
                    backgroundColor: "#EFF6FF",
                  },
                  errors.password && {
                    borderColor: "#EF4444",
                    backgroundColor: "#FEF2F2",
                  },
                ]}
              >
                <TextInput
                  style={[
                    styles.input,
                    { flex: 1, borderWidth: 0, backgroundColor: "transparent" },
                  ]}
                  placeholder="••••••••"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={(value) => handleChange("password", value)}
                  onFocus={() => setFocusedInput("password")}
                  onBlur={() => setFocusedInput(null)}
                  autoComplete="password"
                  editable={!isLoading}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={{ padding: 4 }}
                >
                  <Ionicons
                    name={showPassword ? "eye-off" : "eye"}
                    size={22}
                    color="#9CA3AF"
                  />
                </TouchableOpacity>
              </View>
              {errors.password && (
                <Text style={styles.errorText}>{errors.password}</Text>
              )}
            </View>

            {/* Botón de Login */}
            <TouchableOpacity
              style={[
                {
                  backgroundColor: "#2563EB",
                  paddingVertical: 16,
                  borderRadius: 16,
                  alignItems: "center",
                  flexDirection: "row",
                  justifyContent: "center",
                },
                (isLoading ||
                  !email ||
                  !password ||
                  !/\S+@\S+\.\S+/.test(email)) && {
                  backgroundColor: "#93C5FD",
                  opacity: 0.8,
                },
              ]}
              onPress={handleLogin}
              disabled={
                isLoading || !email || !password || !/\S+@\S+\.\S+/.test(email)
              }
            >
              {isLoading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <>
                  <Text
                    style={{
                      color: "white",
                      fontSize: 18,
                      fontWeight: "bold",
                      marginRight: 8,
                    }}
                  >
                    Ingresar
                  </Text>
                  <Ionicons name="arrow-forward" size={20} color="white" />
                </>
              )}
            </TouchableOpacity>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginVertical: 24,
              }}
            >
              <View
                style={{ flex: 1, height: 1, backgroundColor: "#E5E7EB" }}
              />
              <Text
                style={{
                  marginHorizontal: 16,
                  color: "#9CA3AF",
                  fontWeight: "500",
                }}
              >
                O continúa con
              </Text>
              <View
                style={{ flex: 1, height: 1, backgroundColor: "#E5E7EB" }}
              />
            </View>

            {/* Botón Google */}
            <TouchableOpacity
              style={{
                backgroundColor: "white",
                paddingVertical: 16,
                borderRadius: 16,
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: "#E5E7EB",
              }}
              onPress={async () => {
                const res = await loginWithGoogle();
                if (!res.success) Alert.alert("Aviso", res.message);
              }}
              disabled={isLoading}
            >
              <Ionicons name="logo-google" size={20} color="#DB4437" />
              <Text
                style={{
                  color: "#374151",
                  fontSize: 16,
                  fontWeight: "bold",
                  marginLeft: 12,
                }}
              >
                Google
              </Text>
            </TouchableOpacity>

            {/* Enlace de registro */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "center",
                marginTop: 32,
              }}
            >
              <Text style={{ color: "#6B7280", fontSize: 14 }}>
                ¿No tienes cuenta?{" "}
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate("Register")}
                disabled={isLoading}
              >
                <Text
                  style={{ color: "#2563EB", fontSize: 14, fontWeight: "bold" }}
                >
                  Regístrate aquí
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

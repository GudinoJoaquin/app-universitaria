import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { eventsService } from "../services/eventsService";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

export default function EventCreateScreen({ route, navigation }) {
  const { event: existingEvent } = route.params || {};
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    date: "",
    location: "",
    type: "academico",
  });
  const [loading, setLoading] = useState(false);
  const [isEditing] = useState(!!existingEvent);

  useEffect(() => {
    if (existingEvent) {
      const eventDate = new Date(existingEvent.date);
      const formattedDate = eventDate.toISOString().slice(0, 16);

      setFormData({
        title: existingEvent.title || "",
        description: existingEvent.description || "",
        date: formattedDate,
        location: existingEvent.location || "",
        type: existingEvent.type || "academico",
      });
    }

    // El Stack header está configurado con backgroundColor #3B82F6 en AppNavigator.
    // Solo actualizamos el título.
    navigation.setOptions({
      title: isEditing ? "Editar Evento" : "Nuevo Evento",
    });
  }, [existingEvent, isEditing, navigation]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const validateForm = () => {
    if (!formData.title.trim()) {
      Alert.alert("Requerido", "Por favor ingresa un título para el evento.");
      return false;
    }
    if (!formData.date) {
      Alert.alert("Requerido", "Por favor selecciona una fecha y hora para el evento.");
      return false;
    }
    if (!formData.location.trim()) {
      Alert.alert("Requerido", "Por favor ingresa una ubicación para el evento.");
      return false;
    }

    const selectedDate = new Date(formData.date);
    if (selectedDate < new Date()) {
      Alert.alert("Fecha Inválida", "No puedes crear eventos en fechas pasadas.");
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      if (isEditing) {
        await eventsService.updateEvent(existingEvent.id, formData);
        Alert.alert("¡Listo!", "El evento se ha actualizado correctamente.");
      } else {
        await eventsService.createEvent(formData);
        Alert.alert("¡Excelente!", "Tu evento ha sido publicado para toda la comunidad.");
      }
      navigation.goBack();
    } catch (error) {
      Alert.alert("Error", error.message || "No se pudo guardar el evento.");
      console.log("Error saving event:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <StatusBar barStyle="light-content" backgroundColor="#3B82F6" />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header Hero Blend */}
        <LinearGradient colors={["#3B82F6", "#1E3A8A"]} style={styles.heroSection}>
          <View style={styles.iconCircle}>
            <Ionicons name={isEditing ? "create" : "calendar-outline"} size={32} color="white" />
          </View>
          <Text style={styles.title}>
            {isEditing ? "Editar Evento" : "Crear Evento"}
          </Text>
          <Text style={styles.subtitle}>
            {isEditing
              ? "Actualiza la información de tu evento publicado."
              : "Programa una nueva actividad y compártela con la comunidad."}
          </Text>
        </LinearGradient>

        {/* Formulario Principal (Floating Card) */}
        <View style={styles.formContainer}>
          <View style={styles.formCard}>
            
            {/* Título del Evento */}
            <View style={styles.inputGroup}>
              <View style={styles.labelContainer}>
                <Ionicons name="text-outline" size={16} color="#6B7280" style={{ marginRight: 6 }} />
                <Text style={styles.label}>TÍTULO DEL EVENTO <Text style={styles.required}>*</Text></Text>
              </View>
              <TextInput
                style={styles.input}
                placeholder="Ej: Feria de Ciencias 2024..."
                placeholderTextColor="#9CA3AF"
                value={formData.title}
                onChangeText={(text) => handleInputChange("title", text)}
                maxLength={100}
              />
              <Text style={styles.charCount}>{formData.title.length}/100</Text>
            </View>

            <View style={styles.divider} />

            {/* Fecha y Hora */}
            <View style={styles.inputGroup}>
              <View style={styles.labelContainer}>
                <Ionicons name="time-outline" size={16} color="#6B7280" style={{ marginRight: 6 }} />
                <Text style={styles.label}>FECHA Y HORA <Text style={styles.required}>*</Text></Text>
              </View>
              <TextInput
                style={styles.input}
                placeholder="AAAA-MM-DDTHH:MM (Ej: 2024-12-25T14:30)"
                placeholderTextColor="#9CA3AF"
                value={formData.date}
                onChangeText={(text) => handleInputChange("date", text)}
              />
              <Text style={styles.helperText}>Formato requerido: ISO 8601 (Futuro)</Text>
            </View>

            <View style={styles.divider} />

            {/* Ubicación */}
            <View style={styles.inputGroup}>
              <View style={styles.labelContainer}>
                <Ionicons name="location-outline" size={16} color="#6B7280" style={{ marginRight: 6 }} />
                <Text style={styles.label}>UBICACIÓN <Text style={styles.required}>*</Text></Text>
              </View>
              <TextInput
                style={styles.input}
                placeholder="Ej: Auditorio principal..."
                placeholderTextColor="#9CA3AF"
                value={formData.location}
                onChangeText={(text) => handleInputChange("location", text)}
                maxLength={100}
              />
            </View>

            <View style={styles.divider} />

            {/* Descripción */}
            <View style={styles.inputGroup}>
              <View style={styles.labelContainer}>
                <Ionicons name="document-text-outline" size={16} color="#6B7280" style={{ marginRight: 6 }} />
                <Text style={styles.label}>DESCRIPCIÓN</Text>
              </View>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Escribe los detalles, actividades y requisitos..."
                placeholderTextColor="#9CA3AF"
                value={formData.description}
                onChangeText={(text) => handleInputChange("description", text)}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                maxLength={500}
              />
              <Text style={styles.charCount}>{formData.description.length}/500</Text>
            </View>

          </View>
        </View>

        {/* Botones de Acción */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.submitButton, (!formData.title || !formData.date || !formData.location || loading) && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={!formData.title || !formData.date || !formData.location || loading}
          >
            {loading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <>
                <Ionicons name={isEditing ? "save" : "paper-plane"} size={20} color="white" style={{ marginRight: 8 }} />
                <Text style={styles.submitButtonText}>
                  {isEditing ? "Guardar Cambios" : "Publicar Evento"}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()} disabled={loading}>
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  heroSection: {
    paddingHorizontal: 24,
    paddingTop: 30,
    paddingBottom: 60,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    alignItems: "center",
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.4)",
  },
  title: { fontSize: 26, fontWeight: "900", color: "white", marginBottom: 8, textAlign: "center" },
  subtitle: { fontSize: 14, color: "rgba(255,255,255,0.8)", textAlign: "center", paddingHorizontal: 20 },
  formContainer: {
    paddingHorizontal: 20,
    marginTop: -30, // Tarjeta flotante
  },
  formCard: {
    backgroundColor: "white",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  inputGroup: { marginVertical: 8 },
  labelContainer: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  label: { fontSize: 12, color: "#4B5563", fontWeight: "bold" },
  required: { color: "#EF4444" },
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
  textArea: {
    minHeight: 120,
    paddingTop: 16,
  },
  charCount: {
    fontSize: 11,
    color: "#9CA3AF",
    textAlign: "right",
    marginTop: 4,
    fontWeight: "500",
  },
  helperText: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 4,
    fontWeight: "500",
  },
  divider: { height: 1, backgroundColor: "#F3F4F6", marginVertical: 16 },
  actionsContainer: { paddingHorizontal: 24, marginTop: 32 },
  submitButton: {
    backgroundColor: "#3B82F6",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 20,
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 16,
  },
  submitButtonDisabled: { backgroundColor: "#93C5FD", shadowOpacity: 0 },
  submitButtonText: { color: "white", fontSize: 16, fontWeight: "bold" },
  cancelButton: {
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
  },
  cancelButtonText: { color: "#6B7280", fontSize: 15, fontWeight: "bold" },
});

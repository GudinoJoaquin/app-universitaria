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
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { eventsService } from "../services/eventsService";
import styles from "../styles/EventCreateScreenStyle";

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

    // Configurar header
    navigation.setOptions({
      title: isEditing ? "Editar Evento" : "Nuevo Evento",
      headerStyle: {
        backgroundColor: "#1E40AF",
      },
      headerTintColor: "white",
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
      Alert.alert("Error", "Por favor ingresa un título para el evento");
      return false;
    }
    if (!formData.date) {
      Alert.alert(
        "Error",
        "Por favor selecciona una fecha y hora para el evento"
      );
      return false;
    }
    if (!formData.location.trim()) {
      Alert.alert("Error", "Por favor ingresa una ubicación para el evento");
      return false;
    }

    // Validar que la fecha no sea en el pasado
    const selectedDate = new Date(formData.date);
    if (selectedDate < new Date()) {
      Alert.alert("Error", "No puedes crear eventos en fechas pasadas");
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
        Alert.alert("¡Éxito!", "Evento actualizado correctamente");
      } else {
        await eventsService.createEvent(formData);
        Alert.alert("¡Éxito!", "Evento creado correctamente");
      }
      navigation.goBack();
    } catch (error) {
      Alert.alert("Error", error.message || "No se pudo guardar el evento");
      console.log("Error saving event:", error);
    } finally {
      setLoading(false);
    }
  };

  const getMinDate = () => {
    return new Date().toISOString().slice(0, 16);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar barStyle="light-content" backgroundColor="#1E40AF" />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.title}>
              {isEditing ? "Editar Evento" : "Crear Nuevo Evento"}
            </Text>
            <Text style={styles.subtitle}>
              {isEditing
                ? "Modifica la información del evento existente"
                : "Completa los detalles para programar un nuevo evento universitario"}
            </Text>
          </View>
        </View>

        {/* Formulario */}
        <View style={styles.form}>
          {/* Título del Evento */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Título del Evento <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Feria de Ciencias 2024, Conferencia de Ingeniería..."
              placeholderTextColor="#9CA3AF"
              value={formData.title}
              onChangeText={(text) => handleInputChange("title", text)}
              maxLength={100}
            />
            <View style={styles.inputFooter}>
              <Text style={styles.charCount}>{formData.title.length}/100</Text>
            </View>
          </View>

          {/* Descripción */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Descripción</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe los detalles del evento, actividades planeadas, público objetivo, requisitos de participación..."
              placeholderTextColor="#9CA3AF"
              value={formData.description}
              onChangeText={(text) => handleInputChange("description", text)}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              maxLength={500}
            />
            <View style={styles.inputFooter}>
              <Text style={styles.charCount}>
                {formData.description.length}/500
              </Text>
            </View>
          </View>

          {/* Fecha y Hora */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Fecha y Hora del Evento <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="AAAA-MM-DDTHH:MM (Ej: 2024-12-25T14:30)"
              placeholderTextColor="#9CA3AF"
              value={formData.date}
              onChangeText={(text) => handleInputChange("date", text)}
            />
            <View style={styles.inputFooter}>
              <Text style={styles.helperText}>
                Selecciona una fecha futura para el evento
              </Text>
            </View>
          </View>

          {/* Ubicación */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Ubicación <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Auditorio principal, Gimnasio, Sala de conferencias..."
              placeholderTextColor="#9CA3AF"
              value={formData.location}
              onChangeText={(text) => handleInputChange("location", text)}
              maxLength={100}
            />
            <View style={styles.inputFooter}>
              <Text style={styles.charCount}>
                {formData.location.length}/100
              </Text>
            </View>
          </View>

          {/* Acciones */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.cancelButton, loading && styles.buttonDisabled]}
              onPress={() => navigation.goBack()}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.submitButton,
                (!formData.title ||
                  !formData.date ||
                  !formData.location ||
                  loading) &&
                  styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={
                !formData.title ||
                !formData.date ||
                !formData.location ||
                loading
              }
            >
              {loading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {isEditing ? "Actualizar Evento" : "Crear Evento"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

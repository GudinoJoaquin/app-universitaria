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
  Modal,
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
    date: "", // timestampz
    location: "",
  });
  const [loading, setLoading] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());

  const [isEditing] = useState(!!existingEvent);

  useEffect(() => {
    if (existingEvent) {
      // Extraer fecha y hora directamente del string para evitar conversión de zona horaria
      let formattedDate = existingEvent.date;

      // Normalizar a formato YYYY-MM-DD HH:MM:SS+00
      // Primero, reemplazar T con espacio
      formattedDate = formattedDate.replace("T", " ");

      // Remover cualquier sufijo de zona horaria (Z, +XX:XX, -XX:XX, etc.)
      formattedDate = formattedDate.replace(/[Z\+\-]\d{2}:\d{2}$/, "").trim();
      formattedDate = formattedDate.replace(/Z$/, "").trim();

      // Asegurar que tenga el sufijo +00
      if (!formattedDate.endsWith("+00")) {
        formattedDate = formattedDate + "+00";
      }

      const dateOnly = formattedDate.split(" ")[0]; // YYYY-MM-DD
      const [year, month, day] = dateOnly.split("-");

      setFormData({
        title: existingEvent.title || "",
        description: existingEvent.description || "",
        date: formattedDate,
        location: existingEvent.location || "",
      });
      setCalendarMonth(parseInt(month) - 1);
      setCalendarYear(parseInt(year));
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

  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    const day = `${date.getDate()}`.padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const formatDateDisplay = (value) => {
    if (!value) return "Selecciona una fecha";
    const dateStr = value.split(" ")[0]; // Obtener YYYY-MM-DD
    const [year, month, day] = dateStr.split("-");
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const generateCalendar = (month, year) => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const weeks = [];
    let week = Array(firstDay).fill(null);

    for (let day = 1; day <= daysInMonth; day++) {
      week.push(day);
      if (week.length === 7) {
        weeks.push(week);
        week = [];
      }
    }

    if (week.length > 0) {
      while (week.length < 7) {
        week.push(null);
      }
      weeks.push(week);
    }

    return weeks;
  };

  const handleDaySelect = (day) => {
    const selectedDate = new Date(calendarYear, calendarMonth, day);
    const dateStr = formatDate(selectedDate);
    // Extraer hora manteniendo el formato YYYY-MM-DD HH:MM:SS+00
    let timeStr = "00:00:00";
    if (formData.date) {
      const timePart = formData.date.split(" ")[1];
      if (timePart) {
        timeStr = timePart.replace("+00", "").trim();
      }
    }
    const timestamp = `${dateStr} ${timeStr}+00`;
    setFormData((prev) => ({
      ...prev,
      date: timestamp,
    }));
    setShowCalendar(false);
  };

  const handleTimeSelect = (time) => {
    // time viene como "HH:MM" de getTimeOptions()
    let dateStr = "";
    if (formData.date) {
      dateStr = formData.date.split(" ")[0]; // Obtener YYYY-MM-DD
    }
    // Construir timestamp con la hora seleccionada
    const timestamp = `${dateStr} ${time}:00+00`;
    setFormData((prev) => ({
      ...prev,
      date: timestamp,
    }));
    setShowTimePicker(false);
  };

  const handleMonthChange = (direction) => {
    const nextMonth = calendarMonth + direction;
    if (nextMonth < 0) {
      setCalendarMonth(11);
      setCalendarYear((prev) => prev - 1);
    } else if (nextMonth > 11) {
      setCalendarMonth(0);
      setCalendarYear((prev) => prev + 1);
    } else {
      setCalendarMonth(nextMonth);
    }
  };

  const getTimeOptions = () => {
    const options = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let step = 0; step < 60; step += 15) {
        options.push(
          `${String(hour).padStart(2, "0")}:${String(step).padStart(2, "0")}`,
        );
      }
    }
    return options;
  };

  const validateForm = () => {
    if (!formData.title.trim()) {
      Alert.alert("Requerido", "Por favor ingresa un título para el evento.");
      return false;
    }
    if (!formData.date) {
      Alert.alert(
        "Requerido",
        "Por favor selecciona una fecha para el evento.",
      );
      return false;
    }
    if (!formData.location.trim()) {
      Alert.alert(
        "Requerido",
        "Por favor ingresa una ubicación para el evento.",
      );
      return false;
    }

    // Convertir YYYY-MM-DD HH:MM:SS+00 a ISO format para parsearlo correctamente
    const isoDate = formData.date.replace(" ", "T").replace("+00", "Z");
    const selectedDateTime = new Date(isoDate);
    if (selectedDateTime < new Date()) {
      Alert.alert(
        "Fecha Inválida",
        "No puedes crear eventos en fechas pasadas.",
      );
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    const payload = {
      ...formData,
    };

    setLoading(true);
    try {
      if (isEditing) {
        await eventsService.updateEvent(existingEvent.id, payload);
        Alert.alert("¡Listo!", "El evento se ha actualizado correctamente.");
      } else {
        await eventsService.createEvent(payload);
        Alert.alert(
          "¡Excelente!",
          "Tu evento ha sido publicado para toda la comunidad.",
        );
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
        <LinearGradient
          colors={["#3B82F6", "#1E3A8A"]}
          style={styles.heroSection}
        >
          <View style={styles.iconCircle}>
            <Ionicons
              name={isEditing ? "create" : "calendar-outline"}
              size={32}
              color="white"
            />
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
                <Ionicons
                  name="text-outline"
                  size={16}
                  color="#6B7280"
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.label}>
                  TÍTULO DEL EVENTO <Text style={styles.required}>*</Text>
                </Text>
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
                <Ionicons
                  name="time-outline"
                  size={16}
                  color="#6B7280"
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.label}>
                  FECHA Y HORA <Text style={styles.required}>*</Text>
                </Text>
              </View>

              <View style={styles.rowGroup}>
                <View style={[styles.column, styles.dateColumn]}>
                  <Text style={styles.subLabel}>Fecha</Text>
                  <TouchableOpacity
                    style={styles.datePickerInput}
                    onPress={() => setShowCalendar((prev) => !prev)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.datePickerText}>
                      {formatDateDisplay(formData.date)}
                    </Text>
                    <Ionicons
                      name="calendar-outline"
                      size={20}
                      color="#3B82F6"
                    />
                  </TouchableOpacity>

                  {showCalendar && (
                    <View style={styles.calendarContainer}>
                      <View style={styles.calendarHeader}>
                        <TouchableOpacity onPress={() => handleMonthChange(-1)}>
                          <Ionicons
                            name="chevron-back"
                            size={18}
                            color="#475569"
                          />
                        </TouchableOpacity>
                        <Text style={styles.calendarTitle}>
                          {new Date(
                            calendarYear,
                            calendarMonth,
                          ).toLocaleDateString("es-ES", {
                            month: "long",
                            year: "numeric",
                          })}
                        </Text>
                        <TouchableOpacity onPress={() => handleMonthChange(1)}>
                          <Ionicons
                            name="chevron-forward"
                            size={18}
                            color="#475569"
                          />
                        </TouchableOpacity>
                      </View>

                      <View style={styles.calendarWeekNames}>
                        {["D", "L", "M", "M", "J", "V", "S"].map((day) => (
                          <Text key={day} style={styles.calendarWeekName}>
                            {day}
                          </Text>
                        ))}
                      </View>

                      {generateCalendar(calendarMonth, calendarYear).map(
                        (week, weekIndex) => (
                          <View key={weekIndex} style={styles.calendarWeekRow}>
                            {week.map((day, dayIndex) => {
                              const dateStr = formData.date
                                ? formData.date.split(" ")[0]
                                : null;
                              const isSelected =
                                dateStr &&
                                day &&
                                `${calendarYear}-${String(calendarMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}` ===
                                  dateStr;

                              return (
                                <TouchableOpacity
                                  key={dayIndex}
                                  style={[
                                    styles.calendarDay,
                                    isSelected && styles.calendarDaySelected,
                                  ]}
                                  disabled={!day}
                                  onPress={() => day && handleDaySelect(day)}
                                >
                                  <Text
                                    style={[
                                      styles.calendarDayText,
                                      !day && styles.calendarDayTextDisabled,
                                      isSelected &&
                                        styles.calendarDayTextSelected,
                                    ]}
                                  >
                                    {day || ""}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        ),
                      )}
                    </View>
                  )}
                </View>

                <View style={[styles.column, styles.timeColumn]}>
                  <Text style={styles.subLabel}>Hora</Text>
                  <TouchableOpacity
                    style={styles.datePickerInput}
                    onPress={() => setShowTimePicker(true)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.datePickerText}>
                      {formData.date
                        ? formData.date.split(" ")[1]?.slice(0, 5)
                        : "Selecciona una hora"}
                    </Text>
                    <Ionicons name="time-outline" size={20} color="#3B82F6" />
                  </TouchableOpacity>

                  <Modal
                    visible={showTimePicker}
                    animationType="slide"
                    transparent
                    onRequestClose={() => setShowTimePicker(false)}
                  >
                    <View style={styles.modalOverlay}>
                      <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                          <Text style={styles.modalTitle}>Selecciona hora</Text>
                          <TouchableOpacity
                            onPress={() => setShowTimePicker(false)}
                          >
                            <Ionicons name="close" size={24} color="#475569" />
                          </TouchableOpacity>
                        </View>
                        <ScrollView
                          style={styles.timeModalScroll}
                          contentContainerStyle={styles.timeModalContent}
                          showsVerticalScrollIndicator={false}
                        >
                          {getTimeOptions().map((time) => {
                            const currentTime = formData.date
                              ? formData.date.split(" ")[1]?.slice(0, 5)
                              : "";
                            return (
                              <TouchableOpacity
                                key={time}
                                style={[
                                  styles.timeOption,
                                  currentTime === time &&
                                    styles.timeOptionActive,
                                ]}
                                onPress={() => handleTimeSelect(time)}
                                activeOpacity={0.8}
                              >
                                <Text
                                  style={[
                                    styles.timeOptionText,
                                    currentTime === time &&
                                      styles.timeOptionTextActive,
                                  ]}
                                >
                                  {time}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>
                      </View>
                    </View>
                  </Modal>

                  <Text style={styles.helperText}>
                    Toca para abrir el selector de hora.
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Ubicación */}
            <View style={styles.inputGroup}>
              <View style={styles.labelContainer}>
                <Ionicons
                  name="location-outline"
                  size={16}
                  color="#6B7280"
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.label}>
                  UBICACIÓN <Text style={styles.required}>*</Text>
                </Text>
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
                <Ionicons
                  name="document-text-outline"
                  size={16}
                  color="#6B7280"
                  style={{ marginRight: 6 }}
                />
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
              <Text style={styles.charCount}>
                {formData.description.length}/500
              </Text>
            </View>
          </View>
        </View>

        {/* Botones de Acción */}
        <View style={styles.actionsContainer}>
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
              !formData.title || !formData.date || !formData.location || loading
            }
          >
            {loading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <>
                <Ionicons
                  name={isEditing ? "save" : "paper-plane"}
                  size={20}
                  color="white"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.submitButtonText}>
                  {isEditing ? "Guardar Cambios" : "Publicar Evento"}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
            disabled={loading}
          >
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
  title: {
    fontSize: 26,
    fontWeight: "900",
    color: "white",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
    paddingHorizontal: 20,
  },
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
  labelContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
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
  rowGroup: {
    flexDirection: "column",
    alignItems: "stretch",
  },
  column: {
    flex: 1,
  },
  dateColumn: {
    minWidth: 170,
  },
  timeColumn: {
    minWidth: 170,
    marginTop: 16,
  },
  subLabel: {
    color: "#4B5563",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 8,
  },
  datePickerInput: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  datePickerText: {
    color: "#1F2937",
    fontSize: 16,
  },
  calendarContainer: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 20,
    backgroundColor: "white",
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  calendarTitle: {
    color: "#1F2937",
    fontWeight: "700",
    fontSize: 14,
    textTransform: "capitalize",
  },
  calendarWeekNames: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  calendarWeekName: {
    width: 28,
    textAlign: "center",
    color: "#6B7280",
    fontSize: 11,
    fontWeight: "700",
  },
  calendarWeekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  calendarDay: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  calendarDaySelected: {
    backgroundColor: "#3B82F6",
  },
  calendarDayText: {
    color: "#1F2937",
    fontSize: 12,
  },
  calendarDayTextSelected: {
    color: "white",
    fontWeight: "700",
  },
  calendarDayTextDisabled: {
    color: "transparent",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "white",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "70%",
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
  },
  timeModalScroll: {
    maxHeight: 380,
  },
  timeModalContent: {
    paddingBottom: 12,
  },
  timeOption: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    marginBottom: 10,
    backgroundColor: "#F9FAFB",
  },
  timeOptionActive: {
    backgroundColor: "#3B82F6",
  },
  timeOptionText: {
    fontSize: 14,
    color: "#1F2937",
    textAlign: "center",
  },
  timeOptionTextActive: {
    color: "white",
    fontWeight: "700",
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

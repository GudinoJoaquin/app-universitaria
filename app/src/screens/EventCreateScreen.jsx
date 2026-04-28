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
  Dimensions,
  Switch,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { eventsService } from "../services/eventsService";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { categoriesService } from "../services/categoriesService";
import { supabase } from "../services/supabase";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import DateTimePicker from "@react-native-community/datetimepicker";

const { width, height } = Dimensions.get("window");

export default function EventCreateScreen({ route, navigation }) {
  const { event: existingEvent } = route.params || {};
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    date: "",
    location: "",
    image_url: "",
    start_time_raw: new Date(),
    end_time_raw: new Date(),
  });

  const [useTime, setUseTime] = useState(false);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState([]);
  const [allAvailableCategories, setAllAvailableCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  const [isEditing] = useState(!!existingEvent);

  useEffect(() => {
    const init = async () => {
      const res = await categoriesService.getAll();
      if (res.success) setAllAvailableCategories(res.data);
      if (existingEvent) {
        const { data: assigned } = await supabase
          .from("event_categories_junction")
          .select("category_id")
          .eq("event_id", existingEvent.id);
        if (assigned)
          setSelectedCategoryIds(assigned.map((d) => d.category_id));

        const start = existingEvent.start_time
          ? new Date(existingEvent.start_time)
          : new Date();
        const end = existingEvent.end_time
          ? new Date(existingEvent.end_time)
          : new Date();

        setFormData({
          title: existingEvent.title || "",
          description: existingEvent.description || "",
          date: existingEvent.date || "",
          location: existingEvent.location || "",
          image_url: existingEvent.image_url || "",
          start_time_raw: start,
          end_time_raw: end,
        });
        if (existingEvent.start_time) setUseTime(true);
      }
    };
    init();
  }, [existingEvent]);

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaType
        ? ImagePicker.MediaType.Images
        : ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.7,
    });
    if (!result.canceled) {
      setImageLoading(true);
      const res = await eventsService.uploadImage(result.assets[0].uri);
      if (res.success) setFormData((p) => ({ ...p, image_url: res.url }));
      else Alert.alert("Error", res.error);
      setImageLoading(false);
    }
  };

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const isoDate = selectedDate.toISOString().split("T")[0];
      setFormData((p) => ({ ...p, date: isoDate }));
    }
  };

  const onStartTimeChange = (event, selectedTime) => {
    setShowStartTimePicker(Platform.OS === "ios");
    if (selectedTime) {
      setFormData((p) => ({ ...p, start_time_raw: selectedTime }));
    }
  };

  const onEndTimeChange = (event, selectedTime) => {
    setShowEndTimePicker(Platform.OS === "ios");
    if (selectedTime) {
      setFormData((p) => ({ ...p, end_time_raw: selectedTime }));
    }
  };

  const handleSubmit = async () => {
    if (
      formData.title.length < 4 ||
      !formData.date ||
      formData.location.length < 4
    ) {
      return Alert.alert(
        "Campos incompletos",
        "Verifica el título, fecha y ubicación.",
      );
    }
    setLoading(true);
    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        date: formData.date,
        location: formData.location,
        image_url: formData.image_url,
        created_by: user.id,
      };

      if (useTime) {
        // Combinar fecha con hora seleccionada
        const start = new Date(
          formData.date +
            "T" +
            formData.start_time_raw.toLocaleTimeString("en-US", {
              hour12: false,
            }),
        );
        payload.start_time = start.toISOString();

        const end = new Date(
          formData.date +
            "T" +
            formData.end_time_raw.toLocaleTimeString("en-US", {
              hour12: false,
            }),
        );
        payload.end_time = end.toISOString();
      } else {
        payload.start_time = null;
        payload.end_time = null;
      }

      let result = isEditing
        ? await eventsService.updateEvent(existingEvent.id, payload)
        : await eventsService.createEvent(payload);
      if (result.success) {
        await categoriesService.assignToEvent(
          result.event.id,
          selectedCategoryIds,
        );
        Alert.alert(
          "✅ Éxito",
          isEditing ? "Evento actualizado" : "¡Evento publicado!",
        );
        navigation.goBack();
      } else throw new Error(result.error);
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDisplayDate = (d) => {
    if (!d) return "Seleccionar día";
    const parts = d.split("-");
    return new Date(parts[0], parts[1] - 1, parts[2]).toLocaleDateString(
      "es-ES",
      { day: "numeric", month: "long" },
    );
  };

  const formatDisplayTime = (d) => {
    return d.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.scroll}
        >
          <LinearGradient colors={["#0F172A", "#1E293B"]} style={s.header}>
            <TouchableOpacity
              style={s.backBtn}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text style={s.headerTitle}>
              {isEditing ? "Editar" : "Crear"} Evento
            </Text>
          </LinearGradient>

          <View style={s.form}>
            <TouchableOpacity
              style={s.imgBox}
              onPress={handlePickImage}
              disabled={imageLoading}
            >
              {formData.image_url ? (
                <Image source={{ uri: formData.image_url }} style={s.preview} />
              ) : (
                <View style={s.imgPlaceholder}>
                  {imageLoading ? (
                    <ActivityIndicator color="#1E1B4B" />
                  ) : (
                    <>
                      <View style={s.imgIconBox}>
                        <Ionicons name="camera" size={30} color="#3B82F6" />
                      </View>
                      <Text style={s.imgLabel}>Añadir imagen de portada</Text>
                    </>
                  )}
                </View>
              )}
            </TouchableOpacity>

            <View style={s.group}>
              <Text style={s.label}>INFORMACIÓN GENERAL</Text>
              <TextInput
                style={s.input}
                placeholder="Título del evento"
                value={formData.title}
                onChangeText={(t) => setFormData((p) => ({ ...p, title: t }))}
              />

              <TouchableOpacity
                style={s.inputRow}
                onPress={() => setShowDatePicker(true)}
              >
                <View style={s.inputRowLeft}>
                  <Ionicons name="calendar" size={20} color="#3B82F6" />
                  <Text style={[s.inputTxt, !formData.date && s.muted]}>
                    {formatDisplayDate(formData.date)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
              </TouchableOpacity>

              <TextInput
                style={s.input}
                placeholder="¿Dónde será el evento?"
                value={formData.location}
                onChangeText={(t) =>
                  setFormData((p) => ({ ...p, location: t }))
                }
              />
            </View>

            <View style={s.group}>
              <View style={s.toggleRow}>
                <View>
                  <Text style={s.label}>HORARIO DEL EVENTO</Text>
                  <Text style={s.subLabel}>¿Tiene una hora específica?</Text>
                </View>
                <Switch
                  value={useTime}
                  onValueChange={setUseTime}
                  trackColor={{ false: "#E2E8F0", true: "#1E1B4B" }}
                />
              </View>

              {useTime && (
                <View style={s.row}>
                  <TouchableOpacity
                    style={[s.inputRow, { flex: 1 }]}
                    onPress={() => setShowStartTimePicker(true)}
                  >
                    <View style={s.inputRowLeft}>
                      <Ionicons name="time" size={20} color="#10B981" />
                      <Text style={s.inputTxt}>
                        {formatDisplayTime(formData.start_time_raw)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.inputRow, { flex: 1 }]}
                    onPress={() => setShowEndTimePicker(true)}
                  >
                    <View style={s.inputRowLeft}>
                      <Ionicons name="time" size={20} color="#EF4444" />
                      <Text style={s.inputTxt}>
                        {formatDisplayTime(formData.end_time_raw)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <View style={s.group}>
              <Text style={s.label}>CATEGORÍAS</Text>
              <View style={s.catGrid}>
                {allAvailableCategories.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[
                      s.catChip,
                      selectedCategoryIds.includes(c.id) && {
                        backgroundColor: c.color,
                        borderColor: c.color,
                      },
                    ]}
                    onPress={() =>
                      setSelectedCategoryIds((p) =>
                        p.includes(c.id)
                          ? p.filter((id) => id !== c.id)
                          : [...p, c.id],
                      )
                    }
                  >
                    <Text
                      style={[
                        s.catChipTxt,
                        selectedCategoryIds.includes(c.id) && {
                          color: "white",
                        },
                      ]}
                    >
                      {c.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={s.group}>
              <Text style={s.label}>DESCRIPCIÓN</Text>
              <TextInput
                style={[s.input, { height: 120, textAlignVertical: "top" }]}
                placeholder="Describe los detalles del evento..."
                multiline
                value={formData.description}
                onChangeText={(t) =>
                  setFormData((p) => ({ ...p, description: t }))
                }
              />
            </View>

            <TouchableOpacity
              style={[
                s.submit,
                (formData.title.length < 4 || !formData.date) && s.disabled,
              ]}
              onPress={handleSubmit}
              disabled={loading}
            >
              <LinearGradient
                colors={["#1E1B4B", "#312E81"]}
                style={s.submitGradient}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={s.submitTxt}>
                    {isEditing ? "GUARDAR CAMBIOS" : "PUBLICAR EVENTO"}
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Native Pickers */}
      {showDatePicker && (
        <DateTimePicker
          value={
            formData.date ? new Date(formData.date + "T12:00:00") : new Date()
          }
          mode="date"
          display={Platform.OS === "ios" ? "inline" : "default"}
          minimumDate={new Date()}
          onChange={onDateChange}
        />
      )}

      {showStartTimePicker && (
        <DateTimePicker
          value={formData.start_time_raw}
          mode="time"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          is24Hour={true}
          onChange={onStartTimeChange}
        />
      )}

      {showEndTimePicker && (
        <DateTimePicker
          value={formData.end_time_raw}
          mode="time"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          is24Hour={true}
          onChange={onEndTimeChange}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  scroll: { paddingBottom: 50 },
  header: {
    height: 160,
    padding: 25,
    justifyContent: "flex-end",
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
  },
  backBtn: {
    position: "absolute",
    top: 60,
    left: 25,
    width: 45,
    height: 45,
    borderRadius: 15,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { fontSize: 28, fontWeight: "900", color: "white" },

  form: { padding: 25, marginTop: -25, gap: 20 },
  imgBox: {
    height: 180,
    backgroundColor: "white",
    borderRadius: 25,
    overflow: "hidden",
    elevation: 10,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 15,
  },
  imgPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  imgIconBox: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
  },
  imgLabel: { fontSize: 14, fontWeight: "700", color: "#64748B" },
  preview: { ...StyleSheet.absoluteFillObject },

  group: { gap: 10 },
  label: {
    fontSize: 11,
    fontWeight: "900",
    color: "#94A3B8",
    letterSpacing: 1,
  },
  subLabel: { fontSize: 12, color: "#64748B", fontWeight: "600" },
  input: {
    backgroundColor: "white",
    borderRadius: 18,
    padding: 16,
    fontSize: 15,
    fontWeight: "600",
    color: "#1E293B",
    elevation: 2,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "white",
    borderRadius: 18,
    padding: 16,
    elevation: 2,
  },
  inputRowLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  inputTxt: { fontSize: 15, fontWeight: "600", color: "#1E293B" },
  muted: { color: "#94A3B8" },

  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 5,
  },
  row: { flexDirection: "row", gap: 15 },

  catGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "white",
    borderWidth: 1.5,
    borderColor: "#F1F5F9",
  },
  catChipTxt: { fontSize: 12, fontWeight: "800", color: "#64748B" },

  submit: {
    height: 60,
    borderRadius: 22,
    overflow: "hidden",
    marginTop: 20,
    elevation: 8,
  },
  submitGradient: { flex: 1, alignItems: "center", justifyContent: "center" },
  submitTxt: {
    color: "white",
    fontWeight: "900",
    fontSize: 16,
    letterSpacing: 1,
  },
  disabled: { opacity: 0.5 },
});

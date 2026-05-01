import React, { useState, useEffect, useMemo } from "react";
import {
  View, Text, TextInput, TouchableOpacity, Alert, ScrollView,
  ActivityIndicator, StatusBar, KeyboardAvoidingView, Platform, StyleSheet, Dimensions, Switch, Modal
} from "react-native";
import { useAuth } from "../../auth/context/AuthContext";
import { eventsService } from "../services/eventsService";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { categoriesService } from "../../gestion/services/categoriesService";
import { supabase } from "../../shared/services/supabase";
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
    end_time_raw: new Date(new Date().getTime() + 3600000),
  });

  const [useTime, setUseTime] = useState(false);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState([]);
  const [allAvailableCategories, setAllAvailableCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  
  // Track globally if the form has been interacted with
  const [formTouched, setFormTouched] = useState(false);
  const [touchedFields, setTouchedFields] = useState({});
  const [catModalVisible, setCatModalVisible] = useState(false);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  const isEditing = !!existingEvent;

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

        const start = existingEvent.start_time ? new Date(existingEvent.start_time) : new Date();
        const end = existingEvent.end_time ? new Date(existingEvent.end_time) : new Date(start.getTime() + 3600000);

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

  const errors = useMemo(() => {
    const errs = {};
    if (formData.title && formData.title.length < 5) errs.title = "Título corto (mín 5)";
    if (formData.location && formData.location.length < 5) errs.location = "Lugar muy corto";
    if (formData.description && formData.description.length < 15) errs.description = "Descripción insuficiente";
    if (useTime && formData.end_time_raw <= formData.start_time_raw) errs.time = "Horario inválido";
    if (!formData.title) errs.title = "Campo obligatorio";
    if (!formData.date) errs.date = "Falta la fecha";
    if (!formData.location) errs.location = "Falta la ubicación";
    if (selectedCategoryIds.length === 0) errs.categories = "Elige una categoría";
    return errs;
  }, [formData, selectedCategoryIds, useTime]);

  const isValid = Object.keys(errors).length === 0;

  const handleTouch = (field) => {
    setFormTouched(true);
    setTouchedFields(p => ({ ...p, [field]: true }));
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.7,
    });
    if (!result.canceled) {
      setFormTouched(true);
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
      handleTouch('date');
      const isoDate = selectedDate.toISOString().split("T")[0];
      setFormData((p) => ({ ...p, date: isoDate }));
    }
  };

  const handleSubmit = async () => {
    if (!isValid) return;
    setLoading(true);
    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        date: formData.date,
        location: formData.location,
        image_url: formData.image_url,
        created_by: user?.id,
      };

      if (useTime) {
        const start = new Date(formData.date + "T" + formData.start_time_raw.toLocaleTimeString("en-US", { hour12: false }));
        payload.start_time = start.toISOString();
        const end = new Date(formData.date + "T" + formData.end_time_raw.toLocaleTimeString("en-US", { hour12: false }));
        payload.end_time = end.toISOString();
      } else {
        payload.start_time = null;
        payload.end_time = null;
      }

      let result = isEditing
        ? await eventsService.updateEvent(existingEvent.id, payload)
        : await eventsService.createEvent(payload);
      
      if (result.success) {
        await categoriesService.assignToEvent(result.event.id, selectedCategoryIds);
        Alert.alert("✅ Éxito", isEditing ? "Evento actualizado" : "¡Evento publicado!");
        navigation.goBack();
      } else throw new Error(result.error);
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDisplayDate = (d) => {
    if (!d) return "Elegir fecha";
    const parts = d.split("-");
    return new Date(parts[0], parts[1] - 1, parts[2]).toLocaleDateString("es-ES", { day: "numeric", month: "long" });
  };

  // Helper to determine if we should show error for a field
  const shouldShowError = (field) => formTouched && errors[field];

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={["#0F172A", "#1E293B"]} style={s.header}>
        <View style={s.headerNav}>
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={22} color="white" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>{isEditing ? "Editar" : "Nuevo"} Evento</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
          
          <View style={s.form}>
            {/* PORTADA RECOMENDADA */}
            <TouchableOpacity style={s.heroBox} onPress={handlePickImage} activeOpacity={0.8}>
                {formData.image_url ? (
                    <Image source={{ uri: formData.image_url }} style={s.heroImg} contentFit="cover" />
                ) : (
                    <View style={s.heroPlaceholder}>
                        <View style={s.heroIcon}>
                            <Ionicons name="image-outline" size={30} color="#3B82F6" />
                        </View>
                        <Text style={s.heroLabel}>Portada del Evento</Text>
                        <Text style={s.heroSub}>Recomendado: 16:9</Text>
                    </View>
                )}
                {imageLoading && <View style={s.imgLoader}><ActivityIndicator color="white" /></View>}
            </TouchableOpacity>

            <View style={s.mainForm}>
                <View style={s.sectionHeader}>
                    <Text style={s.sectionLabel}>DETALLES DEL EVENTO</Text>
                    {formTouched && !isValid && <View style={s.statusTag}><Text style={s.statusTagTxt}>Incompleto</Text></View>}
                </View>
                
                <View style={[s.card, shouldShowError('title') && s.cardError]}>
                    <View style={s.field}>
                        <Ionicons name="pencil-outline" size={16} color={shouldShowError('title') ? "#EF4444" : "#94A3B8"} />
                        <TextInput
                            style={s.input}
                            placeholder="Nombre del evento"
                            placeholderTextColor="#CBD5E1"
                            value={formData.title}
                            onChangeText={(t) => { setFormData(p => ({...p, title: t})); if(!formTouched) setFormTouched(true); }}
                            onBlur={() => handleTouch('title')}
                        />
                        {shouldShowError('title') && <Text style={s.miniError}>{errors.title}</Text>}
                    </View>

                    <View style={s.hDivider} />

                    <View style={[s.field, shouldShowError('location') && s.fieldError]}>
                        <Ionicons name="location-outline" size={16} color={shouldShowError('location') ? "#EF4444" : "#94A3B8"} />
                        <TextInput
                            style={s.input}
                            placeholder="¿Dónde será?"
                            placeholderTextColor="#CBD5E1"
                            value={formData.location}
                            onChangeText={(t) => { setFormData(p => ({...p, location: t})); if(!formTouched) setFormTouched(true); }}
                            onBlur={() => handleTouch('location')}
                        />
                        {shouldShowError('location') && <Text style={s.miniError}>{errors.location}</Text>}
                    </View>
                </View>

                <View style={[s.card, (shouldShowError('date') || (useTime && errors.time)) && s.cardError]}>
                    <View style={s.compactRow}>
                        <TouchableOpacity style={s.compactItem} onPress={() => { setShowDatePicker(true); handleTouch('date'); }}>
                            <Ionicons name="calendar-outline" size={16} color={shouldShowError('date') ? "#EF4444" : "#3B82F6"} />
                            <Text style={[s.compactVal, !formData.date && {color: '#CBD5E1'}, shouldShowError('date') && {color: '#EF4444'}]}>
                                {formData.date ? formatDisplayDate(formData.date) : "Fecha"}
                            </Text>
                        </TouchableOpacity>
                        
                        <View style={s.vDivider} />

                        <View style={s.timeToggle}>
                            <Text style={s.toggleLabel}>Horario</Text>
                            <Switch 
                                value={useTime} 
                                onValueChange={(v) => { setUseTime(v); handleTouch('time'); }} 
                                trackColor={{ false: "#E2E8F0", true: "#0F172A" }}
                                scaleX={0.65} scaleY={0.65}
                            />
                        </View>
                    </View>

                    {useTime && (
                        <View style={s.timeRow}>
                            <TouchableOpacity style={s.timePill} onPress={() => setShowStartTimePicker(true)}>
                                <Text style={s.pillLab}>De</Text>
                                <Text style={s.pillVal}>{formData.start_time_raw.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</Text>
                            </TouchableOpacity>
                            <Ionicons name="remove-outline" size={14} color="#E2E8F0" />
                            <TouchableOpacity style={[s.timePill, errors.time && {borderColor: '#EF4444'}]} onPress={() => setShowEndTimePicker(true)}>
                                <Text style={s.pillLab}>A</Text>
                                <Text style={[s.pillVal, errors.time && {color: '#EF4444'}]}>{formData.end_time_raw.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                    {shouldShowError('date') && !formData.date && <Text style={s.rowError}>La fecha es obligatoria</Text>}
                    {useTime && errors.time && <Text style={s.rowError}>{errors.time}</Text>}
                </View>

                <View style={[s.card, shouldShowError('categories') && s.cardError]}>
                    <TouchableOpacity style={s.dropdown} onPress={() => { setCatModalVisible(true); handleTouch('categories'); }}>
                        <View style={s.dropLeft}>
                            <Ionicons name="layers-outline" size={16} color={shouldShowError('categories') ? "#EF4444" : "#8B5CF6"} />
                            <Text style={[s.dropLabel, shouldShowError('categories') && {color: '#EF4444'}]}>Categorías</Text>
                        </View>
                        <Ionicons name="chevron-down" size={14} color={shouldShowError('categories') ? "#EF4444" : "#94A3B8"} />
                    </TouchableOpacity>

                    {selectedCategoryIds.length > 0 && (
                        <View style={s.chipBox}>
                            {selectedCategoryIds.map(id => {
                                const cat = allAvailableCategories.find(c => c.id === id);
                                if (!cat) return null;
                                return (
                                    <View key={id} style={[s.chip, { backgroundColor: cat.color + '10', borderColor: cat.color + '20' }]}>
                                        <View style={[s.chipDot, { backgroundColor: cat.color }]} />
                                        <Text style={[s.chipTxt, { color: cat.color }]}>{cat.name}</Text>
                                        <TouchableOpacity onPress={() => setSelectedCategoryIds(p => p.filter(cid => cid !== id))}>
                                            <Ionicons name="close" size={12} color={cat.color} />
                                        </TouchableOpacity>
                                    </View>
                                );
                            })}
                        </View>
                    )}
                    {shouldShowError('categories') && selectedCategoryIds.length === 0 && <Text style={s.rowError}>Selecciona al menos una categoría</Text>}
                </View>

                <View style={[s.card, shouldShowError('description') && s.cardError]}>
                    <Text style={[s.smallLabel, shouldShowError('description') && {color: '#EF4444'}]}>DESCRIPCIÓN</Text>
                    <TextInput
                        style={s.textArea}
                        placeholder="Cuenta de qué trata tu evento..."
                        placeholderTextColor="#CBD5E1"
                        multiline
                        value={formData.description}
                        onChangeText={(t) => { setFormData(p => ({...p, description: t})); if(!formTouched) setFormTouched(true); }}
                        onBlur={() => handleTouch('description')}
                    />
                    {shouldShowError('description') && <Text style={s.errorTxt}>{errors.description}</Text>}
                </View>

                {/* BOTÓN BIEN ABAJO CON MÁS MARGEN */}
                <View style={s.submitWrapper}>
                    <TouchableOpacity 
                        style={[s.mainBtn, !isValid && s.btnOff]} 
                        disabled={!isValid || loading} 
                        onPress={handleSubmit}
                    >
                        <LinearGradient colors={["#0F172A", "#1E293B"]} style={s.btnGrad}>
                            {loading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <>
                                    <Text style={s.btnTxt}>{isEditing ? "GUARDAR CAMBIOS" : "PUBLICAR EVENTO"}</Text>
                                    {!isValid && <Ionicons name="lock-closed-outline" size={16} color="rgba(255,255,255,0.5)" style={{marginLeft: 10}} />}
                                </>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
                    {formTouched && !isValid && (
                        <View style={s.finalHelp}>
                            <Ionicons name="warning-outline" size={14} color="#EF4444" />
                            <Text style={s.finalHelpTxt}>Hay campos obligatorios pendientes arriba</Text>
                        </View>
                    )}
                </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={catModalVisible} transparent animationType="slide">
        <View style={s.modalBack}>
            <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setCatModalVisible(false)} />
            <View style={s.modalContent}>
                <View style={s.modalHandle} />
                <Text style={s.modalTitle}>Seleccionar Categorías</Text>
                <ScrollView contentContainerStyle={s.modalList} showsVerticalScrollIndicator={false}>
                    {allAvailableCategories.map(cat => {
                        const active = selectedCategoryIds.includes(cat.id);
                        return (
                            <TouchableOpacity key={cat.id} style={[s.modalItem, active && {borderColor: cat.color}]} onPress={() => setSelectedCategoryIds(p => active ? p.filter(c => c !== cat.id) : [...p, cat.id])}>
                                <View style={[s.modalDot, { backgroundColor: cat.color }]} />
                                <Text style={[s.modalItemTxt, active && {color: cat.color, fontWeight: '700'}]}>{cat.name}</Text>
                                {active && <Ionicons name="checkmark-circle" size={20} color={cat.color} />}
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
                <TouchableOpacity style={s.modalBtn} onPress={() => setCatModalVisible(false)}>
                    <Text style={s.modalBtnTxt}>Listo</Text>
                </TouchableOpacity>
            </View>
        </View>
      </Modal>

      {showDatePicker && (
        <DateTimePicker
          value={formData.date ? new Date(formData.date + "T12:00:00") : new Date()}
          mode="date"
          display={Platform.OS === "ios" ? "inline" : "default"}
          minimumDate={new Date()}
          onChange={onDateChange}
        />
      )}
      {showStartTimePicker && (
        <DateTimePicker value={formData.start_time_raw} mode="time" display={Platform.OS === "ios" ? "spinner" : "default"} is24Hour={true} onChange={(e, d) => { setShowStartTimePicker(false); if(d) setFormData(p => ({...p, start_time_raw: d})); }} />
      )}
      {showEndTimePicker && (
        <DateTimePicker value={formData.end_time_raw} mode="time" display={Platform.OS === "ios" ? "spinner" : "default"} is24Hour={true} onChange={(e, d) => { setShowEndTimePicker(false); if(d) setFormData(p => ({...p, end_time_raw: d})); }} />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: { paddingTop: 50, paddingBottom: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.15)", justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "white" },

  scroll: { paddingBottom: 50 },
  form: { paddingHorizontal: 16, marginTop: 15, gap: 12 },
  
  heroBox: { height: 160, backgroundColor: "white", borderRadius: 20, overflow: "hidden", elevation: 8, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 10 },
  heroImg: { ...StyleSheet.absoluteFillObject },
  heroPlaceholder: { flex: 1, justifyContent: "center", alignItems: "center", gap: 5 },
  heroIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: "#EFF6FF", justifyContent: "center", alignItems: "center", marginBottom: 5 },
  heroLabel: { fontSize: 15, fontWeight: "700", color: "#1E293B" },
  heroSub: { fontSize: 11, color: "#94A3B8" },
  imgLoader: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.3)", justifyContent: "center", alignItems: "center" },

  mainForm: { gap: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  sectionLabel: { fontSize: 10, fontWeight: "800", color: "#94A3B8", letterSpacing: 1.2, marginLeft: 5 },
  statusTag: { backgroundColor: '#FEF2F2', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  statusTagTxt: { color: '#EF4444', fontSize: 9, fontWeight: '800', textTransform: 'uppercase' },

  card: { backgroundColor: "white", borderRadius: 16, padding: 12, elevation: 3, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 5, borderWidth: 1, borderColor: 'transparent' },
  cardError: { borderColor: '#FEE2E2', backgroundColor: '#FFFAFA' },
  field: { flexDirection: "row", alignItems: "center", gap: 10, height: 36, position: 'relative' },
  input: { flex: 1, fontSize: 14, fontWeight: "600", color: "#334155" },
  hDivider: { height: 1, backgroundColor: "#F1F5F9", marginVertical: 8 },
  miniError: { color: "#EF4444", fontSize: 9, fontWeight: "800", position: 'absolute', right: 0 },

  compactRow: { flexDirection: "row", alignItems: "center", height: 36 },
  compactItem: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  compactVal: { fontSize: 14, fontWeight: "700", color: "#334155" },
  vDivider: { width: 1, height: 20, backgroundColor: "#E2E8F0", marginHorizontal: 12 },
  timeToggle: { flexDirection: "row", alignItems: "center", gap: 4 },
  toggleLabel: { fontSize: 12, fontWeight: "600", color: "#64748B" },

  timeRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#F1F5F9" },
  timePill: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#F8FAFC", paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: "#F1F5F9" },
  pillLab: { fontSize: 9, fontWeight: "700", color: "#94A3B8" },
  pillVal: { fontSize: 13, fontWeight: "800", color: "#334155" },
  rowError: { fontSize: 10, color: "#EF4444", fontWeight: "700", marginTop: 10, textAlign: 'center' },

  dropdown: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", height: 36 },
  dropLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  dropLabel: { fontSize: 14, fontWeight: "700", color: "#334155" },

  chipBox: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#F1F5F9" },
  chip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  chipDot: { width: 5, height: 5, borderRadius: 2.5 },
  chipTxt: { fontSize: 10, fontWeight: "800" },

  smallLabel: { fontSize: 9, fontWeight: "900", color: "#94A3B8", letterSpacing: 0.5, marginBottom: 8 },
  textArea: { fontSize: 14, fontWeight: "600", color: "#334155", minHeight: 60, textAlignVertical: "top" },
  errorTxt: { fontSize: 10, color: "#EF4444", fontWeight: "700", marginTop: 5 },

  submitWrapper: { marginTop: 25, paddingBottom: 20 },
  mainBtn: { height: 60, borderRadius: 18, overflow: "hidden", elevation: 8, shadowColor: "#0F172A", shadowOpacity: 0.2, shadowRadius: 15 },
  btnGrad: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center" },
  btnTxt: { color: "white", fontWeight: "900", fontSize: 16, letterSpacing: 0.5 },
  btnOff: { opacity: 0.2 },
  finalHelp: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 15 },
  finalHelpTxt: { fontSize: 12, color: "#EF4444", fontWeight: "700" },

  modalBack: { flex: 1, backgroundColor: "rgba(15,23,42,0.6)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "white", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: height * 0.7 },
  modalHandle: { width: 36, height: 4, backgroundColor: "#E2E8F0", borderRadius: 2, alignSelf: "center", marginBottom: 15 },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#1E293B", marginBottom: 15 },
  modalList: { gap: 8, paddingBottom: 20 },
  modalItem: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "#F1F5F9" },
  modalDot: { width: 10, height: 10, borderRadius: 5 },
  modalItemTxt: { flex: 1, fontSize: 14, fontWeight: "600", color: "#475569" },
  modalBtn: { backgroundColor: "#0F172A", paddingVertical: 14, borderRadius: 14, alignItems: "center", marginTop: 10 },
  modalBtnTxt: { color: "white", fontWeight: "800", fontSize: 15 },
});

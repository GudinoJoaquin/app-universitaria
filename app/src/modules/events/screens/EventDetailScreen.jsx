
// EventDetailsScreen.jsx - Versión corregida
import React, { useState, useEffect } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, Alert,
  StatusBar, StyleSheet, Dimensions, ActivityIndicator, Modal, TextInput, Pressable
} from "react-native";
import { useAuth } from "../../auth/context/AuthContext";
import { supabase } from "../../shared/services/supabase";
import { getEventParticipants, registerToEvent, unregisterFromEvent, getMyRegistrations } from "../services/eventsRegistrationService";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";

const { width, height } = Dimensions.get("window");

const parseDate = (d) => {
  if (!d) return new Date(0);
  const clean = d.replace(/[\s]*[+-]\d{2}:\d{2}$/, "").replace(/Z$/, "").trim();
  return new Date(clean.replace(" ", "T") + "Z");
};

const formatTimeRange = (start, end) => {
  if (!start) return "Todo el día";
  const s = start.includes("T") ? start.split("T")[1].slice(0, 5) : start.slice(0, 5);
  if (!end) return `${s} hs`;
  const e = end.includes("T") ? end.split("T")[1].slice(0, 5) : end.slice(0, 5);
  return `${s} - ${e} hs`;
};

export default function EventDetailsScreen({ route, navigation }) {
  const { event } = route.params;
  const { user, isAdmin } = useAuth();
  const [participants, setParticipants] = useState([]);
  const [loadingParticipants, setLoadingParticipants] = useState(true);
  const [isRegistered, setIsRegistered] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [participantSearch, setParticipantSearch] = useState("");
  const [participantRoleFilter, setParticipantRoleFilter] = useState("all");
  const [menuVisible, setMenuVisible] = useState(false);

  const canViewParticipants = isAdmin() || user?.id === event.created_by || user?.role === "Helper";

  useEffect(() => {
    const loadData = async () => {
      const [pRes, myRes] = await Promise.all([
        getEventParticipants(event.id),
        getMyRegistrations(user.id)
      ]);
      if (pRes.success) setParticipants(pRes.data);
      if (myRes.success) setIsRegistered(myRes.data.some(e => e.id === event.id));
      setLoadingParticipants(false);
    };
    loadData();
  }, [event.id, user.id]);

  const handleToggleRegistration = async () => {
    setActionLoading(true);
    if (isRegistered) {
      Alert.alert("Cancelar Inscripción", "¿Seguro?", [
        { text: "No", style: "cancel", onPress: () => setActionLoading(false) },
        {
          text: "Sí", style: "destructive", onPress: async () => {
            const res = await unregisterFromEvent(user.id, event.id);
            if (res.success) {
              setIsRegistered(false);
              setParticipants(p => p.filter(u => u.id !== user.id));
            } else Alert.alert("Error", res.error);
            setActionLoading(false);
          }
        }
      ]);
    } else {
      const res = await registerToEvent(user.id, event.id);
      if (res.success) {
        setIsRegistered(true);
        setParticipants(p => [...p, { id: user.id, name: user.name, email: user.email, role: user.role }]);
      } else Alert.alert("Error", res.error);
      setActionLoading(false);
    }
  };

  const handleDeleteEvent = () => {
    Alert.alert(
      "Eliminar Evento",
      "¿Estás seguro de que deseas eliminar este evento? Esta acción no se puede deshacer.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            setActionLoading(true);
            const { error } = await supabase.from("events").delete().eq("id", event.id);
            if (error) {
              Alert.alert("Error", "No se pudo eliminar el evento");
              setActionLoading(false);
            } else {
              navigation.goBack();
            }
          }
        }
      ]
    );
  };

  const formatDate = (dateString) => {
    const date = parseDate(dateString);
    return date.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  };

  const getStatus = (dateStr, sTime, eTime) => {
    const now = new Date();
    const eventDate = parseDate(dateStr);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const target = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());

    if (target < today) return { label: "FINALIZADO", color: "#64748B", bg: "#F1F5F9" };
    if (target > today) return { label: "PROGRAMADO", color: "#3B82F6", bg: "#EFF6FF" };
    return { label: "EN PROCESO", color: "#10B981", bg: "#ECFDF5" };
  };

  const status = getStatus(event.date, event.start_time, event.end_time);
  
  // Solo los Admins pueden gestionar eventos FINALIZADOS.
  // Los creadores pueden gestionar sus eventos siempre que NO estén FINALIZADOS.
  const canManageEvent = isAdmin() || (user?.id === event.created_by && status.label !== "FINALIZADO");

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Controles Fijos Superiores */}
      <View style={s.fixedControls}>
        <TouchableOpacity style={s.fixedBackBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>

        {canManageEvent && (
          <TouchableOpacity style={s.fixedMenuBtn} onPress={() => setMenuVisible(true)}>
            <Ionicons name="ellipsis-vertical" size={24} color="white" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scrollContent}
      >
        {/* Hero Image */}
        <View style={s.hero}>
          {event.image_url ? (
            <Image source={{ uri: event.image_url }} style={s.heroImg} contentFit="cover" />
          ) : (
            <LinearGradient colors={["#1E1B4B", "#0F172A"]} style={s.heroImg} />
          )}
          <LinearGradient
            colors={["rgba(0,0,0,0.5)", "transparent", "rgba(15, 23, 42, 0.95)"]}
            style={StyleSheet.absoluteFill}
          />
          <View style={s.heroMeta}>
            <View style={[s.statusBadge, { backgroundColor: status.bg }]}>
              <Text style={[s.statusTxt, { color: status.color }]}>{status.label}</Text>
            </View>
            <Text style={s.title} numberOfLines={3}>{event.title}</Text>
          </View>
        </View>

        {/* Contenido */}
        <View style={s.body}>
          {/* Grid de info - corregido */}
          <View style={s.infoGrid}>
            <View style={s.infoCard}>
              <View style={[s.iconBox, { backgroundColor: "#EFF6FF" }]}>
                <Ionicons name="calendar" size={20} color="#3B82F6" />
              </View>
              <View style={s.infoTextContainer}>
                <Text style={s.infoLabel}>FECHA</Text>
                <Text style={s.infoVal} numberOfLines={2}>{formatDate(event.date)}</Text>
              </View>
            </View>
            <View style={s.infoCard}>
              <View style={[s.iconBox, { backgroundColor: "#FEF2F2" }]}>
                <Ionicons name="time" size={20} color="#EF4444" />
              </View>
              <View style={s.infoTextContainer}>
                <Text style={s.infoLabel}>HORARIO</Text>
                <Text style={s.infoVal} numberOfLines={2}>{formatTimeRange(event.start_time, event.end_time)}</Text>
              </View>
            </View>
          </View>

          {/* Ubicación */}
          <View style={s.locationCard}>
            <View style={[s.iconBox, { backgroundColor: "#ECFDF5" }]}>
              <Ionicons name="location" size={20} color="#10B981" />
            </View>
            <View style={s.locationTextContainer}>
              <Text style={s.infoLabel}>UBICACIÓN</Text>
              <Text style={s.infoVal} numberOfLines={3}>{event.location}</Text>
            </View>
          </View>

          {/* Descripción */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Sobre el evento</Text>
            <Text style={s.desc}>
              {event.description || "Sin descripción proporcionada."}
            </Text>
          </View>

          {/* Creador */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Organizado por</Text>
            <View style={s.creatorCard}>
              <View style={s.creatorAvatar}>
                {event.profiles?.avatar_url ? (
                  <Image source={{ uri: event.profiles.avatar_url }} style={s.creatorAvatarImg} contentFit="cover" />
                ) : (
                  <Text style={s.creatorAvatarTxt}>{event.profiles?.name?.[0]?.toUpperCase() || "?"}</Text>
                )}
              </View>
              <View>
                <Text style={s.creatorName}>{event.profiles?.name}</Text>
                <View style={s.creatorStatesRow}>
                  {event.profiles?.states?.length > 0 ? (
                    event.profiles.states.map((st, i) => (
                      <View key={i} style={[s.creatorStateChip, { backgroundColor: st.color + '15' }]}>
                        <View style={[s.creatorStateDot, { backgroundColor: st.color }]} />
                        <Text style={[s.creatorStateTxt, { color: st.color }]}>{st.name}</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={s.creatorRole}>Organizador</Text>
                  )}
                </View>
              </View>
            </View>
          </View>

          {/* Categorías */}
          {event.categories?.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Categorías</Text>
              <View style={s.catRow}>
                {event.categories.map(c => (
                  <View key={c.id} style={[s.catTag, { borderColor: c.color, backgroundColor: c.color + "10" }]}>
                    <Text style={[s.catTagTxt, { color: c.color }]}>{c.name}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Participantes */}
          <View style={s.section}>
            <TouchableOpacity
              style={s.pHeader}
              activeOpacity={canViewParticipants ? 0.7 : 1}
              onPress={() => canViewParticipants && setModalVisible(true)}
            >
              <Text style={s.sectionTitle}>Participantes</Text>
              <View style={s.pCountRow}>
                <Text style={s.pCount}>{participants.length} inscritos</Text>
                {canViewParticipants && <Ionicons name="chevron-forward" size={14} color="#3B82F6" />}
              </View>
            </TouchableOpacity>
            {loadingParticipants ? (
              <ActivityIndicator size="small" color="#3B82F6" />
            ) : participants.length > 0 ? (
              <TouchableOpacity
                style={s.pList}
                activeOpacity={canViewParticipants ? 0.7 : 1}
                onPress={() => canViewParticipants && setModalVisible(true)}
              >
                {participants.slice(0, 5).map((p, i) => (
                  <View
                    key={p.id}
                    style={[
                      s.pAvatar,
                      { marginLeft: i === 0 ? 0 : -12, zIndex: participants.length - i }
                    ]}
                  >
                    {p.avatar_url ? (
                      <Image source={{ uri: p.avatar_url }} style={s.avatarImg} contentFit="cover" />
                    ) : (
                      <Text style={s.pAvatarTxt}>{p.name?.[0]?.toUpperCase() || "?"}</Text>
                    )}
                  </View>
                ))}
                {participants.length > 5 && (
                  <View style={[s.pMore, { marginLeft: -12 }]}>
                    <Text style={s.pMoreTxt}>+{participants.length - 5}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ) : (
              <Text style={s.noParticipants}>Aún no hay participantes inscritos.</Text>
            )}
          </View>
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Action Bar fijo simplificado */}
      <View style={s.actionBar}>
        <LinearGradient colors={["rgba(255,255,255,0)", "white", "white"]} style={s.actionBarBg} />
        <TouchableOpacity
          style={[s.mainBtn, (isRegistered || status.label === "FINALIZADO") && s.mainBtnReg]}
          onPress={handleToggleRegistration}
          disabled={actionLoading || status.label === "FINALIZADO"}
        >
          <LinearGradient
            colors={isRegistered || status.label === "FINALIZADO" ? ["#F1F5F9", "#E2E8F0"] : ["#1E1B4B", "#312E81"]}
            style={s.btnGradient}
          >
            {actionLoading ? (
              <ActivityIndicator color={isRegistered || status.label === "FINALIZADO" ? "#1E1B4B" : "white"} />
            ) : (
              <>
                <Ionicons
                  name={isRegistered ? "checkmark-circle" : (status.label === "FINALIZADO" ? "time" : "calendar")}
                  size={22}
                  color={isRegistered ? "#10B981" : (status.label === "FINALIZADO" ? "#94A3B8" : "white")}
                  style={{ marginRight: 10 }}
                />
                <Text style={[s.btnTxt, (isRegistered || status.label === "FINALIZADO") && { color: "#475569" }]}>
                  {status.label === "FINALIZADO"
                    ? (isRegistered ? "Asistido" : "Evento Finalizado")
                    : (isRegistered ? "Inscrito" : "Inscribirme al Evento")}
                </Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Menú de Gestión (Modal) */}
      <Modal visible={menuVisible} transparent animationType="fade">
        <Pressable style={s.menuOverlay} onPress={() => setMenuVisible(false)}>
          <View style={s.menuSheet}>
            <View style={s.menuHandle} />
            <Text style={s.menuTitle}>Gestión de Evento</Text>

            <TouchableOpacity
              style={s.menuItem}
              onPress={() => {
                setMenuVisible(false);
                navigation.navigate("CreateEvent", { event });
              }}
            >
              <View style={[s.menuIconBox, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="create-outline" size={20} color="#3B82F6" />
              </View>
              <Text style={s.menuItemTxt}>Editar Evento</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={s.menuItem}
              onPress={() => {
                setMenuVisible(false);
                handleDeleteEvent();
              }}
            >
              <View style={[s.menuIconBox, { backgroundColor: '#FEE2E2' }]}>
                <Ionicons name="trash-outline" size={20} color="#EF4444" />
              </View>
              <Text style={[s.menuItemTxt, { color: '#EF4444' }]}>Eliminar Evento</Text>
            </TouchableOpacity>

            <TouchableOpacity style={s.menuCancelBtn} onPress={() => setMenuVisible(false)}>
              <Text style={s.menuCancelBtnTxt}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* Modal Participantes Detallado */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        statusBarTranslucent={true}
      >
        <View style={s.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setModalVisible(false)} />
          <View style={[s.modalSheet, { height: height * 0.85 }]}>
            <View style={s.modalHandle} />

            <View style={s.modalHeaderDetailed}>
              <View>
                <Text style={s.modalHeaderTitleDetailed}>Participantes</Text>
                <Text style={s.modalHeaderSubDetailed}>{event.title}</Text>
              </View>
              <View style={s.participantsCountBadge}>
                <Text style={s.participantsCountTxt}>{participants.length}</Text>
              </View>
            </View>

            {/* Controles de Búsqueda y Filtro */}
            <View style={s.participantControls}>
              <View style={s.pSearchBox}>
                <Ionicons name="search" size={18} color="#94A3B8" />
                <TextInput
                  style={s.pSearchInput}
                  placeholder="Buscar nombre o email..."
                  placeholderTextColor="#94A3B8"
                  value={participantSearch}
                  onChangeText={setParticipantSearch}
                />
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.pFilterScroll}>
                {['all', 'Admin', 'Helper', 'Organizer', 'User'].map(role => (
                  <TouchableOpacity
                    key={role}
                    style={[s.pFilterPill, participantRoleFilter === role && s.pFilterPillActive]}
                    onPress={() => setParticipantRoleFilter(role)}
                  >
                    <Text style={[s.pFilterPillTxt, participantRoleFilter === role && s.pFilterPillTxtActive]}>
                      {role === 'all' ? 'Todos' : role === 'User' ? 'Estudiantes' : role}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
              {participants
                .filter(p => {
                  const matchesSearch = p.name?.toLowerCase().includes(participantSearch.toLowerCase()) || p.email?.toLowerCase().includes(participantSearch.toLowerCase());
                  const matchesRole = participantRoleFilter === 'all' || p.role === participantRoleFilter;
                  return matchesSearch && matchesRole;
                })
                .map((p, index, filtered) => (
                  <TouchableOpacity
                    key={p.id}
                    style={[s.participantCardDetailed, index === filtered.length - 1 && { borderBottomWidth: 0 }]}
                    onPress={() => {
                      if (isAdmin() || user?.role === "Helper") {
                        setModalVisible(false);
                        navigation.navigate("UserProfile", { userId: p.id });
                      }
                    }}
                  >
                    <View style={[s.pAvatarDetailed, { backgroundColor: p.role === "Admin" ? "#FEE2E2" : "#EFF6FF" }]}>
                      {p.avatar_url ? (
                        <Image source={{ uri: p.avatar_url }} style={s.avatarImgDetailed} contentFit="cover" />
                      ) : (
                        <Text style={[s.pAvatarTxtDetailed, { color: p.role === "Admin" ? "#EF4444" : "#3B82F6" }]}>
                          {p.name?.[0]?.toUpperCase() || "?"}
                        </Text>
                      )}
                    </View>

                    <View style={s.pInfoDetailed}>
                      <View style={s.pNameRowDetailed}>
                        <Text style={s.pNameDetailed}>{p.name}</Text>
                        <View style={[s.roleBadgeDetailed, { backgroundColor: p.role === "Admin" ? "#EF444415" : "#3B82F615" }]}>
                          <Text style={[s.roleBadgeTxtDetailed, { color: p.role === "Admin" ? "#EF4444" : "#3B82F6" }]}>
                            {p.role}
                          </Text>
                        </View>
                      </View>
                      <Text style={s.pEmailDetailed}>{p.email}</Text>
                    </View>

                    {(isAdmin() || user?.role === "Helper") && (
                      <View style={s.pActionBtnDetailed}>
                        <Ionicons name="person-outline" size={16} color="#3B82F6" />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              {participants.length > 0 && participants.filter(p => {
                const matchesSearch = p.name?.toLowerCase().includes(participantSearch.toLowerCase()) || p.email?.toLowerCase().includes(participantSearch.toLowerCase());
                const matchesRole = participantRoleFilter === 'all' || p.role === participantRoleFilter;
                return matchesSearch && matchesRole;
              }).length === 0 && (
                  <View style={s.emptyModalDetailed}>
                    <Text style={s.emptyModalTitleDetailed}>Sin resultados</Text>
                    <Text style={s.emptyModalSubDetailed}>Prueba con otros filtros o términos</Text>
                  </View>
                )}
            </ScrollView>

            <TouchableOpacity style={s.modalCloseBtnDetailed} onPress={() => setModalVisible(false)}>
              <Text style={s.modalCloseBtnTxtDetailed}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "white" },
  scrollContent: { paddingBottom: 20 },

  hero: {
    height: height * 0.45,
    justifyContent: "flex-end",
    padding: 20,
    position: "relative",
  },
  heroImg: { ...StyleSheet.absoluteFillObject },
  fixedControls: {
    position: "absolute",
    top: 50,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    zIndex: 100,
  },
  fixedBackBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(15, 23, 42, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  fixedMenuBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(15, 23, 42, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  heroMeta: { gap: 12, marginBottom: 20 },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusTxt: { fontSize: 11, fontWeight: "900" },
  title: {
    fontSize: 28,
    fontWeight: "900",
    color: "white",
    letterSpacing: -0.5,
    lineHeight: 36,
  },

  body: { paddingHorizontal: 20, marginTop: -25, backgroundColor: "white", borderTopLeftRadius: 25, borderTopRightRadius: 25, paddingTop: 20 },

  infoGrid: { flexDirection: "row", gap: 12, marginBottom: 12 },
  infoCard: {
    flex: 1,
    backgroundColor: "white",
    borderRadius: 20,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  iconBox: { width: 42, height: 42, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  infoTextContainer: { flex: 1 },
  infoLabel: { fontSize: 10, fontWeight: "900", color: "#94A3B8", letterSpacing: 0.5, marginBottom: 4 },
  infoVal: { fontSize: 13, fontWeight: "700", color: "#1E293B", lineHeight: 18 },

  locationCard: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    marginBottom: 8,
  },
  locationTextContainer: { flex: 1 },

  section: { marginTop: 24 },
  sectionTitle: { fontSize: 18, fontWeight: "900", color: "#1E293B", marginBottom: 12 },
  desc: { fontSize: 15, color: "#475569", lineHeight: 24, fontWeight: "500" },

  catRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  catTag: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  catTagTxt: { fontSize: 13, fontWeight: "700" },

  pHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  pCount: { fontSize: 13, fontWeight: "700", color: "#3B82F6", backgroundColor: "#EFF6FF", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  pList: { flexDirection: "row", alignItems: "center", flexWrap: "wrap" },
  pAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: "white",
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    overflow: 'hidden',
  },
  avatarImg: { width: '100%', height: '100%' },
  pAvatarTxt: { fontWeight: "900", color: "#4F46E5", fontSize: 16 },
  pMore: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#E2E8F0",
  },
  pMoreTxt: { fontSize: 12, fontWeight: "800", color: "#64748B" },
  noParticipants: { fontSize: 14, color: "#94A3B8", textAlign: "center", paddingVertical: 20 },

  actionBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 30,
    paddingTop: 10,
  },
  actionBarBg: { position: "absolute", bottom: 0, left: 0, right: 0, height: 130 },
  actionRow: { flexDirection: "row", gap: 12 },
  editBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  mainBtn: { flex: 1, height: 56, borderRadius: 28, overflow: "hidden", elevation: 5 },
  mainBtnReg: { elevation: 2 },
  btnGradient: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center" },
  btnTxt: { color: "white", fontSize: 16, fontWeight: "900" },

  creatorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#F1F5F9'
  },
  creatorAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#E0E7FF', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  creatorAvatarImg: { width: '100%', height: '100%' },
  creatorAvatarTxt: { fontSize: 18, fontWeight: '900', color: '#4338CA' },
  creatorName: { fontSize: 15, fontWeight: '800', color: '#1E293B' },
  creatorRole: { fontSize: 12, color: '#94A3B8', fontWeight: '600' },
  creatorStatesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  creatorStateChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  creatorStateDot: { width: 4, height: 4, borderRadius: 2 },
  creatorStateTxt: { fontSize: 10, fontWeight: '700' },

  // Estilos del Modal de Participantes
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: 'white', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 20 },
  modalHandle: { width: 40, height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },

  modalHeaderDetailed: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalHeaderTitleDetailed: { fontSize: 24, fontWeight: '900', color: '#1E293B' },
  modalHeaderSubDetailed: { fontSize: 14, color: '#64748B', fontWeight: '500', marginTop: 2 },

  participantsCountBadge: { backgroundColor: '#EFF6FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  participantsCountTxt: { color: '#3B82F6', fontWeight: '800', fontSize: 16 },

  participantControls: { marginBottom: 20 },
  pSearchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 12, paddingHorizontal: 12, height: 46, marginBottom: 12 },
  pSearchInput: { flex: 1, marginLeft: 10, fontSize: 14, color: '#1E293B', fontWeight: '600' },
  pFilterScroll: { gap: 8 },
  pFilterPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' },
  pFilterPillActive: { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
  pFilterPillTxt: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  pFilterPillTxtActive: { color: 'white' },

  participantCardDetailed: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  pAvatarDetailed: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  avatarImgDetailed: { width: '100%', height: '100%' },
  pAvatarTxtDetailed: { fontSize: 18, fontWeight: '900' },
  pInfoDetailed: { flex: 1, marginLeft: 16 },
  pNameRowDetailed: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pNameDetailed: { fontSize: 16, fontWeight: '800', color: '#1E293B' },
  roleBadgeDetailed: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  roleBadgeTxtDetailed: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  pEmailDetailed: { fontSize: 13, color: '#64748B', marginTop: 2 },
  pActionBtnDetailed: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center' },

  emptyModalDetailed: { alignItems: 'center', paddingVertical: 40 },
  emptyModalTitleDetailed: { fontSize: 16, fontWeight: '800', color: '#1E293B' },
  emptyModalSubDetailed: { fontSize: 14, color: '#94A3B8', marginTop: 4 },

  modalCloseBtnDetailed: { backgroundColor: '#1E293B', height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  modalCloseBtnTxtDetailed: { color: 'white', fontSize: 16, fontWeight: '900' },

  pCountRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },

  // Estilos del Menú de Gestión
  menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  menuSheet: { backgroundColor: 'white', width: '85%', borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
  menuTitle: { fontSize: 18, fontWeight: '900', color: '#1E293B', marginBottom: 20, textAlign: 'center' },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 15, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  menuIconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  menuItemTxt: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  menuCancelBtn: { marginTop: 20, paddingVertical: 12, alignItems: 'center' },
  menuCancelBtnTxt: { fontSize: 14, fontWeight: '800', color: '#94A3B8' },
});




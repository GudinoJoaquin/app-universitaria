import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, Alert,
  StatusBar, ActivityIndicator, StyleSheet, RefreshControl, Dimensions
} from "react-native";
import { Image } from "expo-image";
import { useAuth } from "../../auth/context/AuthContext";
import { supabase } from "../../shared/services/supabase";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import SettingsModal from "../components/SettingsModal";
import { useNavigation } from "@react-navigation/native";

const { width } = Dimensions.get("window");

const ROLE_CONFIG = {
  Admin: { label: "Admin", color: "#EF4444", icon: "shield-checkmark" },
  Helper: { label: "Helper", color: "#8B5CF6", icon: "briefcase" },
  Organizer: { label: "Organizador", color: "#F59E0B", icon: "calendar" },
  User: { label: "Estudiante", color: "#3B82F6", icon: "person" },
};

export default function ProfileScreen() {
  const { user, setUser, logout } = useAuth();
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    attended: 0, inscribed: 0, created: 0, finished: 0, nextEvent: null, totalAvailable: 0
  });
  const [settingsVisible, setSettingsVisible] = useState(false);

  const loadStats = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data: userRegs } = await supabase
        .from("event_registrations")
        .select("*, events(*, categories:event_categories_junction(categories(*)))")
        .eq("user_id", user.id);

      const regs = (userRegs || []).map(r => ({
        ...r,
        events: {
          ...r.events,
          categories: (r.events?.categories ?? []).map(j => j.categories).filter(Boolean)
        }
      }));

      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const isoNow = now.toISOString().split('T')[0];

      const attended = regs.filter(r => new Date(r.events.date) < now).length;
      const inscribed = regs.filter(r => new Date(r.events.date) >= now).length;

      const registeredEventIds = regs.map(r => r.event_id);
      const { data: availableEvents } = await supabase
        .from("events")
        .select("id")
        .gte("date", isoNow)
        .neq("created_by", user.id);

      const realAvailable = (availableEvents || []).filter(e => !registeredEventIds.includes(e.id)).length;

      let created = 0, finished = 0;
      if (user.role !== 'User') {
        const { data: myEvents } = await supabase.from("events").select("*").eq("created_by", user.id);
        created = myEvents?.length || 0;
        finished = myEvents?.filter(e => new Date(e.date) < now).length || 0;
      }

      const nextEv = regs
        .map(r => r.events)
        .filter(e => {
          const evDate = new Date(e.date);
          evDate.setHours(23, 59, 59, 999);
          return evDate >= new Date();
        })
        .sort((a, b) => new Date(a.date) - new Date(b.date))[0];

      setStats({
        attended, inscribed, created, finished, nextEvent: nextEv,
        totalAvailable: realAvailable
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, user.role]);

  useEffect(() => { loadStats(); }, [loadStats]);

  const roleInfo = ROLE_CONFIG[user?.role] ?? ROLE_CONFIG.User;
  const isManager = user?.role !== 'User';

  const AnalyticRing = ({ value, label, colors, icon }) => (
    <View style={s.ringItem}>
      <View style={s.ringOuter}>
        <LinearGradient colors={colors} style={s.ringGradient}>
          <View style={s.ringHole}>
            <Text style={s.ringValue}>{value}</Text>
          </View>
        </LinearGradient>
      </View>
      <View style={s.ringLabelBox}>
        <Ionicons name={icon} size={14} color={colors[0]} />
        <Text style={[s.ringLabel, { color: '#475569' }]}>{label}</Text>
      </View>
    </View>
  );

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadStats(); }} tintColor="white" />}
      >
        {/* HERO */}
        <LinearGradient colors={["#0F172A", "#1E293B"]} style={s.hero}>
          <TouchableOpacity style={s.settingsIcon} onPress={() => setSettingsVisible(true)}>
            <Ionicons name="settings-outline" size={22} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>

          <View style={s.headerContent}>
            <View style={s.avatarSection}>
              <View style={s.avatarWrap}>
                {user?.avatar_url ? (
                  <Image source={{ uri: user.avatar_url }} style={s.avatar} contentFit="cover" />
                ) : (
                  <View style={s.avatarPlaceholder}>
                    <Text style={s.avatarPlaceholderTxt}>{user?.name?.[0]?.toUpperCase()}</Text>
                  </View>
                )}
                <View style={[s.roleBadge, { backgroundColor: roleInfo.color }]}>
                  <Ionicons name={roleInfo.icon} size={10} color="white" />
                </View>
              </View>
              <View style={[s.roleTag, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
                <Text style={[s.roleTagTxt, { color: "white" }]}>{roleInfo.label}</Text>
              </View>
            </View>

            <View style={s.infoSection}>
              <Text style={s.userName}>{user?.name}</Text>
              <Text style={s.userEmail} numberOfLines={1}>{user?.email}</Text>

              {user?.states?.length > 0 && (
                <View style={s.miniStates}>
                  {user.states.map(st => (
                    <View key={st.id} style={s.miniStateItem}>
                      <View style={[s.dot, { backgroundColor: st.color }]} />
                      <Text style={s.miniStateTxt}>{st.name}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        </LinearGradient>

        <View style={s.content}>
          {/* SECCIÓN EVENTOS */}
          <View style={s.section}>
            <View style={s.rowHeader}>
              <Ionicons name="calendar-outline" size={18} color="#1E293B" />
              <Text style={s.mainSectionTitle}>Eventos</Text>
            </View>

            {/* Próximo Evento */}
            {stats.nextEvent ? (
              <TouchableOpacity style={s.eventCard} onPress={() => navigation.navigate("EventDetails", { event: stats.nextEvent })}>
                <View style={s.eventCardImgBox}>
                  <Image source={{ uri: stats.nextEvent.image_url || "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4" }} style={s.eventCardImg} contentFit="cover" />
                  <LinearGradient colors={["transparent", "rgba(0,0,0,0.6)"]} style={StyleSheet.absoluteFill} />
                  <View style={s.eventDateBadge}>
                    <Text style={s.eventDateDay}>{new Date(stats.nextEvent.date).getUTCDate()}</Text>
                    <Text style={s.eventDateMonth}>{new Date(stats.nextEvent.date).toLocaleDateString('es-ES', { month: 'short' }).toUpperCase()}</Text>
                  </View>
                </View>
                <View style={s.eventCardInfo}>
                  <Text style={s.eventTitle} numberOfLines={1}>{stats.nextEvent.title}</Text>
                  <View style={s.eventMetaRow}>
                    <View style={s.eventMetaItem}>
                      <Ionicons name="location-outline" size={14} color="#64748B" />
                      <Text style={s.eventMetaTxt}>{stats.nextEvent.location}</Text>
                    </View>
                    <View style={s.eventMetaItem}>
                      <Ionicons name="time-outline" size={14} color="#3B82F6" />
                      <Text style={s.eventMetaTxt}>{new Date(stats.nextEvent.start_time).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} hs</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ) : (
              <View style={s.emptyBox}><Text style={s.emptyBoxTxt}>Sin eventos próximos</Text></View>
            )}

            {/* Botones de acción */}
            <View style={s.actionGrid}>
              <View style={s.actionRow}>
                <TouchableOpacity
                  style={[s.actionBtn, { backgroundColor: "#EEF2FF" }]}
                  onPress={() => navigation.navigate("EventsTab")}
                >
                  <View style={s.actionIconBox}><Ionicons name="search" size={20} color="#4F46E5" /></View>
                  <View>
                    <Text style={s.actionBtnTitle}>Disponibles</Text>
                    <Text style={s.actionBtnInfo}>
                      {stats.totalAvailable === 0 ? "Ninguno" : `${stats.totalAvailable} Disponibles`}
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[s.actionBtn, { backgroundColor: "#ECFDF5" }]}
                  onPress={() => navigation.navigate("EventsTab")}
                >
                  <View style={[s.actionIconBox, { backgroundColor: "#10B98120" }]}><Ionicons name="ticket" size={20} color="#10B981" /></View>
                  <View>
                    <Text style={s.actionBtnTitle}>Inscritos</Text>
                    <Text style={[s.actionBtnInfo, { color: "#10B981" }]}>
                      {stats.inscribed === 0 ? "Sin eventos" : `${stats.inscribed} Eventos`}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              {isManager && (
                <TouchableOpacity
                  style={[s.actionBtnWide, { backgroundColor: "#FFF7ED" }]}
                  onPress={() => navigation.navigate("CreateEvent")}
                >
                  <View style={[s.actionIconBox, { backgroundColor: "#F59E0B20" }]}><Ionicons name="add-circle" size={24} color="#F59E0B" /></View>
                  <View>
                    <Text style={[s.actionBtnTitle, { color: "#92400E" }]}>Crear Evento</Text>
                    <Text style={[s.actionBtnInfo, { color: "#F59E0B" }]}>Acceso rápido</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#FDBA74" style={{ marginLeft: 'auto' }} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* MÉTRICAS DE ACTIVIDAD */}
          <View style={s.metricsSection}>
            <View style={s.rowHeader}>
              <Ionicons name="stats-chart" size={16} color="#1E293B" />
              <Text style={s.mainSectionTitle}>Actividad</Text>
            </View>
            <View style={s.ringsContainer}>
              <AnalyticRing
                value={stats.attended}
                label="Eventos asistidos"
                colors={["#10B981", "#34D399"]}
                icon="checkmark-done-circle"
              />
              {isManager && (
                <AnalyticRing
                  value={stats.created}
                  label="Eventos Creados"
                  colors={["#F59E0B", "#FBBF24"]}
                  icon="add-circle"
                />
              )}
            </View>
          </View>

          <TouchableOpacity style={s.logoutBtn} onPress={() => {
            Alert.alert("Cerrar Sesión", "¿Salir?", [{ text: "No" }, { text: "Sí", onPress: logout, style: "destructive" }]);
          }}>
            <Ionicons name="log-out-outline" size={20} color="#EF4444" />
            <Text style={s.logoutTxt}>Cerrar Sesión</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <SettingsModal visible={settingsVisible} onClose={() => setSettingsVisible(false)} user={user} onUpdate={(u) => setUser(u)} />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  hero: {
    paddingTop: 46,
    paddingBottom: 26,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    elevation: 8,
  },
  settingsIcon: { alignSelf: "flex-end", padding: 4, marginBottom: 0 },
  headerContent: { flexDirection: "row", alignItems: "flex-start", gap: 20, marginTop: -10 },

  avatarSection: { alignItems: "center", gap: 4 },
  avatarWrap: { position: "relative" },
  avatar: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: "rgba(255,255,255,0.2)" },
  avatarPlaceholder: { width: 80, height: 80, borderRadius: 40, backgroundColor: "rgba(255,255,255,0.1)", justifyContent: "center", alignItems: "center" },
  avatarPlaceholderTxt: { fontSize: 32, fontWeight: "900", color: "white" },
  roleBadge: { position: "absolute", bottom: 0, right: 0, width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: "#0F172A", justifyContent: "center", alignItems: "center" },

  roleTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  roleTagTxt: { fontSize: 8, fontWeight: "900", textTransform: "uppercase" },

  infoSection: { flex: 1, paddingTop: 5 },
  userName: { fontSize: 24, fontWeight: "900", color: "white" },
  userEmail: { fontSize: 13, color: "rgba(255,255,255,0.6)", marginBottom: 12 },

  miniStates: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  miniStateItem: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.1)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  dot: { width: 5, height: 5, borderRadius: 2.5 },
  miniStateTxt: { fontSize: 9, fontWeight: "700", color: "rgba(255,255,255,0.8)" },

  content: { padding: 20 },
  section: { marginBottom: 20 },
  rowHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginLeft: 5, marginBottom: 15 },
  mainSectionTitle: { fontSize: 18, fontWeight: "900", color: "#1E293B", letterSpacing: -0.5 },

  eventCard: { backgroundColor: "white", borderRadius: 24, overflow: "hidden", elevation: 5, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 10, borderWidth: 1, borderColor: "#F1F5F9", marginBottom: 12 },
  eventCardImgBox: { height: 110, position: "relative" },
  eventCardImg: { ...StyleSheet.absoluteFillObject },
  eventDateBadge: { position: "absolute", top: 10, left: 10, backgroundColor: "white", borderRadius: 10, padding: 5, alignItems: "center" },
  eventDateDay: { fontSize: 12, fontWeight: "900", color: "#1E293B" },
  eventDateMonth: { fontSize: 7, fontWeight: "800", color: "#3B82F6" },
  eventCardInfo: { padding: 12 },
  eventTitle: { fontSize: 15, fontWeight: "800", color: "#1E293B", marginBottom: 4 },
  eventMetaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  eventMetaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  eventMetaTxt: { fontSize: 11, color: "#64748B", fontWeight: "600" },

  emptyBox: { alignItems: "center", padding: 15, backgroundColor: "white", borderRadius: 20, marginBottom: 12, borderStyle: "dashed", borderWidth: 1, borderColor: "#CBD5E1" },
  emptyBoxTxt: { color: "#94A3B8", fontWeight: "600", fontSize: 12 },

  actionGrid: { gap: 8, marginBottom: 0 },
  actionRow: { flexDirection: "row", gap: 8 },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", padding: 10, borderRadius: 15, gap: 8 },
  actionBtnWide: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 18, gap: 10, width: '100%' },
  actionIconBox: { width: 32, height: 32, borderRadius: 8, backgroundColor: "#4F46E520", justifyContent: "center", alignItems: "center" },
  actionBtnTitle: { fontSize: 13, fontWeight: "800", color: "#1E293B" },
  actionBtnInfo: { fontSize: 9, fontWeight: "700", color: "#4F46E5" },

  sectionDivider: { display: 'none' },

  metricsSection: { marginTop: 0, marginBottom: 20 },
  ringsContainer: { flexDirection: "row", justifyContent: "space-around", marginTop: 5 },
  ringItem: { alignItems: "center", gap: 10 },
  ringOuter: { width: 74, height: 74, borderRadius: 37, padding: 3, backgroundColor: "#E2E8F0" },
  ringGradient: { flex: 1, borderRadius: 34, padding: 4 },
  ringHole: { flex: 1, borderRadius: 30, backgroundColor: "white", justifyContent: "center", alignItems: "center", position: 'relative' },
  ringValue: { fontSize: 22, fontWeight: "900", color: "#1E293B" },
  ringLabelBox: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 4 },
  ringLabel: { fontSize: 12, fontWeight: "800", color: "#475569" },

  logoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 18, borderRadius: 24, backgroundColor: "#FEF2F2", marginTop: 5 },
  logoutTxt: { color: "#EF4444", fontSize: 16, fontWeight: "900" },
});

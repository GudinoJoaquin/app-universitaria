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

const formatTimeRange = (start, end) => {
  if (!start) return "Todo el día";
  const s = start.includes("T") ? start.split("T")[1].slice(0, 5) : start.slice(0, 5);
  if (!end) return `${s} hs`;
  const e = end.includes("T") ? end.split("T")[1].slice(0, 5) : end.slice(0, 5);
  return `${s} - ${e} hs`;
};

const ROLE_CONFIG = {
  Admin: { label: "Admin", color: "#EF4444", icon: "shield-checkmark" },
  Helper: { label: "Helper", color: "#8B5CF6", icon: "briefcase" },
  Organizer: { label: "Organizador", color: "#F59E0B", icon: "calendar" },
  User: { label: "Estudiante", color: "#3B82F6", icon: "person" },
};

export default function ProfileScreen({ route }) {
  const { user: currentUser, updateUserProfileLocally, logout } = useAuth();
  const navigation = useNavigation();
  const targetUserId = route.params?.userId;
  const isOwnProfile = !targetUserId || targetUserId === currentUser.id;

  const [targetUser, setTargetUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    attended: 0, inscribed: 0, created: 0, finished: 0, nextEvent: null, totalAvailable: 0
  });
  const [settingsVisible, setSettingsVisible] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      let userData = currentUser;
      
      // Si estamos viendo a otro usuario, cargamos sus datos básicos
      if (!isOwnProfile) {
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("*, user_states(states(id, name, color))")
          .eq("id", targetUserId)
          .single();
        if (error) throw error;
        
        // Aplanar estados
        userData = {
          ...profile,
          states: profile.user_states?.map(us => us.states).filter(Boolean) ?? []
        };
      }
      setTargetUser(userData);

      // Cargar stats del usuario (propio o ajeno)
      const { data: userRegs } = await supabase
        .from("event_registrations")
        .select("*, events(*, categories:event_categories_junction(categories(*)))")
        .eq("user_id", userData.id);

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
      
      // Para otros usuarios, tal vez no necesitamos "totalAvailable", pero lo dejamos por consistencia
      const { data: availableEvents } = await supabase
        .from("events")
        .select("id")
        .gte("date", isoNow)
        .neq("created_by", userData.id);

      const realAvailable = (availableEvents || []).filter(e => !registeredEventIds.includes(e.id)).length;

      let created = 0, finished = 0;
      if (userData.role !== 'User') {
        const { data: myEvents } = await supabase.from("events").select("*").eq("created_by", userData.id);
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
      Alert.alert("Error", "No se pudo cargar el perfil");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUser, targetUserId, isOwnProfile]);

  useEffect(() => { loadData(); }, [loadData]);

  const activeUser = targetUser || currentUser;
  const roleInfo = ROLE_CONFIG[activeUser?.role] ?? ROLE_CONFIG.User;
  const isManager = activeUser?.role !== 'User';

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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor="white" />}
      >
        {/* HERO */}
        <LinearGradient colors={["#0F172A", "#1E293B"]} style={s.hero}>
          <View style={s.topBar}>
            {!isOwnProfile ? (
              <TouchableOpacity style={s.backIcon} onPress={() => navigation.goBack()}>
                <Ionicons name="arrow-back" size={24} color="white" />
              </TouchableOpacity>
            ) : <View />}

            {isOwnProfile && (
              <TouchableOpacity style={s.settingsIcon} onPress={() => setSettingsVisible(true)}>
                <Ionicons name="settings-outline" size={22} color="rgba(255,255,255,0.6)" />
              </TouchableOpacity>
            )}
          </View>

          <View style={s.headerContent}>
            <View style={s.avatarSection}>
              <View style={s.avatarWrap}>
                {activeUser?.avatar_url ? (
                  <Image source={{ uri: activeUser.avatar_url }} style={s.avatar} contentFit="cover" />
                ) : (
                  <View style={s.avatarPlaceholder}>
                    <Text style={s.avatarPlaceholderTxt}>{activeUser?.name?.[0]?.toUpperCase()}</Text>
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
              <Text style={s.userName}>{activeUser?.name}</Text>
              <Text style={s.userEmail} numberOfLines={1}>{activeUser?.email}</Text>

              {activeUser?.states?.length > 0 && (
                <View style={s.miniStates}>
                  {activeUser.states.map(st => (
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
              <TouchableOpacity style={s.eventCard} activeOpacity={0.9} onPress={() => navigation.navigate("EventDetails", { event: stats.nextEvent })}>
                <View style={s.eventCardImgBox}>
                  {stats.nextEvent.image_url ? (
                    <Image source={{ uri: stats.nextEvent.image_url }} style={s.eventCardImg} contentFit="cover" />
                  ) : (
                    <LinearGradient colors={["#1E1B4B", "#312E81"]} style={s.eventCardImg} />
                  )}
                  <LinearGradient colors={["rgba(0,0,0,0.4)", "transparent", "rgba(0,0,0,0.8)"]} style={StyleSheet.absoluteFill} />
                  
                  <View style={[s.statusTag, { backgroundColor: "#EFF6FFCC", borderColor: "#BFDBFE" }]}>
                    <View style={[s.statusDot, { backgroundColor: "#3B82F6" }]} />
                    <Text style={[s.statusTagTxt, { color: "#3B82F6" }]}>PRÓXIMO</Text>
                  </View>
                  
                  <View style={[s.imageDateTime, { backgroundColor: "#EFF6FFCC", borderColor: "#BFDBFE" }]}>
                    <Ionicons name="calendar-outline" size={10} color="#3B82F6" />
                    <Text style={[s.imageDateTimeTxt, { color: "#3B82F6" }]}>{new Date(stats.nextEvent.date).getUTCDate()} {new Date(stats.nextEvent.date).toLocaleDateString('es-ES', { month: 'short', timeZone: 'UTC' }).toUpperCase().replace(".", "")}</Text>
                    <View style={[s.dateTimeSeparator, { backgroundColor: "#3B82F640" }]} />
                    <Ionicons name="time-outline" size={10} color="#3B82F6" />
                    <Text style={[s.imageDateTimeTxt, { color: "#3B82F6" }]}>{formatTimeRange(stats.nextEvent.start_time, stats.nextEvent.end_time)}</Text>
                  </View>

                  <View style={s.imageCategories}>
                    {stats.nextEvent.categories?.map((cat) => (
                      <View key={cat.id} style={[s.imageCat, { backgroundColor: cat.color + '66', borderColor: cat.color }]}>
                        <Text style={s.imageCatTxt}>{cat.name}</Text>
                      </View>
                    ))}
                  </View>
                </View>
                
                <View style={s.eventCardInfo}>
                  <Text style={s.eventTitle} numberOfLines={2}>{stats.nextEvent.title}</Text>
                  <View style={s.locationRow}>
                    <Ionicons name="location-outline" size={12} color="#94A3B8" />
                    <Text style={s.locationTxt} numberOfLines={1}>{stats.nextEvent.location}</Text>
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
                  onPress={() => isOwnProfile && navigation.navigate("MainTabs", { screen: "EventsTab", params: { initialTab: 0 } })}
                  disabled={!isOwnProfile}
                  activeOpacity={isOwnProfile ? 0.7 : 1}
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
                  onPress={() => isOwnProfile && navigation.navigate("MainTabs", { screen: "EventsTab", params: { initialTab: 1 } })}
                  disabled={!isOwnProfile}
                  activeOpacity={isOwnProfile ? 0.7 : 1}
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

              {isOwnProfile && isManager && (
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


        </View>
      </ScrollView>
      <SettingsModal 
        visible={settingsVisible} 
        onClose={() => setSettingsVisible(false)} 
        user={activeUser} 
        onUpdate={(u) => { 
          setTargetUser(u); 
          if (updateUserProfileLocally) updateUserProfileLocally(u); 
        }} 
      />
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
  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 0 },
  settingsIcon: { padding: 4 },
  backIcon: { padding: 4 },
  headerContent: { flexDirection: "row", alignItems: "flex-start", gap: 20, marginTop: 4 },

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

  eventCard: {
    backgroundColor: "white",
    borderRadius: 20,
    marginBottom: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 6,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  eventCardImgBox: { height: 140, width: "100%", position: "relative" },
  eventCardImg: { width: "100%", height: "100%" },
  statusTag: { 
    position: "absolute", top: 10, left: 10, flexDirection: "row", alignItems: "center", gap: 4, 
    paddingHorizontal: 8, height: 22, borderRadius: 11, borderWidth: 1,
  },
  statusDot: { width: 4, height: 4, borderRadius: 2 },
  statusTagTxt: { fontSize: 8, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.5 },
  imageDateTime: {
    position: "absolute", top: 10, right: 10, flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 8, height: 22, borderRadius: 11, borderWidth: 1,
  },
  imageDateTimeTxt: { fontSize: 8, fontWeight: "900", textTransform: "uppercase" },
  dateTimeSeparator: { width: 1, height: 8, marginHorizontal: 1 },
  imageCategories: { position: "absolute", bottom: 10, left: 10, flexDirection: "row", flexWrap: "wrap", gap: 4, maxWidth: '70%' },
  imageCat: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1 },
  imageCatTxt: { fontSize: 7, fontWeight: "900", color: "white", textTransform: "uppercase" },
  eventCardInfo: { padding: 14, paddingTop: 16 },
  eventTitle: { fontSize: 20, fontWeight: "900", color: "#0F172A", lineHeight: 26, letterSpacing: -0.5 },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  locationTxt: { fontSize: 11, color: "#94A3B8", fontWeight: "600" },

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

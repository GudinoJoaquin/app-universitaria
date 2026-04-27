import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../context/AuthContext";

export default function SystemConfigScreen({ navigation }) {
  const { isAdmin } = useAuth();

  if (!isAdmin()) {
    return (
      <View style={s.centered}>
        <Ionicons name="lock-closed" size={60} color="#EF4444" />
        <Text style={s.errorTxt}>Solo administradores pueden acceder aquí.</Text>
      </View>
    );
  }

  const OPTIONS = [
    { 
      id: 1, 
      title: "Estados de Usuario", 
      desc: "Crear, editar y eliminar estados dinámicos (Ej: Estudiante, Becado).", 
      icon: "layers", 
      color: "#8B5CF6", 
      screen: "AdminStates" 
    },
    { 
      id: 2, 
      title: "Categorías de Eventos", 
      desc: "Gestionar las categorías disponibles para clasificar eventos.", 
      icon: "grid", 
      color: "#EC4899", 
      screen: "AdminCategories" 
    },
  ];

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={["#1E3A8A", "#1E40AF"]} style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Configuración del Sistema</Text>
      </LinearGradient>

      <View style={s.content}>
        {OPTIONS.map(opt => (
          <TouchableOpacity 
            key={opt.id} 
            style={s.card} 
            onPress={() => navigation.navigate(opt.screen)}
            activeOpacity={0.7}
          >
            <View style={[s.iconBox, { backgroundColor: opt.color + "15" }]}>
              <Ionicons name={opt.icon} size={28} color={opt.color} />
            </View>
            <View style={s.cardInfo}>
              <Text style={s.cardTitle}>{opt.title}</Text>
              <Text style={s.cardDesc}>{opt.desc}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: 40 },
  errorTxt: { textAlign: "center", marginTop: 20, fontSize: 16, color: "#4B5563", fontWeight: "600" },
  header: { paddingTop: 50, paddingBottom: 24, paddingHorizontal: 20, flexDirection: "row", alignItems: "center" },
  backBtn: { padding: 8, marginRight: 12 },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "white" },
  content: { padding: 20 },
  card: { 
    flexDirection: "row", 
    alignItems: "center", 
    backgroundColor: "white", 
    padding: 18, 
    borderRadius: 20, 
    marginBottom: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10
  },
  iconBox: { width: 56, height: 56, borderRadius: 16, justifyContent: "center", alignItems: "center", marginRight: 16 },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: "800", color: "#1F2937", marginBottom: 4 },
  cardDesc: { fontSize: 13, color: "#6B7280", lineHeight: 18 },
});

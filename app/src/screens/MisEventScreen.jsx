import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from "expo-image";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../services/supabase";

export default function MisEventScreen({ navigation }) {
  const { user } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState(null);

  useEffect(() => {
    if (user?.avatar_url) {
      setAvatarUrl(user.avatar_url);
    }
  }, [user?.avatar_url]);
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1E3A8A" />
      
      {/* Header Compacto Estandarizado */}
      <LinearGradient colors={["#1E3A8A", "#3B82F6"]} style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Mis Eventos 🏷️</Text>
          <TouchableOpacity 
            onPress={() => navigation.navigate("ProfileTab")}
            style={[styles.avatar, { padding: 0, overflow: 'hidden' }]}
          >
            {avatarUrl ? (
              <Image
                source={{ uri: avatarUrl }}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
                transition={200}
              />
            ) : (
              <Text style={styles.avatarText}>
                {user?.name?.charAt(0)?.toUpperCase() || "U"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Contenido Empty State Minimalista */}
      <View style={styles.content}>
        <View style={styles.emptyCard}>
          <View style={styles.iconContainer}>
            <Ionicons name="bookmarks-outline" size={60} color="#3B82F6" />
          </View>
          <Text style={styles.title}>Aún no tienes eventos guardados</Text>
          <Text style={styles.subtitle}>
            Aquí aparecerán los eventos a los que te registres para que puedas hacerles seguimiento fácilmente.
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: '800',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.4)"
  },
  avatarText: { color: "white", fontSize: 18, fontWeight: "bold" },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyCard: {
    backgroundColor: 'white',
    borderRadius: 32,
    padding: 40,
    alignItems: 'center',
    width: '100%',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#F1F5F9'
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
    textAlign: 'center'
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  }
});

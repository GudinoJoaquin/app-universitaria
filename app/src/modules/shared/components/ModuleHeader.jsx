import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

export default function ModuleHeader({ 
  title, 
  subtitle, 
  tabs = [], 
  activeTab, 
  setActiveTab, 
  getTabIcon 
}) {
  return (
    <LinearGradient colors={["#0F172A", "#1E293B"]} style={s.header}>
      <View style={s.headerTop}>
        <View>
          <Text style={s.headerTitle}>{title}</Text>
          {subtitle && (
            <Text style={s.headerSubtitle}>{subtitle}</Text>
          )}
        </View>
      </View>
      
      {tabs.length > 0 && (
        <View style={s.tabBar}>
          {tabs.map((tab, i) => (
            <Pressable 
              key={tab} 
              style={[s.tabItem, activeTab === i && s.tabItemActive]} 
              onPress={() => setActiveTab(i)}
            >
              {getTabIcon && (
                <Ionicons 
                  name={getTabIcon(tab)} 
                  size={18} 
                  color={activeTab === i ? "white" : "rgba(255,255,255,0.6)"} 
                  style={s.tabIcon}
                />
              )}
              <Text style={[s.tabText, activeTab === i && s.tabTextActive]}>
                {tab}
              </Text>
              {activeTab === i && <View style={s.tabIndicator} />}
            </Pressable>
          ))}
        </View>
      )}
    </LinearGradient>
  );
}

const s = StyleSheet.create({
  header: {
    paddingTop: 56,
    paddingBottom: 16,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "white",
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
  },
  tabBar: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 4,
    gap: 8,
  },
  tabItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 30,
    gap: 8,
    position: "relative",
  },
  tabItemActive: {
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  tabIcon: {
    opacity: 0.8,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255,255,255,0.7)",
  },
  tabTextActive: {
    color: "white",
    fontWeight: "700",
  },
  tabIndicator: {
    position: "absolute",
    bottom: 0,
    left: "25%",
    right: "25%",
    height: 3,
    backgroundColor: "white",
    borderRadius: 2,
  },
});

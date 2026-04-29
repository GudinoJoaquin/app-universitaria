import React from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function FilterChip({ icon, label, isActive, activeColor = "#3B82F6", onPress }) {
  return (
    <TouchableOpacity 
      style={[s.filterChip, isActive && s.filterChipActive]} 
      onPress={onPress}
    >
      <Ionicons name={icon} size={16} color={isActive ? activeColor : "#64748B"} />
      <Text style={[s.filterChipTxt, isActive && s.filterChipTxtActive]}>
        {label}
      </Text>
      <Ionicons name="chevron-down" size={14} color={isActive ? activeColor : "#94A3B8"} />
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  filterChip: { 
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "white",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 6,
  },
  filterChipActive: {
    backgroundColor: "#F8FAFC",
    borderColor: "#CBD5E1",
  },
  filterChipTxt: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
  },
  filterChipTxtActive: {
    color: "#1E293B",
  },
});

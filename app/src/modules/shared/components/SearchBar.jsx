import React from "react";
import { View, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function SearchBar({ value, onChangeText, placeholder = "Buscar..." }) {
  return (
    <View style={s.searchBar}>
      <Ionicons name="search-outline" size={20} color="#94A3B8" />
      <TextInput 
        style={s.searchInput} 
        placeholder={placeholder}
        placeholderTextColor="#94A3B8" 
        value={value}
        onChangeText={onChangeText}
      />
      {value !== "" && (
        <TouchableOpacity onPress={() => onChangeText("")}>
          <Ionicons name="close-circle" size={18} color="#94A3B8" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  searchBar: { 
    flex: 1, 
    flexDirection: "row", 
    alignItems: "center", 
    backgroundColor: "#F8FAFC", 
    borderRadius: 14, 
    paddingHorizontal: 14, 
    height: 46,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 8,
  },
  searchInput: { 
    flex: 1, 
    fontSize: 14, 
    fontWeight: "500", 
    color: "#1E293B" 
  },
});

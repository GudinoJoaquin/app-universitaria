import React from "react";
import { Platform } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { useAuth } from "../context/AuthContext";

// Auth screens
import LoginScreen from "../screens/LoginScreens";
import RegisterScreen from "../screens/RegisterScreen";
import FirstTimeSetupScreen from "../screens/FirstTimeSetupScreen";

// Main screens
import EventDashboardScreen from "../screens/EventScreens"; // Unified Events Hub
import ProfileScreen from "../screens/ProfileScreen";
import GestionScreen from "../screens/GestionScreen"; 
import AdminCategoriesScreen from "../screens/AdminCategoriesScreen";
import SystemConfigScreen from "../screens/SystemConfigScreen";
import UserManagementScreen from "../screens/UserManagementScreen";
import AdminStatesScreen from "../screens/AdminStatesScreen";

// Event detail & create
import EventDetailsScreen from "../screens/EventDetailScreen";
import EventCreateScreen from "../screens/EventCreateScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  const { user, isAdmin, isHelper } = useAuth();
  
  // Only Admin and Helper can see the "Gestión" tab (User Management)
  const canManageUsers = isAdmin() || isHelper();

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: "#2563EB",
        tabBarInactiveTintColor: "#9CA3AF",
        tabBarShowLabel: true,
        tabBarStyle: {
          paddingBottom: Platform.OS === "ios" ? 25 : 10,
          paddingTop: 8,
          height: Platform.OS === "ios" ? 85 : 65,
          backgroundColor: "#ffffff",
          borderTopWidth: 1,
          borderTopColor: "#F1F5F9",
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "700" },
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="EventsTab"
        component={EventDashboardScreen}
        options={{
          title: "Eventos",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "calendar" : "calendar-outline"} color={color} size={24} />
          ),
        }}
      />

      {canManageUsers && (
        <Tab.Screen
          name="ManagementTab"
          component={GestionScreen}
          options={{
            title: "Gestión",
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? "people" : "people-outline"} color={color} size={24} />
            ),
          }}
        />
      )}

      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          title: "Perfil",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "person" : "person-outline"} color={color} size={24} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { user } = useAuth();

  const linking = {
    prefixes: [Linking.createURL("/")],
    config: {
      screens: {
        Login: "login",
        Register: "register",
        MainTabs: {
          screens: {
            EventsTab: "events",
            ManagementTab: "management",
            UserManagement: "users",
            SystemConfig: "config",
            ProfileTab: "profile",
          },
        },
      },
    },
  };

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="MainTabs" component={MainTabs} />
            
            {/* Event detail & Create - Stacked above tabs for clean focus */}
            <Stack.Screen 
              name="EventDetails" 
              component={EventDetailsScreen} 
              options={{ headerShown: true, title: "Detalles del Evento", headerBackTitle: "Atrás" }} 
            />
            <Stack.Screen name="CreateEvent" component={EventCreateScreen} options={{ headerShown: true, title: "Gestión de Evento" }} />
            <Stack.Screen name="AdminCategories" component={AdminCategoriesScreen} options={{ headerShown: false }} />
            <Stack.Screen name="UserManagement" component={UserManagementScreen} options={{ headerShown: false }} />
            <Stack.Screen name="SystemConfig" component={SystemConfigScreen} options={{ headerShown: false }} />
            <Stack.Screen name="AdminStates" component={AdminStatesScreen} options={{ headerShown: false }} />
            
            {/* Legacy Fallback if needed */}
            <Stack.Screen name="FirstTimeSetup" component={FirstTimeSetupScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

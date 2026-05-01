import React from "react";
import { Platform } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { useAuth } from "../modules/auth/context/AuthContext";

import LoginScreen from "../modules/auth/screens/LoginScreen";
import RegisterScreen from "../modules/auth/screens/RegisterScreen";
import FirstTimeSetupScreen from "../modules/auth/screens/FirstTimeSetupScreen";
import EventDashboardScreen from "../modules/events/screens/EventDashboardScreen"; 
import ProfileScreen from "../modules/profile/screens/ProfileScreen";
import GestionScreen from "../modules/gestion/screens/GestionScreen"; 
import AdminCategoriesScreen from "../modules/gestion/screens/AdminCategoriesScreen";
import SystemConfigScreen from "../modules/gestion/screens/SystemConfigScreen";
import UserManagementScreen from "../modules/gestion/screens/UserManagementScreen";
import AdminStatesScreen from "../modules/gestion/screens/AdminStatesScreen";
import EventDetailsScreen from "../modules/events/screens/EventDetailScreen";
import EventCreateScreen from "../modules/events/screens/EventCreateScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  const { isAdmin, isHelper } = useAuth();
  const canManageUsers = isAdmin() || isHelper();
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: "#0F172A",
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

const linkingConfig = {
  prefixes: [Linking.createURL("/")],
  config: {
    screens: {
      Login: "login",
      Register: "register",
      MainTabs: {
        screens: {
          EventsTab: "events",
          ManagementTab: "management",
          ProfileTab: "profile",
        },
      },
      UserManagement: "users",
      SystemConfig: "config",
    },
  },
};

export default function AppNavigator() {
  const { user } = useAuth();

  return (
    <NavigationContainer linking={linkingConfig}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Group>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </Stack.Group>
        ) : (
          <Stack.Group>
            <Stack.Screen name="MainTabs" component={MainTabs} />
            <Stack.Screen name="FirstTimeSetup" component={FirstTimeSetupScreen} />
            <Stack.Screen name="EventDetails" component={EventDetailsScreen} />
            <Stack.Screen name="CreateEvent" component={EventCreateScreen} />
            <Stack.Screen name="AdminCategories" component={AdminCategoriesScreen} />
            <Stack.Screen name="UserManagement" component={UserManagementScreen} />
            <Stack.Screen name="SystemConfig" component={SystemConfigScreen} />
            <Stack.Screen name="AdminStates" component={AdminStatesScreen} />
            <Stack.Screen name="UserProfile" component={ProfileScreen} />
          </Stack.Group>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

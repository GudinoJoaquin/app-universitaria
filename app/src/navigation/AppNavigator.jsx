// En AppNavigator.jsx - AGREGAR ESTA IMPORTACIÓN
import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useAuth } from "../context/AuthContext";

// Importar pantallas de screens
import LoginScreen from "../screens/LoginScreens";
import RegisterScreen from "../screens/RegisterScreen";
import EventsScreen from "../screens/EventScreens";
import EventDetailsScreen from "../screens/EventDetailScreen";
import EventCreateScreen from "../screens/EventCreateScreen";
import ProfileScreen from "../screens/ProfileScreen";
import MisEventScreen from "../screens/MisEventScreen";
import FirstTimeSetupScreen from "../screens/FirstTimeSetupScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Tab Navigator para las pantallas principales
import { Ionicons } from "@expo/vector-icons";
import { Platform } from "react-native";

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: "#2563EB",
        tabBarInactiveTintColor: "#9CA3AF",
        tabBarShowLabel: true,
        tabBarStyle: {
          paddingBottom: Platform.OS === 'ios' ? 25 : 15,
          paddingTop: 8,
          height: Platform.OS === 'ios' ? 85 : 75,
          borderTopWidth: 0,
          elevation: 10,
          shadowColor: "#000",
          shadowOpacity: 0.1,
          shadowOffset: { width: 0, height: -2 },
          backgroundColor: "#ffffff",
          marginBottom: Platform.OS === 'android' ? 10 : 0, // Separación extra de la barra de gestos
          borderRadius: Platform.OS === 'android' ? 20 : 0, // Para que se vea como píldora si tiene margen
          marginHorizontal: Platform.OS === 'android' ? 15 : 0,
          position: Platform.OS === 'android' ? 'absolute' : 'relative',
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
        },
        headerShown: false,
      }}
      sceneContainerStyle={{ backgroundColor: "#F8FAFC" }}
    >
      <Tab.Screen
        name="EventsTab"
        component={EventsScreen}
        options={{
          title: "Eventos",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "calendar" : "calendar-outline"} color={color} size={26} />
          ),
        }}
      />
      <Tab.Screen
        name="MisEventosTab"
        component={MisEventScreen}
        options={{
          title: "Mis Eventos",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "bookmarks" : "bookmarks-outline"} color={color} size={26} />
          ),
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          title: "Perfil",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "person-circle" : "person-circle-outline"} color={color} size={28} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

import * as Linking from 'expo-linking';

export default function AppNavigator() {
  const { user, loading } = useAuth();

  const linking = {
    prefixes: [Linking.createURL("/")],
    config: {
      screens: {
        Login: "login",
        Register: "register",
        MainTabs: {
          screens: {
            EventsTab: "events",
            MisEventosTab: "miseventos",
            ProfileTab: "profile",
          },
        },
      },
    },
  };

  // Eliminamos la pantalla de carga blanca global,
  // permitiendo que se renderice el Login inmediatamente y luego navegue solo si hay sesión.

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator>
        {!user ? (
          // pantalla para los usuarios no registrados
          <>
            <Stack.Screen
              name="Login"
              component={LoginScreen}
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="Register"
              component={RegisterScreen}
              options={{
                headerShown: false,
              }}
            />
          </>
        ) : user.user_metadata?.has_completed_setup !== true ? (
          // pantalla obligatoria para completar perfil la primera vez
          <Stack.Screen
            name="FirstTimeSetup"
            component={FirstTimeSetupScreen}
            options={{
              headerShown: false,
            }}
          />
        ) : (
          // pantalla para los usuarios registrados que ya completaron el setup
          <>
            <Stack.Screen
              name="MainTabs"
              component={MainTabs}
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen
              name="EventDetails"
              component={EventDetailsScreen}
              options={{
                title: "Detalles del Evento",
              }}
            />
            <Stack.Screen
              name="CreateEvent"
              component={EventCreateScreen}
              options={{
                title: "Crear Evento",
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

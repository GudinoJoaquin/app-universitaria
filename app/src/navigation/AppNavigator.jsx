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

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Tab Navigator para las pantallas principales (perfil,eventos,MisEventos)
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: "#3B82F6",
        tabBarInactiveTintColor: "#8E8E93",
        tabBarStyle: {
          paddingBottom: 5,
          height: 60,
        },
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="EventsTab"
        component={EventsScreen}
        options={{
          title: "Eventos",
          tabBarIcon: ({ color, size }) => (
            <Text style={{ color, fontSize: size }}></Text>
          ),
        }}
      />
      <Tab.Screen>
        name="MisEventosTab"
        component={MisEventScreen}
          options={{
          title: "Mis Eventos",
          tabBarIcon: ({ color, size }) => (
            <Text style={{ color, fontSize: size }}></Text>
          ),
        }}
      </Tab.Screen>
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          title: "Perfil",
          tabBarIcon: ({ color, size }) => (
            <Text style={{ color, fontSize: size }}></Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Cargando...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
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
        ) : (
          // pantalla para los usuarios registrados
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

import { useState, useEffect, useRef } from "react";
import { Text, View, Platform } from "react-native";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { eventsService } from "../../events/services/eventsService";
import { useAuth } from "../../auth/context/AuthContext";

const isExpoGo = Constants.executionEnvironment === "storeClient";
const Notifications = !isExpoGo ? require("expo-notifications") : null;

if (Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

async function sendPushNotification(expoPushToken, title, body) {
  if (isExpoGo || !expoPushToken) return;

  const message = {
    to: expoPushToken,
    sound: "default",
    title: title,
    body: body,
    data: { customData: "valor personalizado" },
  };

  await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Accept-encoding": "gzip, deflate",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(message),
  });
}

async function registerForPushNotificationsAsync() {
  if (isExpoGo) {
    console.log(
      "ℹ️ Modo Expo Go detectado: Saltando configuración de notificaciones remotas.",
    );
    return null;
  }

  try {
    if (Platform.OS === "android" && Notifications) {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance?.MAX ?? 3,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF231F7C",
      });
    }

    if (!Device.isDevice) {
      console.log("Must use physical device for push notifications");
      return null;
    }

    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") return null;

    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      Constants?.easConfig?.projectId;

    if (!projectId) {
      console.warn("Project ID not found for push notifications");
      return null;
    }

    const token = (await Notifications.getExpoPushTokenAsync({ projectId }))
      .data;
    console.log("Push Token:", token);
    return token;
  } catch (e) {
    console.log("Error en notificaciones:", e.message);
    return null;
  }
}

async function scheduleEventNotifications(scheduledNotificationsRef) {
  if (isExpoGo || !Notifications) return;
  try {
    // Cancelar notificaciones programadas anteriores
    await Notifications.cancelAllScheduledNotificationsAsync();
    scheduledNotificationsRef.current.clear();

    // Obtener eventos
    const { success, events } = await eventsService.getEvents();
    if (!success) return;

    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    const todaysEvents = events.filter((event) => event.date === today);

    for (const event of todaysEvents) {
      const eventTime = event.start_time ? new Date(event.start_time) : null;
      let notificationTime;

      if (eventTime) {
        // Notificar 1 hora antes si hay tiempo específico
        notificationTime = new Date(eventTime.getTime() - 60 * 60 * 1000); // 1 hora antes
        if (notificationTime <= new Date()) continue; // Si ya pasó, no notificar
      } else {
        // Si no hay tiempo, notificar a las 9 AM
        const [year, month, day] = today.split("-");
        notificationTime = new Date(year, month - 1, day, 9, 0, 0);
        if (notificationTime <= new Date()) continue;
      }

      const timeString = eventTime
        ? eventTime.toLocaleTimeString("es-ES", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "Todo el día";
      const body = `📅 ${event.title}\n🕒 ${timeString}\n📍 ${event.location}`;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: "¡Evento hoy!",
          body: body,
          sound: "default",
          data: { eventId: event.id },
        },
        trigger: { date: notificationTime },
      });

      scheduledNotificationsRef.current.add(event.id);
    }
  } catch (error) {
    console.log("Error programando notificaciones:", error);
  }
}

export default function Notification() {
  const [expoPushToken, setExpoPushToken] = useState("");
  const { user } = useAuth();
  const scheduledNotifications = useRef(new Set());

  useEffect(() => {
    registerForPushNotificationsAsync().then((token) => {
      if (token) setExpoPushToken(token);
    });
  }, []);

  useEffect(() => {
    if (expoPushToken && user) {
      scheduleEventNotifications(scheduledNotifications);
    }
  }, [expoPushToken, user]);

  return null;
}



import { useState, useEffect, useRef } from "react";
import { Text, View, Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";

const isExpoGo = Constants.executionEnvironment === "storeClient";

if (!isExpoGo) {
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
    console.log("ℹ️ Modo Expo Go detectado: Saltando configuración de notificaciones remotas.");
    return null;
  }

  try {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF231F7C",
      });
    }

    if (!Device.isDevice) {
      console.log("Must use physical device for push notifications");
      return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
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

    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    console.log("Push Token:", token);
    return token;
  } catch (e) {
    console.log("Error en notificaciones:", e.message);
    return null;
  }
}

export default function Notification({ title, body }) {
  const [expoPushToken, setExpoPushToken] = useState("");
  const [trigger, setTrigger] = useState(true);

  useEffect(() => {
    registerForPushNotificationsAsync().then((token) => {
      if (token) setExpoPushToken(token);
    });
  }, []);

  useEffect(() => {
    if (trigger && expoPushToken && !isExpoGo) {
      sendPushNotification(expoPushToken, title, body);
    }
  }, [trigger, expoPushToken]);

  useEffect(() => {
    const dias = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
    const hoy = new Date();
    const today = dias[hoy.getDay()];

    if (today === "lunes") {
      setTrigger(true);
    }
  }, []);

  return null;
}

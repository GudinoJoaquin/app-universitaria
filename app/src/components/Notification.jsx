import { useState, useEffect, useRef } from "react";
import { Text, View, Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

async function sendPushNotification(expoPushToken, title, body) {
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
  if (Platform.OS === "android") {
    Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") {
      alert("Permission not granted to get push token for push notification!");
      return;
    }
    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      Constants?.easConfig?.projectId;
    if (!projectId) {
      alert("Project ID not found");
    }
    const token = (
      await Notifications.getExpoPushTokenAsync({
        projectId,
      })
    ).data;
    console.log(token);
    return token;
  } else {
    alert("Must use physical device for push notifications");
  }
}

export default function Notification({ title, body }) {
  const [expoPushToken, setExpoPushToken] = useState("");
  const [trigger, setTrigger] = useState(true);

  useEffect(() => {
    registerForPushNotificationsAsync().then((token) =>
      setExpoPushToken(token ?? ""),
    );

    return () => {
      // Limpieza si es necesario
    };
  }, []);

  useEffect(() => {
    if (trigger && expoPushToken) {
      sendPushNotification(expoPushToken, title, body);
    }
  }, [trigger, expoPushToken]);

  // Simulación de un cambio que dispara la notificación
  useEffect(() => {
    const dias = [
      "domingo",
      "lunes",
      "martes",
      "miercoles",
      "jueves",
      "viernes",
      "sabado",
    ];

    const hoy = new Date();
    const numeroDia = hoy.getDay();
    const today = dias[numeroDia];

    console.log(today);

    if (today === "lunes") {
      setTrigger(true);
    }
  }, []);

  return null;
}

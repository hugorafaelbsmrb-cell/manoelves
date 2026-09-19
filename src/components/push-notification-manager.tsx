import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { savePushSubscription } from "@/lib/push.functions";

// Helpers de conversão exigidos pela Push API.

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function arrayBufferToBase64(buffer: ArrayBuffer | null): string {
  if (!buffer) return "";
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return window.btoa(binary);
}

/**
 * Registra o service worker /sw.js e salva a subscrição push do usuário
 * logado (dono ou barbeiro). Montado apenas dentro da área autenticada
 * (AppShell), então user sempre existe aqui.
 */
export function PushNotificationManager() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    const vapidPublic = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
    if (!vapidPublic) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    const vapidKey = vapidPublic;

    let cancelled = false;

    async function setup() {
      // Se já negou antes, não insiste de novo.
      if (Notification.permission === "denied") return;
      const permission =
        Notification.permission === "granted"
          ? "granted"
          : await Notification.requestPermission();
      if (permission !== "granted") return;

      await navigator.serviceWorker.register("/sw.js");
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        });
      }
      if (cancelled) return;

      await savePushSubscription({
        data: {
          endpoint: sub.endpoint,
          keys: {
            p256dh: arrayBufferToBase64(sub.getKey("p256dh")),
            auth: arrayBufferToBase64(sub.getKey("auth")),
          },
        },
      });
    }

    setup().catch((e) => {
      console.error("[push] falha ao registrar subscrição:", e);
    });

    return () => {
      cancelled = true;
    };
  }, [user]);

  return null;
}

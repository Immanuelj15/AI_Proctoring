/**
 * Web Push Notification Client Utilities
 * 
 * Manages VAPID subscription lifecycle, permission negotiation,
 * and backend subscription persistence.
 */

import { API_BASE_URL } from "./api";

// Pre-configured default VAPID public key (matching backend config)
export const DEFAULT_VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  "BIohzaztSefqt-2j2dRioX1FUz9JxV8r-lRTE026iNGeooeAR_5I93Jexg9irrBArOyPxyV7I9smh1YonkIgKug";

/**
 * Converts a standard URL-safe Base64 string to a Uint8Array
 * required by PushManager.subscribe({ applicationServerKey }).
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Checks whether the current browser supports Web Push notifications.
 */
export function isPushNotificationSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/**
 * Fetches the active VAPID public key from backend if available, or falls back to local constant.
 */
export async function getVapidPublicKey(): Promise<string> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/notifications/vapid-public-key`);
    if (res.ok) {
      const data = await res.json();
      if (data.public_key) return data.public_key;
    }
  } catch (err) {
    // Graceful fallback to default key
  }
  return DEFAULT_VAPID_PUBLIC_KEY;
}

/**
 * Retrieves existing push subscription from active Service Worker.
 */
export async function getExistingSubscription(): Promise<PushSubscription | null> {
  if (!isPushNotificationSupported()) return null;

  try {
    const registration = await navigator.serviceWorker.ready;
    return await registration.pushManager.getSubscription();
  } catch (error) {
    console.warn("Could not retrieve push subscription:", error);
    return null;
  }
}

/**
 * Requests notification permission, subscribes via PushManager,
 * and posts subscription payload to backend.
 */
export async function subscribeToPushNotifications(
  userId?: number | string
): Promise<{ success: boolean; subscription?: PushSubscription; error?: string }> {
  if (!isPushNotificationSupported()) {
    return { success: false, error: "Web Push notifications are not supported by this browser." };
  }

  try {
    // 1. Request user permission
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return { success: false, error: `Notification permission ${permission}.` };
    }

    // 2. Ensure Service Worker is registered and ready
    let registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    }
    await navigator.serviceWorker.ready;

    // 3. Fetch public VAPID key
    const publicKey = await getVapidPublicKey();
    const applicationServerKey = urlBase64ToUint8Array(publicKey);

    // 4. Subscribe with pushManager
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey as any,
      });
    }

    const subJson = subscription.toJSON();

    // 5. Send subscription to backend
    const numericUserId = userId !== undefined && userId !== null ? Number(userId) : null;
    const payload = {
      endpoint: subscription.endpoint,
      p256dh: subJson.keys?.p256dh || "",
      auth: subJson.keys?.auth || "",
      user_id: !isNaN(numericUserId as number) ? numericUserId : null,
      user_agent: navigator.userAgent,
    };

    const res = await fetch(`${API_BASE_URL}/api/v1/notifications/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      console.warn("Backend subscription registration returned non-200:", res.status);
    }

    return { success: true, subscription };
  } catch (error: any) {
    console.error("Push subscription failed:", error);
    return { success: false, error: error.message || "Failed to subscribe." };
  }
}

/**
 * Unsubscribes from push notifications locally and notifies backend.
 */
export async function unsubscribeFromPushNotifications(): Promise<boolean> {
  if (!isPushNotificationSupported()) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();

      // Notify backend to remove subscription
      await fetch(`${API_BASE_URL}/api/v1/notifications/unsubscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint }),
      }).catch(() => {});

      return true;
    }
    return false;
  } catch (error) {
    console.warn("Unsubscribe error:", error);
    return false;
  }
}

/**
 * Triggers a test exam reminder push notification from the backend.
 */
export async function triggerTestPushNotification(userId?: number | string): Promise<boolean> {
  try {
    const sub = await getExistingSubscription();
    if (!sub) return false;

    const numericUserId = userId !== undefined && userId !== null ? Number(userId) : null;
    const res = await fetch(`${API_BASE_URL}/api/v1/notifications/test-reminder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: sub.endpoint,
        user_id: !isNaN(numericUserId as number) ? numericUserId : null,
      }),
    });
    return res.ok;
  } catch (err) {
    console.error("Failed to trigger test push notification:", err);
    return false;
  }
}

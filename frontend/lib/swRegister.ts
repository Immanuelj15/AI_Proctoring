/**
 * Service Worker Registration Helper
 * 
 * Automatically gates service worker registration to production builds
 * to prevent caching interference with Next.js development hot-reloading.
 */

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }

  // Register strictly in production, unless explicitly overridden for staging testing
  const isProduction = process.env.NODE_ENV === "production";
  const forceEnable = Boolean(
    typeof window !== "undefined" && (window as any).__ENABLE_SW__
  );

  if (!isProduction && !forceEnable) {
    // In development: do not register to preserve instant hot reload
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });
    return registration;
  } catch (error) {
    console.warn("Service worker registration failed:", error);
    return null;
  }
}

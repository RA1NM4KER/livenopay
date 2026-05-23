"use client";

import { useEffect } from "react";

const SERVICE_WORKER_URL = "/sw.js";

export function PwaRegistrar() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register(SERVICE_WORKER_URL, { scope: "/" });
        registration.update().catch(() => undefined);
      } catch {
        // Ignore registration errors and keep the app usable without PWA features.
      }
    };

    window.addEventListener("load", register, { once: true });

    return () => {
      window.removeEventListener("load", register);
    };
  }, []);

  return null;
}

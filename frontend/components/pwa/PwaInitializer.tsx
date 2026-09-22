"use client";

import { useEffect } from "react";
import { registerServiceWorker } from "@/lib/swRegister";

export default function PwaInitializer() {
  useEffect(() => {
    registerServiceWorker();
  }, []);

  return null;
}

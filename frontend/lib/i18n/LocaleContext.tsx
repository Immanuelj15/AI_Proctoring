"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { SupportedLocale, LocaleMeta, SUPPORTED_LOCALES } from "./types";

import enDict from "../../locales/en.json";
import hiDict from "../../locales/hi.json";
import teDict from "../../locales/te.json";
import taDict from "../../locales/ta.json";
import mlDict from "../../locales/ml.json";
import knDict from "../../locales/kn.json";

const DICTIONARIES: Record<SupportedLocale, Record<string, any>> = {
  en: enDict,
  hi: hiDict,
  te: teDict,
  ta: taDict,
  ml: mlDict,
  kn: knDict,
};

interface LocaleContextType {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
  t: (key: string, variables?: Record<string, string | number>) => string;
  supportedLocales: LocaleMeta[];
  currentMeta: LocaleMeta;
}

const LocaleContext = createContext<LocaleContextType | null>(null);

/**
 * Detects the user's preferred language from browser settings.
 */
function detectBrowserLocale(): SupportedLocale {
  if (typeof window === "undefined" || !window.navigator) {
    return "en";
  }

  const languages = window.navigator.languages || [window.navigator.language];
  for (const lang of languages) {
    const code = lang.toLowerCase().split("-")[0] as SupportedLocale;
    if (code in DICTIONARIES) {
      return code;
    }
  }
  return "en";
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<SupportedLocale>("en");
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    // 1. Check localStorage first
    const storedLocale = localStorage.getItem("preferred_locale") as SupportedLocale;
    if (storedLocale && storedLocale in DICTIONARIES) {
      setLocaleState(storedLocale);
      document.documentElement.lang = storedLocale;
    } else {
      // 2. Check document cookie
      const cookieMatch = document.cookie.match(/preferred_locale=([^;]+)/);
      if (cookieMatch && cookieMatch[1] in DICTIONARIES) {
        const cLocale = cookieMatch[1] as SupportedLocale;
        setLocaleState(cLocale);
        document.documentElement.lang = cLocale;
      } else {
        // 3. Fallback to browser language detection
        const detected = detectBrowserLocale();
        setLocaleState(detected);
        document.documentElement.lang = detected;
      }
    }
    setMounted(true);
  }, []);

  const setLocale = useCallback((newLocale: SupportedLocale) => {
    if (!(newLocale in DICTIONARIES)) return;
    setLocaleState(newLocale);
    localStorage.setItem("preferred_locale", newLocale);
    document.cookie = `preferred_locale=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
    if (typeof document !== "undefined") {
      document.documentElement.lang = newLocale;
    }
  }, []);

  /**
   * Helper to resolve nested dot-notation key in dictionary.
   */
  const getNestedValue = (obj: Record<string, any>, keyPath: string): any => {
    const parts = keyPath.split(".");
    let current = obj;
    for (const part of parts) {
      if (current === null || current === undefined || typeof current !== "object") {
        return undefined;
      }
      current = current[part];
    }
    return current;
  };

  /**
   * Translates a given key with variable interpolation and English fallback.
   */
  const t = useCallback(
    (key: string, variables?: Record<string, string | number>): string => {
      const activeDict = DICTIONARIES[locale] || DICTIONARIES.en;
      let template = getNestedValue(activeDict, key);

      // Automatic fallback to English if missing or blank
      if (template === undefined || template === null || String(template).trim() === "") {
        template = getNestedValue(DICTIONARIES.en, key);
      }

      // If still missing, return the key as last-resort fallback (never crash)
      if (template === undefined || template === null) {
        return key;
      }

      let result = String(template);

      // Interpolate {{variable}} tokens
      if (variables) {
        for (const [varName, varValue] of Object.entries(variables)) {
          const regex = new RegExp(`{{\\s*${varName}\\s*}}`, "g");
          result = result.replace(regex, String(varValue));
        }
      }

      return result;
    },
    [locale]
  );

  const currentMeta =
    SUPPORTED_LOCALES.find((l) => l.code === locale) || SUPPORTED_LOCALES[0];

  return (
    <LocaleContext.Provider
      value={{
        locale,
        setLocale,
        t,
        supportedLocales: SUPPORTED_LOCALES,
        currentMeta,
      }}
    >
      {children}
    </LocaleContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(LocaleContext);
  if (!context) {
    // Provide safe fallback if used outside LocaleProvider
    return {
      locale: "en" as SupportedLocale,
      setLocale: () => {},
      t: (key: string, variables?: Record<string, string | number>) => {
        let text = key.split(".").pop() || key;
        if (variables) {
          for (const [k, v] of Object.entries(variables)) {
            text = text.replace(new RegExp(`{{\\s*${k}\\s*}}`, "g"), String(v));
          }
        }
        return text;
      },
      supportedLocales: SUPPORTED_LOCALES,
      currentMeta: SUPPORTED_LOCALES[0],
    };
  }
  return context;
}

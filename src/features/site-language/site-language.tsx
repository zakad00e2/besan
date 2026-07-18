import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export const SITE_LOCALE_STORAGE_KEY = "besan.site-locale";
export type SiteLocale = "en" | "ar";
export type SiteDirection = "ltr" | "rtl";

export function getStoredSiteLocale(storage: Pick<Storage, "getItem"> | undefined): SiteLocale {
  return storage?.getItem(SITE_LOCALE_STORAGE_KEY) === "ar" ? "ar" : "en";
}

const messages = {
  en: {
    nav: { about: "ABOUT", services: "SERVICES", opinions: "TESTIMONIALS", book: "BOOK A CALL", language: "ع", switchLanguage: "Switch language" },
    common: { workshops: "WORKSHOPS", previous: "Previous", next: "Next", back: "Back", close: "CLOSE" },
    footer: { instagram: "Instagram", whatsapp: "WhatsApp", email: "Email", readMore: "Read more", rights: "ALL RIGHTS RESERVED" },
  },
  ar: {
    nav: { about: "من أنا", services: "الخدمات", opinions: "الآراء", book: "احجزي موعدًا", language: "EN", switchLanguage: "تغيير اللغة" },
    common: { workshops: "ورش العمل", previous: "السابق", next: "التالي", back: "رجوع", close: "إغلاق" },
    footer: { instagram: "إنستغرام", whatsapp: "واتساب", email: "جيميل", readMore: "اقرئي المزيد", rights: "جميع الحقوق محفوظة" },
  },
} as const;

type SiteLanguageContextValue = {
  locale: SiteLocale;
  direction: SiteDirection;
  messages: (typeof messages)[SiteLocale];
  setLocale: (locale: SiteLocale) => void;
};

const SiteLanguageContext = createContext<SiteLanguageContextValue | null>(null);

export function SiteLanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<SiteLocale>(() => {
    if (typeof window === "undefined") return "en";
    try {
      return getStoredSiteLocale(window.localStorage);
    } catch {
      return "en";
    }
  });

  const value = useMemo<SiteLanguageContextValue>(() => ({
    locale,
    direction: locale === "ar" ? "rtl" : "ltr",
    messages: messages[locale],
    setLocale(nextLocale) {
      setLocaleState(nextLocale);
      try {
        window.localStorage.setItem(SITE_LOCALE_STORAGE_KEY, nextLocale);
      } catch {
        // The visible language change remains available when storage is blocked.
      }
    },
  }), [locale]);

  return <SiteLanguageContext.Provider value={value}>{children}</SiteLanguageContext.Provider>;
}

export function useSiteLanguage() {
  const value = useContext(SiteLanguageContext);
  return value ?? {
    locale: "en" as const,
    direction: "ltr" as const,
    messages: messages.en,
    setLocale: () => undefined,
  };
}

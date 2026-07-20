import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { SiteLocale } from "@/features/seo/site-config";

export type SiteDirection = "ltr" | "rtl";

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
};

const SiteLanguageContext = createContext<SiteLanguageContextValue | null>(null);

export function SiteLanguageProvider({ locale, children }: { locale: SiteLocale; children: ReactNode }) {
  const value = useMemo<SiteLanguageContextValue>(() => ({
    locale,
    direction: locale === "ar" ? "rtl" : "ltr",
    messages: messages[locale],
  }), [locale]);

  return <SiteLanguageContext.Provider value={value}>{children}</SiteLanguageContext.Provider>;
}

export function useSiteLanguage() {
  const value = useContext(SiteLanguageContext);
  return value ?? {
    locale: "en" as const,
    direction: "ltr" as const,
    messages: messages.en,
  };
}

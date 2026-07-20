import type { ReactNode } from "react";
import type { SiteLocale } from "@/features/seo/site-config";
import { SiteLanguageProvider, useSiteLanguage } from "./site-language";

export function PublicSite({ locale, children }: { locale: SiteLocale; children: ReactNode }) {
  return <SiteLanguageProvider locale={locale}><PublicSiteBoundary>{children}</PublicSiteBoundary></SiteLanguageProvider>;
}

function PublicSiteBoundary({ children }: { children: ReactNode }) {
  const { direction, locale } = useSiteLanguage();
  return (
    <div data-testid="public-site" lang={locale} dir={direction} className={locale === "ar" ? "public-site-arabic" : ""}>
      {children}
    </div>
  );
}

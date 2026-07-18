import type { ReactNode } from "react";
import { SiteLanguageProvider, useSiteLanguage } from "./site-language";

export function PublicSite({ children }: { children: ReactNode }) {
  return <SiteLanguageProvider><PublicSiteBoundary>{children}</PublicSiteBoundary></SiteLanguageProvider>;
}

function PublicSiteBoundary({ children }: { children: ReactNode }) {
  const { direction, locale } = useSiteLanguage();
  return (
    <div data-testid="public-site" lang={locale} dir={direction} className={locale === "ar" ? "public-site-arabic" : ""}>
      {children}
    </div>
  );
}

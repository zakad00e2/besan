export type SiteLocale = "ar" | "en";
export type SiteDirection = "rtl" | "ltr";
export type PublicPageKey = "home" | "workshops" | "bookCall";

export const SITE_ORIGIN = "https://www.besankhalaily.com" as const;
export const PUBLIC_PAGE_KEYS = ["home", "workshops", "bookCall"] as const;
export const SITE_LOCALES = ["ar", "en"] as const;

export const PUBLIC_ROUTE_PATHS = {
  home: { ar: "/", en: "/en" },
  workshops: { ar: "/workshops", en: "/en/workshops" },
  bookCall: { ar: "/book-call", en: "/en/book-call" },
} as const satisfies Record<PublicPageKey, Record<SiteLocale, string>>;

export function getPublicPath(page: PublicPageKey, locale: SiteLocale) {
  return PUBLIC_ROUTE_PATHS[page][locale];
}

export function getPublicUrl(page: PublicPageKey, locale: SiteLocale) {
  return new URL(getPublicPath(page, locale), `${SITE_ORIGIN}/`).href;
}

export function getAlternateLocalePath(pathname: string, targetLocale: SiteLocale) {
  for (const page of PUBLIC_PAGE_KEYS) {
    const localizedPaths = Object.values(PUBLIC_ROUTE_PATHS[page]) as readonly string[];
    if (localizedPaths.includes(pathname)) return getPublicPath(page, targetLocale);
  }
  return getPublicPath("home", targetLocale);
}

export function getDocumentAttributes(pathname: string): {
  lang: SiteLocale;
  dir: SiteDirection;
} {
  const english =
    pathname === "/auth" || pathname.startsWith("/dashboard") || pathname.startsWith("/en");
  return english ? { lang: "en", dir: "ltr" } : { lang: "ar", dir: "rtl" };
}

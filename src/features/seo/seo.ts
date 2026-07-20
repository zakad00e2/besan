import type { MetaDescriptor } from "@tanstack/react-router";
import { siteContactLinks } from "@/features/site-language/site-contact";
import {
  type PublicPageKey,
  type SiteLocale,
  SITE_ORIGIN,
  getPublicUrl,
} from "./site-config";

const OG_IMAGE_URL = `${SITE_ORIGIN}/og-besan-khalaily.png`;

const SEO_COPY = {
  ar: {
    home: {
      title: "مصممة أزياء وفساتين حسب الطلب في سخنين | بيسان خلايلة",
      description: "بيسان خلايلة، مصممة أزياء في سخنين لتصميم الفساتين حسب الطلب، التأجير، والاستشارات الشخصية. احجزي موعدك في الأتيليه.",
      imageAlt: "بيسان خلايلة، مصممة أزياء في سخنين",
    },
    workshops: {
      title: "ورش خياطة وباترون في سخنين | بيسان خلايلة",
      description: "ورش خياطة وباترون عملية مع بيسان خلايلة في سخنين، تشمل أخذ القياسات، رسم الباترون، خياطة الكورسيه، ودورات أتيليه خاصة.",
      imageAlt: "ورشة خياطة وباترون في أتيليه بيسان خلايلة",
    },
    bookCall: {
      title: "احجزي موعد تصميم أو قياس فستان | بيسان خلايلة",
      description: "احجزي موعدًا مع بيسان خلايلة في سخنين لتصميم فستان حسب الطلب، استشارة تصميم، جلسة قياس، أو استئجار فستان.",
      imageAlt: "حجز موعد في أتيليه بيسان خلايلة",
    },
  },
  en: {
    home: {
      title: "Fashion Designer & Made-to-Measure Dresses in Sakhnin | Besan Khalaily",
      description: "Besan Khalaily is a Sakhnin fashion designer offering made-to-measure dresses, rentals, and personal design consultations.",
      imageAlt: "Besan Khalaily, fashion designer in Sakhnin",
    },
    workshops: {
      title: "Sewing & Pattern Workshops in Sakhnin | Besan Khalaily",
      description: "Practical sewing and pattern workshops in Sakhnin covering measurements, drafting, corset construction, and private atelier courses.",
      imageAlt: "Sewing and pattern workshop at Besan Khalaily atelier",
    },
    bookCall: {
      title: "Book a Dress Design or Fitting Appointment | Besan Khalaily",
      description: "Book a Sakhnin atelier appointment for a custom dress, design consultation, fitting, or dress rental with Besan Khalaily.",
      imageAlt: "Book an appointment at Besan Khalaily atelier",
    },
  },
} as const;

export const PRIVATE_ROBOTS_META = { name: "robots", content: "noindex, nofollow" } as const;

function createHomeJsonLd(locale: SiteLocale) {
  const arabic = locale === "ar";
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Person",
        "@id": `${SITE_ORIGIN}/#person`,
        name: arabic ? "بيسان خلايلة" : "Besan Khalaily",
        jobTitle: arabic ? "مصممة أزياء" : "Fashion Designer",
        url: getPublicUrl("home", locale),
        sameAs: [siteContactLinks.instagram],
      },
      {
        "@type": "ProfessionalService",
        "@id": `${SITE_ORIGIN}/#atelier`,
        name: arabic ? "أتيليه بيسان خلايلة" : "Besan Khalaily Atelier",
        url: getPublicUrl("home", locale),
        image: OG_IMAGE_URL,
        email: siteContactLinks.email.replace(/^mailto:/, ""),
        address: { "@type": "PostalAddress", addressLocality: "Sakhnin", addressCountry: "IL" },
        areaServed: ["Sakhnin"],
        founder: { "@id": `${SITE_ORIGIN}/#person` },
        sameAs: [siteContactLinks.instagram],
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_ORIGIN}/#website`,
        url: `${SITE_ORIGIN}/`,
        name: arabic ? "بيسان خلايلة" : "Besan Khalaily",
        inLanguage: locale,
        publisher: { "@id": `${SITE_ORIGIN}/#atelier` },
      },
    ],
  };
}

export function createSeoHead(page: PublicPageKey, locale: SiteLocale) {
  const copy = SEO_COPY[locale][page];
  const canonical = getPublicUrl(page, locale);
  const alternateLocale = locale === "ar" ? "en" : "ar";
  const meta: MetaDescriptor[] = [
    { title: copy.title },
    { name: "description", content: copy.description },
    { property: "og:title", content: copy.title },
    { property: "og:description", content: copy.description },
    { property: "og:type", content: "website" },
    { property: "og:url", content: canonical },
    { property: "og:image", content: OG_IMAGE_URL },
    { property: "og:image:alt", content: copy.imageAlt },
    { property: "og:image:width", content: "2172" },
    { property: "og:image:height", content: "724" },
    { property: "og:locale", content: locale === "ar" ? "ar_AR" : "en_US" },
    { property: "og:locale:alternate", content: alternateLocale === "ar" ? "ar_AR" : "en_US" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: copy.title },
    { name: "twitter:description", content: copy.description },
    { name: "twitter:image", content: OG_IMAGE_URL },
  ];

  if (page === "home") meta.push({ "script:ld+json": createHomeJsonLd(locale) });

  return {
    meta,
    links: [
      { rel: "canonical", href: canonical },
      { rel: "alternate", hrefLang: "ar", href: getPublicUrl(page, "ar") },
      { rel: "alternate", hrefLang: "en", href: getPublicUrl(page, "en") },
      { rel: "alternate", hrefLang: "x-default", href: getPublicUrl(page, "ar") },
    ],
  };
}

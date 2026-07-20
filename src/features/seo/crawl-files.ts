import { PUBLIC_PAGE_KEYS, SITE_LOCALES, SITE_ORIGIN, getPublicUrl } from "./site-config";

export function buildSitemapXml() {
  const entries = PUBLIC_PAGE_KEYS.flatMap((page) =>
    SITE_LOCALES.map((locale) => [
      "  <url>",
      `    <loc>${getPublicUrl(page, locale)}</loc>`,
      `    <xhtml:link rel="alternate" hreflang="ar" href="${getPublicUrl(page, "ar")}" />`,
      `    <xhtml:link rel="alternate" hreflang="en" href="${getPublicUrl(page, "en")}" />`,
      `    <xhtml:link rel="alternate" hreflang="x-default" href="${getPublicUrl(page, "ar")}" />`,
      "  </url>",
    ].join("\n")),
  );

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...entries,
    "</urlset>",
    "",
  ].join("\n");
}

export function buildRobotsTxt() {
  return [
    "User-agent: *",
    "Allow: /",
    "",
    `Sitemap: ${SITE_ORIGIN}/sitemap.xml`,
    "",
  ].join("\n");
}

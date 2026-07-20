import { describe, expect, it } from "vitest";
import {
  PUBLIC_PAGE_KEYS,
  SITE_ORIGIN,
  getAlternateLocalePath,
  getDocumentAttributes,
  getPublicPath,
  getPublicUrl,
} from "./site-config";

describe("SEO site configuration", () => {
  it("uses the confirmed canonical production origin", () => {
    expect(SITE_ORIGIN).toBe("https://www.besankhalaily.com");
  });

  it.each([
    ["home", "ar", "/", "https://www.besankhalaily.com/"],
    ["workshops", "ar", "/workshops", "https://www.besankhalaily.com/workshops"],
    ["bookCall", "ar", "/book-call", "https://www.besankhalaily.com/book-call"],
    ["home", "en", "/en", "https://www.besankhalaily.com/en"],
    ["workshops", "en", "/en/workshops", "https://www.besankhalaily.com/en/workshops"],
    ["bookCall", "en", "/en/book-call", "https://www.besankhalaily.com/en/book-call"],
  ] as const)("maps %s/%s to stable paths and URLs", (page, locale, path, url) => {
    expect(getPublicPath(page, locale)).toBe(path);
    expect(getPublicUrl(page, locale)).toBe(url);
  });

  it("keeps the corresponding page when switching languages", () => {
    for (const page of PUBLIC_PAGE_KEYS) {
      const arabic = getPublicPath(page, "ar");
      const english = getPublicPath(page, "en");
      expect(getAlternateLocalePath(arabic, "en")).toBe(english);
      expect(getAlternateLocalePath(english, "ar")).toBe(arabic);
    }
    expect(getAlternateLocalePath("/unknown", "en")).toBe("/en");
  });

  it("derives server document language and direction from the URL", () => {
    expect(getDocumentAttributes("/")).toEqual({ lang: "ar", dir: "rtl" });
    expect(getDocumentAttributes("/en/workshops")).toEqual({ lang: "en", dir: "ltr" });
    expect(getDocumentAttributes("/dashboard/bookings")).toEqual({ lang: "en", dir: "ltr" });
    expect(getDocumentAttributes("/auth")).toEqual({ lang: "en", dir: "ltr" });
  });
});

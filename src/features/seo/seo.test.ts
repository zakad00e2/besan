import type { MetaDescriptor } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";
import { PUBLIC_PAGE_KEYS, SITE_LOCALES, getPublicUrl } from "./site-config";
import { PRIVATE_ROBOTS_META, createSeoHead } from "./seo";

function metaValue(meta: MetaDescriptor[], attribute: "name" | "property", key: string) {
  const tag = meta.find((item) => (item as Record<string, unknown>)[attribute] === key);
  return tag && "content" in tag ? tag.content : undefined;
}

function titleValue(meta: MetaDescriptor[]) {
  const tag = meta.find((item): item is { title: string } => "title" in item);
  return tag?.title;
}

describe("SEO head generation", () => {
  it("uses the requested brand title for the Arabic home page", () => {
    expect(titleValue(createSeoHead("home", "ar").meta)).toBe(
      "Besan Khalaily - Timeless Couture",
    );
  });

  it("uses the requested Arabic home page description", () => {
    expect(metaValue(createSeoHead("home", "ar").meta, "name", "description")).toBe(
      "بيسان خلايلة، مصممة أزياء متخصصة في تصميم الفساتين حسب الطلب، وتأجير الفساتين، وتقديم الاستشارات الشخصية. احجزي موعدك في الأتيليه.",
    );
  });

  it("provides unique titles and descriptions for all public pages", () => {
    const heads = SITE_LOCALES.flatMap((locale) =>
      PUBLIC_PAGE_KEYS.map((page) => createSeoHead(page, locale)),
    );
    expect(new Set(heads.map((head) => titleValue(head.meta))).size).toBe(6);
    expect(new Set(heads.map((head) => metaValue(head.meta, "name", "description"))).size).toBe(6);
  });

  it.each([
    ["home", "ar"],
    ["workshops", "ar"],
    ["bookCall", "ar"],
    ["home", "en"],
    ["workshops", "en"],
    ["bookCall", "en"],
  ] as const)(
    "adds canonical, language alternates, and social metadata for %s/%s",
    (page, locale) => {
      const head = createSeoHead(page, locale);
      expect(head.links).toContainEqual({ rel: "canonical", href: getPublicUrl(page, locale) });
      expect(head.links.filter((link) => link.rel === "alternate")).toHaveLength(3);
      expect(metaValue(head.meta, "property", "og:url")).toBe(getPublicUrl(page, locale));
      expect(metaValue(head.meta, "property", "og:image")).toBe(
        "https://www.besankhalaily.com/og-besan-khalaily.png",
      );
      expect(metaValue(head.meta, "name", "twitter:card")).toBe("summary_large_image");
    },
  );

  it("emits conservative Sakhnin structured data without the placeholder WhatsApp number", () => {
    const json = JSON.stringify(
      createSeoHead("home", "ar").meta.find((tag) => "script:ld+json" in tag),
    );
    expect(json).toContain("Sakhnin");
    expect(json).toContain("ProfessionalService");
    expect(json).toContain("Person");
    expect(json).toContain("besankkhalaily");
    expect(json).toContain("besankhalaily@gmail.com");
    expect(json).not.toContain("970000000000");
    expect(json).not.toContain("aggregateRating");
    expect(json).not.toContain("openingHours");
  });

  it("defines a single private indexing directive", () => {
    expect(PRIVATE_ROBOTS_META).toEqual({ name: "robots", content: "noindex, nofollow" });
  });
});

import { describe, expect, it } from "vitest";
import { buildRobotsTxt, buildSitemapXml } from "./crawl-files";

describe("crawl files", () => {
  it("lists exactly the six public locale URLs with alternates", () => {
    const xml = buildSitemapXml();
    const locations = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);

    expect(locations).toEqual([
      "https://www.besankhalaily.com/",
      "https://www.besankhalaily.com/en",
      "https://www.besankhalaily.com/workshops",
      "https://www.besankhalaily.com/en/workshops",
      "https://www.besankhalaily.com/book-call",
      "https://www.besankhalaily.com/en/book-call",
    ]);
    expect(xml).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"');
    expect(xml.match(/hreflang="ar"/g)).toHaveLength(6);
    expect(xml.match(/hreflang="en"/g)).toHaveLength(6);
    expect(xml).not.toContain("/dashboard");
    expect(xml).not.toContain("/auth");
  });

  it("allows public crawling and advertises the production sitemap", () => {
    expect(buildRobotsTxt()).toBe(
      [
        "User-agent: *",
        "Allow: /",
        "",
        "Sitemap: https://www.besankhalaily.com/sitemap.xml",
        "",
      ].join("\n"),
    );
  });
});

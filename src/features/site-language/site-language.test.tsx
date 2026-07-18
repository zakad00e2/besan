import { describe, expect, it } from "vitest";
import { getStoredSiteLocale } from "./site-language";

describe("site language storage", () => {
  it("defaults to English unless Arabic was explicitly saved", () => {
    expect(getStoredSiteLocale(undefined)).toBe("en");
    expect(getStoredSiteLocale({ getItem: () => "he" })).toBe("en");
    expect(getStoredSiteLocale({ getItem: () => "ar" })).toBe("ar");
  });
});

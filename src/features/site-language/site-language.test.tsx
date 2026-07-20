import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { SiteLanguageProvider, useSiteLanguage } from "./site-language";

function wrapper(locale: "ar" | "en") {
  return ({ children }: { children: ReactNode }) => (
    <SiteLanguageProvider locale={locale}>{children}</SiteLanguageProvider>
  );
}

describe("site language context", () => {
  it("exposes the explicit Arabic route locale", () => {
    const { result } = renderHook(useSiteLanguage, { wrapper: wrapper("ar") });
    expect(result.current.locale).toBe("ar");
    expect(result.current.direction).toBe("rtl");
    expect(result.current.messages.nav.book).toBe("احجزي موعدًا");
  });

  it("exposes the explicit English route locale", () => {
    const { result } = renderHook(useSiteLanguage, { wrapper: wrapper("en") });
    expect(result.current.locale).toBe("en");
    expect(result.current.direction).toBe("ltr");
    expect(result.current.messages.nav.book).toBe("BOOK A CALL");
  });
});

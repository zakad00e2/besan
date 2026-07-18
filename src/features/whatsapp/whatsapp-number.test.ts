import { describe, expect, it } from "vitest";
import {
  DEFAULT_WHATSAPP_COUNTRY,
  getWhatsAppCountryOptions,
  normalizeWhatsAppNumber,
} from "./whatsapp-number";

describe("WhatsApp number metadata", () => {
  it("defaults to +972 and includes the supported regional countries", () => {
    const options = getWhatsAppCountryOptions("en");

    expect(DEFAULT_WHATSAPP_COUNTRY).toBe("IL");
    expect(options.find((option) => option.country === DEFAULT_WHATSAPP_COUNTRY)).toMatchObject({
      callingCode: "972",
    });
    expect(options.map((option) => option.country)).toEqual(["IL", "PS", "JO", "EG", "SA", "AE", "LB"]);
    expect(options.find((option) => option.country === "PS")?.label).toContain("🇵🇸");
  });
});

describe("normalizeWhatsAppNumber", () => {
  it("normalizes a +972 local number and removes the domestic trunk zero", () => {
    expect(normalizeWhatsAppNumber("IL", "050-234-5678")).toEqual({
      success: true,
      number: "+972502345678",
    });
  });

  it("normalizes a number using another selected country", () => {
    expect(normalizeWhatsAppNumber("US", "202-555-0123")).toEqual({
      success: true,
      number: "+12025550123",
    });
  });

  it.each(["", "123", "not-a-number"])("rejects invalid input %j", (value) => {
    expect(normalizeWhatsAppNumber("IL", value)).toEqual({ success: false });
  });
});

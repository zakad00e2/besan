import { getCountryCallingCode, parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";

export const DEFAULT_WHATSAPP_COUNTRY: CountryCode = "IL";
const WHATSAPP_COUNTRIES: CountryCode[] = ["IL", "PS", "JO", "EG", "SA", "AE", "LB"];

export type WhatsAppCountryOption = {
  country: CountryCode;
  callingCode: string;
  label: string;
};

export type WhatsAppNumberResult = { success: true; number: string } | { success: false };

function countryFlag(country: CountryCode) {
  return String.fromCodePoint(...[...country].map((letter) => 0x1f1a5 + letter.charCodeAt(0)));
}

export function getWhatsAppCountryOptions(_locale: "ar" | "en"): WhatsAppCountryOption[] {
  return WHATSAPP_COUNTRIES
    .map((country) => ({
      country,
      callingCode: getCountryCallingCode(country),
      label: `${countryFlag(country)} +${getCountryCallingCode(country)}`,
    }));
}

export function normalizeWhatsAppNumber(
  country: CountryCode,
  value: string,
): WhatsAppNumberResult {
  const input = value.trim();
  if (!input) return { success: false };

  const parsed = input.startsWith("+")
    ? parsePhoneNumberFromString(input)
    : parsePhoneNumberFromString(input, country);

  return parsed?.isValid() ? { success: true, number: parsed.number } : { success: false };
}

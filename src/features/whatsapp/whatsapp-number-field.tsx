import { useMemo } from "react";
import type { CountryCode } from "libphonenumber-js";
import { getWhatsAppCountryOptions } from "./whatsapp-number";

export function WhatsAppNumberField({
  id,
  locale,
  country,
  value,
  disabled = false,
  compact = false,
  error,
  onCountryChange,
  onValueChange,
}: {
  id: string;
  locale: "ar" | "en";
  country: CountryCode;
  value: string;
  disabled?: boolean;
  compact?: boolean;
  error?: string;
  onCountryChange: (country: CountryCode) => void;
  onValueChange: (value: string) => void;
}) {
  const options = useMemo(() => getWhatsAppCountryOptions(locale), [locale]);
  const label = locale === "ar" ? "رقم واتساب" : "WhatsApp Number";
  const countryLabel = locale === "ar" ? "مقدمة رقم واتساب" : "WhatsApp country code";
  const errorId = `${id}-error`;

  const fieldPadding = compact ? "py-2" : "py-4";
  const fieldSpacing = compact ? "mt-1" : "mt-3";

  return (
    <div className="block max-w-sm text-sm">
      <label
        htmlFor={id}
        className={`text-xs text-muted-foreground ${locale === "ar" ? "tracking-normal" : "tracking-[0.1em]"}`}
      >
        {label}
      </label>
      <div
        dir={locale === "ar" ? "rtl" : "ltr"}
        className={`${fieldSpacing} grid ${locale === "ar" ? "grid-cols-[minmax(0,1fr)_5.25rem]" : "grid-cols-[5.25rem_minmax(0,1fr)]"}`}
      >
        <input
          id={id}
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          dir="ltr"
          value={value}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          onChange={(event) => onValueChange(event.target.value)}
          placeholder="5xxxxxxxx"
          className={`border border-l-0 border-foreground/40 bg-transparent px-4 ${fieldPadding} text-sm outline-none focus:border-foreground ${locale === "en" ? "order-2" : ""}`}
        />
        <select
          aria-label={countryLabel}
          dir="ltr"
          value={country}
          disabled={disabled}
          onChange={(event) => onCountryChange(event.target.value as CountryCode)}
          className={`w-full min-w-0 border border-foreground/40 bg-transparent px-1.5 ${fieldPadding} text-xs outline-none focus:border-foreground ${locale === "en" ? "order-1" : ""}`}
        >
          {options.map((option) => (
            <option key={option.country} value={option.country}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      {error ? <span id={errorId} className="mt-2 block text-xs text-destructive">{error}</span> : null}
    </div>
  );
}

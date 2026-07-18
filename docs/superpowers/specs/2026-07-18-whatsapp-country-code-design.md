# WhatsApp Country Code Input Design

**Date:** 2026-07-18

## Goal

Replace the customer-facing mobile-number input with a WhatsApp-number input in both the public appointment form and workshop registration form. Customers can choose any supported country, with calling code `+972` selected by default.

## Scope

### In scope

- The public appointment form on `/book-call`.
- The customer-facing workshop booking dialog.
- Arabic and English WhatsApp labels and validation messages.
- A reusable country selector and WhatsApp-number normalization utility.
- All countries and calling codes supported by `libphonenumber-js`.
- Persisting the normalized international number in the existing `mobile` field.

### Out of scope

- Renaming the `mobile` database column or internal repository properties.
- Adding a second phone-number field.
- Changing administrator phone-number inputs or dashboard labels.
- Sending WhatsApp messages or verifying number ownership.
- Rewriting previously stored customer numbers.

## Architecture

### Trusted phone metadata

Add `libphonenumber-js` as the source of supported ISO countries, calling codes, parsing, and validation. Use `getCountries()` and `getCountryCallingCode()` to build the options. Store the selected ISO country code in form state rather than storing only a calling-code string because several countries share the same calling code.

The selector displays a localized country name and calling code. Country names come from `Intl.DisplayNames` in the active site locale, with the ISO code as a fallback. The default country is the ISO country whose calling code is `+972`.

### Reusable form unit

Create a focused WhatsApp-number field component that receives:

- the current ISO country code;
- the current local-number text;
- locale and disabled state;
- country-change and number-change callbacks;
- an optional validation error.

It renders a country selector next to a `type="tel"` input. The Arabic label is `رقم واتساب`; the English label is `WhatsApp Number`. The selector remains keyboard accessible and exposes a clear accessible name.

Both customer-facing forms use this component. Their existing `mobile` form property continues to hold the local-number text while a new `mobileCountry` property holds the selected ISO country code until submission.

### Normalization and validation

Create a shared normalization function:

```ts
normalizeWhatsAppNumber(country, localNumber)
```

The function trims the input, lets `libphonenumber-js` parse it in the selected country, and returns the canonical E.164 number when valid. A leading domestic trunk zero is handled by the library, so an Israeli local input such as `05xxxxxxxx` is stored in the form `+9725xxxxxxxx` when valid.

If the customer pastes an international number beginning with `+`, the parser respects that international prefix. The result must still be a possible and valid phone number. Invalid input produces a WhatsApp-specific validation error and prevents submission.

### Persistence compatibility

The appointment and workshop submission payloads continue to use the `mobile` property. Before submission, each form replaces the local display value with the normalized E.164 value. Existing services, repositories, database constraints, customer matching, and dashboard display continue to operate without a schema migration.

The current database limit of 20 characters is sufficient because E.164 numbers are shorter than that limit.

## Data Flow

1. The customer opens either customer-facing form.
2. The country selector defaults to the `+972` country.
3. The customer may select any supported country and enters a local or international WhatsApp number.
4. On submission, the shared utility parses and validates the country and number.
5. A valid number is converted to E.164 and passed through the existing `mobile` payload property.
6. An invalid number keeps the form open and shows a localized WhatsApp-number error.

## Error Handling

- Unknown ISO country values are rejected.
- Empty, impossible, or invalid phone numbers show a WhatsApp-specific error.
- The form keeps the customer's country and number after a validation or server error.
- Submission-pending state disables both the country selector and number input.
- The existing storage and slot-conflict error handling remains unchanged.

## Testing

- Country utility tests verify that all library-supported countries are represented and `+972` is the default.
- Normalization tests cover an Israeli local number, an explicit international number, a different selected country, and invalid input.
- Appointment form tests verify the WhatsApp label in Arabic and English, the default selector, choosing another country, normalized submission, and disabled state while pending.
- Workshop dialog tests verify the same country selection and normalized submission behavior.
- Existing service and repository tests confirm that normalized numbers still travel through the `mobile` field.

## Success Criteria

- Both customer-facing forms show `رقم واتساب` in Arabic and `WhatsApp Number` in English.
- Both forms provide all countries supported by `libphonenumber-js`.
- The default calling code is `+972`.
- Customers can choose a different country before submitting.
- Valid numbers are stored in E.164 form in the existing `mobile` field.
- Invalid numbers do not submit and receive a localized WhatsApp-specific error.
- No database migration is required and existing bookings remain readable.

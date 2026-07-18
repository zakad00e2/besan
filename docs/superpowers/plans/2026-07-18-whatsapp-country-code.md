# WhatsApp Country Code Input Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the customer-facing mobile inputs in appointment and workshop booking with a reusable WhatsApp-number field that supports every library-backed country, defaults to `+972`, and submits canonical E.164 numbers through the existing `mobile` property.

**Architecture:** Add `libphonenumber-js` as the phone metadata and validation source. A focused utility owns country options and E.164 normalization, while a reusable React field owns the localized selector/input UI. Both customer-facing forms keep their existing payload and database contracts and normalize immediately before submission.

**Tech Stack:** TypeScript 5.8, React 19, Vitest 4, Testing Library, `libphonenumber-js` 1.13.9, npm.

## Global Constraints

- Apply the WhatsApp field to `/book-call` and the customer-facing workshop booking dialog.
- Show `WhatsApp Number` in English and `رقم واتساب` in Arabic.
- Include every country supported by `libphonenumber-js`.
- Default to the country whose calling code is `+972` (`IL`).
- Persist canonical E.164 through the existing `mobile` property.
- Do not rename database columns, repository fields, or administrator phone inputs.
- Keep selected country and entered number after validation, availability, or storage errors.
- Preserve unrelated dirty-worktree changes and do not stage whole pre-modified files.

---

## File Structure

- Modify `package.json` and `package-lock.json`: declare and lock `libphonenumber-js` 1.13.9.
- Create `src/features/whatsapp/whatsapp-number.ts`: country metadata, default country, and normalization.
- Create `src/features/whatsapp/whatsapp-number.test.ts`: utility contract tests.
- Create `src/features/whatsapp/whatsapp-number-field.tsx`: accessible localized country selector and telephone input.
- Create `src/features/whatsapp/whatsapp-number-field.test.tsx`: component rendering and interaction tests.
- Modify `src/routes/book-call.tsx`: controlled WhatsApp state, validation, normalization, and shared field rendering.
- Modify `src/routes/-book-call.test.tsx`: appointment form integration tests.
- Modify `src/features/workshop-booking/workshop-booking-dialog.tsx`: country state, normalization, and shared field rendering.
- Modify `src/features/workshop-booking/workshop-booking-dialog.test.tsx`: workshop integration tests.

---

### Task 1: Add Country Metadata and E.164 Normalization

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/features/whatsapp/whatsapp-number.test.ts`
- Create: `src/features/whatsapp/whatsapp-number.ts`

**Interfaces:**
- Produces: `DEFAULT_WHATSAPP_COUNTRY: CountryCode`, `getWhatsAppCountryOptions(locale: "ar" | "en"): WhatsAppCountryOption[]`, and `normalizeWhatsAppNumber(country: CountryCode, value: string): WhatsAppNumberResult`.
- `WhatsAppNumberResult` is `{ success: true; number: string } | { success: false }`.

- [ ] **Step 1: Install the pinned library**

Run:

```bash
npm install libphonenumber-js@1.13.9
```

Expected: `package.json` contains `"libphonenumber-js": "^1.13.9"` and `package-lock.json` records the resolved package.

- [ ] **Step 2: Write the failing utility tests**

Create `whatsapp-number.test.ts`:

```ts
import { getCountries } from "libphonenumber-js";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_WHATSAPP_COUNTRY,
  getWhatsAppCountryOptions,
  normalizeWhatsAppNumber,
} from "./whatsapp-number";

describe("WhatsApp number metadata", () => {
  it("defaults to +972 and includes every supported country", () => {
    const options = getWhatsAppCountryOptions("en");

    expect(DEFAULT_WHATSAPP_COUNTRY).toBe("IL");
    expect(options.find((option) => option.country === DEFAULT_WHATSAPP_COUNTRY)).toMatchObject({
      callingCode: "972",
    });
    expect(options.map((option) => option.country).sort()).toEqual([...getCountries()].sort());
  });

  it("localizes country labels without changing country identity", () => {
    const english = getWhatsAppCountryOptions("en").find((option) => option.country === "US");
    const arabic = getWhatsAppCountryOptions("ar").find((option) => option.country === "US");

    expect(english).toMatchObject({ country: "US", callingCode: "1" });
    expect(arabic).toMatchObject({ country: "US", callingCode: "1" });
    expect(english?.label).not.toBe(arabic?.label);
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

  it("respects an explicitly international number", () => {
    expect(normalizeWhatsAppNumber("IL", "+44 20 7946 0018")).toEqual({
      success: true,
      number: "+442079460018",
    });
  });

  it.each(["", "123", "not-a-number"])("rejects invalid input %j", (value) => {
    expect(normalizeWhatsAppNumber("IL", value)).toEqual({ success: false });
  });
});
```

- [ ] **Step 3: Run the utility tests and verify RED**

Run:

```bash
npx vitest run src/features/whatsapp/whatsapp-number.test.ts
```

Expected: FAIL because `whatsapp-number.ts` does not exist.

- [ ] **Step 4: Implement the metadata and normalization utility**

Create `whatsapp-number.ts`:

```ts
import {
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js";

export const DEFAULT_WHATSAPP_COUNTRY: CountryCode = "IL";

export type WhatsAppCountryOption = {
  country: CountryCode;
  callingCode: string;
  label: string;
};

export type WhatsAppNumberResult =
  | { success: true; number: string }
  | { success: false };

export function getWhatsAppCountryOptions(locale: "ar" | "en"): WhatsAppCountryOption[] {
  const displayNames = new Intl.DisplayNames([locale], { type: "region" });

  return getCountries()
    .map((country) => ({
      country,
      callingCode: getCountryCallingCode(country),
      label: displayNames.of(country) ?? country,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, locale));
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

  return parsed?.isValid()
    ? { success: true, number: parsed.number }
    : { success: false };
}
```

- [ ] **Step 5: Run the utility tests and verify GREEN**

Run:

```bash
npx vitest run src/features/whatsapp/whatsapp-number.test.ts
```

Expected: PASS with all metadata and normalization tests green.

- [ ] **Step 6: Commit the utility without staging unrelated files**

```bash
git add package.json package-lock.json src/features/whatsapp/whatsapp-number.ts src/features/whatsapp/whatsapp-number.test.ts
git commit -m "feat: add WhatsApp number normalization"
```

---

### Task 2: Build the Reusable WhatsApp Field

**Files:**
- Create: `src/features/whatsapp/whatsapp-number-field.test.tsx`
- Create: `src/features/whatsapp/whatsapp-number-field.tsx`

**Interfaces:**
- Consumes: `DEFAULT_WHATSAPP_COUNTRY`, `getWhatsAppCountryOptions`, `CountryCode`.
- Produces: `WhatsAppNumberField(props)` with `id`, `locale`, `country`, `value`, `disabled`, `error`, `onCountryChange`, and `onValueChange` props.

- [ ] **Step 1: Write the failing component tests**

Create `whatsapp-number-field.test.tsx`:

```tsx
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { WhatsAppNumberField } from "./whatsapp-number-field";

afterEach(cleanup);

function renderField(overrides = {}) {
  const props = {
    id: "customer-whatsapp",
    locale: "en" as const,
    country: "IL" as const,
    value: "",
    disabled: false,
    error: undefined,
    onCountryChange: vi.fn(),
    onValueChange: vi.fn(),
    ...overrides,
  };
  render(<WhatsAppNumberField {...props} />);
  return props;
}

it("renders the English WhatsApp label with +972 selected", () => {
  renderField();

  expect(screen.getByLabelText("WhatsApp Number")).toBeTruthy();
  expect((screen.getByLabelText("WhatsApp country code") as HTMLSelectElement).value).toBe("IL");
  expect(screen.getByRole("option", { name: /\+972/ })).toBeTruthy();
});

it("renders Arabic labels", () => {
  renderField({ locale: "ar" });

  expect(screen.getByLabelText("رقم واتساب")).toBeTruthy();
  expect(screen.getByLabelText("مقدمة رقم واتساب")).toBeTruthy();
});

it("reports country and number changes", () => {
  const props = renderField();

  fireEvent.change(screen.getByLabelText("WhatsApp country code"), {
    target: { value: "US" },
  });
  fireEvent.change(screen.getByLabelText("WhatsApp Number"), {
    target: { value: "202-555-0123" },
  });

  expect(props.onCountryChange).toHaveBeenCalledWith("US");
  expect(props.onValueChange).toHaveBeenCalledWith("202-555-0123");
});

it("disables both controls and associates an error", () => {
  renderField({ disabled: true, error: "Enter a valid WhatsApp number." });

  expect((screen.getByLabelText("WhatsApp country code") as HTMLSelectElement).disabled).toBe(true);
  expect((screen.getByLabelText("WhatsApp Number") as HTMLInputElement).disabled).toBe(true);
  expect(screen.getByLabelText("WhatsApp Number").getAttribute("aria-invalid")).toBe("true");
  expect(screen.getByText("Enter a valid WhatsApp number.")).toBeTruthy();
});
```

- [ ] **Step 2: Run the component tests and verify RED**

Run:

```bash
npx vitest run src/features/whatsapp/whatsapp-number-field.test.tsx
```

Expected: FAIL because the field component does not exist.

- [ ] **Step 3: Implement the shared field**

Create `whatsapp-number-field.tsx` with this public shape and behavior:

```tsx
import { useMemo } from "react";
import type { CountryCode } from "libphonenumber-js";
import { getWhatsAppCountryOptions } from "./whatsapp-number";

export function WhatsAppNumberField({
  id,
  locale,
  country,
  value,
  disabled = false,
  error,
  onCountryChange,
  onValueChange,
}: {
  id: string;
  locale: "ar" | "en";
  country: CountryCode;
  value: string;
  disabled?: boolean;
  error?: string;
  onCountryChange: (country: CountryCode) => void;
  onValueChange: (value: string) => void;
}) {
  const options = useMemo(() => getWhatsAppCountryOptions(locale), [locale]);
  const label = locale === "ar" ? "رقم واتساب" : "WhatsApp Number";
  const countryLabel = locale === "ar" ? "مقدمة رقم واتساب" : "WhatsApp country code";
  const errorId = `${id}-error`;

  return (
    <div className="block text-sm">
      <label htmlFor={id} className="text-xs tracking-[0.1em] text-muted-foreground">
        {label}
      </label>
      <div className="mt-1 grid grid-cols-[minmax(8rem,0.9fr)_minmax(0,1.1fr)]">
        <select
          aria-label={countryLabel}
          value={country}
          disabled={disabled}
          onChange={(event) => onCountryChange(event.target.value as CountryCode)}
          className="border border-foreground/40 bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground"
        >
          {options.map((option) => (
            <option key={option.country} value={option.country}>
              {option.label} (+{option.callingCode})
            </option>
          ))}
        </select>
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
          placeholder="05xxxxxxxx"
          className="border border-l-0 border-foreground/40 bg-transparent px-4 py-2 text-sm outline-none focus:border-foreground rtl:border-l rtl:border-r-0"
        />
      </div>
      {error ? (
        <span id={errorId} className="mt-2 block text-xs text-destructive">
          {error}
        </span>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 4: Run the component tests and verify GREEN**

Run:

```bash
npx vitest run src/features/whatsapp/whatsapp-number-field.test.tsx
```

Expected: PASS with label, default, interaction, disabled, and error behavior green.

- [ ] **Step 5: Commit the reusable field**

```bash
git add src/features/whatsapp/whatsapp-number-field.tsx src/features/whatsapp/whatsapp-number-field.test.tsx
git commit -m "feat: add WhatsApp country selector"
```

---

### Task 3: Integrate the Appointment Booking Form

**Files:**
- Modify: `src/routes/-book-call.test.tsx`
- Modify: `src/routes/book-call.tsx`

**Interfaces:**
- Consumes: `WhatsAppNumberField`, `DEFAULT_WHATSAPP_COUNTRY`, and `normalizeWhatsAppNumber`.
- Produces: an unchanged `submitBooking({ data: { ... mobile } })` boundary where `mobile` is canonical E.164.

- [ ] **Step 1: Write failing appointment integration tests**

Update existing `Mobile Number` queries to `WhatsApp Number`. Add a test that fills the required booking controls, changes the country to `US`, enters `202-555-0123`, submits, and asserts:

```tsx
expect((screen.getByLabelText("WhatsApp country code") as HTMLSelectElement).value).toBe("IL");
fireEvent.change(screen.getByLabelText("WhatsApp country code"), {
  target: { value: "US" },
});
fireEvent.change(screen.getByLabelText("WhatsApp Number"), {
  target: { value: "202-555-0123" },
});

expect(submitBooking).toHaveBeenCalledWith({
  data: expect.objectContaining({ mobile: "+12025550123" }),
});
```

Add an invalid-number test that enters `123`, clicks `Confirm Booking`, expects `Enter a valid WhatsApp number.`, and expects `submitBooking` not to be called.

- [ ] **Step 2: Run the appointment route tests and verify RED**

Run:

```bash
npx vitest run src/routes/-book-call.test.tsx src/routes/book-call.test.tsx
```

Expected: FAIL because the route still renders `Mobile Number` and sends the raw value.

- [ ] **Step 3: Add controlled country and number state**

In `BookCallContent`, add:

```ts
const [mobileCountry, setMobileCountry] = useState(DEFAULT_WHATSAPP_COUNTRY);
const [mobile, setMobile] = useState("");
```

Import the shared field and utility. In `handleSubmit`, replace the raw FormData mobile read with:

```ts
const normalizedMobile = normalizeWhatsAppNumber(mobileCountry, mobile);
if (!normalizedMobile.success) {
  setSubmitted(false);
  setFieldErrors((current) => ({
    ...current,
    mobile: ar ? "أدخلي رقم واتساب صحيحًا." : "Enter a valid WhatsApp number.",
  }));
  return;
}
```

Submit `mobile: normalizedMobile.number`. Clear `fieldErrors.mobile` when either country or local number changes.

- [ ] **Step 4: Replace the current mobile label and input**

Render:

```tsx
<WhatsAppNumberField
  id="appointment-whatsapp"
  locale={locale}
  country={mobileCountry}
  value={mobile}
  disabled={submitting || submitted}
  error={fieldErrors.mobile}
  onCountryChange={(country) => {
    setMobileCountry(country);
    setFieldErrors((current) => ({ ...current, mobile: undefined }));
  }}
  onValueChange={(value) => {
    setMobile(value);
    setFieldErrors((current) => ({ ...current, mobile: undefined }));
  }}
/>
```

Update the incomplete-form English copy from `mobile number` to `WhatsApp number` and use the proper Arabic WhatsApp wording.

- [ ] **Step 5: Run appointment route tests and verify GREEN**

Run:

```bash
npx vitest run src/routes/-book-call.test.tsx src/routes/book-call.test.tsx
```

Expected: all appointment route tests pass, aside from any explicitly documented pre-existing assertion unrelated to WhatsApp; the new WhatsApp assertions must pass.

- [ ] **Step 6: Commit only the appointment integration hunks**

Because these files were already modified before this task, stage only the reviewed WhatsApp hunks. Do not stage the complete file if unrelated changes appear.

```bash
git diff -- src/routes/book-call.tsx src/routes/-book-call.test.tsx
git add -p -- src/routes/book-call.tsx src/routes/-book-call.test.tsx
git commit -m "feat: collect WhatsApp on appointment booking"
```

---

### Task 4: Integrate the Workshop Booking Dialog

**Files:**
- Modify: `src/features/workshop-booking/workshop-booking-dialog.test.tsx`
- Modify: `src/features/workshop-booking/workshop-booking-dialog.tsx`

**Interfaces:**
- Consumes: the same shared field and normalization utility as Task 3.
- Produces: an unchanged `submitWorkshopBooking({ data: { ... mobile } })` boundary where `mobile` is canonical E.164.

- [ ] **Step 1: Write failing workshop integration tests**

Replace `Mobile number` queries with `WhatsApp Number`. Update `fillValidForm()` to enter `050-234-5678`. In the success test, assert:

```tsx
expect((screen.getByLabelText("WhatsApp country code") as HTMLSelectElement).value).toBe("IL");
expect(submitWorkshopBooking).toHaveBeenCalledWith({
  data: expect.objectContaining({
    workshopId: "mini-course",
    mobile: "+972502345678",
  }),
});
```

Add a test that selects `US`, enters `202-555-0123`, submits valid remaining fields, and expects `mobile: "+12025550123"`. Add an invalid-number test that keeps the entered `123`, shows `Enter a valid WhatsApp number.`, and does not call `submitWorkshopBooking`.

- [ ] **Step 2: Run the workshop dialog tests and verify RED**

Run:

```bash
npx vitest run src/features/workshop-booking/workshop-booking-dialog.test.tsx
```

Expected: FAIL because the dialog still renders `Mobile number` and submits raw input.

- [ ] **Step 3: Add country state and normalize before domain parsing**

Add:

```ts
const [mobileCountry, setMobileCountry] = useState(DEFAULT_WHATSAPP_COUNTRY);
```

At the start of `handleSubmit`, normalize `values.mobile`. If invalid, preserve values and set:

```ts
setErrors((current) => ({
  ...current,
  mobile: ar ? "أدخلي رقم واتساب صحيحًا." : "Enter a valid WhatsApp number.",
}));
return;
```

Call the existing parser with:

```ts
const parsed = parseWorkshopBooking(workshop, {
  ...values,
  mobile: normalizedMobile.number,
});
```

Reset `mobileCountry` to `DEFAULT_WHATSAPP_COUNTRY` whenever the dialog reset path resets `values` to `initialValues`.

- [ ] **Step 4: Replace the current workshop mobile field**

Render the shared component with `id="workshop-whatsapp"`, `locale`, `mobileCountry`, `values.mobile`, `submitting`, and `errors.mobile`. Clear the mobile error whenever country or value changes.

- [ ] **Step 5: Run the workshop dialog tests and verify GREEN**

Run:

```bash
npx vitest run src/features/workshop-booking/workshop-booking-dialog.test.tsx
```

Expected: all workshop dialog tests pass with normalized `mobile` payloads.

- [ ] **Step 6: Commit only the workshop integration hunks**

```bash
git diff -- src/features/workshop-booking/workshop-booking-dialog.tsx src/features/workshop-booking/workshop-booking-dialog.test.tsx
git add -p -- src/features/workshop-booking/workshop-booking-dialog.tsx src/features/workshop-booking/workshop-booking-dialog.test.tsx
git commit -m "feat: collect WhatsApp on workshop booking"
```

---

### Task 5: Verify the Complete WhatsApp Flow

**Files:**
- Modify only if a failure is directly caused by Tasks 1-4.

**Interfaces:**
- Consumes all previous task outputs.
- Produces fresh evidence for utility, UI, form integration, build, and existing baseline status.

- [ ] **Step 1: Run all WhatsApp-focused tests**

```bash
npx vitest run src/features/whatsapp/whatsapp-number.test.ts src/features/whatsapp/whatsapp-number-field.test.tsx src/routes/-book-call.test.tsx src/routes/book-call.test.tsx src/features/workshop-booking/workshop-booking-dialog.test.tsx
```

Expected: zero WhatsApp-related failures.

- [ ] **Step 2: Run the complete suite**

```bash
npm test
```

Expected: compare with the documented baseline of five unrelated failures. No new failures may be introduced.

- [ ] **Step 3: Lint the touched files**

```bash
npx eslint src/features/whatsapp/whatsapp-number.ts src/features/whatsapp/whatsapp-number.test.ts src/features/whatsapp/whatsapp-number-field.tsx src/features/whatsapp/whatsapp-number-field.test.tsx src/routes/book-call.tsx src/routes/-book-call.test.tsx src/features/workshop-booking/workshop-booking-dialog.tsx src/features/workshop-booking/workshop-booking-dialog.test.tsx
```

Expected: zero errors in touched files. Global lint failures outside these paths remain documented baseline issues.

- [ ] **Step 4: Run the production build**

```bash
npm run build
```

Expected: exit code 0 with client and server bundles generated.

- [ ] **Step 5: Review scope and whitespace**

```bash
git diff --check
git status --short
rg -n "Mobile Number|Mobile number|رقم الجوال" src/routes/book-call.tsx src/features/workshop-booking/workshop-booking-dialog.tsx
```

Expected: no whitespace errors introduced; the two customer-facing forms contain no old mobile labels; administrator labels and database contracts remain unchanged.

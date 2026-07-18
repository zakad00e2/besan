# Public-site Arabic Language Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (\`- [ ]\`) syntax for tracking.

**Goal:** Add a persistent English/Arabic language switcher to the public site, with Arabic content, Thmanyah Sans typography, and complete RTL behavior while keeping the dashboard English LTR.

**Architecture:** A client-side public-site locale provider owns the \`en\`/\`ar\` state, typed catalogue, and explicit browser preference. Each public route wraps itself in a local \`lang\`/\`dir\` boundary. Canonical appointment and workshop values remain English domain values; only visitor-facing labels are translated.

**Tech Stack:** React 19, TanStack Start Router, TypeScript, Tailwind CSS v4, React Day Picker, Vitest, Testing Library.

## Global Constraints

- Scope only \`/\`, \`/book-call\`, and \`/workshops\`; do not translate \`/dashboard\` or \`/auth\`.
- Default to English; restore a valid \`localStorage\` preference only after hydration.
- Copy the three supplied Thmanyah Sans \`.woff2\` files into \`src/assets\` and use them only for Arabic public content.
- Apply \`lang="ar"\` and \`dir="rtl"\` inside public route wrappers; retain dashboard/auth \`lang="en"\` and \`dir="ltr"\`.
- Keep booking payloads and validation values in canonical English; translate presentation strings only.
- Use logical CSS utilities or explicit \`rtl:\` variants. Keep phone, email, URLs, prices, dates, and time slots LTR.

---

## File structure

| File | Responsibility |
| --- | --- |
| \`src/features/site-language/site-language.tsx\` | Locale types, messages, storage parser, provider, \`useSiteLanguage\`. |
| \`src/features/site-language/site-language.test.tsx\` | Locale default, persistence, fallback, and direction tests. |
| \`src/features/site-language/public-site.tsx\` | Public-only \`lang\`/\`dir\` wrapper. |
| \`src/assets/thmanyahsans-*.woff2\`, \`src/styles.css\` | Arabic font files and \`@font-face\`/RTL typography. |
| \`src/components/site-shell.tsx\` | Shared translated header/footer and language switcher. |
| \`src/routes/index.tsx\` | Localized home content, carousel labels, and accordion alignment. |
| \`src/routes/book-call.tsx\`, \`src/components/ui/calendar.tsx\` | Localized booking flow and Arabic calendar. |
| \`src/routes/workshops.tsx\`, \`src/features/workshop-booking/workshop-booking-dialog.tsx\` | Localized workshops and booking dialog. |
| Scoped \`*.test.tsx\` files and \`src/routes/README.md\` | Locale and dashboard-isolation regression coverage. |

### Task 1: Build the public locale boundary and typed message catalogue

**Files:**

- Create: \`src/features/site-language/site-language.tsx\`
- Create: \`src/features/site-language/site-language.test.tsx\`
- Create: \`src/features/site-language/public-site.tsx\`
- Create: \`src/features/site-language/public-site.test.tsx\`

**Interfaces:**

- Produces \`type SiteLocale = "en" | "ar"\`, \`type SiteDirection = "ltr" | "rtl"\`, \`SiteLanguageProvider\`, \`PublicSite\`, \`getStoredSiteLocale\`, and \`useSiteLanguage()\`.
- \`useSiteLanguage()\` returns \`{ locale, direction, messages, setLocale }\`.

- [ ] **Step 1: Write the failing provider tests**

~~~tsx
it("starts in English and persists Arabic only after a visitor chooses it", async () => {
  const user = userEvent.setup();
  render(<PublicSite><Probe /></PublicSite>);
  expect(screen.getByTestId("public-site")).toHaveAttribute("lang", "en");
  await user.click(screen.getByRole("button", { name: "Arabic" }));
  expect(screen.getByTestId("public-site")).toHaveAttribute("dir", "rtl");
  expect(localStorage.getItem("besan.site-locale")).toBe("ar");
});

it("uses English for missing or invalid storage", () => {
  expect(getStoredSiteLocale(undefined)).toBe("en");
  expect(getStoredSiteLocale({ getItem: () => "he" })).toBe("en");
});
~~~

- [ ] **Step 2: Run the test to verify it fails**

Run: \`npm test -- src/features/site-language/site-language.test.tsx src/features/site-language/public-site.test.tsx\`

Expected: FAIL because the locale modules do not exist.

- [ ] **Step 3: Implement provider and public wrapper**

~~~tsx
export const SITE_LOCALE_STORAGE_KEY = "besan.site-locale";
export type SiteLocale = "en" | "ar";
export type SiteDirection = "ltr" | "rtl";

export function getStoredSiteLocale(storage: Pick<Storage, "getItem"> | undefined): SiteLocale {
  return storage?.getItem(SITE_LOCALE_STORAGE_KEY) === "ar" ? "ar" : "en";
}

export function PublicSite({ children }: { children: ReactNode }) {
  return <SiteLanguageProvider><PublicSiteBoundary>{children}</PublicSiteBoundary></SiteLanguageProvider>;
}

function PublicSiteBoundary({ children }: { children: ReactNode }) {
  const { locale, direction } = useSiteLanguage();
  return <div data-testid="public-site" lang={locale} dir={direction} className={locale === "ar" ? "public-site-arabic" : ""}>{children}</div>;
}
~~~

Define a single \`siteMessages\` object with identical \`en\` and \`ar\` shapes, typed through \`as const\`. Move every public-facing literal from the scoped routes, shared shell, and workshop dialog into descriptive nested message keys. The provider renders English initially and reads browser storage in \`useEffect\` to avoid hydration mismatch.

- [ ] **Step 4: Run the provider tests to verify they pass**

Run: \`npm test -- src/features/site-language/site-language.test.tsx src/features/site-language/public-site.test.tsx\`

Expected: PASS.

- [ ] **Step 5: Commit**

~~~bash
git add src/features/site-language
git commit -m "feat: add public site language state"
~~~

### Task 2: Add Arabic fonts and localize the shared public shell

**Files:**

- Create: \`src/assets/thmanyahsans-Light.woff2\`
- Create: \`src/assets/thmanyahsans-Regular.woff2\`
- Create: \`src/assets/thmanyahsans-Medium.woff2\`
- Modify: \`src/styles.css\`
- Modify: \`src/components/site-shell.tsx\`
- Modify: \`src/components/site-shell.test.tsx\`

**Interfaces:**

- Consumes \`useSiteLanguage\` from Task 1.
- \`SiteNav\` renders a two-option language control and \`SiteFooter\` uses translated strings.

- [ ] **Step 1: Write the failing shell test**

~~~tsx
it("switches the shared shell to Arabic RTL", async () => {
  const user = userEvent.setup();
  render(<PublicSite><SiteNav /><SiteFooter /></PublicSite>);
  await user.click(screen.getByRole("button", { name: /switch language/i }));
  expect(screen.getByRole("link", { name: "احجزي موعدًا" })).toBeVisible();
  expect(screen.getByTestId("site-nav")).toHaveAttribute("dir", "rtl");
});
~~~

- [ ] **Step 2: Run it to verify it fails**

Run: \`npm test -- src/components/site-shell.test.tsx\`

Expected: FAIL because the switcher and Arabic labels are absent.

- [ ] **Step 3: Copy fonts and implement shell localization**

Run:

~~~powershell
Copy-Item 'C:\Users\zeka1\AppData\Local\Temp\thmanyahsans-Light.woff2' src\assets\thmanyahsans-Light.woff2
Copy-Item 'C:\Users\zeka1\AppData\Local\Temp\thmanyahsans-Regular.woff2' src\assets\thmanyahsans-Regular.woff2
Copy-Item 'C:\Users\zeka1\AppData\Local\Temp\thmanyahsans-Medium.woff2' src\assets\thmanyahsans-Medium.woff2
~~~

Add all three weights via \`@font-face\` in \`src/styles.css\`, with \`font-display: swap\`, then scope \`"Thmanyah Sans"\` to \`.public-site-arabic\` and its \`.font-serif\` descendants. In \`SiteNav\`, obtain \`messages\`, \`locale\`, and \`setLocale\`; render translated nav links and a keyboard-focusable \`EN / العربية\` control with \`aria-label="Switch language"\`. Use \`text-start\`, logical spacing, and \`rtl:scale-x-[-1]\` for the footer arrow; force the footer URL to \`dir="ltr"\`.

- [ ] **Step 4: Run checks**

Run: \`npm test -- src/components/site-shell.test.tsx && npm run lint\`

Expected: PASS; Arabic typography remains scoped to public Arabic content.

- [ ] **Step 5: Commit**

~~~bash
git add src/assets/thmanyahsans-*.woff2 src/styles.css src/components/site-shell.tsx src/components/site-shell.test.tsx
git commit -m "feat: localize public site shell"
~~~

### Task 3: Localize and mirror the home page

**Files:**

- Modify: \`src/routes/index.tsx\`
- Create: \`src/routes/-index.language.test.tsx\`
- Modify: \`src/features/site-language/site-language.tsx\`

**Interfaces:**

- Consumes \`messages.home\` and \`direction\` from Task 1.
- Keeps carousel navigation as numeric state and accordion state as \`number | null\`.

- [ ] **Step 1: Write the failing home-page test**

~~~tsx
it("renders Arabic home content and semantic RTL testimonial controls", async () => {
  render(<PublicSite><Index /></PublicSite>);
  await userEvent.setup().click(screen.getByRole("button", { name: /switch language/i }));
  expect(screen.getByRole("heading", { name: /بَسان/i })).toBeVisible();
  expect(screen.getByRole("button", { name: "الشهادة السابقة" })).toBeVisible();
  expect(screen.getByTestId("public-site")).toHaveAttribute("dir", "rtl");
});
~~~

- [ ] **Step 2: Run it to verify it fails**

Run: \`npm test -- src/routes/-index.language.test.tsx\`

Expected: FAIL because home copy and aria labels are English.

- [ ] **Step 3: Implement home localization**

Move testimonials, services, hero copy, section labels, alt text, CTA labels, and testimonial button labels into \`messages.home\`. Render the current testimonial from \`messages.home.testimonials[i]\`. Keep \`move(-1)\` and \`move(1)\` chronological, and mirror only icons when \`direction === "rtl"\`.

~~~tsx
<ChevronLeft className={direction === "rtl" ? "h-5 w-5 scale-x-[-1]" : "h-5 w-5"} />
~~~

Replace accordion \`text-left\` with \`text-start\`; add RTL desktop ordering only to hero/services copy where Arabic reading flow must begin on the right. Leave full-bleed images and mobile DOM order unchanged.

- [ ] **Step 4: Run home tests**

Run: \`npm test -- src/routes/-index.language.test.tsx src/routes/-index.motion.test.tsx\`

Expected: PASS.

- [ ] **Step 5: Commit**

~~~bash
git add src/routes/index.tsx src/routes/-index.language.test.tsx src/features/site-language/site-language.tsx
git commit -m "feat: translate public home page"
~~~

### Task 4: Localize appointment booking and the calendar

**Files:**

- Modify: \`src/routes/book-call.tsx\`
- Modify: \`src/components/ui/calendar.tsx\`
- Modify: \`src/routes/book-call.test.tsx\`
- Create: \`src/components/ui/calendar.test.tsx\`

**Interfaces:**

- \`Calendar\` accepts \`locale?: Locale\` and \`dir?: "ltr" | "rtl"\`.
- Booking continues sending canonical \`appointmentTypes\` values to \`submitBooking\`.

- [ ] **Step 1: Write failing booking/calendar tests**

~~~tsx
it("renders Arabic booking UI but submits the canonical appointment type", async () => {
  const user = userEvent.setup();
  render(<PublicSite><BookCall /></PublicSite>);
  await user.click(screen.getByRole("button", { name: /switch language/i }));
  expect(screen.getByText("اختاري اليوم")).toBeVisible();
  expect(screen.getByTestId("booking-calendar")).toHaveAttribute("dir", "rtl");
  await user.click(screen.getByRole("button", { name: /sunday, july 19th, 2026/i }));
  await user.click(screen.getAllByRole("button", { name: "11:00" })[0]);
  await user.type(screen.getByLabelText("الاسم الكامل"), "Noor Al-Hashemi");
  await user.type(screen.getByLabelText("رقم الجوال"), "0500000000");
  await user.click(screen.getByRole("button", { name: "تأكيد الحجز" }));
  expect(submitBooking).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ appointmentType: "Custom Design" }) }));
});
~~~

- [ ] **Step 2: Run tests to verify they fail**

Run: \`npm test -- src/routes/book-call.test.tsx src/components/ui/calendar.test.tsx\`

Expected: FAIL because labels, formatter, and calendar props are hard-coded for English.

- [ ] **Step 3: Implement booking/calendar locale support**

Use the locale to derive both \`Intl.DateTimeFormat\` and \`date-fns\` locale (\`enUS\` or \`arSA\`).

~~~tsx
const { locale, direction, messages } = useSiteLanguage();
const selectedDateLabel = selectedDate
  ? new Intl.DateTimeFormat(locale === "ar" ? "ar-SA" : "en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(selectedDate)
  : "";
<Calendar data-testid="booking-calendar" locale={locale === "ar" ? arSA : enUS} dir={direction} />
~~~

Translate all headings, hints, placeholders, client error states, retry/loading copy, action text, and success text. Render presentation labels with \`messages.booking.appointmentTypes[appointmentType]\`, but submit \`appointmentType\` unchanged. Apply \`dir="ltr"\` to phone inputs, time buttons, prices, and date/time fragments. Replace physical text, border, padding, and GSAP transform-origin values with direction-aware alternatives. In \`calendar.tsx\`, pass locale/direction through to \`DayPicker\`, localize the month label, and mirror chevrons visually without changing keyboard semantics.

- [ ] **Step 4: Run tests and booking-domain regression**

Run: \`npm test -- src/routes/book-call.test.tsx src/components/ui/calendar.test.tsx src/features/book-call/booking-domain.test.ts\`

Expected: PASS; Arabic UI works and domain validation remains unchanged.

- [ ] **Step 5: Commit**

~~~bash
git add src/routes/book-call.tsx src/routes/book-call.test.tsx src/components/ui/calendar.tsx src/components/ui/calendar.test.tsx src/features/site-language/site-language.tsx
git commit -m "feat: translate public booking flow"
~~~

### Task 5: Localize workshops and the workshop-booking dialog

**Files:**

- Modify: \`src/routes/workshops.tsx\`
- Modify: \`src/features/workshop-booking/workshop-booking-dialog.tsx\`
- Modify: \`src/features/workshop-booking/workshop-booking-dialog.test.tsx\`
- Modify: \`src/features/site-language/site-language.tsx\`

**Interfaces:**

- \`WorkshopBookingDialog\` retains \`workshop: WorkshopOption | null\` and the existing domain payload.
- \`Field\` receives stable ASCII names rather than generating IDs from translated labels.

- [ ] **Step 1: Write the failing Arabic-dialog test**

~~~tsx
it("renders workshop booking Arabic RTL with stable field IDs", async () => {
  render(<PublicSite><Workshops /></PublicSite>);
  await userEvent.setup().click(screen.getByRole("button", { name: /switch language/i }));
  await userEvent.setup().click(screen.getAllByRole("button", { name: "احجزي هذه الورشة" })[0]);
  expect(screen.getByRole("dialog")).toHaveAttribute("dir", "rtl");
  expect(screen.getByLabelText("الاسم الكامل")).toHaveAttribute("id", "full-name");
});
~~~

- [ ] **Step 2: Run it to verify it fails**

Run: \`npm test -- src/features/workshop-booking/workshop-booking-dialog.test.tsx\`

Expected: FAIL because public workshop content and dialog labels are English.

- [ ] **Step 3: Implement workshop/dialog localization**

Move all workshop sections, prices, detail items, image alt text, and action labels into \`messages.workshops\`; retain NIS values inside \`dir="ltr"\` spans. Change each editorial desktop grid only as needed with RTL ordering so copy leads from the right; retain mobile DOM order. Set \`dir={direction}\` on \`DialogContent\`, use text-start/logical spacing, and replace the current label-derived \`Field\` ID with named fields.

~~~tsx
function Field({ name, label, error, children }: {
  name: "full-name" | "mobile-number" | "workshop-date" | "participants" | "notes";
  label: string; error?: string; children: ReactElement<AccessibleFieldProps>;
}) {
  const errorId = name + "-error";
  return <div><label htmlFor={name}>{label}</label>{cloneElement(children, { id: name, "aria-describedby": error ? errorId : undefined, "aria-invalid": Boolean(error) })}{error ? <span id={errorId}>{error}</span> : null}</div>;
}
~~~

Translate the generic client submission error and known field validation display. Map known server field errors to equivalent translated generic messages; use the translated generic submission error for unknown errors.

- [ ] **Step 4: Run workshop tests**

Run: \`npm test -- src/features/workshop-booking/workshop-booking-dialog.test.tsx\`

Expected: PASS.

- [ ] **Step 5: Commit**

~~~bash
git add src/routes/workshops.tsx src/features/workshop-booking/workshop-booking-dialog.tsx src/features/workshop-booking/workshop-booking-dialog.test.tsx src/features/site-language/site-language.tsx
git commit -m "feat: translate public workshops"
~~~

### Task 6: Verify dashboard isolation and complete validation

**Files:**

- Modify: \`src/routes/-dashboard-auth.test.tsx\`
- Modify: \`src/routes/README.md\`

**Interfaces:**

- The public locale provider has no consumer in dashboard/auth code.
- Dashboard remains \`lang="en"\`, \`dir="ltr"\`, and Roboto-styled when \`besan.site-locale\` is \`ar\`.

- [ ] **Step 1: Add the dashboard-isolation regression test**

~~~tsx
it("keeps dashboard loading English LTR after Arabic was chosen on the public site", () => {
  localStorage.setItem("besan.site-locale", "ar");
  useSession.mockReturnValue({ data: null, isPending: true });
  render(<DashboardAccessGate redirectTo="/dashboard"><div>Protected page</div></DashboardAccessGate>);
  expect(screen.getByRole("main")).toHaveAttribute("lang", "en");
  expect(screen.getByRole("main")).toHaveAttribute("dir", "ltr");
});
~~~

Document in \`src/routes/README.md\` that public pages must use \`PublicSite\` and public string changes require both catalogues.

- [ ] **Step 2: Run the isolation test**

Run: \`npm test -- src/routes/-dashboard-auth.test.tsx\`

Expected: PASS; it guards the existing dashboard boundary.

- [ ] **Step 3: Audit directional utilities**

Run: \`rg -n 'text-left|text-right|border-l|border-r|\bpl-|\bpr-|\bleft-|\bright-|origin-left|origin-right' src/components/site-shell.tsx src/routes/index.tsx src/routes/book-call.tsx src/routes/workshops.tsx src/features/workshop-booking/workshop-booking-dialog.tsx\`

Expected: every result is replaced with a logical utility, paired with an \`rtl:\` alternative, or is an explicit LTR value with an adjacent explanatory comment.

- [ ] **Step 4: Run full automated checks**

Run: \`npm test && npm run lint && npm run build\`

Expected: PASS.

- [ ] **Step 5: Perform responsive visual verification and commit**

Run: \`npm run dev\`

Verify \`/\`, \`/book-call\`, and \`/workshops\` at mobile and desktop widths in both EN and العربية: language control, header/footer order, calendar layout, booking errors/success states, workshop dialog, numeric values, and directional arrows. Then:

~~~bash
git add src/routes/-dashboard-auth.test.tsx src/routes/README.md
git commit -m "test: verify public Arabic isolation"
~~~

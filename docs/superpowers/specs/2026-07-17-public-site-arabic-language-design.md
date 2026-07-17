# Public-site Arabic language design

**Date:** 2026-07-17  
**Scope:** The public marketing site (`/`, `/book-call`, and `/workshops`). The English-language dashboard and its authentication flow are explicitly out of scope.

## Goal

Let visitors switch the public site between English and Arabic. English remains the initial language. Arabic uses the supplied Thmanyah Sans font files and a complete right-to-left interface.

## Approach

Use one public-site language provider and a typed message catalogue. The provider owns the current locale, writes it to browser storage after a visitor changes it, and exposes the corresponding language and direction metadata. Public-page roots consume this metadata and set `lang` and `dir` on their own wrapper. Dashboard and auth roots keep their existing explicit `en`/`ltr` settings and do not consume the provider.

The provider uses English during server rendering and the first client render. It reads a saved choice only after hydration, avoiding an HTML hydration mismatch. The saved choice then applies to every public route during the same visit and future visits in the same browser.

## Interface and components

### Language control

`SiteNav` receives the locale state from the public-site provider and renders an accessible two-option control: `EN` and `العربية`.

- It names the current language for assistive technology.
- It retains the compact editorial appearance of the existing header.
- It is usable by keyboard and has a visible focus state.
- Selecting a language updates the whole public route without navigation.

### Public page wrapper

A narrow wrapper shared by the public routes supplies:

- `locale`: `en` or `ar`
- `direction`: `ltr` or `rtl`
- translation lookup
- a locale-aware date formatter for booking dates

It applies `lang` and `dir` locally to the public site, instead of changing the document root. This makes it impossible for a public-language switch to alter the dashboard.

### Content

All visitor-visible strings on the three public routes and their shared shell move into English and Arabic catalogues, including:

- navigation, actions, footer, testimonials, service accordions, and workshop content;
- booking form labels, validation errors, availability and completion states;
- accessible labels and page title/description metadata.

Names, email addresses, phone numbers, URLs, dates, times, and NIS prices remain correctly rendered LTR where needed inside Arabic content.

### Arabic typography

The three supplied `.woff2` files are copied into the project assets and registered with `@font-face` as the Thmanyah Sans family with light, regular, and medium weights. Arabic public content uses this family; English public content retains its present editorial fonts. The dashboard keeps Roboto as it does now.

## RTL behaviour

Arabic public roots use `dir="rtl"`; layout and typography rules use logical alignment and spacing where direction matters.

- Header logo, navigation, and language control mirror their horizontal placement naturally.
- Two-column editorial sections reverse visual reading order only where the copy/image arrangement must follow Arabic reading flow; image treatment itself is unchanged.
- Accordions, price rows, booking cards, footer links, form labels, and validation text align and order for RTL.
- Back/next, testimonial, calendar, and booking-navigation arrows point in the semantic Arabic direction.
- Calendar month navigation, weekday layout, and localized selected-date text use Arabic locale formatting.
- Decorative imagery, numerical prices, dates, time slots, and contact fields retain an explicit LTR direction when necessary for legibility.

The dashboard's `dir="ltr"`, `lang="en"`, layout, fonts, and data formatting remain unchanged.

## Data flow and failure behaviour

1. A public route renders English by default.
2. After hydration, the provider restores a valid saved locale, if present.
3. The visitor selects `EN` or `العربية`.
4. The provider updates the view state, persists the locale, and public components re-render from the matching catalogue.

If storage is unavailable or contains an unknown value, the site continues in English without an error. Translation lookup is type-checked so a missing message key is caught during development rather than silently displaying an incorrect string.

## Verification

- Unit-test the locale persistence and fallback behavior.
- Render shared navigation and representative pages in both locales; assert language, direction, translated text, and control state.
- Test Arabic booking date formatting and semantic arrow direction.
- Assert dashboard and authentication wrappers still render `lang="en"` and `dir="ltr"` when the public locale is Arabic.
- Run the focused test suite, lint, and production build.
- Visually inspect desktop and mobile public routes in English and Arabic, including the booking calendar, workshop dialog, forms, and footer.

## Out of scope

- Translating dashboard or authentication screens.
- Arabic-specific URLs or `/ar` route variants.
- Server-side locale cookies, account-level preferences, or automatic browser-language detection.

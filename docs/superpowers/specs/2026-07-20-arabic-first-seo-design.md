# Arabic-First SEO Design

**Date:** 2026-07-20

## Goal

Improve organic discovery and appointment conversions for Besan Khalaily among
Arabic-speaking women searching for custom fashion design, made-to-measure
dresses, and dress rental in Sakhnin and the wider Palestine/inside market.

The work must not change the existing visible page copy, visual design, or
booking behavior.

## Current State

- The public site has three indexable routes: `/`, `/workshops`, and
  `/book-call`.
- The server-rendered document and public pages default to English. Arabic is
  selected client-side and stored in `localStorage`, so crawlers do not receive
  a stable Arabic URL or Arabic-first server response.
- The root route provides generic English metadata. Workshops and booking have
  only basic English titles and descriptions.
- Canonical URLs, language alternates, structured data, social share images,
  `robots.txt`, and `sitemap.xml` are absent.
- Authentication and dashboard routes do not explicitly opt out of indexing.
- The production origin is `https://www.besankhalaily.com`.

## Scope

### Included

- Stable, crawlable Arabic and English public routes.
- Arabic-first server rendering for the existing unprefixed public routes.
- Route-specific search metadata for both languages.
- Canonical and `hreflang` links.
- Social sharing metadata and a suitable share image.
- Local business and person structured data based only on facts already
  confirmed by the user or represented in the project.
- Public sitemap and robots endpoints.
- `noindex, nofollow` metadata for authentication and dashboard pages.
- Localized non-visible image alternative text where it improves accessibility
  and image search relevance.
- Automated tests for routing, metadata, structured data, robots, sitemap, and
  private-route indexing rules.
- A post-deployment Google Search Console handoff checklist.

### Excluded

- Rewriting, adding, or expanding visible marketing copy.
- New service or location landing pages.
- A visual redesign.
- Changes to appointment or workshop booking behavior.
- Search Console submission, which requires access to the owner's Google
  account.
- Claims about opening hours, street address, awards, credentials, or services
  that have not been confirmed.

## URL and Language Architecture

Arabic is the primary language and uses the existing unprefixed URLs:

| Purpose | Arabic URL | English URL |
| --- | --- | --- |
| Home | `/` | `/en` |
| Workshops | `/workshops` | `/en/workshops` |
| Appointment booking | `/book-call` | `/en/book-call` |

The unprefixed routes must render Arabic during SSR without consulting browser
storage. The `/en` routes must render English during SSR. The root HTML element
must expose the route language and direction from the first response:

- Arabic: `lang="ar"` and `dir="rtl"`
- English: `lang="en"` and `dir="ltr"`

The language control must navigate to the equivalent route in the other
language. It must not depend on `localStorage` to determine the rendered
language. Existing stored preferences may be ignored; automatic redirects based
on browser language or stored state are prohibited because they make crawling
and canonicalization unpredictable.

Each public route must declare:

- A self-referencing canonical URL.
- An Arabic alternate.
- An English alternate.
- An `x-default` alternate pointing to the Arabic URL.

## Metadata

Metadata may use new search-focused wording because it is not visible page
copy. It must remain accurate and concise.

### Arabic

| Route | Title | Description focus |
| --- | --- | --- |
| `/` | `مصممة أزياء وفساتين حسب الطلب في سخنين | بيسان خلايلة` | Besan Khalaily, custom fashion design, made-to-measure dresses, dress rental, Sakhnin, and booking an atelier appointment |
| `/workshops` | `ورش خياطة وباترون في سخنين | بيسان خلايلة` | Practical sewing, pattern drafting, measurements, corset construction, and atelier workshops in Sakhnin |
| `/book-call` | `احجزي موعد تصميم أو قياس فستان | بيسان خلايلة` | Booking an appointment for a custom design, consultation, fitting, or dress rental |

### English

| Route | Title | Description focus |
| --- | --- | --- |
| `/en` | `Fashion Designer & Made-to-Measure Dresses in Sakhnin | Besan Khalaily` | Besan Khalaily, custom fashion design, made-to-measure dresses, rental, Sakhnin, and atelier appointments |
| `/en/workshops` | `Sewing & Pattern Workshops in Sakhnin | Besan Khalaily` | Measurements, pattern drafting, practical sewing, corset construction, and atelier workshops |
| `/en/book-call` | `Book a Dress Design or Fitting Appointment | Besan Khalaily` | Appointment booking for custom design, consultation, fitting, or dress rental |

Descriptions must be written as complete natural-language sentences during
implementation and should stay within approximately 150–160 characters where
that can be done without awkward wording.

Every public route must also provide:

- `og:title`
- `og:description`
- `og:type=website`
- `og:url`
- `og:image` with an absolute production URL
- `og:image:alt`
- `og:locale` and the corresponding alternate locale
- `twitter:card=summary_large_image`
- `twitter:title`
- `twitter:description`
- `twitter:image`

The share image must be a static local asset, use a social-preview aspect ratio,
and remain free of fabricated awards, testimonials, or service claims.

## Structured Data

The Arabic home page must include one JSON-LD graph with:

1. A `Person` entity for Besan Khalaily, identified as a fashion designer.
2. A `ProfessionalService` entity for the atelier.
3. A `WebSite` entity for `https://www.besankhalaily.com/`.

The graph may include:

- The confirmed business and person name.
- The canonical site URL.
- A local image/logo URL.
- `addressLocality` set to Sakhnin and `addressCountry` set to the applicable
  ISO country code required by schema consumers.
- `areaServed` phrased conservatively around Sakhnin and the wider service area
  confirmed by the user.
- Confirmed public contact links from `site-contact.ts`. The Instagram and
  email links may be used; the current placeholder WhatsApp number must be
  omitted until it is replaced with a confirmed public number.
- Service names already present in visible site content.

It must not include unconfirmed ratings, price ranges, opening hours, a street
address, or customer review markup. The English home page may expose the same
entities with English labels and its own canonical page URL.

Subpages may include `WebPage` data linked to the same site and business
entities. Breadcrumb structured data is unnecessary because the visible site
does not expose a breadcrumb trail.

## Crawl Control

`/sitemap.xml` must return valid XML containing exactly the six public language
URLs. Each entry must include Arabic and English alternate links. The sitemap
must not include authentication, dashboard, function, or error routes.

`/robots.txt` must:

- Allow crawling of public pages and assets.
- Reference
  `https://www.besankhalaily.com/sitemap.xml`.
- Avoid relying on `Disallow` as the mechanism for removing private routes from
  search.

Authentication and all dashboard routes must include:

```text
noindex, nofollow
```

The not-found response must also be non-indexable when the routing framework
allows route-specific head metadata without weakening valid public pages.

## Code Organization

SEO data and URL mapping must live in focused modules rather than being copied
across page components:

- A site configuration module owns the production origin, brand names, locales,
  and public route mapping.
- An SEO module produces route metadata, canonical/alternate links, and JSON-LD.
- The language provider accepts an explicit locale from the route.
- Arabic and English route files reuse the existing page components with a
  route-supplied locale; visible content remains sourced from the current
  bilingual component data.
- Robots and sitemap endpoints consume the same site configuration and route
  mapping to prevent URL drift.

No new runtime SEO dependency is required unless the TanStack Start APIs cannot
produce one of the specified tags or endpoints directly.

## Error Handling and Safety

- Absolute URLs must be derived from the fixed production origin, never from a
  preview or request host.
- Helpers must reject or make invalid public route mappings obvious during
  tests.
- JSON-LD must be serialized safely through React/TanStack head APIs and remain
  valid JSON.
- The language switcher must use a deterministic route map and fall back to the
  target-language home page only for an unknown public path.
- Existing dashboard authentication, booking functions, and database behavior
  must remain untouched.

## Testing

Automated tests must verify:

1. Arabic and English route mapping in both directions.
2. Arabic SSR metadata, canonical, and alternates for all three Arabic routes.
3. English SSR metadata, canonical, and alternates for all three English
   routes.
4. Correct `lang` and `dir` values for each route family.
5. Valid JSON-LD parsing and the presence of the required entities and confirmed
   Sakhnin locality.
6. Valid sitemap content, exactly six public page URLs, and matching language
   alternates.
7. Robots content and the production sitemap URL.
8. `noindex, nofollow` on authentication and dashboard routes.
9. Language-switch navigation preserves the corresponding page.
10. Existing visible public text and booking behavior remain covered by the
    current component and route tests.

The final verification gate is:

```bash
npm test
npm run lint
npm run build
```

All three commands must complete successfully. The built server output or local
SSR responses must then be inspected for the Arabic home page, English home
page, sitemap, robots file, and a private route.

## Acceptance Criteria

- Arabic is the server-rendered and canonical default for all unprefixed public
  routes.
- English has stable `/en` routes with correct server-rendered language
  attributes and unique metadata.
- All six public pages expose accurate, unique metadata and complete language
  alternates on the production origin.
- The Arabic home page exposes valid, conservative local structured data for
  Besan Khalaily in Sakhnin.
- Sitemap and robots endpoints are valid and internally consistent.
- Authentication and dashboard pages explicitly opt out of indexing.
- Visible copy, design, and booking workflows are unchanged.
- Tests, lint, and production build pass.

## Post-Deployment Handoff

After the code is deployed to the production domain, the owner should:

1. Add or verify the `www.besankhalaily.com` domain property in Google Search
   Console.
2. Submit `https://www.besankhalaily.com/sitemap.xml`.
3. Inspect and request indexing for the Arabic home page.
4. Confirm the page is selected as its own canonical and that the Arabic and
   English alternates are discovered.
5. Validate the home page with Google's Rich Results Test and review indexing
   after Google recrawls the site.

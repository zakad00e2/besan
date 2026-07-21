# Public Site Intro Design

## Goal

Add a restrained opening sequence to the public Besan Khalaily website. The intro should establish the brand before the page appears without becoming a repeated interruption during normal navigation.

## Scope

- Show the intro on public-site routes only.
- Do not show it in the admin dashboard, authentication screens, error pages, or other application-only surfaces.
- Show it once per browser session. Navigation between public routes in the same session must not replay it.
- Use the supplied monogram artwork as the visual anchor.
- Render `BESAN KHALAILY` as live text so its letters can animate independently.

## Visual Design

The intro is a fixed, full-viewport layer using the site's existing warm cream background and warm dark foreground. The monogram is centered, with the brand name directly below it. The composition remains sparse and uses the same editorial typography already loaded by the public site.

The monogram should be comfortably visible without dominating the viewport: approximately 96-112 pixels wide on desktop and 80-88 pixels wide on mobile. The wordmark should fit on one line at common mobile widths, with responsive sizing and deliberate letter spacing.

## Motion Sequence

1. The cream intro surface is present on first paint so the underlying page does not flash.
2. The monogram fades in with a subtle upward movement.
3. After the monogram settles, the letters in `BESAN KHALAILY` reveal from left to right. Each letter fades in and rises a few pixels with a short stagger.
4. The completed lockup holds briefly.
5. The entire intro layer fades out, then unmounts and returns interaction to the page.

The complete experience should take about two seconds. The animation should feel calm and editorial, with no bounce, large travel, blur-heavy effects, or loading indicator.

## Component Design

Create a focused public-site intro component with three responsibilities:

- Read and write a session-scoped completion flag.
- Coordinate the intro phases and cleanup timers.
- Render the accessible logo and independently animated wordmark letters.

Mount the component at the public-site boundary so it applies consistently across localized public routes while remaining isolated from the dashboard and application routes.

The component should prevent scrolling only while the intro is visible and restore the document state when it exits or unmounts. It must not delay page data loading or block the underlying route from rendering.

## Session Behavior

Use `sessionStorage` for the completion flag. Set the flag when the intro begins so a route change or remount during the same session cannot replay it. If storage is unavailable, fail safely by showing the intro for the current mount without breaking the page.

Server rendering must not access browser-only storage. The server should emit the intro-ready public shell, and the client should resolve the session flag after hydration without producing a hydration mismatch.

## Accessibility

- The intro is decorative branding, not a loading status, so it should not announce progress to assistive technology.
- The monogram image receives a concise brand alt value, while the split letter spans are hidden from assistive technology and an intact accessible brand-name string is provided.
- Under `prefers-reduced-motion: reduce`, skip the stagger and spatial movement, use a brief opacity transition, and keep the total delay minimal.
- The overlay must not trap keyboard focus. The underlying page becomes interactive only after the overlay is removed.

## Failure Handling

- Timer cleanup must run on unmount to prevent state updates after navigation.
- A storage read or write failure must never prevent the public page from rendering.
- The intro layer must always have a deterministic exit path.

## Verification

- Component tests confirm the logo and complete accessible brand name are present on the first public visit.
- Tests confirm individual letter spans are rendered for the visual stagger.
- Tests confirm the session flag suppresses the intro on a second mount in the same session.
- Tests confirm timers complete the sequence and remove the overlay.
- Tests confirm the public-site boundary owns the intro and dashboard routes remain unaffected.
- Motion CSS includes a `prefers-reduced-motion` fallback.
- Run the relevant Vitest suite, lint, and production build.

## Visual Thesis

A quiet editorial brand reveal: warm paper, fine dark typography, and a measured letter-by-letter signature.

## Content Plan

One full-screen brand moment containing only the monogram and the `BESAN KHALAILY` wordmark before the existing public page is revealed.

## Interaction Thesis

The monogram establishes presence, the staggered letters build identity, and the final surface fade hands attention to the existing page without competing with it.

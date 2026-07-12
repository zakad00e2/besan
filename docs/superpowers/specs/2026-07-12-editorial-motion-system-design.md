# Editorial Motion System Design

**Date:** 2026-07-12  
**Status:** Approved for implementation planning  
**Scope:** Public marketing pages, workshop booking flow, appointment booking flow, and live dashboard motion primitives

## Objective

Improve the project's complete motion surface while preserving its quiet editorial fashion identity. The result should borrow Apple's principles of immediate feedback, continuity, spatial consistency, restraint, and accessible alternatives without imitating Apple's visual language.

The public site may retain slower explanatory entrances. Controls, forms, navigation, dialogs, and dashboard interactions must feel immediate and remain usable while motion is in progress.

## Motion Languages

The project will use two related motion scales.

### Editorial motion

Editorial entrances are reserved for first exposure to marketing content. They use opacity and a small vertical translation, may be staggered, and should complete within 600–800ms. They must never delay interaction.

- Entrance curve: `cubic-bezier(0.23, 1, 0.32, 1)`
- Standard entrance duration: `700ms`
- Compact entrance duration: `600ms`
- Stagger range: `40–80ms`
- Movement distance: no more than `1.5rem`

### Interface motion

Interface motion covers buttons, accordions, content swaps, dialogs, sheets, booking controls, and dashboard navigation.

- Press feedback: `120ms`
- Color and hover feedback: `160ms`
- Small state transitions: `180ms`
- Accordion and content reveal: `220ms`
- Modal and sheet transitions: `240ms`
- Interface entrance curve: `cubic-bezier(0.23, 1, 0.32, 1)`
- On-screen movement curve: `cubic-bezier(0.77, 0, 0.175, 1)`
- Sheet curve: `cubic-bezier(0.32, 0.72, 0, 1)`
- Press scale: `0.97`

These values will live in shared CSS custom properties. Tailwind arbitrary values and GSAP configuration will reference the same conceptual scale rather than introduce additional timing systems.

## Component Changes

### Global motion and accessibility

`src/styles.css` will define shared duration and easing tokens. Reduced-motion handling will apply globally, including content rendered through Radix portals. Reduced motion will remove translations, scale, and large spatial movement while retaining brief opacity and color feedback.

Pointer-only hover movement will be gated behind `@media (hover: hover) and (pointer: fine)`. The current dashboard-specific reduced-motion rule will be replaced or narrowed so it does not erase useful color and opacity feedback.

### Shared Reveal

`src/components/site-shell.tsx` will keep the one-shot IntersectionObserver behavior, but its transition will target only opacity and translation. Duration will change from 900ms to the editorial token. Permanent `will-change` promotion will be removed after the reveal or avoided entirely.

Reveal remains for homepage, workshop page, and footer scroll entrances. It will not wrap content that already has a dedicated GSAP entrance.

### Book Call entrance

`src/routes/book-call.tsx` will retain GSAP as the single entrance system for its initial editorial sequence. The nested Reveal wrappers around GSAP-animated copy and form panels will be replaced with static layout wrappers.

GSAP will keep its reduced-motion branch and cleanup. Its timings will be tightened to the editorial scale, with stagger values no greater than 80ms.

### Mobile dashboard sheet

`src/components/ui/sheet.tsx` will use a 240ms opening and closing treatment with the sheet curve. Entry and exit will follow the same spatial path. The sheet must respond immediately to closing or navigation while in motion.

When reduced motion is active, sheet translation will be removed and only a short opacity transition will remain. The behavior must work for portaled content.

### Dialogs

`src/components/ui/dialog.tsx` will retain centered scale because it is spatially correct for modals. Timing will use the 240ms interface budget. Reduced motion will remove zoom and retain a short fade for both overlay and content.

### Testimonials

`src/routes/index.tsx` will replace the currently inert `animate-fade-in` classes. Quote and author changes will use an explicit 180ms transition that remains coherent under rapid repeated navigation. Controls stay active during the transition.

Reduced motion will use a brief opacity-only change. Testimonial arrow controls will receive immediate press feedback.

### Services accordion

The accordion will stop using unrestricted `transition-all`. Its reveal will use a 220ms deliberate curve and avoid transitioning unrelated properties. The plus/minus replacement will become one continuous indicator treatment so the icon and panel describe the same state change.

Reduced motion will make the state change immediate or opacity-only without rotating or translating the indicator.

### Marketing imagery

Homepage and workshop image hover effects will be shortened to 240ms or less and gated to fine pointers. Expensive long-running grayscale changes will be replaced with a cheaper opacity-based treatment where practical; otherwise the filter transition will be tightly scoped and shortened.

Large image movement will be subtle and disabled under reduced motion. Touch interaction must not leave a synthetic hover state that changes the intended appearance.

### Interactive controls

Marketing calls to action, appointment type buttons, time buttons, and dashboard buttons will replace `transition-all` with explicit transition properties. Primary pressable controls will respond on active state with scale `0.97` or an equivalent one-pixel physical depression, using the 120ms press token.

### Booking state reveals

The appointment time grid in `src/routes/book-call.tsx` will enter with a 180–220ms opacity and small translation when a day becomes selected. Its desktop and mobile presentations must share the same behavior.

The workshop success state in `src/features/workshop-booking/workshop-booking-dialog.tsx` will use a restrained completion transition. The form will yield to the confirmation without overlapping interactive controls. Reduced motion will use opacity only.

## Scope Boundaries

- Do not change typography, colors, spacing, copy, information architecture, or data behavior except where a class must change to support motion.
- Do not add a new animation dependency.
- Keep GSAP only where it already provides the Book Call editorial sequence.
- Do not animate Recharts charts; their disabled animation is a documented decision.
- Do not refactor unused generic UI components unless required by a live project path.
- Do not alter booking persistence, validation, authentication, or dashboard data flow.
- Preserve existing user changes in the dirty worktree.

## State and Error Handling

Motion must not block clicks, focus, Escape dismissal, form submission, or route navigation. Disabled and submitting states retain their existing functional behavior. Error and success messages remain accessible through their existing ARIA roles.

Animations must never be required to understand whether an operation succeeded. The final visual state and accessible text remain authoritative.

## Testing Strategy

Implementation will follow test-driven development.

1. Add failing component or contract tests for the new shared motion tokens and reduced-motion portal classes.
2. Add failing tests for Reveal's scoped transition and Book Call's single entrance system.
3. Add failing tests for testimonial state classes and uninterrupted navigation controls.
4. Add failing tests for accordion indicator state and scoped transition properties.
5. Add failing tests for booking time-grid and workshop-success transition hooks.
6. Make the smallest production changes needed to pass each test.

After the targeted tests pass, run the complete Vitest suite, ESLint, and production build.

## Visual Verification

Verify the following at desktop and mobile widths:

- Homepage initial entrance, testimonial navigation under rapid clicks, services accordion, and image hover behavior.
- Workshops page scroll reveals, image hover behavior, dialog open/close, and success-state transition.
- Book Call entrance, day-to-time-grid transition, button press feedback, and submission states.
- Dashboard mobile sheet, dialogs, navigation, card hover, and button press behavior.
- Reduced-motion mode for marketing reveals, dialogs, sheets, testimonials, accordion, and booking state changes.

Feel-check motion at normal speed and in slowed playback. Confirm that controls react on press, no transition blocks input, entry and exit paths match, and no state visibly jumps when an interaction is reversed.

## Acceptance Criteria

- All live portaled dialogs and sheets respect reduced motion.
- Dashboard mobile sheet completes in 240ms and uses the sheet curve.
- No inert `animate-fade-in` classes remain on testimonials.
- Book Call content uses one entrance system rather than nested Reveal and GSAP motion.
- Live high-frequency controls no longer rely on `transition-all`.
- Marketing hover movement is gated to fine pointers and disabled or gentled for reduced motion.
- Accordion panel and indicator communicate one continuous state change.
- Appointment time grids and workshop success confirmation no longer appear abruptly.
- Existing functional tests, lint, and production build pass.
- No new animation package is added.

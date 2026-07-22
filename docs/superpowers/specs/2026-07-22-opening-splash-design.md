# Besan Khalaily Opening Splash Design

## Goal

Add a refined opening splash to the public website that introduces the Besan Khalaily identity without making repeated navigation feel slow.

## Approved Experience

- Show the splash once per browser tab session.
- Use the existing warm editorial background and dark brown foreground colors.
- Center the supplied Besan monogram above the brand name.
- Reveal `BESAN KHALAILY` one letter at a time from left to right.
- Hold the completed lockup briefly, then move the splash upward to reveal the home page.
- Keep the full sequence near 2.8 seconds.
- Do not show the splash on dashboard, authentication, booking, workshop, error, or other routes.

## Visual Direction

The splash is a full-viewport, borderless editorial canvas. Its visual thesis is quiet luxury: warm paper, dark ink, generous negative space, and one controlled exit movement. The monogram is the dominant mark. The wordmark is smaller, widely spaced, and rendered in uppercase beneath it.

The supplied monogram image is used as the visual source. The brand name is rendered as live text so every character can animate independently and remain sharp at all viewport sizes.

## Motion Sequence

1. The splash is present before the page is revealed, preventing a flash of the home page.
2. The monogram fades in with a small upward movement.
3. After the monogram settles, the letters in `BESAN KHALAILY` appear sequentially from left to right.
4. The completed lockup pauses briefly.
5. The entire splash translates upward and is removed from interaction and layout.

The sequence uses the project's existing editorial easing. Character delays are short enough to read as a continuous word build rather than separate pop animations.

## Architecture

Create an isolated `OpeningSplash` component owned by the home page. The component handles only presentation and splash lifecycle; the home page remains responsible for its normal sections.

Session visibility is controlled with `sessionStorage` using a versioned key. On the first home-page mount in a tab, the component renders and records completion. Later home-page visits in the same tab skip it. If storage is unavailable, the splash may run once for the current React mount and must never block the page.

The underlying home page remains rendered while the splash is active so images and layout can load behind it. The splash is fixed above the page, locks document scrolling during its active sequence, and restores scrolling on completion or unmount.

## Accessibility

- Mark the animated lockup as decorative because the page already exposes the brand in semantic navigation and heading content.
- Never trap focus inside the splash.
- Keep the overlay non-interactive.
- For `prefers-reduced-motion: reduce`, show the complete lockup without staggered letters and use a short opacity fade instead of the full upward transition.
- Restore document scrolling in every cleanup path.

## Responsive Behavior

- Use viewport-relative spacing with explicit maximum sizes for the monogram and wordmark.
- Keep the monogram comfortably within narrow mobile screens.
- Prevent the brand name from wrapping.
- Respect mobile safe-area insets while maintaining optical centering.

## Failure Handling

- If the monogram image fails to load, the live-text brand name still appears and the sequence completes.
- If `sessionStorage` throws or is blocked, continue without surfacing an error to the visitor.
- Timers are cleared and scroll state is restored if the component unmounts early.

## Verification

- Component test: first render shows the splash and completes the sequence.
- Component test: a populated session key skips the splash.
- Component test: completion writes the session key.
- Component test: reduced-motion mode avoids staggered and large movement states.
- Component test: unmount cleanup restores document scrolling and clears pending timers.
- Existing home-page and motion tests continue to pass.
- Production build succeeds.
- Visual check on desktop and mobile confirms centering, readable character spacing, no content flash, and a clean reveal.

## Out of Scope

- A persistent loading indicator.
- Audio.
- User controls or a skip button for this short sequence.
- Replaying the splash on internal navigation or refresh within the same browser tab session.

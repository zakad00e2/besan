# Besan Khalaily Opening Splash Design

## Goal

Add a refined opening splash to the public home page that introduces the Besan
Khalaily identity with a deliberate, cinematic pace.

## Approved Experience

- Show the splash whenever the home page mounts, including after a refresh.
- Use the existing warm editorial background and dark brown foreground colors.
- Center the supplied Besan monogram above the brand name.
- Reveal `BESAN KHALAILY` one letter at a time from left to right.
- Hold the completed lockup briefly, then fade the splash to reveal the home page.
- Keep the full sequence near 2.8 seconds: the monogram enters over 800ms, each
  letter enters over 550ms with a 55ms stagger, the exit begins at 2.5 seconds,
  and the 300ms fade completes at 2.8 seconds.
- Do not show the splash on dashboard, authentication, booking, workshop, error, or other routes.

## Visual Direction

The splash is a full-viewport, borderless editorial canvas. Its visual thesis is quiet luxury: warm paper, dark ink, generous negative space, and one controlled exit movement. The monogram is the dominant mark. The wordmark is smaller, widely spaced, and rendered in uppercase beneath it.

The supplied monogram image is used as the visual source. The brand name is rendered as live text so every character can animate independently and remain sharp at all viewport sizes.

## Motion Sequence

1. The splash is present before the page is revealed, preventing a flash of the home page.
2. After an 80ms lead-in, the monogram fades in with a small upward movement over 800ms.
3. At 900ms, after the monogram has settled, the letters in `BESAN KHALAILY`
   appear sequentially from left to right. Each letter enters over 550ms and the
   next letter begins 55ms later.
4. The completed lockup pauses briefly after the last letter settles.
5. At 2.5 seconds, the splash fades out over 300ms and is removed from
   interaction and layout at 2.8 seconds.

The sequence uses the project's existing editorial easing. The 55ms character
stagger is deliberate enough to make the lettering readable while keeping the
word build continuous rather than turning it into separate pop animations. The
reduced-motion timing remains unchanged.

## Architecture

Create an isolated `OpeningSplash` component owned by the home page. The component handles only presentation and splash lifecycle; the home page remains responsible for its normal sections.

The splash lifecycle is local to the `OpeningSplash` component. Every home-page
mount starts the sequence; the component moves from active to exiting to hidden
using timers and does not persist completion in browser storage.

The underlying home page remains rendered while the splash is active so images and layout can load behind it. The splash is fixed above the page, locks document scrolling during its active sequence, and restores scrolling on completion or unmount.

## Accessibility

- Mark the animated lockup as decorative because the page already exposes the brand in semantic navigation and heading content.
- Never trap focus inside the splash.
- Keep the overlay non-interactive.
- For `prefers-reduced-motion: reduce`, show the complete lockup without staggered letters and use a short opacity fade.
- Restore document scrolling in every cleanup path.

## Responsive Behavior

- Use viewport-relative spacing with explicit maximum sizes for the monogram and wordmark.
- Keep the monogram comfortably within narrow mobile screens.
- Prevent the brand name from wrapping.
- Respect mobile safe-area insets while maintaining optical centering.

## Failure Handling

- If the monogram image fails to load, the live-text brand name still appears and the sequence completes.
- Timers are cleared and scroll state is restored if the component unmounts early.

## Verification

- Component test: first render shows the splash and completes the sequence.
- Component test: remounting the home page plays the splash again.
- Component test: reduced-motion mode avoids staggered and large movement states.
- Component test: unmount cleanup restores document scrolling and clears pending timers.
- Existing home-page and motion tests continue to pass.
- Production build succeeds.
- Visual check on desktop and mobile confirms centering, readable character spacing, no content flash, and a clean reveal.

## Out of Scope

- A persistent loading indicator.
- Audio.
- User controls or a skip button for this short sequence.
- Showing the splash on routes other than the home page.

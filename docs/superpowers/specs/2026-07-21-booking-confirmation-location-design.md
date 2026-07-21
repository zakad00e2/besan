# Booking confirmation location design

## Goal

After a customer successfully submits the public appointment form, replace the form with a dedicated confirmation state that reassures her the booking is saved and shows the atelier location.

## Confirmed experience

- The confirmation state appears only after `submitBooking` returns a successful result.
- It replaces the booking form within the existing `/book-call` route instead of navigating to a separate route.
- It shows a clear booking-success heading and the booked appointment date and time.
- It embeds a Google Maps preview centered on latitude `32.866546630859375` and longitude `35.29303741455078`.
- There is no separate location button.
- The embedded map is clickable. Activating it opens the same location in Google Maps, allowing the browser or operating system to hand the link to the Google Maps app when supported.
- Arabic and English content follow the currently selected public-site locale.

## Interface design

The existing site navigation and footer remain in place. The booking page's main content changes from the two-column booking form into a calm, full confirmation composition:

1. A restrained success mark establishes completion.
2. A short confirmation heading confirms that the booking was saved.
3. A compact appointment summary repeats the selected date and time.
4. A large embedded map becomes the dominant visual and location affordance.
5. A short hint explains that the customer can tap the map to open it in Google Maps.

The visual language will reuse the project's existing typography, borders, colors, spacing, and motion tokens. The confirmation transition will be brief and respect `prefers-reduced-motion`.

## Data flow

1. The customer completes the existing form and presses Confirm Booking.
2. The current validation and booking submission flow runs unchanged.
3. On success, the component preserves the selected appointment data and enters its submitted state.
4. The submitted state renders the confirmation composition and map instead of the form.
5. Failed validation, unavailable slots, and storage errors keep the customer on the form with the existing error handling.

No database change is required because the atelier location is fixed public presentation data, not booking-specific data.

## Map behavior and fallback

- The visual preview uses a Google Maps embed URL derived from the fixed coordinates.
- A transparent accessible link covers the map interaction so clicking or tapping opens the canonical Google Maps location URL in a new browsing context.
- The link has a localized accessible label.
- If the embed cannot load, the clickable location area and accessible link remain available; the booking confirmation itself is not treated as failed.

## Testing

Route-level tests will verify that:

- a successful booking submission replaces the form with the confirmation state;
- the confirmation includes the selected appointment date and time;
- the embedded map uses the fixed coordinates;
- the clickable map links to the matching Google Maps location;
- failed submissions do not show the confirmation state.

The focused route tests, full test suite, lint, and production build will be run before completion.

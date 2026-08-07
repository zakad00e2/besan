# Booking confirmation punctuality note design

## Goal

Show customers a clear Arabic punctuality policy after a design booking is successfully saved.

## Scope

The existing public booking confirmation in `src/routes/book-call.tsx` will show this exact Arabic copy below the appointment date and time, and before the map prompt and map:

> يرجى الالتزام بموعد الحجز. في حال التأخر أكثر من 15 دقيقة، يُعتبر الحجز ملغيًا.

The note will be displayed only in the post-submission confirmation state. It will use an inline, bordered notice treatment that follows the existing monochrome editorial styling and remains legible on narrow screens.

## Behavior and accessibility

- The new content does not alter booking submission, appointment details, map interaction, or error states.
- Arabic customers receive the required Arabic policy; the English confirmation retains an equivalent English policy so the component remains complete for both supported locales.
- The confirmation test will assert the English equivalent and a separate Arabic-locale test will assert the exact required copy.

## Validation

Run the focused route test file after implementing the change. The successful submission scenario must still render appointment details and the clickable location map.

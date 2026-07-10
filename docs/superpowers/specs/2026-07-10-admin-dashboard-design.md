# Besan atelier admin dashboard — frontend design specification

**Date:** 2026-07-10

**Status:** Design approved; awaiting written-spec review

## Goal

Create a frontend-only Arabic dashboard for the atelier supervisor. The dashboard must make workshop and design bookings, customer history and progress, reminders, and weekly availability easy to scan and manage.

## Scope

- Dashboard overview with operational metrics, a day/week schedule switcher, reminders, and customers who need follow-up.
- Unified workshop and design bookings with search, filters, and frontend-only create/edit flows.
- Customer directory and a dedicated profile route for each customer.
- Customer profiles with phone number, current stage, previous and upcoming appointments, supervisor notes, and a short activity history.
- Weekly availability editor for Sunday through Thursday, with 60-minute slots starting at 10:00 and ending at 18:00.
- Reminder settings that represent WhatsApp reminders for customers and in-dashboard reminders for the supervisor 24 hours before an appointment.
- Responsive Arabic RTL layouts for desktop, tablet, and mobile.

Out of scope: authentication, database persistence, real WhatsApp or notification delivery, server APIs, role permissions, and production conflict detection.

## Approved visual direction

Follow the supplied dashboard reference closely:

- Crisp white page and surface backgrounds.
- Very light gray borders and dividers.
- Rounded cards with minimal or no shadow.
- Near-black primary text and restrained gray secondary text.
- Purple as the active-navigation and primary-accent color.
- Green for positive and confirmed states.
- A fixed right-hand navigation rail on desktop.
- Comfortable operational density with clear numeric hierarchy.

The reference provides the visual system and hierarchy, while the content is tailored to Besan's atelier operations. Decorative analytics from the reference are replaced with schedule, follow-up, booking, and reminder information.

## Information architecture

The dashboard uses nested routes so each operational area can be linked and revisited directly:

| Route | Purpose |
| --- | --- |
| `/dashboard` | Overview and daily operations |
| `/dashboard/bookings` | Unified workshop and design bookings |
| `/dashboard/customers` | Searchable customer directory |
| `/dashboard/customers/:id` | Dedicated customer profile |
| `/dashboard/availability` | Weekly availability and reminder settings |

The right-side navigation remains stable between routes. On small screens it becomes a drawer. A compact command header contains the current page title and the primary “New appointment” action where applicable.

## Page design

### Overview

- Four concise metric cards: today's appointments, this week's appointments, new customers, and customers requiring follow-up.
- Day/week schedule switcher with a clean appointment list.
- Tomorrow's reminder queue.
- Customers requiring action, linked to their profiles.

### Bookings

- Search by customer name or phone number.
- Filters for booking type, date, and status.
- Unified responsive table containing customer, booking type, appointment purpose, date/time, status, reminder state, and actions.
- Workshop and design bookings are visually distinguishable without splitting them into separate screens.
- Frontend-only create and edit appointment panels.

### Customers

- Searchable directory showing customer name, phone number, current stage, next appointment, and latest update.
- Selecting a customer navigates to `/dashboard/customers/:id`.

### Customer profile

- Contact details and current stage.
- Previous and upcoming appointments.
- Supervisor notes with an add-note interaction.
- Short chronological activity history.
- The approved design-customer stages are:
  1. New inquiry
  2. Initial appointment
  3. Measurements taken
  4. Design and production
  5. Fitting
  6. Ready for delivery
  7. Completed

### Availability and reminders

- Weekly grid for Sunday through Thursday.
- Slots start at 10:00, with the final slot running from 17:00 to 18:00.
- Each slot can be enabled or disabled locally.
- Reminder controls represent a customer WhatsApp reminder and an in-dashboard supervisor reminder 24 hours before the appointment.
- A persistent, unobtrusive notice explains that reminder delivery is simulated in this frontend-only version.

## Component boundaries

- `DashboardShell`: responsive navigation, mobile drawer, and command header.
- `DashboardOverview`: metrics, schedule, reminders, and follow-up summaries.
- `BookingsView`: search, filters, table/list rendering, and appointment panels.
- `CustomersView`: directory search and customer summaries.
- `CustomerProfileView`: customer identity, stage, appointments, notes, and activity.
- `AvailabilityView`: weekly slot editor and reminder settings.
- Shared operational components: status badge, empty state, appointment row, customer summary, filters, and form fields.

Each feature component consumes typed demo models and exposes user actions through a shared dashboard state boundary. Route components remain small and assemble the feature components for their URL.

## Frontend data flow

A shared in-memory dashboard store provides realistic demo customers, appointments, availability slots, notes, and reminder settings. Actions update the shared state so a new or edited appointment appears consistently in the overview, bookings view, and customer profile during the current browser session.

Supported local actions:

- Create or edit an appointment.
- Search and filter bookings or customers.
- Update a customer's stage.
- Add a supervisor note.
- Enable or disable an availability slot.
- Update reminder preferences.

Data intentionally resets to the original demo state after a full page refresh. The prototype does not use `localStorage`, a database, or network mutations.

## Feedback and error states

- Short success toast after a local create or update action.
- Required-field validation in appointment and note forms.
- Local appointment-overlap warning when a selected slot conflicts with demo session data.
- Explicit empty states for no search results, no appointments on the selected day, and no previous appointments.
- Clear simulated-state wording for reminders.

## Accessibility and responsive behavior

- Arabic UI uses RTL direction; times, phone numbers, URLs, and Latin tokens use LTR isolation where needed.
- Icon-only controls have Arabic accessible labels.
- Keyboard focus remains clearly visible.
- Touch targets are at least 40px tall.
- Desktop tables become stacked appointment rows on small screens.
- The desktop sidebar becomes a mobile drawer.
- Motion is subtle and respects reduced-motion preferences.

## Demo content

Use believable Arabic customer names, mixed workshop/design appointments, varied stages and statuses, and non-round operational metrics. Demo data must cover upcoming and previous appointments, follow-up cases, reminder states, empty filters, and availability conflicts.

## Verification strategy

Focused interaction tests cover:

- Navigation between dashboard routes.
- Booking search and filters.
- Appointment creation and shared-state updates.
- Opening a customer profile and updating its stage and notes.
- Enabling and disabling availability slots.
- Required-field and overlap feedback.

Completion also requires running the full test suite, ESLint, and a production build, followed by visual checks at representative desktop and mobile sizes.

# Time-aware dashboard greeting

## Goal

Replace the static dashboard greeting with an English greeting that reflects the user's local time while preserving the existing dashboard layout.

## Behavior

The greeting is derived from the `now` value already accepted by `DashboardOverview`:

- 05:00–11:59: `Good morning Besan ☀️`
- 12:00–16:59: `Good afternoon Besan ☀️`
- 17:00–21:59: `Good evening Besan ☀️`
- 22:00–04:59: `Good night Besan 🌙`

The production dashboard continues to use the browser's current local time through the default `now` value. Tests pass explicit `Date` values so every boundary is deterministic.

## Implementation

Add a small pure greeting helper to the dashboard overview module and render its result in the existing greeting location. Do not add timers, state, or layout changes; the greeting updates on the next dashboard render or reload.

## Verification

Add unit coverage for each time range, run the dashboard overview tests, and run a production build.

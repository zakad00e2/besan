# Dashboard English, LTR, and Roboto conversion — design specification

**Date:** 2026-07-11

**Status:** Approved for implementation planning

## Goal

Convert the complete admin dashboard experience from Arabic RTL to English LTR and use Roboto throughout the dashboard without changing the public website typography or dashboard functionality.

## Scope

- Translate all dashboard interface copy into natural English.
- Translate all demo content, including customer names, activity labels, notes, appointment purposes, and operational statuses.
- Change dashboard document semantics from `lang="ar"` and `dir="rtl"` to `lang="en"` and `dir="ltr"`.
- Mirror directional layout decisions: desktop sidebar, content offset, borders, mobile drawer edge, and direction-sensitive alignment.
- Apply Roboto only within the `.dashboard-app` boundary.
- Update dashboard tests and the dashboard verification script to assert the English experience.
- Preserve all existing dashboard behavior and current uncommitted functional/layout work.

Out of scope: runtime language switching, retaining Arabic as an alternate locale, introducing an internationalization framework, changing routes, redesigning components, changing business logic, or changing typography outside the dashboard.

## Chosen approach

Use a direct, comprehensive conversion of the existing dashboard source. This is preferable to adding an i18n layer because the requested product state has one language and does not require runtime switching. It also avoids a partial translation that would leave Arabic demo content inside an English interface.

## Language and content

Every user-visible dashboard string will be English, including:

- Navigation, page headings, descriptions, buttons, filters, table headings, empty states, form labels, validation messages, toast messages, and accessibility labels.
- Stage, booking type, appointment status, reminder status, and weekday labels.
- Demo customer names, appointment purposes, notes, and activity entries.
- The dashboard route document title and any script-level expected labels.

English wording should be concise and operational. Existing internal identifiers, route paths, enum keys, and data shapes remain unchanged.

## Direction and layout

The dashboard root uses `lang="en"` and `dir="ltr"`. Directional layout is mirrored consistently:

- The fixed desktop sidebar moves from the right edge to the left edge.
- The desktop content offset changes from right padding to left padding.
- The sidebar divider moves from its left edge to its right edge.
- The mobile navigation drawer opens from the left and uses LTR direction.
- Explicit `dir="rtl"` attributes inside dashboard dialogs are removed or changed to LTR.
- Redundant `dir="ltr"` attributes may be removed where the dashboard root already supplies LTR direction.

Responsive breakpoints, dimensions, spacing scale, and component behavior remain otherwise unchanged.

## Typography

Roboto is loaded with the weights used by the dashboard and assigned through `.dashboard-app`, keeping the font change isolated from public pages. A standard sans-serif fallback stack remains available if the web font cannot load. Dashboard controls inherit the dashboard font.

## Component and data boundaries

The existing component boundaries remain intact:

- `DashboardShell` owns language semantics, direction, navigation positioning, and drawer direction.
- Dashboard feature views own their English interface copy.
- `dashboard-model.ts` owns translated display-label maps while preserving enum keys.
- `dashboard-data.ts` owns fully translated demo records.
- `styles.css` owns the dashboard-scoped Roboto rule.

No new translation abstraction or state is introduced.

## Testing and verification

Tests will be updated before implementation assertions are made so they describe the expected English UI and LTR semantics. Verification covers:

- English navigation and active-route behavior.
- English labels, filters, dialogs, validation, toasts, empty states, and demo content.
- `lang="en"` and `dir="ltr"` on the dashboard root.
- Left-side desktop navigation and left-side mobile drawer through source assertions and visual inspection.
- Roboto applied within `.dashboard-app` without changing public-page typography.
- No remaining Arabic-script text in dashboard runtime source or dashboard verification scripts.
- The focused dashboard tests, full test suite, ESLint, production build, and representative desktop/mobile visual checks.

Existing uncommitted dashboard changes are part of the starting state and must remain intact throughout the conversion.

# Dashboard Customers Card Design

## Goal

Replace the dashboard overview's follow-up list with a concise customer directory preview.

## Scope

- Rename the overview card from `Needs follow-up` to `Customers`.
- Show customers from the existing dashboard customer data, regardless of stage or most-recent update time.
- Each visible row shows the customer's name, current stage, and a `View profile` link to that customer's existing profile route.
- Include a `View all customers` link to the existing customer-directory route.
- Keep the existing follow-up metric card and its calculation unchanged; only the detailed overview list changes.

## Display behavior

The preview uses the current customer ordering supplied to the dashboard and displays its first five customers so the overview remains scannable. The all-customers link remains the path to the complete directory.

If the customer dataset is empty, the card shows a clear empty state rather than the prior follow-up-specific copy.

## Data and routing

No database schema, customer model, or routing changes are needed. The card continues to use each customer's existing `id`, `name`, and `stage`; profile links use `/dashboard/customers/:id`. The directory link uses the existing dashboard customers route.

## Verification

- A component test proves the card is titled `Customers` and includes customers that would not qualify for follow-up.
- A component test proves the all-customers link targets the customer directory.
- Existing dashboard metrics tests continue to confirm that the follow-up metric still works independently of the customer preview.

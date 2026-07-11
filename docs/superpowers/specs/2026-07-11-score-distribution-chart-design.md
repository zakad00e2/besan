# Score Distribution Chart Design

## Purpose

Replace the dashboard's manual “Booking status distribution” visualization with a reusable Arabic rating-distribution chart. The chart visualizes four score buckets and gives the operator an at-a-glance average score.

## Component API

Create `ScoreDistributionChart` in `src/features/dashboard/score-distribution-chart.tsx`.

```ts
type ScoreDistribution = {
  high: number;
  good: number;
  medium: number;
  low: number;
};

type ScoreDistributionChartProps = {
  scoreDist: ScoreDistribution;
  avgScore?: number;
};
```

`avgScore` is the preferred value whenever the caller has an exact aggregate. If it is absent, the component computes a clearly deterministic estimate from the distribution using representative bucket scores: `4.75`, `4.2`, `3.7`, and `3.25`, weighted by each bucket count. An all-zero distribution yields `0.0`.

## Data and Rendering

The component transforms only its `scoreDist` prop into four Recharts data points, in this fixed presentation order:

1. `4.5+` from `high`
2. `4.0–4.4` from `good`
3. `3.5–3.9` from `medium`
4. `أقل من 3.5` from `low`

It does not contain sample counts or other fixed source data. The dashboard will provide its data through the component API; the current appointment model has no rating property, so wiring a real data source is outside this focused UI change unless that model is extended separately.

## Visual Design

Use a native `article` container rather than the project’s shadcn `Card` component. It uses `var(--card)`, no shadow, and soft rounded corners. The heading is `توزيع التقييمات` at 14px/400 in `var(--muted-foreground)`; the average appears immediately below at 30px/500 with tabular numerals.

Use a responsive Recharts `BarChart` in a 200px-or-taller region, with `barCategoryGap="28%"` and `margin={{ top: 8, right: 8, left: -12, bottom: 4 }}`. The axis lines are hidden; tick labels are muted at 11px. Horizontal grid lines use `var(--border)` at 0.45 opacity, and vertical grid lines use a 4 4 dash at 0.35 opacity.

Each bar uses `maxBarSize={44}`, `radius={[10, 10, 4, 4]}`, and disabled animation. Four inline SVG vertical gradients use these exact top-to-bottom pairs with 0.95 then 0.85 stop opacity:

1. `#60a5fa` → `#3b82f6`
2. `#34d399` → `#10b981`
3. `#fb923c` → `#f97316`
4. `#f472b6` → `#ec4899`

The tooltip uses the card and border CSS variables, 12px radius, 8px × 12px padding, 12px text, and a light shadow. Its hover cursor is `var(--muted)` at 0.35 opacity.

## Testing

Add focused component tests that verify:

- all four Arabic bucket labels and supplied count values are rendered;
- an explicit `avgScore` takes precedence and is formatted to one decimal place;
- the weighted fallback average is used when `avgScore` is omitted;
- a zero-count distribution renders `0.0` without division by zero.

## Scope Boundaries

No shadcn chart or card primitives will be imported. No chart animation or hard-coded distribution data will be introduced. Existing unrelated dashboard edits remain untouched.

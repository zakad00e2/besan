// @vitest-environment node

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const migrationPath = fileURLToPath(
  new URL("../../../db/migrations/004_create_availability_tables.sql", import.meta.url),
);

describe("availability migration", () => {
  const sql = readFileSync(migrationPath, "utf8");

  it("creates normalized weekly and date-override storage", () => {
    for (const table of [
      "availability_settings",
      "weekly_availability_days",
      "weekly_availability_windows",
      "availability_date_overrides",
      "availability_date_windows",
    ]) {
      expect(sql).toContain(`CREATE TABLE IF NOT EXISTS public.${table}`);
    }
    expect(sql).toContain("Asia/Jerusalem");
    expect(sql).toContain("slot_duration_minutes");
    expect(sql).toMatch(/\(4, false\)/);
  });

  it("protects active 60-minute ranges without modifying bookings", () => {
    expect(sql).toContain("appointments_active_time_overlap");
    expect(sql).toContain("EXCLUDE USING gist");
    expect(sql).toContain("status <> 'cancelled'");
    expect(sql).toContain("Existing active appointments overlap");
    expect(sql).not.toMatch(/DELETE\s+FROM\s+public\.appointments/i);
    expect(sql).not.toMatch(/UPDATE\s+public\.appointments/i);
  });

  it("prevents an override with windows from changing away from custom-hours", () => {
    expect(sql).toMatch(
      /CREATE TRIGGER availability_date_overrides_custom_hours[\s\S]*?BEFORE UPDATE OF kind ON public\.availability_date_overrides[\s\S]*?ensure_custom_hours_override_kind\(\)/,
    );
    expect(sql).toMatch(
      /OLD\.kind = 'custom-hours'[\s\S]*?NEW\.kind <> 'custom-hours'[\s\S]*?FROM public\.availability_date_windows window_row[\s\S]*?window_row\.override_id = OLD\.id/,
    );
  });

  it("scopes the appointment overlap constraint existence check to appointments", () => {
    expect(sql).toMatch(
      /FROM pg_constraint[\s\S]*?conname = 'appointments_active_time_overlap'[\s\S]*?conrelid = 'public\.appointments'::regclass[\s\S]*?contype = 'x'/,
    );
  });
});

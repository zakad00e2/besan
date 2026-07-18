// @vitest-environment node

import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const migrationPath = fileURLToPath(
  new URL("../../../db/migrations/007_update_next_appointment_stages.sql", import.meta.url),
);

describe("next appointment stage migration", () => {
  const sql = existsSync(migrationPath) ? readFileSync(migrationPath, "utf8") : "";

  it("allows public, historical, and approved next-appointment values", () => {
    for (const value of [
      "Custom Design",
      "Consultation",
      "Dresses for Rent",
      "New Design",
      "Measurements",
      "First Fitting",
      "Second Fitting",
      "Alteration",
      "Pickup",
      "Initial Consultation",
      "Final Fitting & Pickup",
    ]) {
      expect(sql).toContain(`'${value}'`);
    }
  });

  it("replaces only the appointment type constraint", () => {
    expect(sql).toContain("DROP CONSTRAINT IF EXISTS appointments_appointment_type_check");
    expect(sql).toContain("ADD CONSTRAINT appointments_appointment_type_check CHECK");
    expect(sql).not.toMatch(/\b(?:UPDATE|DELETE|TRUNCATE)\b/i);
  });
});

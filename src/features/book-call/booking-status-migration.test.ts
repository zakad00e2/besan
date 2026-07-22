// @vitest-environment node

import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const migrationPath = fileURLToPath(
  new URL("../../../db/migrations/009_confirm_design_booking_default.sql", import.meta.url),
);

describe("confirmed design-booking default migration", () => {
  it("adds a migration that defaults future appointments to confirmed", () => {
    expect(existsSync(migrationPath)).toBe(true);
    const sql = readFileSync(migrationPath, "utf8");

    expect(sql).toContain("ALTER COLUMN status SET DEFAULT 'confirmed'");
    expect(sql).not.toMatch(/UPDATE\s+public\.appointments/i);
  });
});

import { describe, expect, it } from "vitest";
import { DEFAULT_ADMIN_EMAIL, isAdminEmail, requireConfiguredAdminEmail } from "./admin-auth";

describe("admin authorization", () => {
  it("uses the current dashboard administrator", () => {
    expect(DEFAULT_ADMIN_EMAIL).toBe("zeka12345678998765432@gmail.com");
  });

  it("matches the configured email without casing or surrounding whitespace", () => {
    expect(isAdminEmail(" Z409483831@gmail.com ", "z409483831@gmail.com")).toBe(true);
  });

  it("rejects a different email and missing configuration", () => {
    expect(isAdminEmail("other@example.com", "z409483831@gmail.com")).toBe(false);
    expect(() => requireConfiguredAdminEmail(undefined)).toThrow("ADMIN_EMAIL is not configured");
  });
});

import { describe, expect, it } from "vitest";
import { isAdminEmail, requireConfiguredAdminEmail } from "./admin-auth";

describe("admin authorization", () => {
  it("matches the configured email without casing or surrounding whitespace", () => {
    expect(isAdminEmail(" Z409483831@gmail.com ", "z409483831@gmail.com")).toBe(true);
  });

  it("rejects a different email and missing configuration", () => {
    expect(isAdminEmail("other@example.com", "z409483831@gmail.com")).toBe(false);
    expect(() => requireConfiguredAdminEmail(undefined)).toThrow("ADMIN_EMAIL is not configured");
  });
});

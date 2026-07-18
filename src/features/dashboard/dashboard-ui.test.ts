import { describe, expect, it } from "vitest";
import {
  dashboardIconButtonClassName,
  dashboardPrimaryButtonClassName,
  dashboardSecondaryButtonClassName,
} from "./dashboard-ui";

describe("dashboard motion classes", () => {
  it.each([
    dashboardPrimaryButtonClassName,
    dashboardSecondaryButtonClassName,
    dashboardIconButtonClassName,
  ])("scopes high-frequency button transitions", (className) => {
    expect(className).not.toContain("transition-all");
    expect(className).toContain("motion-press");
    expect(className).toContain("duration-[var(--motion-duration-color)]");
  });
});

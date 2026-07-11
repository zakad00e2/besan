import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...props }: { to: string; children: ReactNode }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useLocation: () => ({ pathname: "/dashboard/customers" }),
}));

import { DashboardShell } from "./dashboard-shell";

afterEach(cleanup);

describe("DashboardShell", () => {
  it("renders English LTR navigation and marks the current section", () => {
    const { container } = render(
      <DashboardShell>
        <p>Content</p>
      </DashboardShell>,
    );

    const root = container.firstElementChild;
    expect(root?.getAttribute("lang")).toBe("en");
    expect(root?.getAttribute("dir")).toBe("ltr");
    expect(screen.getByRole("link", { name: "Customers" }).getAttribute("aria-current")).toBe(
      "page",
    );
    expect(screen.getByRole("button", { name: "Open menu" })).toBeTruthy();
    expect(document.body.textContent).toContain("Demo version");
    expect(document.body.textContent).toContain("Reminders are not actually sent");
    expect(container.querySelector("aside")?.className).toContain("left-0");
  });
});

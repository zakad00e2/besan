import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

let pathname = "/dashboard/workshop-bookings";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...props }: { to: string; children: ReactNode }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useLocation: () => ({ pathname }),
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
    expect(screen.getByRole("link", { name: "Workshop bookings" }).getAttribute("aria-current")).toBe(
      "page",
    );
    expect(document.body.textContent).toContain("Workshop requests and participant details");
    expect(screen.getByRole("button", { name: "Open menu" })).toBeTruthy();
    expect(document.body.textContent).toContain("Demo version");
    expect(document.body.textContent).toContain("Reminders are not actually sent");
    expect(container.querySelector("aside")?.className).toContain("left-0");
  });

  it("describes general bookings as design appointments", () => {
    pathname = "/dashboard/bookings";

    render(
      <DashboardShell>
        <p>Content</p>
      </DashboardShell>,
    );

    expect(document.body.textContent).toContain("Manage design appointments in one place");
  });
});

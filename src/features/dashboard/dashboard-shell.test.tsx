import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

let pathname = "/dashboard/workshop-bookings";
const { signOut, navigate } = vi.hoisted(() => ({ signOut: vi.fn(), navigate: vi.fn() }));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...props }: { to: string; children: ReactNode }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useLocation: () => ({ pathname }),
  useNavigate: () => navigate,
}));

vi.mock("@/features/auth/neon-auth-client", () => ({
  authClient: { signOut },
}));

import { DashboardShell } from "./dashboard-shell";

afterEach(() => {
  cleanup();
  signOut.mockReset();
  navigate.mockReset();
});

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
    expect(screen.getByRole("link", { name: "Workshop" }).getAttribute("aria-current")).toBe(
      "page",
    );
    expect(document.body.textContent).toContain("Workshop requests and participant details");
    expect(screen.getByRole("button", { name: "Open menu" })).toBeTruthy();
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

  it("signs out from the sidebar footer and returns to the sign-in page", async () => {
    signOut.mockResolvedValue(undefined);
    navigate.mockResolvedValue(undefined);

    render(
      <DashboardShell>
        <p>Content</p>
      </DashboardShell>,
    );

    fireEvent.click(screen.getAllByRole("button", { name: "Log out" })[0]);

    await waitFor(() => expect(signOut).toHaveBeenCalledOnce());
    expect(navigate).toHaveBeenCalledWith({ to: "/auth" });
  });
});

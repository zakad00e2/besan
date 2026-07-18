import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { useSession } = vi.hoisted(() => ({ useSession: vi.fn() }));

vi.mock("@/features/auth/neon-auth-client", () => ({
  authClient: { useSession },
}));

vi.mock("@/features/dashboard/dashboard-shell", () => ({
  DashboardShell: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dashboard-shell">{children}</div>
  ),
}));

vi.mock("./auth", () => ({
  AuthPage: ({ redirectTo }: { redirectTo?: string }) => (
    <div data-testid="auth-page" data-redirect-to={redirectTo} />
  ),
}));

import { DashboardAccessGate } from "./dashboard";

afterEach(() => {
  cleanup();
  useSession.mockReset();
});

describe("DashboardAccessGate", () => {
  it("shows a dashboard skeleton while the session is loading", () => {
    useSession.mockReturnValue({ data: null, isPending: true });

    render(
      <DashboardAccessGate redirectTo="/dashboard/bookings">
        <div>Protected page</div>
      </DashboardAccessGate>,
    );

    const loadingView = screen.getByRole("main", { name: "Loading dashboard" });
    expect(loadingView.getAttribute("aria-busy")).toBe("true");
    expect(screen.getByRole("status").textContent).toContain("Checking your session");
    expect(screen.queryByTestId("dashboard-shell")).toBeNull();
  });

  it("shows sign in outside the dashboard shell for signed-out visitors", () => {
    useSession.mockReturnValue({ data: null, isPending: false });

    render(
      <DashboardAccessGate redirectTo="/dashboard/workshop-bookings">
        <div>Protected page</div>
      </DashboardAccessGate>,
    );

    expect(screen.getByTestId("auth-page").getAttribute("data-redirect-to")).toBe(
      "/dashboard/workshop-bookings",
    );
    expect(screen.queryByTestId("dashboard-shell")).toBeNull();
    expect(screen.queryByText("Protected page")).toBeNull();
  });

  it("renders dashboard pages inside the shell after authentication", () => {
    useSession.mockReturnValue({ data: { user: { id: "admin" } }, isPending: false });

    render(
      <DashboardAccessGate redirectTo="/dashboard">
        <div>Protected page</div>
      </DashboardAccessGate>,
    );

    expect(screen.getByTestId("dashboard-shell")).toBeTruthy();
    expect(screen.getByText("Protected page")).toBeTruthy();
    expect(screen.queryByTestId("auth-page")).toBeNull();
  });
});

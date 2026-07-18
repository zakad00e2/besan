import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { signInEmail } = vi.hoisted(() => ({ signInEmail: vi.fn() }));

vi.mock("@/features/auth/neon-auth-client", () => ({
  authClient: { signIn: { email: signInEmail } },
}));

import { AuthPage, getDashboardRedirect, withTimeout } from "./auth";

afterEach(() => {
  cleanup();
  signInEmail.mockReset();
});

describe("AuthPage", () => {
  it("uses the dashboard brand and visual shell", () => {
    render(<AuthPage />);

    expect(screen.getByRole("main").className).toContain("dashboard-app");
    expect(screen.getByRole("img", { name: "Besan Khalaily" })).toBeTruthy();
    expect(screen.getByText("Atelier admin dashboard")).toBeTruthy();
  });

  it("only accepts dashboard paths as post-login redirects", () => {
    expect(getDashboardRedirect("/dashboard/workshop-bookings?status=new")).toBe(
      "/dashboard/workshop-bookings?status=new",
    );
    expect(getDashboardRedirect("https://example.com/phishing")).toBe("/dashboard/bookings");
    expect(getDashboardRedirect()).toBe("/dashboard/bookings");
  });

  it("times out an authentication request that never settles", async () => {
    await expect(withTimeout(new Promise(() => undefined), 1)).rejects.toThrow(
      "Authentication request timed out",
    );
  });

  it("recovers when the authentication request throws", async () => {
    signInEmail.mockRejectedValue(new Error("Failed to fetch"));
    render(<AuthPage />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "z409483831@gmail.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "secret-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain("Could not sign in"),
    );
    expect(screen.getByRole("button", { name: "Sign in" }).hasAttribute("disabled")).toBe(false);
  });
});

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { signInEmail } = vi.hoisted(() => ({ signInEmail: vi.fn() }));

vi.mock("@/features/auth/neon-auth-client", () => ({
  authClient: { signIn: { email: signInEmail } },
}));

import { AuthPage, withTimeout } from "./auth";

afterEach(() => {
  cleanup();
  signInEmail.mockReset();
});

describe("AuthPage", () => {
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

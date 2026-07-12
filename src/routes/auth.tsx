import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { authClient } from "@/features/auth/neon-auth-client";

export const Route = createFileRoute("/auth")({ component: AuthPage });

export function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(
      () => reject(new Error("Authentication request timed out")),
      timeoutMs,
    );
    promise.then(
      (value) => {
        window.clearTimeout(timeout);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timeout);
        reject(error);
      },
    );
  });
}

export function AuthPage() {
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const result = await withTimeout(
        mode === "sign-in"
          ? authClient.signIn.email({ email, password })
          : authClient.signUp.email({ email, password, name: "Besan dashboard admin" }),
        15_000,
      );
      if (result.error) {
        setError(
          result.error.message ||
            (mode === "sign-in" ? "Could not sign in." : "Could not create the account."),
        );
      } else window.location.assign("/dashboard/bookings");
    } catch (signInError) {
      console.error(signInError);
      setError("Could not sign in. Please check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <form onSubmit={submit} className="w-full max-w-sm space-y-5 border border-foreground/30 p-8">
        <h1 className="font-serif text-4xl">
          {mode === "sign-in" ? "Dashboard sign in" : "Create admin account"}
        </h1>
        <label className="block text-sm">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-2 w-full border border-foreground/40 bg-transparent p-3"
          />
        </label>
        <label className="block text-sm">
          Password
          <input
            type="password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-2 w-full border border-foreground/40 bg-transparent p-3"
          />
        </label>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <button disabled={saving} className="w-full bg-foreground p-3 text-background">
          {saving ? "Please wait…" : mode === "sign-in" ? "Sign in" : "Create account"}
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => {
            setError("");
            setMode((current) => (current === "sign-in" ? "sign-up" : "sign-in"));
          }}
          className="w-full text-sm underline underline-offset-4"
        >
          {mode === "sign-in" ? "First time? Create the admin account" : "Back to sign in"}
        </button>
      </form>
    </main>
  );
}

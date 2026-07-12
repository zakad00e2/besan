import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { authClient } from "@/features/auth/neon-auth-client";

export const Route = createFileRoute("/auth")({ component: AuthPage });

function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const { error: signInError } = await authClient.signIn.email({ email, password });
    if (signInError) setError(signInError.message || "Could not sign in.");
    else window.location.assign("/dashboard/bookings");
    setSaving(false);
  }

  return <main className="flex min-h-screen items-center justify-center bg-background p-6"><form onSubmit={submit} className="w-full max-w-sm space-y-5 border border-foreground/30 p-8"><h1 className="font-serif text-4xl">Dashboard sign in</h1><label className="block text-sm">Email<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full border border-foreground/40 bg-transparent p-3" /></label><label className="block text-sm">Password<input type="password" required value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full border border-foreground/40 bg-transparent p-3" /></label>{error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}<button disabled={saving} className="w-full bg-foreground p-3 text-background">{saving ? "Signing in…" : "Sign in"}</button></form></main>;
}

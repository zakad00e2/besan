import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, KeyRound, Mail } from "lucide-react";
import { useState, type FormEvent } from "react";
import besanLogo from "@/assets/besan-logo.png";
import { authClient } from "@/features/auth/neon-auth-client";
import { dashboardPrimaryButtonClassName } from "@/features/dashboard/dashboard-ui";
import { cn } from "@/lib/utils";

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

export function getDashboardRedirect(redirectTo?: string) {
  return redirectTo?.startsWith("/dashboard") ? redirectTo : "/dashboard/bookings";
}

export function AuthPage({ redirectTo }: { redirectTo?: string }) {
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
      } else window.location.assign(getDashboardRedirect(redirectTo));
    } catch (signInError) {
      console.error(signInError);
      setError("Could not sign in. Please check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main
      className="dashboard-app relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-[#f4f4f5] px-4 py-6 text-[#161619] sm:px-6 lg:px-8"
      dir="ltr"
      lang="en"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(255,255,255,0.95),transparent_36%),radial-gradient(circle_at_86%_88%,rgba(228,228,231,0.7),transparent_32%)]"
      />

      <div className="relative grid w-full max-w-[1040px] overflow-hidden rounded-[18px] border border-[#dedee1] bg-white shadow-[0_24px_70px_-28px_rgba(24,24,27,0.28),0_2px_8px_rgba(24,24,27,0.04)] lg:grid-cols-[0.84fr_1.16fr]">
        <aside className="relative hidden overflow-hidden border-r border-[#e6e6e8] bg-[#f8f8f9] p-6 lg:flex lg:flex-col">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-70 [background-image:linear-gradient(#ececef_1px,transparent_1px),linear-gradient(90deg,#ececef_1px,transparent_1px)] [background-size:38px_38px] [mask-image:linear-gradient(to_bottom,black,transparent_72%)]"
          />

          <div className="relative flex items-center gap-3">
            <img src={besanLogo} alt="Besan Khalaily" className="size-14 object-contain" />
            <div>
              <p className="text-[15px] font-semibold leading-none text-[#19191c]">
                Besan Khalaily
              </p>
              <p className="mt-1 text-[11px] text-[#8a8b91]">Atelier management</p>
            </div>
          </div>

          <div className="relative my-auto max-w-[320px] py-6">
            <p className="text-[11px] font-normal text-[#8b8c92]">Private workspace</p>
            <h2 className="mt-2 text-balance text-[28px] font-semibold leading-[1.08] tracking-[-0.04em] text-[#19191c]">
              Your atelier, organized in one place.
            </h2>
            <p className="mt-3 max-w-[34ch] text-[13px] leading-5 text-[#77787e]">
              Manage appointments, workshop requests, customer details, and availability from a
              focused workspace.
            </p>
          </div>
        </aside>

        <section className="flex flex-col bg-white p-5 sm:p-8 lg:p-10">
          <header className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 lg:hidden">
              <img src={besanLogo} alt="" className="size-11 object-contain" />
              <div>
                <p className="text-[13px] font-semibold leading-none text-[#19191c]">
                  Besan Khalaily
                </p>
                <p className="mt-1 text-[10px] text-[#8a8b91]">Atelier management</p>
              </div>
            </div>
            <p className="ml-auto text-[10px] tracking-[0.04em] text-[#a0a1a6]">
              Atelier admin dashboard
            </p>
          </header>

          <div className="my-auto w-full max-w-[390px] self-center py-6 sm:py-8">
            <div className="mb-6">
              <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.035em] text-[#19191c]">
                {mode === "sign-in" ? "Welcome back Besan" : "Create admin account"}
              </h1>
              <p className="mt-2 max-w-[42ch] text-[12px] leading-5 text-[#88898f]">
                {mode === "sign-in"
                  ? "Sign in to manage bookings, customers, and workshop requests."
                  : "Set up the administrator account for your atelier workspace."}
              </p>
            </div>

            <form onSubmit={submit} className="space-y-4">
              <div>
                <label htmlFor="dashboard-email" className="text-[11px] font-medium text-[#55565b]">
                  Email
                </label>
                <div className="relative mt-2">
                  <Mail
                    className="pointer-events-none absolute left-3.5 top-1/2 size-3.5 -translate-y-1/2 text-[#a0a1a6]"
                    aria-hidden="true"
                  />
                  <input
                    id="dashboard-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="name@example.com"
                    className="h-11 w-full rounded-[10px] border border-[#dedee1] bg-[#fcfcfc] pl-10 pr-3 text-[12px] text-[#242428] outline-none transition-[border-color,background-color,box-shadow] duration-[var(--motion-duration-color)] placeholder:text-[#b1b2b7] hover:border-[#cfcfd3] focus:border-[#aaaab0] focus:bg-white focus:ring-4 focus:ring-[#18181b]/[0.04]"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="dashboard-password"
                  className="text-[11px] font-medium text-[#55565b]"
                >
                  Password
                </label>
                <div className="relative mt-2">
                  <KeyRound
                    className="pointer-events-none absolute left-3.5 top-1/2 size-3.5 -translate-y-1/2 text-[#a0a1a6]"
                    aria-hidden="true"
                  />
                  <input
                    id="dashboard-password"
                    type="password"
                    autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                    aria-describedby={error ? "auth-error" : undefined}
                    className="h-11 w-full rounded-[10px] border border-[#dedee1] bg-[#fcfcfc] pl-10 pr-3 text-[12px] text-[#242428] outline-none transition-[border-color,background-color,box-shadow] duration-[var(--motion-duration-color)] placeholder:text-[#b1b2b7] hover:border-[#cfcfd3] focus:border-[#aaaab0] focus:bg-white focus:ring-4 focus:ring-[#18181b]/[0.04]"
                  />
                </div>
              </div>

              {error ? (
                <p
                  id="auth-error"
                  role="alert"
                  className="motion-state-enter text-[11px] leading-5 text-[#b54747]"
                >
                  {error}
                </p>
              ) : null}

              <button
                disabled={saving}
                className={cn(
                  dashboardPrimaryButtonClassName,
                  "h-11 w-full gap-2 px-4 text-[12px] disabled:cursor-not-allowed disabled:opacity-60",
                )}
              >
                <span>
                  {saving ? "Please wait…" : mode === "sign-in" ? "Sign in" : "Create account"}
                </span>
                {!saving ? <ArrowRight className="size-3.5" aria-hidden="true" /> : null}
              </button>

              <div className="flex items-center gap-3 py-1" aria-hidden="true">
                <span className="h-px flex-1 bg-[#ececee]" />
                <span className="text-[9px] text-[#b0b1b5]">ADMIN ACCESS</span>
                <span className="h-px flex-1 bg-[#ececee]" />
              </div>

              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  setError("");
                  setMode((current) => (current === "sign-in" ? "sign-up" : "sign-in"));
                }}
                className="mx-auto block rounded-md px-2 py-1 text-[11px] font-medium text-[#67686d] outline-none transition-colors hover:text-[#19191c] focus-visible:ring-2 focus-visible:ring-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {mode === "sign-in"
                  ? "First time? Create the admin account"
                  : "Already have an account? Sign in"}
              </button>
            </form>
          </div>

          <footer className="flex items-center justify-between gap-4 border-t border-[#eeeeef] pt-4">
            <a
              href="/"
              className="inline-flex items-center gap-1.5 rounded-md text-[10px] text-[#8d8e93] outline-none transition-colors hover:text-[#343438] focus-visible:ring-2 focus-visible:ring-violet-500"
            >
              <ArrowLeft className="size-3" aria-hidden="true" />
              Back to website
            </a>
            <span className="text-[9px] text-[#b0b1b5]">Private &amp; secure</span>
          </footer>
        </section>
      </div>
    </main>
  );
}

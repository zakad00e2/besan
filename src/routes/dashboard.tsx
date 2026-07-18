import { Outlet, createFileRoute, useLocation } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/features/auth/neon-auth-client";
import { DashboardShell } from "@/features/dashboard/dashboard-shell";
import { cn } from "@/lib/utils";
import { AuthPage } from "./auth";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard | Besan Khalaily" }] }),
  component: DashboardLayout,
});

function DashboardLoadingSkeleton() {
  const skeletonClassName = "animate-pulse bg-[#e8e8eb] motion-reduce:animate-none";

  return (
    <main
      aria-busy="true"
      aria-label="Loading dashboard"
      className="dashboard-app min-h-screen bg-white text-[#161619]"
      dir="ltr"
      lang="en"
    >
      <span role="status" className="sr-only">
        Checking your session…
      </span>

      <aside className="fixed inset-y-0 left-0 hidden w-56 border-r border-[#e9e9eb] bg-[#f8f8f9] lg:block">
        <div className="p-4">
          <div className="flex items-center gap-2.5">
            <Skeleton className={cn(skeletonClassName, "size-12 rounded-xl")} />
            <div className="space-y-2">
              <Skeleton className={cn(skeletonClassName, "h-3 w-24")} />
              <Skeleton className={cn(skeletonClassName, "h-2.5 w-20")} />
            </div>
          </div>

          <div className="mt-10 space-y-3 px-2">
            <Skeleton className={cn(skeletonClassName, "h-2.5 w-14")} />
            {Array.from({ length: 5 }, (_, index) => (
              <div key={index} className="flex items-center gap-2.5 py-2">
                <Skeleton className={cn(skeletonClassName, "size-3.5 rounded-[5px]")} />
                <Skeleton className={cn(skeletonClassName, "h-2.5 w-20")} />
              </div>
            ))}
          </div>
        </div>
      </aside>

      <div className="lg:pl-56">
        <header className="flex h-9 items-center border-b border-[#ededee] bg-white px-4 sm:px-5">
          <Skeleton className={cn(skeletonClassName, "h-2.5 w-28")} />
          <Skeleton className={cn(skeletonClassName, "ml-auto h-2.5 w-32")} />
        </header>

        <div className="mx-auto max-w-screen-2xl px-3 pb-6 pt-6 sm:px-4">
          <div className="mb-6">
            <Skeleton className={cn(skeletonClassName, "h-7 w-36")} />
            <Skeleton className={cn(skeletonClassName, "mt-2 h-3 w-64 max-w-full")} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <div
                key={index}
                className="rounded-[10px] border border-[#e7e7e9] bg-white px-3.5 py-3"
              >
                <div className="flex items-center justify-between">
                  <Skeleton className={cn(skeletonClassName, "h-2.5 w-20")} />
                  <Skeleton className={cn(skeletonClassName, "size-3.5 rounded-[5px]")} />
                </div>
                <Skeleton className={cn(skeletonClassName, "mt-3 h-7 w-16")} />
                <Skeleton className={cn(skeletonClassName, "mt-3 h-2.5 w-28")} />
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
            <section className="rounded-[10px] border border-[#e7e7e9] bg-white p-4">
              <Skeleton className={cn(skeletonClassName, "h-3 w-32")} />
              <div className="mt-5 space-y-4">
                {Array.from({ length: 4 }, (_, index) => (
                  <div key={index} className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Skeleton className={cn(skeletonClassName, "size-8 rounded-[9px]")} />
                      <div className="space-y-2">
                        <Skeleton className={cn(skeletonClassName, "h-2.5 w-28")} />
                        <Skeleton className={cn(skeletonClassName, "h-2 w-20")} />
                      </div>
                    </div>
                    <Skeleton className={cn(skeletonClassName, "h-5 w-14 rounded-full")} />
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[10px] border border-[#e7e7e9] bg-white p-4">
              <Skeleton className={cn(skeletonClassName, "h-3 w-28")} />
              <Skeleton className={cn(skeletonClassName, "mt-5 h-44 w-full rounded-lg")} />
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

export function DashboardAccessGate({
  children,
  redirectTo,
}: {
  children: ReactNode;
  redirectTo: string;
}) {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) return <DashboardLoadingSkeleton />;

  if (!session?.user) return <AuthPage redirectTo={redirectTo} />;

  return <DashboardShell>{children}</DashboardShell>;
}

function DashboardLayout() {
  const { href } = useLocation();

  return (
    <DashboardAccessGate redirectTo={href}>
      <Outlet />
    </DashboardAccessGate>
  );
}

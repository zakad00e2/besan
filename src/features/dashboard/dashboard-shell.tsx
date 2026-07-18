import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  CalendarDays,
  Clock3,
  Scissors,
  LayoutDashboard,
  LogOut,
  Menu,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import besanLogo from "@/assets/besan-logo.png";
import { Toaster } from "@/components/ui/sonner";
import { authClient } from "@/features/auth/neon-auth-client";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const dashboardNavigation = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { label: "Bookings", to: "/dashboard/bookings", icon: CalendarDays },
  { label: "Workshop", to: "/dashboard/workshop-bookings", icon: Scissors },
  { label: "Customers", to: "/dashboard/customers", icon: Users },
  { label: "Availability", to: "/dashboard/availability", icon: Clock3 },
] as const;

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/bookings": "Bookings",
  "/dashboard/workshop-bookings": "Workshop",
  "/dashboard/customers": "Customers",
  "/dashboard/availability": "Availability",
};

const pageDescriptions: Record<string, string> = {
  "/dashboard": "A quick view of your appointments and atelier bookings",
  "/dashboard/bookings": "Manage design appointments in one place",
  "/dashboard/workshop-bookings": "Workshop requests and participant details",
  "/dashboard/customers": "Customer profiles, production stages, and upcoming appointments",
  "/dashboard/availability": "Set available time slots and reminder preferences",
};

function getPageTitle(pathname: string) {
  if (pathname.startsWith("/dashboard/customers/")) return "Customer profile";
  return pageTitles[pathname] ?? "Dashboard";
}

function getPageDescription(pathname: string) {
  if (pathname.startsWith("/dashboard/customers/"))
    return "Appointments, notes, and current production stage";
  return pageDescriptions[pathname] ?? pageDescriptions["/dashboard"];
}

function DashboardNav({ onNavigate }: { onNavigate?: () => void }) {
  const { pathname } = useLocation();

  return (
    <nav aria-label="Main navigation" className="space-y-0.5">
      {dashboardNavigation.map(({ label, to, icon: Icon }) => {
        const active = to === "/dashboard" ? pathname === to : pathname.startsWith(to);

        return (
          <Link
            key={to}
            to={to}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group flex min-h-9 items-center gap-2.5 px-2.5 text-[12px] outline-none transition-[color,background-color,border-color,box-shadow] duration-[var(--motion-duration-color)] ease-[var(--motion-ease-out)] focus-visible:ring-2 focus-visible:ring-violet-500",
              active
                ? "rounded-xl border border-[#e8e8ec] bg-white font-medium text-[#141417] shadow-[0_1px_2px_rgba(24,24,27,0.04)]"
                : "font-normal text-[#6e6f74] hover:text-[#141417]",
            )}
          >
            <Icon
              className={cn(
                "size-3.5 shrink-0 stroke-[1.75]",
                active ? "text-[#141417]" : "text-[#93949a] group-hover:text-[#6e6f74]",
              )}
              aria-hidden="true"
            />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <div className="px-3.5 pb-3 pt-4">
      <div className="flex items-center gap-2.5">
        <img src={besanLogo} alt="besan khalaily" className="size-12 shrink-0 object-contain" />
        <div className="flex flex-col justify-center">
          <p className="text-sm font-semibold leading-none text-[#19191c]">Besan Khalaily</p>
          <p className="mt-0.5 text-[10px] leading-tight text-[#8a8b91]">Atelier management</p>
        </div>
      </div>
    </div>
  );
}

function SignOutButton({ onNavigate }: { onNavigate?: () => void }) {
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    try {
      await authClient.signOut();
      onNavigate?.();
      await navigate({ to: "/auth" });
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void signOut()}
      disabled={signingOut}
      className={cn(
        "group flex min-h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-[11px] font-normal text-[#85868c] transition-[color,background-color] duration-[var(--motion-duration-color)] ease-[var(--motion-ease-out)] hover:bg-[#f0f0f1] hover:text-[#c24141] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:cursor-wait disabled:opacity-60",
      )}
    >
      <LogOut
        className="size-3.5 stroke-[1.75] text-[#a5a6ab] transition-colors duration-[var(--motion-duration-color)] ease-[var(--motion-ease-out)] group-hover:text-[#c24141]"
        aria-hidden="true"
      />
      {signingOut ? "Logging out…" : "Log out"}
    </button>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <Brand />
      <div className="mt-5 px-2">
        <p className="mb-3 px-3 text-[11px] font-normal text-[#94959b]">Workspace</p>
        <DashboardNav onNavigate={onNavigate} />
      </div>
      <div className="mt-auto border-t border-[#eeeeef] px-3 py-3">
        <SignOutButton onNavigate={onNavigate} />
      </div>
    </div>
  );
}

export function DashboardShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const title = getPageTitle(pathname);
  const description = getPageDescription(pathname);

  return (
    <div className="dashboard-app min-h-screen bg-white text-[#161619]" dir="ltr" lang="en">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-56 border-r border-[#e9e9eb] bg-[#f8f8f9] lg:block">
        <SidebarContent />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-64 border-[#e9e9eb] bg-[#f8f8f9] p-0" dir="ltr">
          <SheetHeader className="sr-only">
            <SheetTitle>Dashboard menu</SheetTitle>
            <SheetDescription>Dashboard navigation links</SheetDescription>
          </SheetHeader>
          <SidebarContent onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="lg:pl-56">
        <header className="sticky top-0 z-20 flex h-9 items-center border-b border-[#ededee] bg-white/95 px-4 backdrop-blur sm:px-5">
          <div className="mx-auto flex w-full max-w-screen-2xl items-center justify-between">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              className="inline-flex size-7 items-center justify-center rounded-md border border-[#e5e5e7] text-[#5f6066] transition-colors hover:bg-[#f6f6f7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 lg:hidden"
            >
              <Menu className="size-4" aria-hidden="true" />
            </button>
            <span className="hidden text-sm font-normal uppercase tracking-[0.08em] text-[#44454a] lg:block">
              besan khalaily
            </span>
            <span className="text-[11px] text-[#a0a1a6]">Atelier admin dashboard</span>
          </div>
        </header>

        <div className="mx-auto max-w-screen-2xl px-2 pb-4 pt-5 sm:px-3 sm:pt-6 lg:px-4">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-[23px] font-semibold leading-tight tracking-[-0.025em] text-[#19191c]">
                {title}
              </h1>
              <p className="mt-1 text-[11px] text-[#8b8c92]">{description}</p>
            </div>
          </div>
          <main>{children}</main>
        </div>
      </div>
      <Toaster position="top-center" richColors />
    </div>
  );
}

export type DashboardNavigationItem = (typeof dashboardNavigation)[number] & { icon: LucideIcon };

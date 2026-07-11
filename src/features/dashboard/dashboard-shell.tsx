import { Link, useLocation } from "@tanstack/react-router";
import {
  CalendarDays,
  Clock3,
  LayoutDashboard,
  Menu,
  Plus,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  dashboardIconButtonClassName,
  dashboardPrimaryButtonClassName,
  dashboardSecondaryButtonClassName,
} from "./dashboard-ui";

const dashboardNavigation = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { label: "Bookings", to: "/dashboard/bookings", icon: CalendarDays },
  { label: "Customers", to: "/dashboard/customers", icon: Users },
  { label: "Availability", to: "/dashboard/availability", icon: Clock3 },
] as const;

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/bookings": "Bookings",
  "/dashboard/customers": "Customers",
  "/dashboard/availability": "Availability",
};

const pageDescriptions: Record<string, string> = {
  "/dashboard": "A quick view of your appointments and atelier bookings",
  "/dashboard/bookings": "Manage design and workshop bookings in one place",
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
              "group flex min-h-9 items-center gap-2 rounded-md px-2.5 text-[12px] font-medium outline-none transition-all duration-200 active:translate-y-px focus-visible:ring-2 focus-visible:ring-violet-500",
              active
                ? "bg-[#f7f7f8] text-[#171719]"
                : "text-[#5f6066] hover:bg-[#fafafa] hover:text-[#171719]",
            )}
          >
            <Icon
              className={cn(
                "size-3.5 stroke-[1.8]",
                active ? "text-[#1d1d20]" : "text-[#777980] group-hover:text-[#1d1d20]",
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
      <div className="flex items-center gap-2">
        <span className="flex size-6 items-center justify-center rounded-full bg-violet-600 text-[10px] font-bold text-white">
          B
        </span>
        <div>
          <p className="text-[11px] font-semibold leading-none text-[#19191c]">Besan-Ops</p>
          <p className="mt-1 text-[9px] text-[#8a8b91]">Atelier management</p>
        </div>
      </div>
    </div>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <Brand />
      <div className="px-2.5">
        <Link
          to="/dashboard/bookings"
          search={{ new: 1 }}
          onClick={onNavigate}
          className={cn(
            dashboardPrimaryButtonClassName,
            "flex min-h-9 w-full gap-2 px-3 text-[11px]",
          )}
        >
          <Plus className="size-3.5" aria-hidden="true" />
          New appointment
        </Link>
      </div>
      <div className="mt-4 px-2.5">
        <p className="mb-1.5 px-2.5 text-[9px] font-medium text-[#999aa0]">Workspace</p>
        <DashboardNav onNavigate={onNavigate} />
      </div>
      <div className="mt-auto border-t border-[#eeeeef] px-3 py-3">
        <div className="rounded-md bg-[#fafafa] px-2.5 py-2 text-[9px] leading-4 text-[#85868c]">
          Demo version
          <br />
          Reminders are not actually sent
        </div>
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
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-56 border-r border-[#e9e9eb] bg-white lg:block">
        <SidebarContent />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-64 border-[#e9e9eb] bg-white p-0" dir="ltr">
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
              className={cn(dashboardIconButtonClassName, "size-7 lg:hidden")}
            >
              <Menu className="size-4" aria-hidden="true" />
            </button>
            <span className="hidden text-[10px] font-semibold text-[#44454a] lg:block">Besan-Ops</span>
            <span className="text-[9px] text-[#a0a1a6]">Atelier admin dashboard</span>
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
            <Link
              to="/dashboard/bookings"
              search={{ new: 1 }}
              className={cn(
                dashboardSecondaryButtonClassName,
                "min-h-9 gap-1.5 px-3 text-[11px] lg:hidden",
              )}
            >
              <Plus className="size-3.5" aria-hidden="true" />
              New appointment
            </Link>
          </div>
          <main>{children}</main>
        </div>
      </div>
      <Toaster position="top-center" richColors />
    </div>
  );
}

export type DashboardNavigationItem = (typeof dashboardNavigation)[number] & { icon: LucideIcon };

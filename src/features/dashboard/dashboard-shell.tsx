import { Link, useLocation } from "@tanstack/react-router";
import { CalendarDays, Clock3, LayoutDashboard, Menu, Plus, Users, type LucideIcon } from "lucide-react";
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

const dashboardNavigation = [
  { label: "لوحة التحكم", to: "/dashboard", icon: LayoutDashboard },
  { label: "الحجوزات", to: "/dashboard/bookings", icon: CalendarDays },
  { label: "الزبائن", to: "/dashboard/customers", icon: Users },
  { label: "المواعيد المتاحة", to: "/dashboard/availability", icon: Clock3 },
] as const;

const pageTitles: Record<string, string> = {
  "/dashboard": "لوحة التحكم",
  "/dashboard/bookings": "الحجوزات",
  "/dashboard/customers": "الزبائن",
  "/dashboard/availability": "المواعيد المتاحة",
};

function getPageTitle(pathname: string) {
  if (pathname.startsWith("/dashboard/customers/")) return "ملف الزبونة";
  return pageTitles[pathname] ?? "لوحة التحكم";
}

function DashboardNav({ onNavigate }: { onNavigate?: () => void }) {
  const { pathname } = useLocation();

  return (
    <nav aria-label="التنقل الرئيسي" className="space-y-1">
      {dashboardNavigation.map(({ label, to, icon: Icon }) => {
        const active = to === "/dashboard" ? pathname === to : pathname.startsWith(to);

        return (
          <Link
            key={to}
            to={to}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-violet-500",
              active
                ? "bg-violet-50 text-violet-700"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <div className="border-b border-slate-100 px-5 py-5">
      <p className="text-xs font-semibold tracking-[0.16em] text-slate-950" dir="ltr">
        BESAN
      </p>
      <p className="mt-1 text-xs text-slate-500">إدارة المشغل</p>
    </div>
  );
}

export function DashboardShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const title = getPageTitle(pathname);

  return (
    <div className="dashboard-app min-h-screen bg-slate-50 text-slate-950" dir="rtl" lang="ar">
      <aside className="fixed inset-y-0 right-0 z-30 hidden w-56 border-l border-slate-200 bg-white lg:block">
        <Brand />
        <div className="p-3">
          <DashboardNav />
        </div>
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="right" className="w-72 bg-white p-0" dir="rtl">
          <SheetHeader className="sr-only">
            <SheetTitle>قائمة لوحة التحكم</SheetTitle>
            <SheetDescription>روابط التنقل في لوحة التحكم</SheetDescription>
          </SheetHeader>
          <Brand />
          <div className="p-3">
            <DashboardNav onNavigate={() => setMobileOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      <div className="lg:pr-56">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-6">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
            <Link
              to="/dashboard/bookings"
              search={{ new: 1 }}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-medium text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
            >
              <Plus className="size-4" aria-hidden="true" />
              موعد جديد
            </Link>
            <div className="flex items-center gap-3">
              <h1 className="text-lg font-semibold">{title}</h1>
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                aria-label="فتح القائمة"
                className="flex size-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 outline-none transition-colors hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-violet-500 lg:hidden"
              >
                <Menu className="size-5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        <p className="mx-auto max-w-7xl px-4 pb-6 text-center text-xs text-slate-500 sm:px-6 lg:px-8">
          نسخة تجريبية — التذكيرات غير مرسلة فعليًا
        </p>
      </div>
      <Toaster position="top-center" richColors />
    </div>
  );
}

export type DashboardNavigationItem = (typeof dashboardNavigation)[number] & { icon: LucideIcon };

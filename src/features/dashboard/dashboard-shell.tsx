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

const pageDescriptions: Record<string, string> = {
  "/dashboard": "نظرة سريعة على مواعيدك وحجوزات المشغل",
  "/dashboard/bookings": "إدارة حجوزات التصميم والورشات من مكان واحد",
  "/dashboard/customers": "ملفات الزبائن ومراحل العمل والمواعيد القادمة",
  "/dashboard/availability": "تحديد الفترات المتاحة وإعدادات التذكير",
};

function getPageTitle(pathname: string) {
  if (pathname.startsWith("/dashboard/customers/")) return "ملف الزبونة";
  return pageTitles[pathname] ?? "لوحة التحكم";
}

function getPageDescription(pathname: string) {
  if (pathname.startsWith("/dashboard/customers/"))
    return "المواعيد والملاحظات ومرحلة التنفيذ الحالية";
  return pageDescriptions[pathname] ?? pageDescriptions["/dashboard"];
}

function DashboardNav({ onNavigate }: { onNavigate?: () => void }) {
  const { pathname } = useLocation();

  return (
    <nav aria-label="التنقل الرئيسي" className="space-y-0.5">
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
          <p className="text-[11px] font-semibold leading-none text-[#19191c]" dir="ltr">
            Besan-Ops
          </p>
          <p className="mt-1 text-[9px] text-[#8a8b91]">إدارة المشغل</p>
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
          className="flex min-h-9 w-full items-center justify-center gap-2 rounded-[7px] bg-[#222224] px-3 text-[11px] font-medium text-white shadow-[0_1px_2px_rgba(0,0,0,0.18)] transition-all duration-200 hover:bg-[#111113] active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
        >
          <Plus className="size-3.5" aria-hidden="true" />
          موعد جديد
        </Link>
      </div>
      <div className="mt-4 px-2.5">
        <p className="mb-1.5 px-2.5 text-[9px] font-medium text-[#999aa0]">مساحة العمل</p>
        <DashboardNav onNavigate={onNavigate} />
      </div>
      <div className="mt-auto border-t border-[#eeeeef] px-3 py-3">
        <div className="rounded-md bg-[#fafafa] px-2.5 py-2 text-[9px] leading-4 text-[#85868c]">
          نسخة تجريبية
          <br />
          التذكيرات غير مرسلة فعليًا
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
    <div className="dashboard-app min-h-screen bg-white text-[#161619]" dir="rtl" lang="ar">
      <aside className="fixed inset-y-0 right-0 z-30 hidden w-44 border-l border-[#e9e9eb] bg-white lg:block">
        <SidebarContent />
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="right" className="w-64 border-[#e9e9eb] bg-white p-0" dir="rtl">
          <SheetHeader className="sr-only">
            <SheetTitle>قائمة لوحة التحكم</SheetTitle>
            <SheetDescription>روابط التنقل في لوحة التحكم</SheetDescription>
          </SheetHeader>
          <SidebarContent onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="lg:pr-44">
        <header className="sticky top-0 z-20 flex h-9 items-center border-b border-[#ededee] bg-white/95 px-4 backdrop-blur sm:px-5">
          <div className="mx-auto flex w-full max-w-[1180px] items-center justify-between">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="فتح القائمة"
              className="flex size-7 items-center justify-center rounded-md border border-[#e5e5e7] text-[#63646a] outline-none transition-colors hover:bg-[#f7f7f8] focus-visible:ring-2 focus-visible:ring-violet-500 lg:hidden"
            >
              <Menu className="size-4" aria-hidden="true" />
            </button>
            <span className="hidden text-[10px] font-semibold text-[#44454a] lg:block" dir="ltr">
              Besan-Ops
            </span>
            <span className="text-[9px] text-[#a0a1a6]">لوحة إدارة المشغل</span>
          </div>
        </header>

        <div className="mx-auto max-w-[1180px] px-4 pb-4 pt-5 sm:px-5 sm:pt-6 lg:px-6">
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
              className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-[#dedee1] bg-white px-3 text-[11px] font-medium text-[#36373b] transition-all duration-200 hover:bg-[#fafafa] active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 lg:hidden"
            >
              <Plus className="size-3.5" aria-hidden="true" />
              موعد جديد
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

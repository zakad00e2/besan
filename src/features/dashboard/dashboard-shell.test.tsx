import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...props }: { to: string; children: ReactNode }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
  useLocation: () => ({ pathname: "/dashboard/customers" }),
}));

import { DashboardShell } from "./dashboard-shell";

afterEach(cleanup);

describe("DashboardShell", () => {
  it("renders Arabic navigation and marks the current section", () => {
    render(
      <DashboardShell>
        <p>المحتوى</p>
      </DashboardShell>,
    );

    expect(screen.getByRole("link", { name: "الزبائن" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("button", { name: "فتح القائمة" })).toBeTruthy();
    expect(screen.getByText("نسخة تجريبية — التذكيرات غير مرسلة فعليًا")).toBeTruthy();
  });
});

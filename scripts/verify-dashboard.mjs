import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const required = [
  "src/routes/dashboard.tsx",
  "src/routes/dashboard/index.tsx",
  "src/routes/dashboard/bookings.tsx",
  "src/routes/dashboard/customers/index.tsx",
  "src/routes/dashboard/customers/$id.tsx",
  "src/routes/dashboard/availability.tsx",
];

for (const file of required) {
  if (!existsSync(join(root, file))) {
    throw new Error(`Missing dashboard file: ${file}`);
  }
}

const shell = readFileSync(join(root, "src/features/dashboard/dashboard-shell.tsx"), "utf8");
for (const label of ["لوحة التحكم", "الحجوزات", "الزبائن", "المواعيد المتاحة"]) {
  if (!shell.includes(label)) {
    throw new Error(`Missing dashboard navigation label: ${label}`);
  }
}

const data = readFileSync(join(root, "src/features/dashboard/dashboard-data.ts"), "utf8");
if (/localStorage|sessionStorage/.test(data)) {
  throw new Error("Dashboard demo data must remain in React memory");
}

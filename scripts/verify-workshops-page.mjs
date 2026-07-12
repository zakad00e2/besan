import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const routePath = join(root, "src", "routes", "workshops.tsx");
const sitePath = join(root, "src", "components", "site-shell.tsx");

if (!existsSync(routePath)) {
  throw new Error("Missing /workshops route file");
}

const routeSource = readFileSync(routePath, "utf8");
const siteSource = readFileSync(sitePath, "utf8");

for (const expected of [
  'createFileRoute("/workshops")',
  "ATELIER",
  "First workshop",
  "Mini course",
  "One day",
  "WorkshopBookingDialog",
  "workshopOptions",
  "[patternFoundation, miniCourse, corsetWorkshop] = workshopOptions",
]) {
  if (!routeSource.includes(expected)) {
    throw new Error(`Workshops page is missing expected content: ${expected}`);
  }
}

const bookingActionCount = routeSource.match(/<BookingButton\b/g)?.length ?? 0;
if (bookingActionCount !== 6) {
  throw new Error(`Expected 6 responsive workshop booking actions, found ${bookingActionCount}`);
}

if (/[\u0600-\u06ff]/.test(routeSource)) {
  throw new Error("Workshops page should be English-only and must not include Arabic text");
}

if (!siteSource.includes('href="/workshops"')) {
  throw new Error("Site navigation does not link to /workshops");
}

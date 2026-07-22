// @vitest-environment node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import viteConfig from "../../vite.config";

const packageLock = JSON.parse(
  readFileSync(resolve(process.cwd(), "package-lock.json"), "utf8"),
) as { packages: Record<string, { version?: string }> };

const effectiveViteConfig = await viteConfig({
  command: "serve",
  mode: "test",
  isSsrBuild: false,
  isPreview: false,
});

function expectStableVersionAtLeast(version: string, minimum: [number, number, number]) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);

  expect(match, `${version} must be a stable semantic version`).not.toBeNull();

  const installed = match!.slice(1).map(Number);
  const comparison = installed.findIndex((part, index) => part !== minimum[index]);

  if (comparison === -1) return;

  expect(installed[comparison]).toBeGreaterThan(minimum[comparison]);
}

describe("Vite dependency optimization", () => {
  it("keeps TanStack Query out of the prebundle that can leave the client unhydrated", () => {
    expect(effectiveViteConfig.optimizeDeps?.noDiscovery).toBe(true);
    expect(effectiveViteConfig.optimizeDeps?.include).toEqual(
      expect.arrayContaining([
        "react",
        "react-dom/client",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "prop-types",
        "recharts",
      ]),
    );
    expect(effectiveViteConfig.optimizeDeps?.exclude).toEqual(["@tanstack/react-query"]);
  });

  it("uses a Vite release with the optimizer initialization fix", () => {
    const installedVersion = packageLock.packages["node_modules/vite"]?.version ?? "0.0.0";

    expectStableVersionAtLeast(installedVersion, [8, 1, 4]);
  });
});

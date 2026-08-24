import { defineConfig, devices } from "@playwright/test";

/* Production mode: serve the prior `pnpm build` instead of the dev
 * server. CI always runs this way; locally, E2E_PROD=1 opts in. The
 * bounded-route specs demand it — `next dev` enforces neither
 * generateStaticParams nor dynamicParams, so a dev-server run proves
 * nothing about what actually ships. */
const prod = !!process.env.CI || !!process.env.E2E_PROD;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "html",
  use: {
    baseURL: "http://localhost:3100",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    // Playwright ships no WebKit build for macOS 12 (this machine), so
    // WebKit coverage lives in CI, where the build exists and is current.
    ...(process.env.CI
      ? [{ name: "webkit", use: { ...devices["Desktop Safari"] } }]
      : []),
  ],
  // E2E owns port 3100 so it never touches 3000, where Sauel's own
  // dev server lives; a leftover 3100 server is reused locally.
  webServer: {
    command: prod ? "pnpm start --port 3100" : "pnpm dev --port 3100",
    url: "http://localhost:3100",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});

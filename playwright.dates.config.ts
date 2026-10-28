import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e-dates",
  testMatch: "date-selector.spec.ts",
  workers: 1,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4330",
    locale: "es-CL",
    // El selector debe seguir Chile incluso si el dispositivo usa otra zona.
    timezoneId: "Asia/Tokyo",
    browserName: "chromium",
    channel: process.platform === "win32" ? "chrome" : undefined,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 1000 } } },
    {
      name: "mobile",
      use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
    },
  ],
  webServer: {
    command:
      "corepack pnpm@12.4.2 exec astro preview --config astro.public-test.config.mjs --host 127.0.0.1 --port 4330",
    url: "http://127.0.0.1:4330",
    reuseExistingServer: false,
    timeout: 60_000,
  },
});

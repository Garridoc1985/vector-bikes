import { defineConfig } from "@playwright/test";
import {
  E2E_BASE_URL,
  E2E_CANCEL_TOKEN_SECRET,
  E2E_DATABASE_URL,
  E2E_PORT,
  E2E_STORAGE_DIR,
  E2E_TASKS_SECRET,
} from "./e2e/fixtures.ts";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/public-*.spec.ts",
  globalSetup: "./e2e/public-global-setup.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  timeout: 60_000,
  use: {
    baseURL: E2E_BASE_URL,
    locale: "es-CL",
    timezoneId: "America/Santiago",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: {
        browserName: "chromium",
        viewport: { width: 1440, height: 1000 },
        deviceScaleFactor: 1,
      },
    },
    {
      name: "mobile",
      use: {
        browserName: "chromium",
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: {
    command: "node --env-file-if-exists=.env dist/server/entry.mjs",
    url: `${E2E_BASE_URL}/robots.txt`,
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      HOST: "127.0.0.1",
      PORT: String(E2E_PORT),
      DATABASE_URL: E2E_DATABASE_URL,
      PUBLIC_SITE_URL: E2E_BASE_URL,
      SESSION_SECRET: "e2e-session-secret-0123456789abcdef012",
      CANCEL_TOKEN_SECRET: E2E_CANCEL_TOKEN_SECRET,
      TURNSTILE_SECRET_KEY: "e2e-turnstile-secret",
      TASKS_SECRET: E2E_TASKS_SECRET,
      EMAIL_TRANSPORT: "console",
      EMAIL_FROM: "Vector Bikes <reservas@e2e.vectorbikes.cl>",
      EMAIL_REPLY_TO: "reply@e2e.vectorbikes.cl",
      SHOP_NOTIFY_EMAIL: "notify@e2e.vectorbikes.cl",
      STORAGE_DRIVER: "local",
      STORAGE_LOCAL_DIR: E2E_STORAGE_DIR,
      WHATSAPP_ENABLED: "false",
      NODE_OPTIONS: "--import=./e2e/turnstile-mock.mjs",
    },
  },
});

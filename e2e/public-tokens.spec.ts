import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";
import type { Page, Request } from "@playwright/test";
import { PUBLIC_TEST_TOKENS, SEED } from "./fixtures.ts";

type Diagnostics = {
  consoleErrors: string[];
  pageErrors: string[];
  failedRequests: Array<{
    method: string;
    url: string;
    resourceType: string;
    category: "same-origin" | "third-party";
    error: string;
  }>;
};

const evidenceDir = resolve("generated-artifacts/playwright-evidence");
const diagnosticsByPage = new WeakMap<Page, Diagnostics>();

function redact(value: string): string {
  return value
    .replace(/(\/(?:aprobacion|informe)\/)[A-Za-z0-9_-]{32,128}(?=[/?#\s]|$)/g, "$1[redacted]")
    .replace(/([?&]token=)[^&#\s]+/gi, "$1[redacted]")
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[email redacted]")
    .replace(/\+?56\s?9[0-9\s-]{8,}/g, "[phone redacted]");
}

function safeRequestUrl(request: Request): string {
  const url = new URL(request.url());
  const path = url.pathname.replace(/^\/(aprobacion|informe)\/[^/]+$/, "/$1/[redacted]");
  return `${url.origin}${path}`;
}

test.use({ trace: "off", screenshot: "off", video: "off" });

test.beforeEach(async ({ page }) => {
  const observed: Diagnostics = { consoleErrors: [], pageErrors: [], failedRequests: [] };
  diagnosticsByPage.set(page, observed);
  page.on("console", (message) => {
    if (message.type() === "error") observed.consoleErrors.push(redact(message.text()));
  });
  page.on("pageerror", (error) => observed.pageErrors.push(redact(error.message)));
  page.on("requestfailed", (request) => {
    const requestOrigin = new URL(request.url()).origin;
    observed.failedRequests.push({
      method: request.method(),
      url: safeRequestUrl(request),
      resourceType: request.resourceType(),
      category:
        requestOrigin === new URL(page.url() || "http://127.0.0.1").origin
          ? "same-origin"
          : "third-party",
      error: request.failure()?.errorText ?? "unknown",
    });
  });
});

test.afterEach(async ({ page }, testInfo) => {
  const observed = diagnosticsByPage.get(page);
  if (!observed) return;
  const report = JSON.stringify(observed, null, 2);
  await testInfo.attach("browser-console-and-network.json", {
    body: Buffer.from(report),
    contentType: "application/json",
  });
  console.info(
    `BROWSER_DIAGNOSTICS ${testInfo.project.name} ${testInfo.title}: ${report.replaceAll("\n", " ")}`,
  );
});

test("los tokens válidos abren los flujos públicos y los inválidos no", async ({
  page,
}, testInfo) => {
  mkdirSync(evidenceDir, { recursive: true });

  const approval = await page.goto(`/aprobacion/${PUBLIC_TEST_TOKENS.approval}`);
  expect(approval?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: /Hola Cliente/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Aprobar" })).toBeVisible();
  await page.locator("aside.ticket").screenshot({
    path: resolve(evidenceDir, `aprobacion-token-valido-${testInfo.project.name}.png`),
  });

  const invalidApproval = await page.goto("/aprobacion/invalid");
  expect(invalidApproval?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Enlace no válido" })).toBeVisible();

  const report = await page.goto(`/informe/${PUBLIC_TEST_TOKENS.report}`);
  expect(report?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: "Informe de servicio" })).toBeVisible();
  await expect(page.locator("main")).toContainText("Revisar frenos antes de cada salida.");
  await page.locator("section.section").screenshot({
    path: resolve(evidenceDir, `informe-token-valido-${testInfo.project.name}.png`),
  });

  const invalidReport = await page.goto("/informe/invalid");
  expect(invalidReport?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Enlace no válido" })).toBeVisible();

  const cancelToken =
    testInfo.project.name === "desktop"
      ? PUBLIC_TEST_TOKENS.cancelDesktop
      : PUBLIC_TEST_TOKENS.cancelMobile;
  const cancellation = await page.goto(
    `/reservas/cancelar?token=${encodeURIComponent(cancelToken)}`,
  );
  expect(cancellation?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: "¿Cancelar tu reserva?" })).toBeVisible();
  await page.getByRole("button", { name: "Cancelar mi reserva" }).click();
  await expect(page.getByRole("heading", { name: "Reserva cancelada" })).toBeVisible();
  await page.locator("aside.ticket").screenshot({
    path: resolve(evidenceDir, `cancelacion-token-valido-${testInfo.project.name}.png`),
  });

  const invalidCancellation = await page.goto("/reservas/cancelar?token=invalid");
  expect(invalidCancellation?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Enlace no válido" })).toBeVisible();

  await page.goto("/taller/catalogo");
  await expect(page).toHaveURL(/\/admin\/login\?next=%2Ftaller%2Fcatalogo$/);
  await expect(page.getByLabel("Correo")).toBeVisible();
  await page.goto(`/taller/catalogo/${SEED.serviceMantencionId}`);
  await expect(page).toHaveURL(
    new RegExp(`/admin/login\\?next=%2Ftaller%2Fcatalogo%2F${SEED.serviceMantencionId}$`),
  );
});

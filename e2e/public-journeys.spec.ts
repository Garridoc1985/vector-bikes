import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";
import type { Page, Request } from "@playwright/test";

type BrowserDiagnostics = {
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

const diagnostics = new WeakMap<Page, BrowserDiagnostics>();
const evidenceDir = resolve("generated-artifacts/playwright-evidence");

function requestUrl(request: Request): string {
  const url = new URL(request.url());
  const path = url.pathname.replace(/^\/(aprobacion|informe)\/[^/]+$/, "/$1/[redacted]");
  return redactSensitive(`${url.origin}${path}`);
}

function redactSensitive(value: string): string {
  return value
    .replace(/(\/(?:aprobacion|informe)\/)[A-Za-z0-9_-]{32,128}(?=[/?#\s]|$)/g, "$1[redacted]")
    .replace(/([?&]token=)[^&#\s]+/gi, "$1[redacted]")
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[email redacted]")
    .replace(/\+?56\s?9[0-9\s-]{8,}/g, "[phone redacted]");
}

test.beforeEach(async ({ page }) => {
  const observed: BrowserDiagnostics = {
    consoleErrors: [],
    pageErrors: [],
    failedRequests: [],
  };
  diagnostics.set(page, observed);

  await page.addInitScript(() => {
    const w = window as typeof window & {
      turnstile?: {
        render: (element: HTMLElement, options: { callback: (token: string) => void }) => string;
        reset: () => void;
        getResponse: () => string;
        remove: () => void;
      };
    };
    w.turnstile = {
      render: (_element, options) => {
        options.callback("e2e-turnstile-ok");
        return "e2e-widget";
      },
      reset: () => undefined,
      getResponse: () => "e2e-turnstile-ok",
      remove: () => undefined,
    };
  });
  await page.route("https://challenges.cloudflare.com/**", (route) =>
    route.fulfill({ status: 200, contentType: "application/javascript", body: "" }),
  );

  page.on("console", (message) => {
    if (message.type() === "error") observed.consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => observed.pageErrors.push(error.message));
  page.on("requestfailed", (request) => {
    const url = new URL(request.url());
    observed.failedRequests.push({
      method: request.method(),
      url: requestUrl(request),
      resourceType: request.resourceType(),
      category:
        url.origin === new URL(page.url() || "http://127.0.0.1").origin
          ? "same-origin"
          : "third-party",
      error: request.failure()?.errorText ?? "unknown",
    });
  });
});

test.afterEach(async ({ page }, testInfo) => {
  const observed = diagnostics.get(page);
  if (!observed) return;
  const report = JSON.stringify(
    {
      ...observed,
      consoleErrors: observed.consoleErrors.map(redactSensitive),
      pageErrors: observed.pageErrors.map(redactSensitive),
    },
    null,
    2,
  );
  await testInfo.attach("browser-console-and-network.json", {
    body: Buffer.from(report),
    contentType: "application/json",
  });
  console.info(
    `BROWSER_DIAGNOSTICS ${testInfo.project.name} ${testInfo.title}: ${report.replaceAll("\n", " ")}`,
  );
});

test("la landing permite llegar a reservas y contactos públicos", async ({ page }, testInfo) => {
  mkdirSync(evidenceDir, { recursive: true });
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Mecánica de precisión." })).toBeVisible();
  await expect(page.getByText("14 días corridos desde hoy", { exact: false })).toBeVisible();
  await expect(page.locator("a.wa")).toHaveCount(0);
  await page.screenshot({
    path: resolve(evidenceDir, `landing-${testInfo.project.name}.png`),
  });

  const workshopNav = page.getByRole("link", { name: "Taller", exact: true });
  if (await workshopNav.isVisible()) {
    await workshopNav.click();
    await expect(page).toHaveURL(/#taller$/);
  } else {
    await page.locator("#taller").scrollIntoViewIfNeeded();
  }
  await expect(page.locator("#taller")).toBeInViewport();
  await expect(page.getByText("Avenida Kennedy 7666", { exact: false })).toBeVisible();
  await expect(page.getByRole("table")).toContainText("Lunes a viernes");
  await expect(page.getByRole("table")).toContainText("15:00 – 20:00");
  await expect(page.getByRole("table")).toContainText("10:00 – 14:00");
  await expect(page.getByRole("table")).toContainText("Domingo y feriados");

  await expect(page.locator('a[href^="tel:"]')).toHaveAttribute("href", "tel:+56985095780");
  await expect(page.locator('a[href="mailto:info@vectorbikes.cl"]').first()).toBeVisible();
  await expect(page.locator('a[href^="https://www.google.com/maps/"]').first()).toBeVisible();
  await expect(page.locator('a[href="https://instagram.com/vector.bikes"]')).toBeVisible();

  await page.locator('.hero a[href="#retiro"]').click();
  await expect(page).toHaveURL(/#retiro$/);
  const pickup = page.locator("#retiro");
  await expect(pickup).toContainText("Vitacura y Las Condes");
  await expect(pickup).toContainText("$15.000");
  await expect(pickup).toContainText("Ocupa 1 hora de agenda (2 bloques)");
  await expect(pickup).toContainText("Al devolverla");

  const bookingResponse = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return url.pathname === "/api/disponibilidad" && response.status() === 200;
  });
  await page.locator(".hero").getByRole("link", { name: "Reservar hora" }).click();
  await expect(page).toHaveURL(/#reservar$/);
  const availability = await bookingResponse;
  expect(new URL(availability.url()).searchParams.get("dias")).toBe("14");
  expect((await availability.json()).days).toHaveLength(14);
  await expect(page.getByRole("button", { name: "La dejo en el taller" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Retiro y devolución" }).first()).toBeVisible();
  await expect(
    page.getByText("retiro a domicilio parte a las 09:00 de lunes a viernes", { exact: false }),
  ).toBeVisible();

  const currentUrl = new URL(page.url());
  expect(
    await page.request.get(new URL("/servicios", currentUrl).toString()).then((r) => r.status()),
  ).toBe(404);
  expect(
    await page.request.get(new URL("/contacto", currentUrl).toString()).then((r) => r.status()),
  ).toBe(404);
});

test("el selector completa una reserva de retiro y valida el formulario", async ({
  page,
}, testInfo) => {
  mkdirSync(evidenceDir, { recursive: true });
  await page.goto("/");
  const firstAvailability = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/disponibilidad" && response.status() === 200,
  );
  await page.locator(".hero").getByRole("link", { name: "Reservar hora" }).click();
  const firstResponse = await firstAvailability;
  expect(new URL(firstResponse.url()).searchParams.get("dias")).toBe("14");
  await expect(page.locator("button.day")).toHaveCount(14);

  await expect(page.locator("#mode-taller")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#f-comuna")).toBeHidden();
  await expect(page.locator("#f-dir")).toBeHidden();
  await expect(page.locator(".ticket-total")).toContainText("$0");

  const pickupAvailability = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return (
      url.pathname === "/api/disponibilidad" &&
      url.searchParams.get("modo") === "retiro" &&
      response.status() === 200
    );
  });
  await page.locator("#mode-retiro").click();
  await pickupAvailability;
  await expect(page.locator("#mode-retiro")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#f-comuna")).toBeVisible();
  await expect(page.locator("#f-dir")).toBeVisible();
  await expect(page.locator(".ticket-total")).toContainText("$15.000");

  const nextOpenDay = page
    .locator("button.day:not(:disabled)")
    .filter({ hasNotText: "Hoy" })
    .first();
  await expect(nextOpenDay).toBeVisible();
  await nextOpenDay.click();
  const firstFreeSlot = page
    .locator('[aria-label="Bloques del día"] button.slot[aria-disabled="false"]')
    .first();
  await expect(firstFreeSlot).toBeVisible();
  await firstFreeSlot.click();
  await expect(page.locator(".slot.sel")).toContainText("–");
  await expect(page.locator(".ticket")).toContainText("Retiro y devolución");

  await page.locator('select[name="comuna"]').selectOption("Las Condes");
  await page.locator('input[name="direccion"]').fill("Avenida Apoquindo 100");
  await page.getByRole("button", { name: "Confirmar reserva" }).click();
  await expect(page.getByText("Escribe tu nombre.", { exact: true })).toBeVisible();

  await page.locator('input[name="nombre"]').fill("Reserva E2E pública");
  await page
    .locator('input[name="telefono"]')
    .fill(testInfo.project.name === "desktop" ? "55550101" : "55550102");
  await page
    .locator('input[name="correo"]')
    .fill(`publica-${testInfo.project.name}@e2e.vectorbikes.cl`);
  await page.locator('input[name="bicicleta"]').fill("Trek Marlin 7, MTB");
  await page.locator('textarea[name="descripcion"]').fill("Ajustar freno y revisar cambios");
  await page.locator("#f-ok").check();
  await expect(page.locator("#f-whatsapp")).not.toBeChecked();

  const created = page.waitForResponse(
    (response) => new URL(response.url()).pathname === "/api/reservas" && response.status() === 201,
  );
  await page.getByRole("button", { name: "Confirmar reserva" }).click();
  const createdResponse = await created;
  const result = await createdResponse.json();

  await expect(page.getByText("Reserva confirmada", { exact: true })).toBeVisible();
  await expect(page.locator(".done")).toContainText(result.code);
  expect(result.mode).toBe("retiro");
  expect(result.fee).toBe(15000);
  await page.locator(".done").screenshot({
    path: resolve(evidenceDir, `reserva-confirmada-${testInfo.project.name}.png`),
    mask: [page.locator(".done p")],
    maskColor: "#fff",
  });
});

test("selecciona la segunda semana del rango de 14 y respeta el máximo de API de 31", async ({
  page,
}, testInfo) => {
  mkdirSync(evidenceDir, { recursive: true });
  await page.goto("/");
  const firstAvailability = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/api/disponibilidad" && response.status() === 200,
  );
  await page.locator(".hero").getByRole("link", { name: "Reservar hora" }).click();
  const availabilityResponse = await firstAvailability;
  const availability = (await availabilityResponse.json()) as {
    days: Array<{
      date: string;
      status: string;
      blocks: Array<{ start: string; state: string }>;
    }>;
  };
  expect(availability.days).toHaveLength(14);

  const from = new URL(availabilityResponse.url()).searchParams.get("desde");
  if (!from) throw new Error("La disponibilidad no indicó la fecha inicial.");
  const limits = await Promise.all(
    [31, 32].map(async (days) => {
      const url = new URL("/api/disponibilidad", page.url());
      url.searchParams.set("desde", from);
      url.searchParams.set("dias", String(days));
      url.searchParams.set("modo", "taller");
      const response = await page.request.get(url.toString());
      const body = response.ok() ? await response.json() : null;
      return { status: response.status(), count: body?.days?.length ?? null };
    }),
  );
  expect(limits).toEqual([
    { status: 200, count: 31 },
    { status: 422, count: null },
  ]);

  const laterDay = availability.days.slice(7).find((day) => day.status === "open");
  expect(laterDay).toBeDefined();
  if (!laterDay) throw new Error("No hay un día abierto en la segunda semana de la base E2E.");

  const dayButton = page.locator(`button.day[data-date="${laterDay.date}"]`);
  await expect(dayButton).toBeVisible();
  await dayButton.click();
  await expect(dayButton).toHaveAttribute("aria-pressed", "true");

  const firstFreeBlock = laterDay.blocks.find((block) => block.state === "free");
  expect(firstFreeBlock).toBeDefined();
  if (!firstFreeBlock)
    throw new Error("El día elegido de la segunda semana no tiene bloques libres.");
  const slot = page.getByRole("button", { name: firstFreeBlock.start, exact: true });
  await expect(slot).toBeVisible();
  await slot.click();
  await expect(slot).toHaveAttribute("aria-pressed", "true");

  await page.locator('input[name="nombre"]').fill("Reserva E2E segunda semana");
  await page
    .locator('input[name="telefono"]')
    .fill(testInfo.project.name === "desktop" ? "55550301" : "55550302");
  await page
    .locator('input[name="correo"]')
    .fill(`rango-${testInfo.project.name}@e2e.vectorbikes.cl`);
  await page.locator('input[name="bicicleta"]').fill("Specialized Rockhopper, MTB");
  await page.locator('textarea[name="descripcion"]').fill("Revisión general de prueba sintética");
  await page.locator("#f-ok").check();

  const created = page.waitForResponse(
    (response) => new URL(response.url()).pathname === "/api/reservas" && response.status() === 201,
  );
  await page.getByRole("button", { name: "Confirmar reserva" }).click();
  const createdResponse = await created;
  const requestBody = JSON.parse(createdResponse.request().postData() ?? "{}") as {
    service_date?: string;
    mode?: string;
  };
  expect(requestBody.service_date).toBe(laterDay.date);
  expect(requestBody.mode).toBe("taller");

  const result = await createdResponse.json();
  await expect(page.getByText("Reserva confirmada", { exact: true })).toBeVisible();
  await expect(page.locator(".done")).toContainText(result.code);
  expect(result.mode).toBe("taller");
  expect(result.fee).toBe(0);
  await page.locator(".done").screenshot({
    path: resolve(evidenceDir, `reserva-segunda-semana-${testInfo.project.name}.png`),
    mask: [page.locator(".done p")],
    maskColor: "#fff",
  });
});

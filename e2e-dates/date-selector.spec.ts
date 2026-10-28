import { expect, test } from "@playwright/test";

const selectorId = "public-date-selector";

test("muestra 14 fechas corridas de Chile en un dispositivo de otra zona", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-10-28T02:59:50Z") });
  await page.goto("/#prueba-fechas");
  const selector = page.getByTestId(selectorId);
  const dates = selector.locator("button[data-date]");
  await expect(dates).toHaveCount(14);
  await expect(dates.first()).toHaveAttribute("data-date", "2026-10-27");
  await expect(dates.last()).toHaveAttribute("data-date", "2026-11-09");
  await dates.last().click();
  await expect(dates.last()).toHaveAttribute("aria-pressed", "true");
  await expect(selector.locator("[data-selected-date]")).toHaveAttribute(
    "data-selected-date",
    "2026-11-09",
  );
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(overflow).toBe(false);
});

test("renueva el rango y limpia una selección vencida al pasar medianoche", async ({
  page,
}, info) => {
  await page.clock.install({ time: new Date("2026-10-28T02:59:50Z") });
  await page.goto("/#prueba-fechas");
  const selector = page.getByTestId(selectorId);
  const dates = selector.locator("button[data-date]");
  await expect(dates).toHaveCount(14);
  await dates.first().click();
  await expect(dates.first()).toHaveAttribute("aria-pressed", "true");
  await page.clock.runFor(40_000);
  await expect(dates).toHaveCount(14);
  await expect(dates.first()).toHaveAttribute("data-date", "2026-10-28");
  await expect(dates.last()).toHaveAttribute("data-date", "2026-11-10");
  await expect(selector.locator('[data-date="2026-10-27"]')).toHaveCount(0);
  await expect(selector.locator('[aria-pressed="true"]')).toHaveCount(0);
  await dates.last().click();
  await expect(dates.last()).toHaveAttribute("aria-pressed", "true");
  await selector.screenshot({ path: info.outputPath("selector-medianoche.png") });
});

test("se pone al día al recuperar foco tras varios días suspendida", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-10-28T15:00:00Z") });
  await page.goto("/#prueba-fechas");
  const selector = page.getByTestId(selectorId);
  const dates = selector.locator("button[data-date]");
  await expect(dates.first()).toHaveAttribute("data-date", "2026-10-28");
  await dates.nth(10).click();
  await page.clock.setSystemTime(new Date("2026-10-30T15:00:00Z"));
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(dates).toHaveCount(14);
  await expect(dates.first()).toHaveAttribute("data-date", "2026-10-30");
  await expect(dates.last()).toHaveAttribute("data-date", "2026-11-12");
  await expect(selector.locator('[data-date="2026-11-07"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("mantiene 14 fechas consecutivas al cambiar el horario de Chile", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-09-06T03:59:50Z") });
  await page.goto("/#prueba-fechas");
  const dates = page.getByTestId(selectorId).locator("button[data-date]");
  await expect(dates.first()).toHaveAttribute("data-date", "2026-09-05");
  await page.clock.runFor(40_000);
  await expect(dates).toHaveCount(14);
  await expect(dates.first()).toHaveAttribute("data-date", "2026-09-06");
  await expect(dates.last()).toHaveAttribute("data-date", "2026-09-19");
  const values = await dates.evaluateAll((buttons) =>
    buttons.map((b) => b.getAttribute("data-date")),
  );
  expect(new Set(values).size).toBe(14);
  for (let i = 1; i < values.length; i++) {
    expect(Date.parse(`${values[i]}T12:00:00Z`) - Date.parse(`${values[i - 1]}T12:00:00Z`)).toBe(
      86_400_000,
    );
  }
});

test("incluye sábados, domingos y feriados con su condición visible", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-10-28T15:00:00Z") });
  await page.goto("/#prueba-fechas");
  const selector = page.getByTestId(selectorId);
  const holiday = selector.locator('[data-date="2026-10-31"]');
  const sunday = selector.locator('[data-date="2026-11-01"]');
  const saturday = selector.locator('[data-date="2026-11-07"]');
  await expect(holiday).toBeVisible();
  await expect(holiday).toBeDisabled();
  await expect(holiday).toContainText(/feriado/i);
  await expect(sunday).toBeVisible();
  await expect(sunday).toBeDisabled();
  await expect(sunday).toContainText(/domingo/i);
  await expect(saturday).toBeVisible();
  await expect(saturday).toBeEnabled();
  await saturday.click();
  await expect(saturday).toHaveAttribute("aria-pressed", "true");
});

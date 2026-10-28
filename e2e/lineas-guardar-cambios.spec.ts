import { expect, test } from "@playwright/test";
import { SEED, login } from "./fixtures.ts";

test("Agregar repuesto guarda antes los dos precios editados y el total cambia", async ({
  page,
}) => {
  await login(page, "owner");
  await page.goto("/taller/recepcion/nueva?q=Cliente Taller");
  await page.getByRole("link", { name: "Cliente Taller E2E", exact: true }).tap();
  await page
    .getByRole("group", { name: "Bicicleta", exact: true })
    .getByRole("radio", { name: /Specialized Rockhopper/ })
    .tap();
  await page.getByLabel("Servicio solicitado", { exact: true }).fill("Revisión general");
  await page.getByRole("button", { name: "Crear orden", exact: true }).tap();
  await expect(page).toHaveURL(/\/taller\/ordenes\/[0-9a-f-]{36}\/recepcion$/);
  const orderId = /\/ordenes\/([0-9a-f-]{36})\//.exec(page.url())?.[1] ?? "";

  // Dos líneas: un servicio del catálogo (35.000) y un repuesto (8.000).
  await page.goto(`/taller/ordenes/${orderId}/lineas`);
  await page.getByLabel("Servicio del catálogo").selectOption(SEED.serviceMantencionId);
  await page.getByRole("button", { name: "Agregar servicio", exact: true }).tap();
  await expect(page).toHaveURL(/\/lineas\?hecho=catalog/);
  await page.getByLabel("Descripción", { exact: true }).fill("Cámara 29");
  await page.getByLabel("Precio unitario (CLP)").fill("8000");
  await page.getByRole("button", { name: "Agregar repuesto", exact: true }).tap();
  await expect(page).toHaveURL(/\/lineas\?hecho=part/);
  await expect(page.getByText("Total para el cliente")).toContainText("43.000");

  // Se editan los dos precios y, sin guardarlos, se agrega otro repuesto.
  await page.getByLabel("Nuevo precio de Mantención general").fill("30000");
  await page.getByLabel("Nuevo precio de Cámara 29").fill("9000");
  await page.getByLabel("Descripción", { exact: true }).fill("Pastillas de freno");
  await page.getByLabel("Precio unitario (CLP)").fill("15000");
  await page.getByRole("button", { name: "Agregar repuesto", exact: true }).tap();

  await expect(page).toHaveURL(/\/lineas\?hecho=part&actualizados=2$/);
  await expect(page.getByRole("status")).toContainText(
    "Repuesto agregado. Precios actualizados: 2.",
  );
  await expect(page.getByLabel("Nuevo precio de Mantención general")).toHaveValue("30000");
  await expect(page.getByLabel("Nuevo precio de Cámara 29")).toHaveValue("9000");
  await expect(page.getByLabel("Nuevo precio de Pastillas de freno")).toHaveValue("15000");
  await expect(page.getByText("Total para el cliente")).toContainText("54.000");
});

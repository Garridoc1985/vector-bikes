import { expect, test } from "@playwright/test";
import { login, SEED } from "./fixtures.ts";

/**
 * La cámara la simula Chromium con los flags de `playwright.config.ts`: entrega un video de prueba
 * y acepta el permiso sin diálogo.
 */
test("saca tres fotos seguidas sin salir de la página y las sube juntas", async ({ page }) => {
  test.setTimeout(180_000);
  // Guarda las pistas que entrega la cámara para poder comprobar después que se detuvieron.
  await page.addInitScript(() => {
    const real = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    const guardadas: MediaStreamTrack[] = [];
    (window as unknown as { __tracks: MediaStreamTrack[] }).__tracks = guardadas;
    navigator.mediaDevices.getUserMedia = async (constraints) => {
      const stream = await real(constraints);
      guardadas.push(...stream.getTracks());
      return stream;
    };
  });
  await login(page, "owner");
  await page.goto(`/taller/ordenes/${SEED.orderControlId}/galeria`);

  await page.getByRole("button", { name: "Abrir cámara", exact: true }).first().tap();
  const sacar = page.getByRole("button", { name: "Sacar foto", exact: true });
  await expect(sacar).toBeVisible();
  // El objetivo táctil del botón que más se usa.
  const caja = await sacar.boundingBox();
  expect(Math.round(caja?.height ?? 0)).toBeGreaterThanOrEqual(72);

  for (let i = 0; i < 3; i += 1) await sacar.tap();
  await expect(page.getByText("3 de 20", { exact: false }).first()).toBeVisible();

  await page.getByRole("button", { name: "Listo", exact: true }).tap();
  await expect(sacar).toBeHidden();

  // La cámara queda apagada de verdad: las pistas que entregó el navegador quedan en "ended".
  const estados = await page.evaluate(() =>
    (window as unknown as { __tracks?: MediaStreamTrack[] }).__tracks?.map(
      (track) => track.readyState,
    ),
  );
  expect(estados?.length).toBeGreaterThan(0);
  expect(estados?.every((estado) => estado === "ended")).toBe(true);

  const subir = page.getByRole("button", { name: /^Subir 3 fotos$/ });
  await expect(subir).toBeVisible();
});

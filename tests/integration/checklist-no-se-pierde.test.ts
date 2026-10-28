import { randomUUID } from "node:crypto";
import { getContainerRenderer } from "@astrojs/preact/container-renderer";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { loadRenderers } from "astro:container";
import { and, eq } from "drizzle-orm";
import { beforeEach, expect, it, vi } from "vitest";
import type { SessionUser } from "../../src/server/auth/admin-auth.ts";
import type { AppDb } from "../../src/server/db/client.ts";
import { intakeChecks, workOrders } from "../../src/server/db/schema-orders.ts";
import { bikes, customers, servicePrices, services } from "../../src/server/db/schema-taller.ts";
import { branches, users } from "../../src/server/db/schema.ts";
import { type TestDb, createTestDb } from "../helpers/pglite.ts";

const holder = vi.hoisted(() => ({ db: null as AppDb | null, actor: null as SessionUser | null }));
vi.mock("../../src/server/db/client.ts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../src/server/db/client.ts")>()),
  getDb: () => {
    if (!holder.db) throw new Error("Base de prueba no inicializada");
    return holder.db;
  },
}));
vi.mock("../../src/server/auth/admin-auth.ts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../src/server/auth/admin-auth.ts")>()),
  requireAdmin: async () => holder.actor,
}));
const { default: Recepcion } = await import("../../src/pages/taller/ordenes/[id]/recepcion.astro");
const { default: Cierre } = await import("../../src/pages/taller/ordenes/[id]/cierre.astro");

const SITE = "https://vectorbikes.cl";
const NOW = new Date("2026-10-23T15:00:00.000Z");

let test: TestDb;
let db: AppDb;
let owner: SessionUser;
let orderId: string;
let serviceId: string;

/** Lo mínimo que el formulario manda siempre: el servicio solicitado viaja en todos los envíos. */
function base(extra: Record<string, string> = {}): Record<string, string> {
  return { servicio_solicitado: "Mantención general", observaciones: "", ...extra };
}

async function render(data?: Record<string, string>, search = "") {
  const request = new Request(`${SITE}/taller/ordenes/${orderId}/recepcion${search}`, {
    method: data ? "POST" : "GET",
    headers: data ? { origin: SITE, "content-type": "application/x-www-form-urlencoded" } : {},
    body: data ? new URLSearchParams(data) : undefined,
  });
  const container = await AstroContainer.create({ astroConfig: { site: SITE } });
  return container.renderToResponse(Recepcion, { request, params: { id: orderId } });
}

async function renderCierre() {
  // `cierre.astro` lleva islas: sin el renderer de Preact, el contenedor no sabe pintar un `.tsx`.
  const container = await AstroContainer.create({
    astroConfig: { site: SITE },
    renderers: await loadRenderers([getContainerRenderer()]),
  });
  const response = await container.renderToResponse(Cierre, {
    request: new Request(`${SITE}/taller/ordenes/${orderId}/cierre`),
    params: { id: orderId },
  });
  return response.text();
}

async function guardados(): Promise<string[]> {
  const rows = await db
    .select({ itemKey: intakeChecks.itemKey })
    .from(intakeChecks)
    .where(and(eq(intakeChecks.workOrderId, orderId), eq(intakeChecks.branchId, owner.branchId)));
  return rows.map((row) => row.itemKey).sort();
}

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"], now: NOW });
  test = await createTestDb();
  db = test.db;
  holder.db = db;
  const [branch] = await db.insert(branches).values({ name: "Vitacura" }).returning();
  if (!branch) throw new Error("Falta la sucursal.");
  const [user] = await db
    .insert(users)
    .values({
      branchId: branch.id,
      role: "owner",
      name: "Dueña",
      email: `${randomUUID()}@ejemplo.cl`,
      passwordHash: "hash-de-prueba",
    })
    .returning();
  if (!user) throw new Error("Falta el usuario.");
  owner = { id: user.id, branchId: branch.id, role: "owner", name: user.name, email: user.email };
  holder.actor = owner;
  const [customer] = await db
    .insert(customers)
    .values({ branchId: branch.id, name: "Patricia Cruzat", phoneE164: "+56911112222" })
    .returning();
  const [bike] = await db
    .insert(bikes)
    .values({
      branchId: branch.id,
      customerId: customer?.id ?? "",
      brand: "Trek",
      model: "Marlin",
      bikeType: "mtb",
    })
    .returning();
  const [order] = await db
    .insert(workOrders)
    .values({
      branchId: branch.id,
      number: 1,
      customerId: customer?.id ?? "",
      bikeId: bike?.id ?? "",
      requestedService: "Mantención general",
      createdBy: user.id,
    })
    .returning();
  orderId = order?.id ?? "";
  const [service] = await db
    .insert(services)
    .values({ branchId: branch.id, name: "Ajuste de frenos", estimatedMinutes: 30 })
    .returning();
  serviceId = service?.id ?? "";
  // Sin precio para el tipo de bici, agregar el servicio devuelve `no_price` y 422.
  await db
    .insert(servicePrices)
    .values({ branchId: branch.id, serviceId, bikeType: "mtb", priceClp: 12000 });
  return async () => {
    holder.actor = null;
    holder.db = null;
    vi.useRealTimers();
    await test.close();
  };
});

it("agregar un accesorio guarda primero lo marcado en el checklist", async () => {
  const response = await render(
    base({ accion: "accesorio", description: "Portabultos", frenos: "ok", cadena: "revisar" }),
  );

  expect(response.status).toBe(303);
  expect(await guardados()).toEqual(["cadena", "frenos"]);
});

it("agregar un servicio y confirmar la fecha también los guardan", async () => {
  expect(
    (await render(base({ accion: "servicio", serviceId, quantity: "1", frenos: "ok" }))).status,
  ).toBe(303);
  expect(await guardados()).toEqual(["frenos"]);

  const fecha = await render(
    base({ accion: "fecha", date: "2026-10-30", cadena: "ok", ruedas: "malo" }),
  );

  expect(fecha.status).toBe(303);
  expect(await guardados()).toEqual(["cadena", "frenos", "ruedas"]);
  const [order] = await db.select().from(workOrders).where(eq(workOrders.id, orderId));
  expect(order?.estimatedDeliveryDate).toBe("2026-10-30");
});

it("el aviso dice cuántos puntos van y cuáles faltan por nombre", async () => {
  await render(base({ accion: "checklist", frenos: "ok" }));

  const html = await (await render(undefined, "?hecho=checklist")).text();

  expect(html).toContain("1 de 7");
  expect(html).toContain("Cadena");
  expect(html).toContain("Transmisión");
  expect(html).toContain("Problemas visibles");
});

it("cada punto sin marcar se ve como Pendiente", async () => {
  await render(base({ accion: "checklist", frenos: "ok" }));

  const html = await (await render()).text();

  expect(html.match(/Pendiente/g) ?? []).toHaveLength(6);
});

it("en fotos y firma el aviso nombra los puntos que faltan y lleva al checklist", async () => {
  await render(base({ accion: "checklist", frenos: "ok", cadena: "ok" }));

  const html = await renderCierre();

  expect(html).toContain("Transmisión");
  expect(html).toContain("Ruedas");
  expect(html).not.toContain(">Frenos<");
  expect(html).toContain("/recepcion#checklist");
});

it("una fecha estimada ya pasada no bloquea el resto del formulario", async () => {
  // Con un solo form, el navegador valida todos los campos en cada envío: un `min` en la fecha
  // dejaría a "Guardar checklist" bloqueado por un globo en un campo que nadie tocó. La regla
  // vive en el servidor (`invalid_date`), así que el input no lleva `min`.
  await db
    .update(workOrders)
    .set({ estimatedDeliveryDate: "2026-10-01" })
    .where(eq(workOrders.id, orderId));

  const html = await (await render()).text();
  const campo = html.slice(html.indexOf('id="delivery-date"'));
  expect(campo.slice(0, campo.indexOf(">"))).not.toContain("min=");

  const guardado = await render(base({ accion: "checklist", frenos: "ok" }));

  expect(guardado.status).toBe(303);
  expect(await guardados()).toEqual(["frenos"]);
});

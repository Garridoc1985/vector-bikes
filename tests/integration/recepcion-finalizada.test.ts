import { randomUUID } from "node:crypto";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { and, eq } from "drizzle-orm";
import { beforeEach, expect, it, vi } from "vitest";
import type { SessionUser } from "../../src/server/auth/admin-auth.ts";
import type { AppDb } from "../../src/server/db/client.ts";
import { intakeChecks, orderSignatures, workOrders } from "../../src/server/db/schema-orders.ts";
import { bikes, customers, servicePrices, services } from "../../src/server/db/schema-taller.ts";
import { bookings, branches, users } from "../../src/server/db/schema.ts";
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

/** Deja la orden como queda al finalizar: recibida, con firma. */
async function recibida(signedByName = "Patricia Cruzat") {
  await db
    .update(workOrders)
    .set({ status: "recibida", receivedAt: NOW })
    .where(eq(workOrders.id, orderId));
  await db.insert(orderSignatures).values({
    branchId: owner.branchId,
    workOrderId: orderId,
    kind: "recepcion",
    signedByName,
    signedAt: NOW,
    storageKey: `orders/${orderId}/firma.png`,
    createdBy: owner.id,
  });
}

it("al volver de finalizar, la página confirma que terminó", async () => {
  await recibida();

  const html = await (await render(undefined, "?hecho=recibida")).text();

  expect(html).toContain("Recepción finalizada");
  expect(html).toContain("OT-00001");
  expect(html).toContain("Trek Marlin");
  expect(html).toContain("Patricia Cruzat");
  // La tarjeta se reconoce por su id: "Inicio" y /taller también están en el menú lateral.
  expect(html).toContain('id="recepcion-lista"');
  expect(html).toContain("Ver orden");
  expect(html).toContain('role="status"');
});

// La página ya decía "Recepción finalizada" por estado, y `recepcion-completa.spec.ts` busca ese
// aviso con texto exacto: la tarjeta nueva se reconoce por su salida, no por esa frase.
it("sin hecho=recibida no aparece la tarjeta de salida", async () => {
  await recibida();

  const html = await (await render()).text();

  expect(html).not.toContain('id="recepcion-lista"');
  expect(html).not.toContain("Ver orden");
});

it("si la reserva tiene más bicis, ofrece recibir la siguiente", async () => {
  const [booking] = await db
    .insert(bookings)
    .values({
      code: "VB-261023-1500",
      serviceDate: "2026-10-23",
      mode: "taller",
      bikeCount: 3,
      startsAt: NOW,
      endsAt: new Date(NOW.getTime() + 90 * 60_000),
      customerName: "Patricia Cruzat",
      phoneE164: "+56911112222",
      bike: "Trek Marlin",
      description: "Mantención general",
      consentAt: NOW,
      cancelTokenHash: randomUUID(),
    })
    .returning();
  await db
    .update(workOrders)
    .set({ bookingId: booking?.id ?? null, bookingPosition: 1 })
    .where(eq(workOrders.id, orderId));
  await recibida();

  const html = await (await render(undefined, "?hecho=recibida")).text();

  expect(html).toContain("Recibir la siguiente (2 de 3)");
  expect(html).toContain(`/taller/recepcion/nueva?reserva=${booking?.id}`);
});

it("una orden sin reserva no ofrece recibir la siguiente", async () => {
  await recibida();

  const html = await (await render(undefined, "?hecho=recibida")).text();

  expect(html).not.toContain("Recibir la siguiente");
});

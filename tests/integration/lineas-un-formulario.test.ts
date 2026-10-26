import { randomUUID } from "node:crypto";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { eq } from "drizzle-orm";
import { beforeEach, expect, it, vi } from "vitest";
import type { SessionUser } from "../../src/server/auth/admin-auth.ts";
import type { AppDb } from "../../src/server/db/client.ts";
import { workOrderItems, workOrders } from "../../src/server/db/schema-orders.ts";
import {
  auditLog,
  bikes,
  customers,
  servicePrices,
  services,
} from "../../src/server/db/schema-taller.ts";
import { branches, users } from "../../src/server/db/schema.ts";
import { addCatalogItem, addPartItem } from "../../src/server/taller/items.ts";
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
const { default: Lineas } = await import("../../src/pages/taller/ordenes/[id]/lineas.astro");

const SITE = "https://vectorbikes.cl";
const NOW = new Date("2026-10-26T15:00:00.000Z");

let test: TestDb;
let db: AppDb;
let owner: SessionUser;
let reception: SessionUser;
let orderId: string;
let serviceItemId: string;
let partItemId: string;

async function seedUser(branchId: string, role: SessionUser["role"]): Promise<SessionUser> {
  const [user] = await db
    .insert(users)
    .values({
      branchId,
      role,
      name: `Usuario ${role}`,
      email: `${randomUUID()}@ejemplo.cl`,
      passwordHash: "hash-de-prueba",
    })
    .returning();
  if (!user) throw new Error("Falta el usuario.");
  return { id: user.id, branchId, role, name: user.name, email: user.email };
}

/** Lo que el formulario único manda siempre: los campos de las otras acciones viajan vacíos. */
function base(extra: Record<string, string> = {}): Record<string, string> {
  return {
    serviceId: "",
    catalog_quantity: "1",
    description: "",
    part_quantity: "1",
    part_price: "",
    type: "boleta",
    number: "",
    date: "",
    [`price_${serviceItemId}`]: "18000",
    [`price_${partItemId}`]: "15000",
    ...extra,
  };
}

async function render(data?: Record<string, string>, search = "") {
  const request = new Request(`${SITE}/taller/ordenes/${orderId}/lineas${search}`, {
    method: data ? "POST" : "GET",
    headers: data ? { origin: SITE, "content-type": "application/x-www-form-urlencoded" } : {},
    body: data ? new URLSearchParams(data) : undefined,
  });
  const container = await AstroContainer.create({ astroConfig: { site: SITE } });
  return container.renderToResponse(Lineas, { request, params: { id: orderId } });
}

async function prices(): Promise<Record<string, number>> {
  const rows = await db
    .select()
    .from(workOrderItems)
    .where(eq(workOrderItems.workOrderId, orderId));
  return Object.fromEntries(rows.map((row) => [row.id, row.unitPriceClp]));
}

async function order() {
  const [row] = await db.select().from(workOrders).where(eq(workOrders.id, orderId));
  if (!row) throw new Error("Falta la orden.");
  return row;
}

/** Atributos de la etiqueta de apertura de un control, por su id. */
function tag(html: string, id: string): string {
  const start = html.indexOf(`id="${id}"`);
  if (start === -1) throw new Error(`No está el control ${id}.`);
  const open = html.lastIndexOf("<", start);
  return html.slice(open, html.indexOf(">", start) + 1);
}

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"], now: NOW });
  test = await createTestDb();
  db = test.db;
  holder.db = db;
  const [branch] = await db.insert(branches).values({ name: "Vitacura" }).returning();
  if (!branch) throw new Error("Falta la sucursal.");
  owner = await seedUser(branch.id, "owner");
  reception = await seedUser(branch.id, "reception");
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
  const [row] = await db
    .insert(workOrders)
    .values({
      branchId: branch.id,
      number: 1,
      customerId: customer?.id ?? "",
      bikeId: bike?.id ?? "",
      status: "recibida",
      requestedService: "Mantención general",
      createdBy: owner.id,
    })
    .returning();
  orderId = row?.id ?? "";
  const [service] = await db
    .insert(services)
    .values({ branchId: branch.id, name: "Ajuste de frenos", estimatedMinutes: 30 })
    .returning();
  await db.insert(servicePrices).values({
    branchId: branch.id,
    serviceId: service?.id ?? "",
    bikeType: "mtb",
    priceClp: 18000,
  });
  const added = await addCatalogItem(db, owner, orderId, { serviceId: service?.id ?? "" }, NOW);
  const part = await addPartItem(
    db,
    owner,
    orderId,
    { description: "Cadena", quantity: 1, unitPriceClp: 15000 },
    NOW,
  );
  if (!added.ok || !part.ok) throw new Error("Faltan las líneas.");
  serviceItemId = added.itemId;
  partItemId = part.itemId;
  return async () => {
    holder.actor = null;
    holder.db = null;
    vi.useRealTimers();
    await test.close();
  };
});

it("la página es un solo formulario sin required, min ni max", async () => {
  const html = await (await render()).text();
  // El layout trae su propio form de "Salir"; aquí cuentan solo los de la página.
  const own = /<form\b[^>]*action="\/taller\/ordenes\//g;
  const start = html.search(own);
  const form = html.slice(start, html.indexOf("</form>", start));

  expect(html.match(own)).toHaveLength(1);
  expect(form).not.toMatch(/\brequired\b/);
  expect(form).not.toMatch(/\bmin=/);
  expect(form).not.toMatch(/\bmax=/);
  expect(form).not.toMatch(/\bminlength=/);
  expect(html).toContain("Guardar cambios");
  expect(html).not.toContain("Cambiar precio");
  expect(tag(html, `price-${serviceItemId}`)).toContain(`name="price_${serviceItemId}"`);
});

it("Guardar cambios guarda dos precios y el aviso dice cuántos", async () => {
  const response = await render(
    base({
      action: "prices",
      [`price_${serviceItemId}`]: "20000",
      [`price_${partItemId}`]: "12000",
    }),
  );

  expect(response.status).toBe(303);
  expect(response.headers.get("location")).toBe(
    `/taller/ordenes/${orderId}/lineas?hecho=precios&actualizados=2`,
  );
  expect(await prices()).toEqual({ [serviceItemId]: 20000, [partItemId]: 12000 });
  expect((await order()).totalClp).toBe(32000);
  expect(
    await db.select().from(auditLog).where(eq(auditLog.action, "item.price_changed")),
  ).toHaveLength(2);

  const html = await (await render(undefined, "?hecho=precios&actualizados=2")).text();
  expect(html).toContain("Precios actualizados: 2.");
});

it("sin cambios avisa que no había cambios de precio", async () => {
  const response = await render(base({ action: "prices" }));

  expect(response.status).toBe(303);
  expect(response.headers.get("location")).toBe(
    `/taller/ordenes/${orderId}/lineas?hecho=precios&actualizados=0`,
  );
  const html = await (await render(undefined, "?hecho=precios&actualizados=0")).text();
  expect(html).toContain("No había cambios de precio.");
  expect(html).not.toContain("Precios actualizados");
});

it("Agregar repuesto guarda antes el precio editado", async () => {
  const response = await render(
    base({
      action: "part",
      description: "Pastillas de freno",
      part_quantity: "2",
      part_price: "9000",
      [`price_${serviceItemId}`]: "21000",
    }),
  );

  expect(response.status).toBe(303);
  expect(response.headers.get("location")).toBe(
    `/taller/ordenes/${orderId}/lineas?hecho=part&actualizados=1`,
  );
  const saved = await prices();
  expect(saved[serviceItemId]).toBe(21000);
  expect(Object.keys(saved)).toHaveLength(3);
  expect((await order()).totalClp).toBe(21000 + 15000 + 18000);
  const html = await (await render(undefined, "?hecho=part&actualizados=1")).text();
  expect(html).toContain("Repuesto agregado. Precios actualizados: 1.");
});

it("Anular guarda el otro precio editado y anula la línea", async () => {
  const response = await render(base({ anular: partItemId, [`price_${serviceItemId}`]: "25000" }));

  expect(response.status).toBe(303);
  expect(response.headers.get("location")).toBe(
    `/taller/ordenes/${orderId}/lineas?hecho=void&actualizados=1`,
  );
  expect((await prices())[serviceItemId]).toBe(25000);
  const [voided] = await db.select().from(workOrderItems).where(eq(workOrderItems.id, partItemId));
  expect(voided?.voidedAt).toEqual(NOW);
  expect((await order()).totalClp).toBe(25000);
});

it("con un precio inválido responde 422, marca el campo y no guarda nada", async () => {
  const response = await render(
    base({
      action: "part",
      description: "Pastillas de freno",
      part_price: "9000",
      [`price_${serviceItemId}`]: "21000",
      [`price_${partItemId}`]: "-5",
    }),
  );
  const html = await response.text();

  expect(response.status).toBe(422);
  const field = tag(html, `price-${partItemId}`);
  expect(field).toContain('aria-invalid="true"');
  expect(field).toContain(`aria-describedby="price-${partItemId}-error"`);
  expect(html).toContain(`id="price-${partItemId}-error"`);
  expect(html).toContain("Escribe un monto entero en pesos");
  expect(html).not.toContain("Invalid");
  expect(field).toContain('value="-5"');
  expect(tag(html, `price-${serviceItemId}`)).toContain('value="21000"');
  expect(tag(html, "part-description")).toContain('value="Pastillas de freno"');
  expect(await prices()).toEqual({ [serviceItemId]: 18000, [partItemId]: 15000 });
  expect(await db.select().from(auditLog).where(eq(auditLog.action, "item.added"))).toHaveLength(2);
});

it("un rol sin permiso que manda precios recibe 403 y no cambia nada", async () => {
  holder.actor = reception;
  const html = await (await render()).text();
  expect(html).not.toContain(`price_${serviceItemId}`);

  const response = await render(
    base({
      action: "part",
      description: "Cámara",
      part_price: "5000",
      [`price_${serviceItemId}`]: "1",
    }),
  );

  expect(response.status).toBe(403);
  expect(await prices()).toEqual({ [serviceItemId]: 18000, [partItemId]: 15000 });
  expect(Object.keys(await prices())).toHaveLength(2);
});

it("un rol sin permiso agrega repuestos sin mandar precios", async () => {
  holder.actor = reception;
  const response = await render({
    action: "part",
    serviceId: "",
    catalog_quantity: "1",
    description: "Cámara",
    part_quantity: "1",
    part_price: "5000",
    type: "boleta",
    number: "",
    date: "",
  });

  expect(response.status).toBe(303);
  expect(response.headers.get("location")).toBe(`/taller/ordenes/${orderId}/lineas?hecho=part`);
  expect(Object.keys(await prices())).toHaveLength(3);
});

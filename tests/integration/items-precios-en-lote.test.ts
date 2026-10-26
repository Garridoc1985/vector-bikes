import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { beforeEach, expect, it } from "vitest";
import type { SessionUser } from "../../src/server/auth/admin-auth.ts";
import { workOrderItems, workOrders } from "../../src/server/db/schema-orders.ts";
import {
  auditLog,
  bikes,
  customers,
  servicePrices,
  services,
} from "../../src/server/db/schema-taller.ts";
import { branches, users } from "../../src/server/db/schema.ts";
import {
  addCatalogItem,
  addPartItem,
  overrideItemPrices,
  voidItem,
} from "../../src/server/taller/items.ts";
import { startReception } from "../../src/server/taller/orders.ts";
import { createTestDb } from "../helpers/pglite.ts";
import type { TestDb } from "../helpers/pglite.ts";

const NOW = new Date("2026-10-26T15:00:00.000Z");
const LATER = new Date("2026-10-26T16:00:00.000Z");
const PART = { description: "Cadena de repuesto", quantity: 2, unitPriceClp: 15000 };
let test: TestDb;
let owner: SessionUser;
let reception: SessionUser;
let mechanic: SessionUser;
let orderId: string;
let serviceId: string;

async function actor(branchId: string, role: SessionUser["role"]): Promise<SessionUser> {
  const [user] = await test.db
    .insert(users)
    .values({
      branchId,
      role,
      name: "Personal de prueba",
      email: `${randomUUID()}@example.test`,
      passwordHash: "hash-de-prueba",
    })
    .returning();
  if (!user) throw new Error("Falta el usuario de prueba.");
  return { id: user.id, branchId, role, name: user.name, email: user.email };
}

async function createOrder() {
  const [customer] = await test.db
    .insert(customers)
    .values({ branchId: owner.branchId, name: "Cliente de prueba", phoneE164: "+56912345678" })
    .returning();
  if (!customer) throw new Error("Falta el cliente de prueba.");
  const [bike] = await test.db
    .insert(bikes)
    .values({
      branchId: owner.branchId,
      customerId: customer.id,
      brand: "Specialized",
      model: "Rockhopper",
      bikeType: "mtb",
    })
    .returning();
  if (!bike) throw new Error("Falta la bicicleta de prueba.");
  const result = await startReception(
    test.db,
    mechanic,
    { customerId: customer.id, bikeId: bike.id, requestedService: "Revisión general" },
    NOW,
  );
  if (!result.ok) throw new Error("Falta la orden de prueba.");
  return result.orderId;
}

async function createService() {
  const [service] = await test.db
    .insert(services)
    .values({ branchId: owner.branchId, name: "Ajuste de frenos", estimatedMinutes: 45 })
    .returning();
  if (!service) throw new Error("Falta el servicio de prueba.");
  await test.db
    .insert(servicePrices)
    .values({ branchId: owner.branchId, serviceId: service.id, bikeType: "mtb", priceClp: 18000 });
  return service.id;
}

/** Una línea de servicio (2 × 18.000) y un repuesto (2 × 15.000): total 66.000. */
async function twoLines() {
  const service = await addCatalogItem(test.db, owner, orderId, { serviceId, quantity: 2 }, NOW);
  const part = await addPartItem(test.db, owner, orderId, PART, NOW);
  if (!service.ok || !part.ok) throw new Error("Faltan las líneas de prueba.");
  return { serviceItemId: service.itemId, partItemId: part.itemId };
}

async function snapshot() {
  return {
    orders: await test.db.select().from(workOrders),
    items: await test.db.select().from(workOrderItems),
    audits: await test.db.select().from(auditLog),
  };
}

async function orderRow() {
  const [order] = await test.db.select().from(workOrders).where(eq(workOrders.id, orderId));
  if (!order) throw new Error("Falta la orden de prueba.");
  return order;
}

async function priceAudits() {
  return test.db.select().from(auditLog).where(eq(auditLog.action, "item.price_changed"));
}

beforeEach(async () => {
  test = await createTestDb();
  const [branch] = await test.db.insert(branches).values({ name: "Vitacura" }).returning();
  if (!branch) throw new Error("Falta la sucursal de prueba.");
  owner = await actor(branch.id, "owner");
  reception = await actor(branch.id, "reception");
  mechanic = await actor(branch.id, "mechanic");
  orderId = await createOrder();
  serviceId = await createService();
  return () => test.close();
});

it("guarda dos precios en una llamada, con una auditoría por línea y el total recalculado", async () => {
  const { serviceItemId, partItemId } = await twoLines();

  const result = await overrideItemPrices(
    test.db,
    owner,
    orderId,
    [
      { itemId: serviceItemId, unitPriceClp: 20000 },
      { itemId: partItemId, unitPriceClp: "12000" },
    ],
    LATER,
  );

  expect(result).toEqual({ ok: true, updated: 2 });
  const items = await test.db.select().from(workOrderItems);
  expect(items.find((row) => row.id === serviceItemId)).toMatchObject({
    unitPriceClp: 20000,
    updatedAt: LATER,
  });
  expect(items.find((row) => row.id === partItemId)).toMatchObject({
    unitPriceClp: 12000,
    updatedAt: LATER,
  });
  expect(await orderRow()).toMatchObject({ totalClp: 64000, updatedAt: LATER });
  const audits = await priceAudits();
  expect(audits).toHaveLength(2);
  expect(audits.map((row) => row.details)).toEqual(
    expect.arrayContaining([
      { itemId: serviceItemId, before: 18000, after: 20000 },
      { itemId: partItemId, before: 15000, after: 12000 },
    ]),
  );
  for (const row of audits)
    expect(row).toMatchObject({
      actorUserId: owner.id,
      branchId: owner.branchId,
      entity: "work_order",
      entityId: orderId,
      createdAt: LATER,
    });
});

it("sin cambios no audita, no toca la orden y responde cero actualizados", async () => {
  const { serviceItemId, partItemId } = await twoLines();
  const before = await snapshot();

  const result = await overrideItemPrices(
    test.db,
    owner,
    orderId,
    [
      { itemId: serviceItemId, unitPriceClp: 18000 },
      { itemId: partItemId, unitPriceClp: 15000 },
    ],
    LATER,
  );

  expect(result).toEqual({ ok: true, updated: 0 });
  expect(await snapshot()).toEqual(before);
  expect(await overrideItemPrices(test.db, owner, orderId, [], LATER)).toEqual({
    ok: true,
    updated: 0,
  });
});

it("solo actualiza y audita las líneas cuyo precio cambió", async () => {
  const { serviceItemId, partItemId } = await twoLines();

  const result = await overrideItemPrices(
    test.db,
    owner,
    orderId,
    [
      { itemId: serviceItemId, unitPriceClp: 18000 },
      { itemId: partItemId, unitPriceClp: 10000 },
    ],
    LATER,
  );

  expect(result).toEqual({ ok: true, updated: 1 });
  expect((await priceAudits()).map((row) => row.details)).toEqual([
    { itemId: partItemId, before: 15000, after: 10000 },
  ]);
  expect(await orderRow()).toMatchObject({ totalClp: 56000 });
});

it("con un precio inválido no guarda nada", async () => {
  const { serviceItemId, partItemId } = await twoLines();
  const before = await snapshot();

  for (const unitPriceClp of [-1, 1.5, "1.5", 10000001, "", null, "abc"]) {
    expect(
      await overrideItemPrices(
        test.db,
        owner,
        orderId,
        [
          { itemId: serviceItemId, unitPriceClp: 20000 },
          { itemId: partItemId, unitPriceClp },
        ],
        LATER,
      ),
    ).toEqual({ ok: false, code: "validation_error" });
  }
  expect(await overrideItemPrices(test.db, owner, orderId, null, LATER)).toEqual({
    ok: false,
    code: "validation_error",
  });
  expect(await snapshot()).toEqual(before);
});

it("una línea de otra orden o anulada devuelve not_found sin guardar nada", async () => {
  const { serviceItemId, partItemId } = await twoLines();
  const otherOrderId = await createOrder();
  const other = await addPartItem(test.db, owner, otherOrderId, PART, NOW);
  if (!other.ok) throw new Error("Falta la línea de la otra orden.");
  await voidItem(test.db, owner, partItemId, NOW);
  const before = await snapshot();

  expect(
    await overrideItemPrices(
      test.db,
      owner,
      orderId,
      [
        { itemId: serviceItemId, unitPriceClp: 20000 },
        { itemId: other.itemId, unitPriceClp: 1000 },
      ],
      LATER,
    ),
  ).toEqual({ ok: false, code: "not_found" });
  expect(
    await overrideItemPrices(
      test.db,
      owner,
      orderId,
      [
        { itemId: serviceItemId, unitPriceClp: 20000 },
        { itemId: partItemId, unitPriceClp: 1000 },
      ],
      LATER,
    ),
  ).toEqual({ ok: false, code: "not_found" });
  expect(
    await overrideItemPrices(
      test.db,
      owner,
      randomUUID(),
      [{ itemId: serviceItemId, unitPriceClp: 20000 }],
      LATER,
    ),
  ).toEqual({ ok: false, code: "not_found" });
  expect(await snapshot()).toEqual(before);
});

it.each(["reception", "mechanic"] as const)("%s no puede guardar precios", async (role) => {
  const { serviceItemId } = await twoLines();
  const before = await snapshot();

  expect(
    await overrideItemPrices(
      test.db,
      role === "reception" ? reception : mechanic,
      orderId,
      [{ itemId: serviceItemId, unitPriceClp: 1 }],
      LATER,
    ),
  ).toEqual({ ok: false, code: "forbidden" });
  expect(await snapshot()).toEqual(before);
});

it("en una orden entregada, cancelada o rechazada no cambia nada", async () => {
  const { serviceItemId } = await twoLines();
  await test.db.update(workOrders).set({ status: "cancelada" }).where(eq(workOrders.id, orderId));
  const before = await snapshot();

  expect(
    await overrideItemPrices(
      test.db,
      owner,
      orderId,
      [{ itemId: serviceItemId, unitPriceClp: 1 }],
      LATER,
    ),
  ).toEqual({ ok: false, code: "invalid_status" });
  expect(await snapshot()).toEqual(before);
});

it("revierte precios, totales y auditorías si falla una de las auditorías", async () => {
  const { serviceItemId, partItemId } = await twoLines();
  const before = await snapshot();
  await test.client.exec(`
    create function reject_price_audit() returns trigger language plpgsql as $$
    begin raise exception 'Auditoría no disponible'; end; $$;
    create trigger reject_price_audit before insert on audit_log
    for each row execute function reject_price_audit();
  `);

  await expect(
    overrideItemPrices(
      test.db,
      owner,
      orderId,
      [
        { itemId: serviceItemId, unitPriceClp: 20000 },
        { itemId: partItemId, unitPriceClp: 12000 },
      ],
      LATER,
    ),
  ).rejects.toThrow();
  expect(await snapshot()).toEqual(before);
});

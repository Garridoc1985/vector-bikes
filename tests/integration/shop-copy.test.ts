import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { eq } from "drizzle-orm";
import sharp from "sharp";
import { beforeEach, expect, it, vi } from "vitest";
import type { SessionUser } from "../../src/server/auth/admin-auth.ts";
import { intakeChecks, orderPhotos, workOrders } from "../../src/server/db/schema-orders.ts";
import { auditLog, bikes, customers } from "../../src/server/db/schema-taller.ts";
import { branches, users } from "../../src/server/db/schema.ts";
import { consoleOutbox } from "../../src/server/email/transport.ts";
import type { EmailTransport } from "../../src/server/email/transport.ts";
import { createLocalStorage } from "../../src/server/storage/storage.ts";
import type { ObjectStorage } from "../../src/server/storage/storage.ts";
import { finalizeReception } from "../../src/server/taller/reception.ts";
import { INTAKE_CHECK_KEYS } from "../../src/server/taller/rules.ts";
import { createTestDb } from "../helpers/pglite.ts";
import type { TestDb } from "../helpers/pglite.ts";

const NOW = new Date("2026-10-05T15:00:00.000Z");
const CLIENTE = "patricia@ejemplo.cl";
const TALLER = "info@vectorbikes.cl";

let test: TestDb;
let owner: SessionUser;
let orderId: string;
let storage: ObjectStorage;
let dir: string;
let dataUrl: string;
let numero = 0;

async function crearOrden(email: string | null) {
  numero += 1;
  const [customer] = await test.db
    .insert(customers)
    .values({ branchId: owner.branchId, name: "Patricia Cruzat", phoneE164: "+56911112222", email })
    .returning();
  if (!customer) throw new Error("Falta el cliente.");
  const [bike] = await test.db
    .insert(bikes)
    .values({
      branchId: owner.branchId,
      customerId: customer.id,
      brand: "Trek",
      model: "Marlin",
      bikeType: "mtb",
    })
    .returning();
  if (!bike) throw new Error("Falta la bicicleta.");
  const [order] = await test.db
    .insert(workOrders)
    .values({
      branchId: owner.branchId,
      number: numero,
      customerId: customer.id,
      bikeId: bike.id,
      requestedService: "Mantención general",
      createdBy: owner.id,
    })
    .returning();
  if (!order) throw new Error("Falta la orden.");
  return order.id;
}

/** Checklist, foto y fecha: lo que `finalizeReception` exige. */
async function lista(id = orderId) {
  await test.db.insert(intakeChecks).values(
    INTAKE_CHECK_KEYS.map((itemKey) => ({
      branchId: owner.branchId,
      workOrderId: id,
      itemKey,
      result: "ok",
      createdBy: owner.id,
    })),
  );
  await test.db.insert(orderPhotos).values({
    branchId: owner.branchId,
    workOrderId: id,
    stage: "recepcion",
    retentionClass: "recepcion_6m",
    fullKey: `orders/${id}/${randomUUID()}-full.jpg`,
    thumbKey: `orders/${id}/${randomUUID()}-thumb.jpg`,
    width: 10,
    height: 10,
    createdBy: owner.id,
  });
  await test.db
    .update(workOrders)
    .set({ estimatedDeliveryDate: "2026-10-23", deliveryDateConfirmedAt: NOW })
    .where(eq(workOrders.id, id));
}

function finalizar(deps?: { transport: EmailTransport }) {
  return finalizeReception(
    test.db,
    storage,
    owner,
    { orderId, signatureDataUrl: dataUrl, signedByName: "Patricia Cruzat" },
    NOW,
    deps,
  );
}

beforeEach(async () => {
  consoleOutbox.length = 0;
  numero = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      throw new Error("red deshabilitada en tests");
    }),
  );
  test = await createTestDb();
  dir = mkdtempSync(join(tmpdir(), "vector-copia-"));
  storage = createLocalStorage(dir);
  const [branch] = await test.db.insert(branches).values({ name: "Vitacura" }).returning();
  if (!branch) throw new Error("Falta la sucursal.");
  const [user] = await test.db
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
  orderId = await crearOrden(CLIENTE);
  const png = await sharp({
    create: { width: 10, height: 10, channels: 4, background: "#000000" },
  })
    .png()
    .toBuffer();
  dataUrl = `data:image/png;base64,${png.toString("base64")}`;
  return async () => {
    vi.unstubAllGlobals();
    rmSync(dir, { recursive: true, force: true });
    await test.close();
  };
});

it("el taller recibe una copia del correo de recepción", async () => {
  await lista();

  expect(await finalizar()).toEqual({ ok: true });

  expect(consoleOutbox).toHaveLength(2);
  const [cliente, copia] = consoleOutbox;
  expect(cliente?.to).toBe(CLIENTE);
  expect(copia?.to).toBe(TALLER);
  expect(copia?.subject).toBe(`Copia · ${cliente?.subject}`);
  expect(copia?.text.startsWith(`Copia del correo enviado a ${CLIENTE}.`)).toBe(true);
  // La nota va dentro del documento, no pegada antes del doctype: así sale dentro del <body>,
  // con el estilo del resto del correo, y el HTML sigue siendo válido.
  expect(copia?.html.startsWith("<!doctype html>")).toBe(true);
  const cuerpo = copia?.html.slice(copia.html.indexOf("<body")) ?? "";
  expect(cuerpo).toContain(`Copia del correo enviado a ${CLIENTE}.`);
  expect(copia?.html.slice(0, copia.html.indexOf("<body"))).not.toContain("Copia del correo");
  // El resto del cuerpo es el mismo que vio el cliente.
  expect(copia?.text).toContain(cliente?.text ?? "nada");
  expect(cliente?.text).not.toContain("Copia del correo");
});

it("sin correo del cliente no sale nada, tampoco la copia", async () => {
  orderId = await crearOrden(null);
  await lista();

  expect(await finalizar()).toEqual({ ok: true });

  expect(consoleOutbox).toHaveLength(0);
});

it("si el correo al cliente falla, no se manda copia", async () => {
  await lista();
  const roto: EmailTransport = {
    send: async () => {
      throw new Error("el proveedor rechazó el correo");
    },
  };

  expect(await finalizar({ transport: roto })).toEqual({ ok: true });

  expect(consoleOutbox).toHaveLength(0);
  expect(
    await test.db.select().from(auditLog).where(eq(auditLog.action, "notify.received")),
  ).toHaveLength(0);
});

it("si falla solo la copia, la recepción y su registro quedan en pie", async () => {
  await lista();
  let intentos = 0;
  const copiaRota: EmailTransport = {
    send: async (message) => {
      intentos += 1;
      if (message.to === TALLER) throw new Error("rebotó la copia");
      consoleOutbox.push({ ...message, from: "x", replyTo: "y" });
    },
  };

  expect(await finalizar({ transport: copiaRota })).toEqual({ ok: true });

  expect(intentos).toBe(2);
  expect(consoleOutbox).toHaveLength(1);
  expect(consoleOutbox[0]?.to).toBe(CLIENTE);
  expect(
    await test.db.select().from(auditLog).where(eq(auditLog.action, "notify.received")),
  ).toHaveLength(1);
});

it("una segunda finalización no manda nada", async () => {
  await lista();
  await finalizar();
  consoleOutbox.length = 0;

  const otra = await finalizar();

  expect(otra.ok).toBe(false);
  expect(consoleOutbox).toHaveLength(0);
});

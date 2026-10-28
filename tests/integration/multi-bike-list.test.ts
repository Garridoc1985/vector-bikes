import { randomUUID } from "node:crypto";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { beforeEach, expect, it, vi } from "vitest";
import type { SessionUser } from "../../src/server/auth/admin-auth.ts";
import type { AppDb } from "../../src/server/db/client.ts";
import { workOrders } from "../../src/server/db/schema-orders.ts";
import { bikes, customers } from "../../src/server/db/schema-taller.ts";
import {
  type Booking,
  bookingBikes,
  bookings,
  branches,
  users,
} from "../../src/server/db/schema.ts";
import { listUpcomingBookings } from "../../src/server/taller/manual-booking.ts";
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
const { default: Reservas } = await import("../../src/pages/taller/reservas/index.astro");

const SITE = "https://vectorbikes.cl";
/** 2026-10-22 12:00 hora local. */
const NOW = new Date("2026-10-22T15:00:00.000Z");
const DIA = "2026-10-23";

let test: TestDb;
let db: AppDb;
let branchId: string;
let userId: string;
let customerId: string;
let bikeId: string;

async function reserva(bikeCount: number): Promise<Booking> {
  const [row] = await db
    .insert(bookings)
    .values({
      code: `VB-${randomUUID().slice(0, 8)}`,
      serviceDate: DIA,
      mode: "taller",
      bikeCount,
      startsAt: new Date("2026-10-23T18:00:00.000Z"),
      endsAt: new Date("2026-10-23T19:30:00.000Z"),
      customerName: "Patricia Cruzat",
      phoneE164: "+56911112222",
      bike: "Trek Marlin",
      description: "Mantención general",
      consentAt: NOW,
      cancelTokenHash: randomUUID(),
    })
    .returning();
  if (!row) throw new Error("Falta la reserva.");
  const extra = [
    { position: 2, bike: "Oxford urbana", description: "Frenos" },
    { position: 3, bike: "Specialized Allez", description: "Cadena" },
  ].slice(0, bikeCount - 1);
  if (extra.length > 0) {
    await db.insert(bookingBikes).values(extra.map((bike) => ({ ...bike, bookingId: row.id })));
  }
  return row;
}

let numero = 0;
async function orden(booking: Booking, position: number) {
  numero += 1;
  await db.insert(workOrders).values({
    branchId,
    number: numero,
    customerId,
    bikeId,
    bookingId: booking.id,
    bookingPosition: position,
    requestedService: "Revisión",
    createdBy: userId,
  });
}

async function render() {
  const container = await AstroContainer.create({ astroConfig: { site: SITE } });
  const response = await container.renderToResponse(Reservas, {
    request: new Request(`${SITE}/taller/reservas`),
  });
  return response.text();
}

beforeEach(async () => {
  numero = 0;
  vi.useFakeTimers({ toFake: ["Date"], now: NOW });
  test = await createTestDb();
  db = test.db;
  holder.db = db;
  const [branch] = await db.insert(branches).values({ name: "Vitacura" }).returning();
  if (!branch) throw new Error("Falta la sucursal.");
  branchId = branch.id;
  const [user] = await db
    .insert(users)
    .values({
      branchId,
      role: "owner",
      name: "Dueña",
      email: `${randomUUID()}@ejemplo.cl`,
      passwordHash: "hash-de-prueba",
    })
    .returning();
  if (!user) throw new Error("Falta el usuario.");
  userId = user.id;
  holder.actor = { id: user.id, branchId, role: "owner", name: user.name, email: user.email };
  const [customer] = await db
    .insert(customers)
    .values({ branchId, name: "Patricia Cruzat", phoneE164: "+56911112222" })
    .returning();
  customerId = customer?.id ?? "";
  const [bike] = await db
    .insert(bikes)
    .values({ branchId, customerId, brand: "Trek", model: "Marlin", bikeType: "mtb" })
    .returning();
  bikeId = bike?.id ?? "";
  return async () => {
    holder.actor = null;
    holder.db = null;
    vi.useRealTimers();
    await test.close();
  };
});

it("una reserva con varias órdenes aparece una sola vez, con todas sus órdenes", async () => {
  const booking = await reserva(3);
  await orden(booking, 1);
  await orden(booking, 2);

  const filas = await listUpcomingBookings(db, "2026-10-22");

  expect(filas).toHaveLength(1);
  expect(filas[0]?.bikeCount).toBe(3);
  expect(filas[0]?.orders.map((o) => o.number)).toEqual([1, 2]);
});

it("la lista dice cuántas bicis son y cuántas faltan por recibir", async () => {
  const booking = await reserva(3);
  await orden(booking, 1);

  const html = await render();

  expect(html).toContain("3 bicis");
  expect(html).toContain("OT-00001");
  expect(html).toContain("Recibir (2 de 3)");
});

it("con todas recibidas ya no ofrece recibir", async () => {
  const booking = await reserva(2);
  await orden(booking, 1);
  await orden(booking, 2);

  const html = await render();

  expect(html).toContain("OT-00001");
  expect(html).toContain("OT-00002");
  expect(html).not.toContain("Recibir");
});

it("una reserva de una bici se ve como siempre", async () => {
  await reserva(1);

  const html = await render();

  expect(html).not.toContain("1 bicis");
  expect(html).toContain("Recibir");
  expect(html).not.toContain("Recibir (");
});

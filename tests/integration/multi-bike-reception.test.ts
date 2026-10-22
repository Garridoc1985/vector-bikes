import { randomUUID } from "node:crypto";
import { asc, eq } from "drizzle-orm";
import { beforeEach, expect, it } from "vitest";
import type { SessionUser } from "../../src/server/auth/admin-auth.ts";
import { workOrders } from "../../src/server/db/schema-orders.ts";
import {
  type Booking,
  bookingBikes,
  bookings,
  branches,
  users,
} from "../../src/server/db/schema.ts";
import { insertBike } from "../../src/server/taller/bikes.ts";
import { insertCustomer } from "../../src/server/taller/customers.ts";
import { prefillFromBooking, startReception } from "../../src/server/taller/orders.ts";
import { type TestDb, createTestDb } from "../helpers/pglite.ts";

const NOW = new Date("2026-10-07T15:00:00.000Z");

let test: TestDb;
let owner: SessionUser;
let customerId: string;
let bikeId: string;

async function reserva(bikeCount: number): Promise<Booking> {
  const [row] = await test.db
    .insert(bookings)
    .values({
      code: randomUUID(),
      serviceDate: "2026-10-08",
      mode: "taller",
      bikeCount,
      startsAt: new Date("2026-10-08T15:00:00Z"),
      endsAt: new Date("2026-10-08T16:30:00Z"),
      customerName: "Patricia Cruzat",
      phoneE164: "+56912345678",
      email: null,
      bike: "Trek Marlin",
      description: "Mantención general",
      consentAt: NOW,
      cancelTokenHash: randomUUID(),
      createdAt: NOW,
      updatedAt: NOW,
    })
    .returning();
  if (!row) throw new Error("Falta la reserva de prueba.");
  const extra = [
    { position: 2, bike: "Oxford urbana", description: "Frenos" },
    { position: 3, bike: "Specialized Allez", description: "Cambio de cadena" },
  ].slice(0, bikeCount - 1);
  if (extra.length > 0) {
    await test.db
      .insert(bookingBikes)
      .values(
        extra.map((bike) => ({ ...bike, bookingId: row.id, createdAt: NOW, updatedAt: NOW })),
      );
  }
  return row;
}

function recibir(booking: Booking, requestedService = "Revisar frenos") {
  return startReception(
    test.db,
    owner,
    { customerId, bikeId, requestedService, bookingId: booking.id },
    NOW,
  );
}

async function ordenesDe(booking: Booking) {
  return test.db
    .select({ id: workOrders.id, position: workOrders.bookingPosition })
    .from(workOrders)
    .where(eq(workOrders.bookingId, booking.id))
    .orderBy(asc(workOrders.bookingPosition));
}

beforeEach(async () => {
  test = await createTestDb();
  const [branch] = await test.db
    .insert(branches)
    .values({ name: "Vitacura", createdAt: NOW, updatedAt: NOW })
    .returning();
  if (!branch) throw new Error("Falta la sucursal.");
  const [user] = await test.db
    .insert(users)
    .values({
      branchId: branch.id,
      role: "owner",
      email: `${randomUUID()}@example.test`,
      name: "Dueña",
      passwordHash: "hash-de-prueba",
      createdAt: NOW,
      updatedAt: NOW,
    })
    .returning();
  if (!user) throw new Error("Falta el usuario.");
  owner = { id: user.id, branchId: branch.id, role: "owner", email: user.email, name: user.name };
  const customer = await insertCustomer(
    test.db,
    branch.id,
    {
      name: "Patricia Cruzat",
      phoneE164: "+56912345678",
      email: null,
      rut: null,
      discoveryChannel: null,
      notes: null,
    },
    NOW,
  );
  if (!customer.ok) throw new Error("Falta el cliente.");
  customerId = customer.customer.id;
  const bike = await insertBike(
    test.db,
    branch.id,
    customerId,
    { brand: "Trek", model: "Marlin 7", bikeType: "mtb" },
    NOW,
  );
  if (!bike.ok) throw new Error("Falta la bicicleta.");
  bikeId = bike.bike.id;
  return () => test.close();
});

it("una reserva de tres bicis admite tres órdenes y la cuarta ya no", async () => {
  const booking = await reserva(3);

  for (const vuelta of [1, 2, 3]) {
    expect(await recibir(booking), `vuelta ${vuelta}`).toMatchObject({ ok: true });
  }

  expect(await recibir(booking)).toEqual({ ok: false, code: "booking_taken" });
  expect((await ordenesDe(booking)).map((orden) => orden.position)).toEqual([1, 2, 3]);
});

it("una reserva de una bici sigue admitiendo una sola orden", async () => {
  const booking = await reserva(1);

  expect(await recibir(booking)).toMatchObject({ ok: true });
  expect(await recibir(booking)).toEqual({ ok: false, code: "booking_taken" });
});

// La carrera entre dos recepciones la frena el lock de la reserva, y si algo se colara, el índice
// único `uq_work_orders_booking_position` la rechaza en la base. Esto último se prueba acá, porque
// dos transacciones en paralelo sobre PGlite comparten una sola conexión y se traban entre ellas.
it("la base no deja dos órdenes para la misma bici de una reserva", async () => {
  const booking = await reserva(2);
  const [primera] = await ordenesDe(booking);
  expect(primera).toBeUndefined();
  await recibir(booking);
  const [orden] = await ordenesDe(booking);
  if (!orden) throw new Error("Falta la orden de prueba.");

  await expect(
    test.db.insert(workOrders).values({
      branchId: owner.branchId,
      number: 99,
      customerId,
      bikeId,
      bookingId: booking.id,
      bookingPosition: orden.position,
      requestedService: "Repetida",
      createdBy: owner.id,
      createdAt: NOW,
      updatedAt: NOW,
    }),
  ).rejects.toThrow();

  expect(await ordenesDe(booking)).toHaveLength(1);
});

it("la precarga trae la bici que sigue sin orden", async () => {
  const booking = await reserva(3);

  const primera = await prefillFromBooking(test.db, owner, booking.id);
  expect(primera?.prefill.brand).toBe("Trek");
  expect(primera?.prefill.requestedService).toBe("Mantención general");

  await recibir(booking);
  const segunda = await prefillFromBooking(test.db, owner, booking.id);
  expect(segunda?.prefill.brand).toBe("Oxford");
  expect(segunda?.prefill.requestedService).toBe("Frenos");

  await recibir(booking);
  const tercera = await prefillFromBooking(test.db, owner, booking.id);
  expect(tercera?.prefill.brand).toBe("Specialized");
  expect(tercera?.prefill.requestedService).toBe("Cambio de cadena");
});

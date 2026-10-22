import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { beforeEach, expect, it } from "vitest";
import type { SessionUser } from "../../src/server/auth/admin-auth.ts";
import { readRange } from "../../src/server/booking/availability.ts";
import { type CreateBookingInput, createBooking } from "../../src/server/booking/create-booking.ts";
import { rescheduleBooking } from "../../src/server/booking/reschedule-booking.ts";
import { computeDay } from "../../src/server/booking/slots.ts";
import type { AppDb } from "../../src/server/db/client.ts";
import {
  type Booking,
  bookingBikes,
  bookingBlocks,
  branches,
  users,
} from "../../src/server/db/schema.ts";
import { type TestDb, createTestDb } from "../helpers/pglite.ts";

/** 2026-09-15 12:00 hora local; el 21 es lunes. */
const NOW = new Date("2026-09-15T15:00:00.000Z");
const LUNES = "2026-09-21";

let test: TestDb;
let db: AppDb;
let owner: SessionUser;
let phones = 0;

function input(overrides: Partial<CreateBookingInput> = {}): CreateBookingInput {
  phones += 1;
  return {
    mode: "taller",
    serviceDate: LUNES,
    start: "16:00",
    customerName: "Patricia Cruzat",
    phoneE164: `+5699000${String(1000 + phones).slice(-4)}`,
    email: null,
    bike: "Trek Marlin",
    description: "Mantención general",
    comuna: null,
    address: null,
    ipHash: null,
    ...overrides,
  };
}

const TRES = [
  { bike: "Trek Marlin", description: "Mantención general" },
  { bike: "Oxford urbana", description: "Frenos" },
  { bike: "Specialized Allez", description: "Cambio de cadena" },
];

async function crear(overrides: Partial<CreateBookingInput> = {}) {
  return createBooking(db, input(overrides), NOW);
}

async function crearOk(overrides: Partial<CreateBookingInput> = {}): Promise<Booking> {
  const result = await crear(overrides);
  if (!result.ok) throw new Error(`no se creó: ${result.code}`);
  return result.booking;
}

async function bloques(serviceDate: string): Promise<string[]> {
  const rows = await db
    .select({ blockStart: bookingBlocks.blockStart })
    .from(bookingBlocks)
    .where(and(eq(bookingBlocks.serviceDate, serviceDate), eq(bookingBlocks.isActive, true)))
    .orderBy(bookingBlocks.blockStart);
  return rows.map((row) => row.blockStart.slice(0, 5));
}

/** Lo que ve la web para ese día: la disponibilidad es siempre de 1 bici. */
async function cuposLibresEnLaWeb(): Promise<number> {
  const data = await readRange(db, LUNES, LUNES);
  const day = computeDay({ date: LUNES, mode: "taller", now: NOW, ...data(LUNES) });
  return 4 - day.used;
}

beforeEach(async () => {
  test = await createTestDb();
  db = test.db;
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
  return () => test.close();
});

it("tres bicis en el taller ocupan tres bloques seguidos y tres cupos", async () => {
  const booking = await crearOk({ bikes: TRES });

  expect(booking.bikeCount).toBe(3);
  expect(booking.bike).toBe("Trek Marlin");
  expect(booking.description).toBe("Mantención general");
  expect(await bloques(LUNES)).toEqual(["16:00", "16:30", "17:00"]);
  const extra = await db
    .select()
    .from(bookingBikes)
    .where(eq(bookingBikes.bookingId, booking.id))
    .orderBy(bookingBikes.position);
  expect(extra.map((row) => [row.position, row.bike, row.description])).toEqual([
    [2, "Oxford urbana", "Frenos"],
    [3, "Specialized Allez", "Cambio de cadena"],
  ]);
  expect(await cuposLibresEnLaWeb()).toBe(1);
});

it("un retiro de tres bicis ocupa dos bloques, tres cupos y un solo cargo", async () => {
  const booking = await crearOk({
    bikes: TRES,
    mode: "retiro",
    start: "16:00",
    comuna: "Vitacura",
    address: "Av. Las Flores 123",
  });

  expect(booking.pickupFeeClp).toBe(15000);
  expect(await bloques(LUNES)).toEqual(["16:00", "16:30"]);
  expect(await cuposLibresEnLaWeb()).toBe(1);
});

it("no entra una reserva de tres bicis si solo quedan dos cupos", async () => {
  await crearOk({ bikes: TRES.slice(0, 2), start: "15:00" });

  expect(await crear({ bikes: TRES, start: "17:00" })).toEqual({
    ok: false,
    code: "slot_unavailable",
  });
  expect(await crear({ bikes: TRES.slice(0, 2), start: "17:00" })).toMatchObject({ ok: true });
});

it("sin la lista de bicis la reserva es de una, como la web", async () => {
  const booking = await crearOk();

  expect(booking.bikeCount).toBe(1);
  expect(await db.select().from(bookingBikes)).toHaveLength(0);
  expect(await bloques(LUNES)).toEqual(["16:00"]);
  expect(await cuposLibresEnLaWeb()).toBe(3);
});

it("la base rechaza una cantidad fuera de rango", async () => {
  const booking = await crearOk();

  for (const bikeCount of [0, 4]) {
    await expect(
      db.execute(sql`update bookings set bike_count = ${bikeCount} where id = ${booking.id}`),
    ).rejects.toThrow();
  }
});

it("reprogramar una reserva de tres pide tres bloques seguidos en el día nuevo", async () => {
  const booking = await crearOk({ bikes: TRES });
  const martes = "2026-09-22";
  // Deja libre solo un hueco de dos bloques a las 15:00.
  await crearOk({ serviceDate: martes, start: "16:00" });

  const apretado = await rescheduleBooking(
    db,
    owner,
    { bookingId: booking.id, serviceDate: martes, start: "15:00" },
    NOW,
  );
  expect(apretado).toEqual({ ok: false, code: "slot_unavailable" });

  const cabe = await rescheduleBooking(
    db,
    owner,
    { bookingId: booking.id, serviceDate: martes, start: "16:30" },
    NOW,
  );
  expect(cabe).toMatchObject({ ok: true });
  expect(await bloques(martes)).toEqual(["16:00", "16:30", "17:00", "17:30"]);
  expect(await bloques(LUNES)).toEqual([]);
});

it("una lista vacía es una reserva de una bici y una de cuatro es un error de programación", async () => {
  // La pantalla valida de 1 a 3 con zod, pero el motor no puede depender de eso: sin guarda,
  // estas dos llamadas se estrellan contra `bookings_bike_count_check` y salen como 500.
  const vacia = await crear({ bikes: [] });

  expect(vacia).toMatchObject({ ok: true });
  if (vacia.ok) {
    expect(vacia.booking.bikeCount).toBe(1);
    expect(vacia.booking.bike).toBe("Trek Marlin");
  }

  await expect(
    crear({ bikes: [...TRES, { bike: "Cuarta", description: "No cabe" }], start: "17:00" }),
  ).rejects.toThrow(/entre 1 y 3/);
});

import { randomUUID } from "node:crypto";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { beforeEach, expect, it, vi } from "vitest";
import type { SessionUser } from "../../src/server/auth/admin-auth.ts";
import { listBookingBikes } from "../../src/server/booking/booking-bikes.ts";
import type { AppDb } from "../../src/server/db/client.ts";
import {
  type Booking,
  bookingBikes,
  bookings,
  branches,
  users,
} from "../../src/server/db/schema.ts";
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
const { default: Agenda } = await import("../../src/pages/admin/index.astro");
const { default: Detalle } = await import("../../src/pages/admin/reservas/[id].astro");

const SITE = "https://vectorbikes.cl";
/** 2026-10-22 12:00 hora local. */
const NOW = new Date("2026-10-22T15:00:00.000Z");
const DIA = "2026-10-23";

let test: TestDb;
let db: AppDb;

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
    { position: 3, bike: "Specialized Allez", description: "Cadena cambiada" },
  ].slice(0, bikeCount - 1);
  if (extra.length > 0) {
    await db.insert(bookingBikes).values(extra.map((bike) => ({ ...bike, bookingId: row.id })));
  }
  return row;
}

async function render(page: unknown, path: string, params?: Record<string, string>) {
  const container = await AstroContainer.create({ astroConfig: { site: SITE } });
  const response = await container.renderToResponse(page as never, {
    request: new Request(`${SITE}${path}`),
    params,
  });
  return response.text();
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
  holder.actor = {
    id: user.id,
    branchId: branch.id,
    role: "owner",
    name: user.name,
    email: user.email,
  };
  return async () => {
    holder.actor = null;
    holder.db = null;
    vi.useRealTimers();
    await test.close();
  };
});

it("devuelve las bicis extra de una reserva, en orden", async () => {
  const booking = await reserva(3);

  const extra = await listBookingBikes(db, booking.id);

  expect(extra.map((bike) => [bike.position, bike.bike])).toEqual([
    [2, "Oxford urbana"],
    [3, "Specialized Allez"],
  ]);
  const una = await reserva(1);
  expect(await listBookingBikes(db, una.id)).toEqual([]);
});

it("la agenda del día dice cuántas bicis trae cada reserva", async () => {
  await reserva(3);

  const html = await render(Agenda, `/admin?fecha=${DIA}`);

  expect(html).toContain("Trek Marlin");
  expect(html).toContain("3 bicis");
});

it("una reserva de una bici no dice la cantidad", async () => {
  await reserva(1);

  const html = await render(Agenda, `/admin?fecha=${DIA}`);

  expect(html).not.toContain("1 bicis");
  expect(html).not.toContain("1 bicicleta");
});

it("el detalle lista cada bicicleta con lo que necesita", async () => {
  const booking = await reserva(3);

  const html = await render(Detalle, `/admin/reservas/${booking.id}`, { id: booking.id });

  expect(html).toContain("3 bicicletas");
  expect(html).toContain("Trek Marlin");
  expect(html).toContain("Mantención general");
  expect(html).toContain("Oxford urbana");
  expect(html).toContain("Frenos");
  expect(html).toContain("Specialized Allez");
  expect(html).toContain("Cadena cambiada");
  // Con varias, la primera también se numera; es el mismo criterio del formulario.
  expect(html).toContain("Bicicleta 1");
  expect(html).toContain("Qué necesita la bici 1");
  expect(html).toContain("Qué necesita la bici 2");
});

it("con una bici el detalle conserva sus rótulos de siempre", async () => {
  const booking = await reserva(1);

  const html = await render(Detalle, `/admin/reservas/${booking.id}`, { id: booking.id });

  expect(html).toContain("<dt>Bicicleta</dt>");
  expect(html).toContain("<dt>Qué necesita</dt>");
  expect(html).not.toContain("Bicicleta 1");
});

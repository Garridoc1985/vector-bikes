import { randomUUID } from "node:crypto";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { beforeEach, expect, it, vi } from "vitest";
import type { SessionUser } from "../../src/server/auth/admin-auth.ts";
import { type CreateBookingInput, createBooking } from "../../src/server/booking/create-booking.ts";
import type { AppDb } from "../../src/server/db/client.ts";
import { type Booking, branches, users } from "../../src/server/db/schema.ts";
import { freeBlocks } from "../../src/server/taller/manual-booking.ts";
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
const { default: Reprogramar } = await import(
  "../../src/pages/taller/reservas/[id]/reprogramar.astro"
);

const SITE = "https://vectorbikes.cl";
/** 2026-09-15 12:00 hora local; el 17 es jueves (taller 15:00–20:00, retiro 09:00–20:00). */
const NOW = new Date("2026-09-15T15:00:00.000Z");
const DIA = "2026-09-17";

let test: TestDb;
let db: AppDb;

function input(overrides: Partial<CreateBookingInput> = {}): CreateBookingInput {
  return {
    mode: "taller",
    serviceDate: DIA,
    start: "15:00",
    customerName: "Patricia Cruzat",
    phoneE164: "+56911111111",
    email: null,
    bike: "Urbana Oxford",
    description: "Mantención general",
    comuna: null,
    address: null,
    ipHash: null,
    ...overrides,
  };
}

async function crear(overrides: Partial<CreateBookingInput> = {}): Promise<Booking> {
  const result = await createBooking(db, input(overrides), NOW);
  if (!result.ok) throw new Error(`no se creó la reserva: ${result.code}`);
  return result.booking;
}

/** Cuatro reservas de taller: el día queda sin cupo. Devuelve la primera. */
async function diaLleno(): Promise<Booking> {
  const first = await crear();
  for (const [index, start] of ["15:30", "16:00", "16:30"].entries())
    await crear({ start, phoneE164: `+5692222222${index}` });
  return first;
}

function starts(blocks: { start: string }[]) {
  return blocks.map((block) => block.start);
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

it("un día con cuatro cupos permite mover la reserva a otra hora del mismo día", async () => {
  const booking = await diaLleno();

  expect(await freeBlocks(db, DIA, "taller", NOW)).toEqual([]);
  const own = starts(await freeBlocks(db, DIA, "taller", NOW, 1, booking.id));

  expect(own).toContain("17:00");
  expect(own).toContain("15:00");
  expect(own).not.toContain("15:30");
  expect(own).not.toContain("16:30");
});

it("excluir otra reserva no libera el cupo propio", async () => {
  const booking = await diaLleno();
  // El 18 es feriado (Fiestas Patrias); el 22 es martes.
  const other = await crear({ serviceDate: "2026-09-22", phoneE164: "+56933333333" });

  expect(await freeBlocks(db, DIA, "taller", NOW, 1, other.id)).toEqual([]);
  expect(starts(await freeBlocks(db, DIA, "taller", NOW, 1, booking.id))).not.toEqual([]);
});

it("un retiro corrido 30 minutos ofrece el bloque que se solapa consigo mismo", async () => {
  const booking = await crear({
    mode: "retiro",
    start: "16:00",
    comuna: "Vitacura",
    address: "Av. Bicentenario 123",
  });

  const without = starts(await freeBlocks(db, DIA, "retiro", NOW));
  expect(without).not.toContain("15:30");
  expect(without).not.toContain("16:00");
  expect(without).not.toContain("16:30");

  const own = starts(await freeBlocks(db, DIA, "retiro", NOW, 1, booking.id));
  expect(own).toContain("15:30");
  expect(own).toContain("16:00");
  expect(own).toContain("16:30");
});

it("Reprogramar lista los bloques del mismo día aunque esté lleno", async () => {
  const booking = await diaLleno();

  const request = new Request(
    `${SITE}/taller/reservas/${booking.id}/reprogramar?service_date=${DIA}`,
  );
  const container = await AstroContainer.create({ astroConfig: { site: SITE } });
  const html = await (
    await container.renderToResponse(Reprogramar, { request, params: { id: booking.id } })
  ).text();

  expect(html).toContain('value="17:00"');
  expect(html).not.toContain('value="15:30"');
  expect(html).not.toContain("No hay bloques libres");
});

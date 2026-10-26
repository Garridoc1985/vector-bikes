import { randomUUID } from "node:crypto";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { beforeEach, expect, it, vi } from "vitest";
import type { SessionUser } from "../../src/server/auth/admin-auth.ts";
import { type CreateBookingInput, createBooking } from "../../src/server/booking/create-booking.ts";
import type { AppDb } from "../../src/server/db/client.ts";
import { type Booking, branches, users } from "../../src/server/db/schema.ts";
import { consoleOutbox } from "../../src/server/email/transport.ts";
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
const { default: NuevaReserva } = await import("../../src/pages/taller/reservas/nueva.astro");
const { default: Reprogramar } = await import(
  "../../src/pages/taller/reservas/[id]/reprogramar.astro"
);

const SITE = "https://vectorbikes.cl";
/** 2026-09-15 12:00 hora local; el 17 es jueves. */
const NOW = new Date("2026-09-15T15:00:00.000Z");
const MANANA = "2026-09-16";
const PASADO = "2026-09-17";
const GENERAL = "Revisa los datos de la reserva.";
const DETALLE = "El bloque ya no está disponible. Elige otro bloque o día.";

let test: TestDb;
let db: AppDb;

function input(overrides: Partial<CreateBookingInput> = {}): CreateBookingInput {
  return {
    mode: "taller",
    serviceDate: PASADO,
    start: "15:30",
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

async function post(path: string, data: Record<string, string>, params = {}) {
  const request = new Request(`${SITE}${path}`, {
    method: "POST",
    headers: { origin: SITE, "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(data),
  });
  const container = await AstroContainer.create({ astroConfig: { site: SITE } });
  const page = path.includes("/reprogramar") ? Reprogramar : NuevaReserva;
  return container.renderToResponse(page, { request, params });
}

/** Texto del aviso general y del error bajo el bloque. */
function avisos(html: string) {
  const alert = /<p role="alert">([^<]*)<\/p>/.exec(html)?.[1] ?? "";
  const field = /<p id="start-error">([^<]*)<\/p>/.exec(html)?.[1] ?? "";
  return { alert, field, veces: html.split("El bloque ya no está disponible").length - 1 };
}

beforeEach(async () => {
  consoleOutbox.length = 0;
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

it("Nueva reserva: el bloque tomado se explica una sola vez, bajo el select", async () => {
  await crear();

  const response = await post("/taller/reservas/nueva", {
    mode: "taller",
    service_date: PASADO,
    start: "15:30",
    bicis: "1",
    nombre: "Camila Soto",
    telefono: "9 2222 3333",
    bicicleta: "Trek Marlin",
    descripcion: "Mantención general",
    source: "telefono",
    consentimiento: "true",
  });

  // Nueva reserva responde 409 al bloque tomado (`slot_unavailable`, regla de server-api.md).
  expect(response.status).toBe(409);
  const { alert, field, veces } = avisos(await response.text());
  expect(alert).toBe(GENERAL);
  expect(field).toBe(DETALLE);
  expect(veces).toBe(1);
});

it("Reprogramar: el bloque tomado se explica una sola vez, bajo el select", async () => {
  const booking = await crear({ serviceDate: MANANA, start: "16:30" });
  await crear({ phoneE164: "+56922222222" });

  const response = await post(
    `/taller/reservas/${booking.id}/reprogramar`,
    { service_date: PASADO, start: "15:30" },
    { id: booking.id },
  );

  expect(response.status).toBe(422);
  const { alert, field, veces } = avisos(await response.text());
  expect(alert).toBe(GENERAL);
  expect(field).toBe(DETALLE);
  expect(veces).toBe(1);
});

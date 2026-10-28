import { randomUUID } from "node:crypto";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { eq } from "drizzle-orm";
import { beforeEach, expect, it, vi } from "vitest";
import type { SessionUser } from "../../src/server/auth/admin-auth.ts";
import type { AppDb } from "../../src/server/db/client.ts";
import { bookingBikes, bookings, branches, users } from "../../src/server/db/schema.ts";
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

const SITE = "https://vectorbikes.cl";
/** 2026-09-15 12:00 hora local; el 21 es lunes. */
const NOW = new Date("2026-09-15T15:00:00.000Z");
const LUNES = "2026-09-21";

let test: TestDb;
let db: AppDb;

function campos(extra: Record<string, string> = {}): Record<string, string> {
  return {
    mode: "taller",
    service_date: LUNES,
    start: "16:00",
    nombre: "Patricia Cruzat",
    telefono: "9 1111 2222",
    bicicleta: "Trek Marlin",
    descripcion: "Mantención general",
    source: "telefono",
    consentimiento: "true",
    ...extra,
  };
}

async function render(data?: Record<string, string>, search = "") {
  const request = new Request(`${SITE}/taller/reservas/nueva${search}`, {
    method: data ? "POST" : "GET",
    headers: data ? { origin: SITE, "content-type": "application/x-www-form-urlencoded" } : {},
    body: data ? new URLSearchParams(data) : undefined,
  });
  const container = await AstroContainer.create({ astroConfig: { site: SITE } });
  return container.renderToResponse(NuevaReserva, { request });
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

it("ofrece elegir de una a tres bicicletas", async () => {
  const html = await (await render(undefined, `?service_date=${LUNES}&mode=taller`)).text();

  expect(html).toContain("Cantidad de bicicletas");
  for (const cantidad of ["1", "2", "3"]) {
    expect(html).toContain(`value="${cantidad}"`);
  }
});

it("con tres bicicletas pide la marca y el detalle de cada una", async () => {
  const html = await (await render(undefined, `?service_date=${LUNES}&mode=taller&bicis=3`)).text();

  expect(html).toContain('name="bicicleta_2"');
  expect(html).toContain('name="descripcion_2"');
  expect(html).toContain('name="bicicleta_3"');
  expect(html).toContain('name="descripcion_3"');
  // Con una sola no aparecen.
  const una = await (await render(undefined, `?service_date=${LUNES}&mode=taller&bicis=1`)).text();
  expect(una).not.toContain('name="bicicleta_2"');
});

it("guarda una reserva de tres bicicletas y vuelve a la lista", async () => {
  const response = await render(
    campos({
      bicis: "3",
      bicicleta_2: "Oxford urbana",
      descripcion_2: "Frenos",
      bicicleta_3: "Specialized Allez",
      descripcion_3: "Cambio de cadena",
    }),
  );

  expect(response.status).toBe(303);
  expect(response.headers.get("location")).toContain("hecho=creada");
  const [booking] = await db.select().from(bookings);
  expect(booking?.bikeCount).toBe(3);
  const extra = await db
    .select()
    .from(bookingBikes)
    .where(eq(bookingBikes.bookingId, booking?.id ?? ""))
    .orderBy(bookingBikes.position);
  expect(extra.map((row) => row.bike)).toEqual(["Oxford urbana", "Specialized Allez"]);
});

it("si falta la tercera bicicleta responde 422 y conserva lo escrito", async () => {
  const response = await render(
    campos({
      bicis: "3",
      bicicleta_2: "Oxford urbana",
      descripcion_2: "Frenos",
      bicicleta_3: "",
      descripcion_3: "Cambio de cadena",
    }),
  );

  expect(response.status).toBe(422);
  const html = await response.text();
  expect(html).toContain('aria-describedby="bicicleta_3-error"');
  expect(html).toContain("Oxford urbana");
  expect(html).toContain("Cambio de cadena");
  expect(await db.select().from(bookings)).toHaveLength(0);
});

it("los bloques libres se calculan con la cantidad elegida", async () => {
  // Con tres bicis el último bloque que sirve es el que deja dos más por delante.
  const tres = await (await render(undefined, `?service_date=${LUNES}&mode=taller&bicis=3`)).text();
  const una = await (await render(undefined, `?service_date=${LUNES}&mode=taller&bicis=1`)).text();

  expect(una).toContain('value="19:30"');
  expect(tres).not.toContain('value="19:30"');
  expect(tres).toContain('value="18:30"');
});

import { randomUUID } from "node:crypto";
import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { eq } from "drizzle-orm";
import { beforeEach, expect, it, vi } from "vitest";
import type { SessionUser } from "../../src/server/auth/admin-auth.ts";
import type { AppDb } from "../../src/server/db/client.ts";
import { workOrders } from "../../src/server/db/schema-orders.ts";
import { bikes, customers } from "../../src/server/db/schema-taller.ts";
import { branches, users } from "../../src/server/db/schema.ts";
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
const { default: Nueva } = await import("../../src/pages/taller/recepcion/nueva.astro");

const SITE = "https://vectorbikes.cl";
const NOW = new Date("2026-10-23T15:00:00.000Z");

let test: TestDb;
let db: AppDb;
let customerId: string;
let bikeId: string;

async function render(data?: Record<string, string>, search = "") {
  const request = new Request(`${SITE}/taller/recepcion/nueva${search}`, {
    method: data ? "POST" : "GET",
    headers: data ? { origin: SITE, "content-type": "application/x-www-form-urlencoded" } : {},
    body: data ? new URLSearchParams(data) : undefined,
  });
  const container = await AstroContainer.create({ astroConfig: { site: SITE } });
  return container.renderToResponse(Nueva, { request });
}

/** `bikesOffered` lo manda el formulario cuando el cliente ya tiene bicis: dice que hubo que elegir. */
function datos(extra: Record<string, string> = {}): Record<string, string> {
  return { customerId, bikesOffered: "1", requestedService: "Mantención general", ...extra };
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
  const [customer] = await db
    .insert(customers)
    .values({ branchId: branch.id, name: "Patricia Cruzat", phoneE164: "+56911112222" })
    .returning();
  customerId = customer?.id ?? "";
  const [bike] = await db
    .insert(bikes)
    .values({ branchId: branch.id, customerId, brand: "Trek", model: "Marlin", bikeType: "mtb" })
    .returning();
  bikeId = bike?.id ?? "";
  return async () => {
    holder.actor = null;
    holder.db = null;
    vi.useRealTimers();
    await test.close();
  };
});

it("con un cliente que ya tiene bicis, ninguna viene marcada", async () => {
  const html = await (await render(undefined, `?cliente=${customerId}`)).text();

  expect(html).toContain("Trek Marlin");
  expect(html).toContain("Bicicleta nueva");
  // Ni la bici existente ni "Bicicleta nueva" arrancan elegidas.
  expect(html).not.toContain("checked");
});

it("si no se elige ninguna, lo dice en el campo y no crea la orden", async () => {
  const response = await render(datos(), `?cliente=${customerId}`);

  expect(response.status).toBe(422);
  const html = await response.text();
  expect(html).toContain("Elige la bicicleta o marca «Bicicleta nueva»");
  expect(html).toContain('aria-describedby="bikeId-error"');
  expect(await db.select().from(workOrders)).toHaveLength(0);
});

it("elegir la bici existente crea la orden con esa bici", async () => {
  const response = await render(datos({ bikeId }), `?cliente=${customerId}`);

  expect(response.status).toBe(303);
  const [order] = await db.select().from(workOrders);
  expect(order?.bikeId).toBe(bikeId);
});

it("marcar bicicleta nueva crea una bici más para el mismo cliente", async () => {
  const response = await render(
    datos({ bikeId: "nueva", brand: "Oxford", model: "Urbana", bikeType: "urbana" }),
    `?cliente=${customerId}`,
  );

  expect(response.status).toBe(303);
  const delCliente = await db.select().from(bikes).where(eq(bikes.customerId, customerId));
  expect(delCliente).toHaveLength(2);
  const [order] = await db.select().from(workOrders);
  expect(order?.bikeId).not.toBe(bikeId);
});

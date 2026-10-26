import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { log } from "../../src/lib/log.ts";
import { applyAdminAction } from "../../src/server/admin/agenda.ts";
import type { SessionUser } from "../../src/server/auth/admin-auth.ts";
import { cancelBooking } from "../../src/server/booking/cancel-booking.ts";
import { createBooking } from "../../src/server/booking/create-booking.ts";
import { auditLog } from "../../src/server/db/schema-taller.ts";
import { bookings, branches, users } from "../../src/server/db/schema.ts";
import { createManualBooking } from "../../src/server/taller/manual-booking.ts";
import type { ManualBookingInput } from "../../src/server/taller/manual-booking.ts";
import { createTestDb } from "../helpers/pglite.ts";
import type { TestDb } from "../helpers/pglite.ts";

/** 2026-09-15 12:00 hora local. */
const NOW = new Date("2026-09-15T15:00:00.000Z");
const DIA = "2026-09-17";
const noMail = { notify: async () => {} };
let test: TestDb;
let actor: SessionUser;

function input(overrides: Partial<ManualBookingInput> = {}): ManualBookingInput {
  return {
    mode: "taller",
    service_date: DIA,
    start: "16:30",
    nombre: "Javiera Rojas",
    telefono: "911111111",
    correo: "javiera@ejemplo.cl",
    bicicleta: "Ruta Specialized",
    descripcion: "Cambio de cadena y ajuste de frenos",
    source: "whatsapp",
    consentimiento: true,
    ...overrides,
  };
}

async function audits(action: string) {
  return test.db.select().from(auditLog).where(eq(auditLog.action, action));
}

async function manual(overrides: Partial<ManualBookingInput> = {}) {
  const result = await createManualBooking(test.db, actor, input(overrides), NOW, noMail);
  if (!result.ok) throw new Error(`no se creó la reserva: ${result.code}`);
  return result.booking;
}

function rejectAudits() {
  return test.client.exec(`
    create function reject_booking_audit() returns trigger language plpgsql as $$
    begin raise exception 'Auditoría no disponible'; end; $$;
    create trigger reject_booking_audit before insert on audit_log
    for each row execute function reject_booking_audit();
  `);
}

beforeEach(async () => {
  test = await createTestDb();
  vi.spyOn(log, "info").mockImplementation(() => {});
  const [branch] = await test.db.insert(branches).values({ name: "Vitacura" }).returning();
  if (!branch) throw new Error("Falta la sucursal.");
  const [user] = await test.db
    .insert(users)
    .values({
      branchId: branch.id,
      role: "reception",
      name: "Recepción",
      email: `${randomUUID()}@ejemplo.cl`,
      passwordHash: "hash-de-prueba",
    })
    .returning();
  if (!user) throw new Error("Falta el usuario.");
  actor = {
    id: user.id,
    branchId: branch.id,
    role: "reception",
    name: user.name,
    email: user.email,
  };
  return async () => {
    vi.restoreAllMocks();
    await test.close();
  };
});

describe("booking.created", () => {
  it("audita la reserva creada desde el taller con actor y sin datos personales", async () => {
    const booking = await manual({ bicis: 2, bicicleta_2: "Trek Marlin", descripcion_2: "Frenos" });

    const rows = await audits("booking.created");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      branchId: actor.branchId,
      actorUserId: actor.id,
      entity: "booking",
      entityId: booking.id,
      createdAt: NOW,
    });
    expect(rows[0]?.details).toEqual({
      code: booking.code,
      serviceDate: DIA,
      start: "16:30",
      mode: "taller",
      bikeCount: 2,
      source: "whatsapp",
    });
    const detalle = JSON.stringify(rows[0]?.details);
    expect(detalle).not.toContain("Javiera");
    expect(detalle).not.toContain("911111111");
    expect(detalle).not.toContain("javiera@ejemplo.cl");
  });

  it("una reserva rechazada no deja auditoría", async () => {
    await manual();

    const result = await createManualBooking(
      test.db,
      actor,
      input({ telefono: "922222222" }),
      NOW,
      noMail,
    );

    expect(result).toEqual({ ok: false, code: "slot_unavailable" });
    expect(await audits("booking.created")).toHaveLength(1);
  });

  it("si la auditoría falla, la reserva tampoco se crea", async () => {
    await rejectAudits();

    await expect(createManualBooking(test.db, actor, input(), NOW, noMail)).rejects.toThrow();
    expect(await test.db.select().from(bookings)).toHaveLength(0);
  });

  it("la reserva web no se audita: no hay actor", async () => {
    const result = await createBooking(
      test.db,
      {
        mode: "taller",
        serviceDate: DIA,
        start: "15:00",
        customerName: "Patricia Cruzat",
        phoneE164: "+56933333333",
        email: null,
        bike: "Urbana Oxford",
        description: "Mantención general",
        comuna: null,
        address: null,
        ipHash: null,
      },
      NOW,
    );

    expect(result.ok).toBe(true);
    expect(await audits("booking.created")).toHaveLength(0);
  });
});

describe("booking.cancelled", () => {
  it("audita la cancelación desde la agenda con actor y sin datos personales", async () => {
    const booking = await manual();

    const result = await applyAdminAction(test.db, booking.id, "cancelar", NOW, actor);

    expect(result.ok).toBe(true);
    const rows = await audits("booking.cancelled");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      branchId: actor.branchId,
      actorUserId: actor.id,
      entity: "booking",
      entityId: booking.id,
      createdAt: NOW,
    });
    expect(rows[0]?.details).toEqual({
      code: booking.code,
      serviceDate: DIA,
      start: "16:30",
      mode: "taller",
    });
    const detalle = JSON.stringify(rows[0]?.details);
    expect(detalle).not.toContain("Javiera");
    expect(detalle).not.toContain("911111111");
  });

  it("una cancelación rechazada no deja auditoría", async () => {
    const booking = await manual();
    await applyAdminAction(test.db, booking.id, "cancelar", NOW, actor);

    const again = await applyAdminAction(test.db, booking.id, "cancelar", NOW, actor);

    expect(again).toEqual({ ok: false, code: "invalid_transition" });
    expect(await audits("booking.cancelled")).toHaveLength(1);
  });

  it("si la auditoría falla, la reserva sigue confirmada", async () => {
    const booking = await manual();
    await rejectAudits();

    await expect(applyAdminAction(test.db, booking.id, "cancelar", NOW, actor)).rejects.toThrow();
    const [row] = await test.db.select().from(bookings).where(eq(bookings.id, booking.id));
    expect(row?.status).toBe("confirmed");
  });

  it("la cancelación por el enlace del cliente no se audita", async () => {
    const booking = await manual();

    const result = await cancelBooking(test.db, {
      bookingId: booking.id,
      by: "customer",
      now: NOW,
    });

    expect(result.ok).toBe(true);
    expect(await audits("booking.cancelled")).toHaveLength(0);
  });
});

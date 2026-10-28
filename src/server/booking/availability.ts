import { and, between, eq, ne, sql } from "drizzle-orm";
import type { AppDb } from "../db/client.ts";
import { blockedPeriods, bookingBlocks, bookings } from "../db/schema.ts";
import type { DayInput } from "./slots.ts";

export type DayData = Pick<DayInput, "activeBlockStarts" | "blocked" | "usedCount">;

const hhmm = (value: string | null) => (value === null ? null : value.slice(0, 5));

/**
 * Bloques activos, bloqueos y conteo de todo el rango `[from, to]` en tres consultas fijas,
 * sin importar cuántos días tenga. Devuelve los datos de cada fecha para `computeDay`.
 * `excludeBookingId` deja fuera una reserva (sus bloques y su cupo), como `readDay`: así una
 * reprogramación ve libres el bloque y el cupo que hoy ocupa ella misma.
 */
export async function readRange(
  db: AppDb,
  from: string,
  to: string,
  excludeBookingId?: string,
): Promise<(date: string) => DayData> {
  const blocks = await db
    .select({ serviceDate: bookingBlocks.serviceDate, blockStart: bookingBlocks.blockStart })
    .from(bookingBlocks)
    .where(
      and(
        eq(bookingBlocks.isActive, true),
        between(bookingBlocks.serviceDate, from, to),
        excludeBookingId === undefined ? undefined : ne(bookingBlocks.bookingId, excludeBookingId),
      ),
    );
  const blocked = await db
    .select({
      serviceDate: blockedPeriods.serviceDate,
      startTime: blockedPeriods.startTime,
      endTime: blockedPeriods.endTime,
    })
    .from(blockedPeriods)
    .where(between(blockedPeriods.serviceDate, from, to));
  const used = await db
    .select({ serviceDate: bookings.serviceDate, n: sql<number>`sum(${bookings.bikeCount})` })
    .from(bookings)
    .where(
      and(
        between(bookings.serviceDate, from, to),
        ne(bookings.status, "cancelled"),
        excludeBookingId === undefined ? undefined : ne(bookings.id, excludeBookingId),
      ),
    )
    .groupBy(bookings.serviceDate);

  return (date) => ({
    activeBlockStarts: blocks
      .filter((row) => row.serviceDate === date)
      .map((row) => row.blockStart.slice(0, 5)),
    blocked: blocked
      .filter((row) => row.serviceDate === date)
      .map((row) => ({ startTime: hhmm(row.startTime), endTime: hhmm(row.endTime) })),
    usedCount: Number(used.find((row) => row.serviceDate === date)?.n ?? 0),
  });
}

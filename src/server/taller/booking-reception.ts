import { and, eq, sql } from "drizzle-orm";
import type { SessionUser } from "../auth/admin-auth.ts";
import type { AppDb } from "../db/client.ts";
import { workOrders } from "../db/schema-orders.ts";
import { bookings } from "../db/schema.ts";

/**
 * Qué bici de la reserva toca recibir, o `null` si ya están todas. El join es a la izquierda: una
 * reserva sin ninguna orden todavía también tiene una bici pendiente, la primera.
 */
export async function nextBookingReception(db: AppDb, actor: SessionUser, bookingId: string) {
  const [booking] = await db
    .select({
      id: bookings.id,
      bikeCount: bookings.bikeCount,
      created: sql<number>`count(${workOrders.id})`,
    })
    .from(bookings)
    .leftJoin(
      workOrders,
      and(eq(workOrders.bookingId, bookings.id), eq(workOrders.branchId, actor.branchId)),
    )
    .where(eq(bookings.id, bookingId))
    .groupBy(bookings.id, bookings.bikeCount);
  if (!booking || Number(booking.created) >= booking.bikeCount) return null;
  return { bookingId: booking.id, position: Number(booking.created) + 1, total: booking.bikeCount };
}

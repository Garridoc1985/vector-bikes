import { asc, eq } from "drizzle-orm";
import type { AppDb } from "../db/client.ts";
import { bookingBikes } from "../db/schema.ts";

/** Bicicletas 2 y 3 de una reserva, en orden. Vacío si la reserva es de una. */
export async function listBookingBikes(db: AppDb, bookingId: string) {
  return db
    .select({
      position: bookingBikes.position,
      bike: bookingBikes.bike,
      description: bookingBikes.description,
    })
    .from(bookingBikes)
    .where(eq(bookingBikes.bookingId, bookingId))
    .orderBy(asc(bookingBikes.position));
}

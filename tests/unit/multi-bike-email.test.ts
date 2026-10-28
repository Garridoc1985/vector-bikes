import { describe, expect, it } from "vitest";
import type { BookingBikeLine } from "../../src/server/email/templates.ts";
import {
  customerConfirmationEmail,
  reminderEmail,
  shopNewBookingEmail,
} from "../../src/server/email/templates.ts";
import type { Booking } from "../../src/server/db/schema.ts";

const BOOKING = {
  code: "VB-261023-1600",
  serviceDate: "2026-10-23",
  mode: "taller",
  bikeCount: 3,
  startsAt: new Date("2026-10-23T19:00:00.000Z"),
  endsAt: new Date("2026-10-23T20:30:00.000Z"),
  customerName: "Patricia Cruzat",
  phoneE164: "+56911112222",
  email: "patricia@ejemplo.cl",
  bike: "Trek Marlin",
  description: "Mantención general",
  comuna: null,
  address: null,
  pickupFeeClp: 0,
} as unknown as Booking;

const EXTRA: BookingBikeLine[] = [
  { position: 2, bike: "Oxford urbana", description: "Frenos" },
  { position: 3, bike: "Specialized Allez", description: "Cambio de cadena" },
];

const UNA = { ...BOOKING, bikeCount: 1 } as Booking;

describe("correos con varias bicicletas", () => {
  it("la confirmación nombra cada bicicleta con lo que necesita", () => {
    const email = customerConfirmationEmail(BOOKING, "https://vectorbikes.cl/x", EXTRA);

    for (const body of [email.text, email.html]) {
      expect(body).toContain("Bicicleta 1");
      expect(body).toContain("Trek Marlin");
      expect(body).toContain("Mantención general");
      expect(body).toContain("Bicicleta 2");
      expect(body).toContain("Oxford urbana");
      expect(body).toContain("Frenos");
      expect(body).toContain("Bicicleta 3");
      expect(body).toContain("Specialized Allez");
      expect(body).toContain("Cambio de cadena");
    }
  });

  it("con una bicicleta el correo queda igual que siempre", () => {
    const antes = customerConfirmationEmail(UNA, "https://vectorbikes.cl/x");
    const despues = customerConfirmationEmail(UNA, "https://vectorbikes.cl/x", []);

    expect(despues).toEqual(antes);
    expect(antes.text).toContain("Bicicleta: Trek Marlin");
    expect(antes.text).not.toContain("Bicicleta 1");
  });

  it("el recordatorio y el aviso al taller también las nombran", () => {
    expect(reminderEmail(BOOKING, EXTRA).text).toContain("Oxford urbana");
    expect(shopNewBookingEmail(BOOKING, EXTRA).text).toContain("Specialized Allez");
    expect(reminderEmail(UNA).text).toEqual(reminderEmail(UNA, []).text);
  });

  it("el retiro cobra una sola vez aunque sean tres bicicletas", () => {
    const retiro = {
      ...BOOKING,
      mode: "retiro",
      comuna: "Vitacura",
      address: "Av. Las Flores 123",
      pickupFeeClp: 15000,
    } as Booking;

    const texto = customerConfirmationEmail(retiro, "https://vectorbikes.cl/x", EXTRA).text;

    expect(texto.match(/\$15\.000/g) ?? []).toHaveLength(1);
  });
});

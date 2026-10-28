import holidays from "../../data/feriados-cl.json" with { type: "json" };
import { BOOKING_AVAILABILITY_DAYS } from "./booking-state.ts";

const holidayNames = new Map(holidays.map((holiday) => [holiday.date, holiday.name]));

const chileDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Santiago",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Fecha civil de Chile, independiente de la zona horaria del dispositivo. */
export function todayInSantiago(now: Date = new Date()): string {
  const parts = chileDate.formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function calendarDate(date: Date): string {
  return [date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate()]
    .map((part, index) => String(part).padStart(index === 0 ? 4 : 2, "0"))
    .join("-");
}

/** 14 fechas civiles desde hoy; UTC solo sirve de calendario, no de reloj chileno. */
export function bookingDateRange(today: string): string[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) return [];
  const cursor = new Date(`${today}T00:00:00.000Z`);
  if (Number.isNaN(cursor.getTime()) || calendarDate(cursor) !== today) return [];
  return Array.from({ length: BOOKING_AVAILABILITY_DAYS }, () => {
    const date = calendarDate(cursor);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    return date;
  });
}

/** Los cierres se identifican sin quitar fechas del rango ni inventar feriados. */
export function bookingDateStatus(date: string): { closed: boolean; label: string } {
  const sunday = new Date(`${date}T00:00:00.000Z`).getUTCDay() === 0;
  const holiday = holidayNames.get(date);
  const reasons = [sunday ? "Cerrado · domingo" : "", holiday ? `Feriado · ${holiday}` : ""];
  return { closed: sunday || holiday !== undefined, label: reasons.filter(Boolean).join(" · ") };
}

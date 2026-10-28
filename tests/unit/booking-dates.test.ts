import { describe, expect, it } from "vitest";
import {
  bookingDateRange,
  bookingDateStatus,
  todayInSantiago,
} from "../../src/components/islands/booking-dates.ts";

describe("fecha civil de Chile", () => {
  it.each([
    ["2026-10-29T02:59:59.999Z", "2026-10-28"],
    ["2026-10-29T03:00:00.000Z", "2026-10-29"],
    ["2026-07-02T03:59:59.999Z", "2026-07-01"],
    ["2026-07-02T04:00:00.000Z", "2026-07-02"],
    ["2026-04-05T02:59:59.999Z", "2026-04-04"],
    ["2026-04-05T03:00:00.000Z", "2026-04-04"],
    ["2026-04-05T04:00:00.000Z", "2026-04-05"],
    ["2026-09-06T03:59:59.999Z", "2026-09-05"],
    ["2026-09-06T04:00:00.000Z", "2026-09-06"],
  ])("convierte %s a %s, incluido el cambio de hora", (instant, expected) => {
    expect(todayInSantiago(new Date(instant))).toBe(expected);
  });
});

describe("horizonte móvil de 14 fechas", () => {
  it.each([
    ["2026-03-25", "2026-04-07"],
    ["2026-08-25", "2026-09-07"],
    ["2026-12-20", "2027-01-02"],
    ["2028-02-20", "2028-03-04"],
  ])("mantiene 14 fechas consecutivas de %s a %s", (today, last) => {
    const dates = bookingDateRange(today);
    expect(dates).toHaveLength(14);
    expect(new Set(dates).size).toBe(14);
    expect(dates[0]).toBe(today);
    expect(dates.at(-1)).toBe(last);
    expect(dates).toEqual([...dates].sort());
  });

  it("retira la vencida y agrega una fecha nueva al cambiar hoy", () => {
    const before = bookingDateRange("2026-10-28");
    const after = bookingDateRange("2026-10-29");
    expect(after.slice(0, 13)).toEqual(before.slice(1));
    expect(after).not.toContain("2026-10-28");
    expect(after.at(-1)).toBe("2026-11-11");
  });

  it("incluye cada fecha del cambio de hora sin saltos ni repeticiones", () => {
    expect(bookingDateRange("2026-04-03").slice(0, 4)).toEqual([
      "2026-04-03",
      "2026-04-04",
      "2026-04-05",
      "2026-04-06",
    ]);
    expect(bookingDateRange("2026-09-04").slice(0, 4)).toEqual([
      "2026-09-04",
      "2026-09-05",
      "2026-09-06",
      "2026-09-07",
    ]);
  });

  it.each(["", "2026-02-30", "2026-13-01", "28-10-2026"])(
    "no inventa un rango desde una fecha inválida: %s",
    (today) => {
      expect(bookingDateRange(today)).toEqual([]);
    },
  );
});

describe("cierres visibles en el selector", () => {
  it("mantiene los sábados normales seleccionables y los domingos cerrados", () => {
    expect(bookingDateStatus("2026-10-24")).toEqual({ closed: false, label: "" });
    expect(bookingDateStatus("2026-10-25")).toEqual({
      closed: true,
      label: "Cerrado · domingo",
    });
  });

  it("identifica el feriado del archivo existente aunque caiga en sábado", () => {
    expect(bookingDateStatus("2026-10-31")).toEqual({
      closed: true,
      label: "Feriado · Día de las Iglesias Evangélicas y Protestantes",
    });
  });

  it("informa ambos motivos cuando coinciden domingo y feriado", () => {
    expect(bookingDateStatus("2026-11-01")).toEqual({
      closed: true,
      label: "Cerrado · domingo · Feriado · Día de Todos los Santos",
    });
  });

  it("reutiliza feriados 2027 ya registrados y no inventa los de otros años", () => {
    expect(bookingDateStatus("2027-01-01")).toEqual({
      closed: true,
      label: "Feriado · Año Nuevo",
    });
    expect(bookingDateStatus("2028-01-01")).toEqual({ closed: false, label: "" });
  });

  it("mantiene domingos y feriados dentro de las 14 fechas corridas", () => {
    const dates = bookingDateRange("2026-10-28");
    expect(dates).toHaveLength(14);
    expect(dates).toContain("2026-10-31");
    expect(dates).toContain("2026-11-01");
    expect(dates.at(-1)).toBe("2026-11-10");
  });
});

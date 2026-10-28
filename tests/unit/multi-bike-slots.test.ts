import { describe, expect, it } from "vitest";
import { MAX_BIKES_PER_BOOKING, blocksFor } from "../../src/server/booking/rules.ts";
import { checkStart, computeDay } from "../../src/server/booking/slots.ts";

/** 2026-09-15 12:00 hora local; el 21 es lunes. */
const NOW = new Date("2026-09-15T15:00:00.000Z");
const LUNES = "2026-09-21";

function dia(extra: Partial<Parameters<typeof computeDay>[0]> = {}) {
  return {
    date: LUNES,
    mode: "taller" as const,
    now: NOW,
    activeBlockStarts: [] as string[],
    blocked: [] as { startTime: string | null; endTime: string | null }[],
    usedCount: 0,
    ...extra,
  };
}

describe("bloques y cupos con varias bicicletas", () => {
  it("el retiro usa dos bloques sin importar cuántas bicis sean", () => {
    expect(blocksFor("retiro", 1)).toBe(2);
    expect(blocksFor("retiro", 3)).toBe(2);
  });

  it("en el taller cada bici ocupa su bloque", () => {
    expect(blocksFor("taller", 1)).toBe(1);
    expect(blocksFor("taller", 3)).toBe(3);
    expect(MAX_BIKES_PER_BOOKING).toBe(3);
  });

  it("tres bicis en el taller toman tres bloques seguidos", () => {
    const result = checkStart({ ...dia({ bikeCount: 3 }), start: "16:00" });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.blockStarts).toEqual(["16:00", "16:30", "17:00"]);
  });

  it("no caben tres bicis si el tercer bloque está tomado", () => {
    const tomado = dia({ bikeCount: 3, activeBlockStarts: ["17:00"] });

    expect(checkStart({ ...tomado, start: "16:00" }).ok).toBe(false);
    // Con dos bicis sí cabe: necesita 16:00 y 16:30.
    expect(checkStart({ ...tomado, bikeCount: 2, start: "16:00" }).ok).toBe(true);
  });

  it("el día marca sin cupo cuando las bicis no caben en lo que queda", () => {
    // Dos cupos libres de cuatro: una reserva de tres no entra.
    const result = checkStart({ ...dia({ bikeCount: 3, usedCount: 2 }), start: "16:00" });

    expect(result.ok).toBe(false);
    expect(computeDay(dia({ bikeCount: 3, usedCount: 2 })).status).toBe("full");
    expect(computeDay(dia({ bikeCount: 2, usedCount: 2 })).status).toBe("open");
  });

  it("sin cantidad declarada todo se comporta como una bici", () => {
    expect(computeDay(dia({ usedCount: 3 })).status).toBe("open");
    expect(checkStart({ ...dia({ usedCount: 3 }), start: "16:00" }).ok).toBe(true);
    expect(computeDay(dia({ usedCount: 4 })).status).toBe("full");
  });

  it("un retiro de tres bicis sigue tomando dos bloques", () => {
    const result = checkStart({ ...dia({ mode: "retiro", bikeCount: 3 }), start: "16:00" });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.blockStarts).toEqual(["16:00", "16:30"]);
  });
});

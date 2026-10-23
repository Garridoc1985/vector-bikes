import { describe, expect, it } from "vitest";
import {
  MAX_PHOTO_BYTES,
  MAX_QUEUED_PHOTOS,
  addToQueue,
  afterUpload,
  removeFromQueue,
} from "../../src/lib/photo-queue.ts";
import type { QueuedPhoto } from "../../src/lib/photo-queue.ts";

/** Un archivo de mentira con el tamaño y el tipo que importan. */
function archivo(name: string, size = 1024, type = "image/jpeg"): File {
  return { name, size, type } as File;
}

function cola(cuantas: number): QueuedPhoto[] {
  return Array.from({ length: cuantas }, (_, index) => ({
    id: `p${index}`,
    file: archivo(`foto-${index}.jpg`),
    error: null,
  }));
}

describe("cola de fotos", () => {
  it("acepta hasta veinte y rechaza la que sobra", () => {
    const { queue, rejected } = addToQueue(cola(19), [archivo("a.jpg"), archivo("b.jpg")]);

    expect(queue).toHaveLength(MAX_QUEUED_PHOTOS);
    expect(rejected).toEqual(["Máximo 20 fotos por vez"]);
  });

  it("quitar una deja lugar para otra", () => {
    const llena = addToQueue(cola(19), [archivo("a.jpg")]).queue;
    expect(addToQueue(llena, [archivo("b.jpg")]).queue).toHaveLength(MAX_QUEUED_PHOTOS);

    const conHueco = removeFromQueue(llena, llena[0]?.id ?? "");

    expect(conHueco).toHaveLength(MAX_QUEUED_PHOTOS - 1);
    expect(addToQueue(conHueco, [archivo("b.jpg")]).queue).toHaveLength(MAX_QUEUED_PHOTOS);
  });

  it("rechaza lo que pesa más de 15 MB y lo que no es una foto", () => {
    const pesada = archivo("grande.jpg", MAX_PHOTO_BYTES + 1);
    const texto = archivo("notas.txt", 100, "text/plain");

    const { queue, rejected } = addToQueue([], [pesada, texto, archivo("buena.jpg")]);

    expect(queue).toHaveLength(1);
    expect(rejected).toEqual(["grande.jpg pesa más de 15 MB", "notas.txt no es una foto"]);
  });

  it("después de subir, solo quedan las que fallaron", () => {
    const antes = cola(3);

    const despues = afterUpload(antes, [
      { id: "p0", ok: true },
      { id: "p1", ok: false, error: "No se pudo subir la foto. Intenta de nuevo." },
      { id: "p2", ok: true },
    ]);

    expect(despues.map((photo) => photo.id)).toEqual(["p1"]);
    expect(despues[0]?.error).toBe("No se pudo subir la foto. Intenta de nuevo.");
  });

  it("si suben todas, la cola queda vacía", () => {
    const despues = afterUpload(cola(2), [
      { id: "p0", ok: true },
      { id: "p1", ok: true },
    ]);

    expect(despues).toEqual([]);
  });
});

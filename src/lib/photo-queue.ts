/**
 * Cola de fotos antes de subirlas. Es pura y sin DOM para poder probarla sola: la isla
 * `PhotoCapture` se encarga de las miniaturas, de la subida y de liberar las URL.
 */

export const MAX_QUEUED_PHOTOS = 20;
export const MAX_PHOTO_BYTES = 15 * 1024 * 1024;

export type QueuedPhoto = { id: string; file: File; error: string | null };
export type UploadOutcome = { id: string; ok: boolean; error?: string };

/** Por qué una foto no entra a la cola, o `null` si entra. */
function rejectionOf(file: File): string | null {
  if (!file.type.startsWith("image/")) return `${file.name} no es una foto`;
  if (file.size > MAX_PHOTO_BYTES) return `${file.name} pesa más de 15 MB`;
  return null;
}

/**
 * Agrega lo que quepa y devuelve el motivo de cada descarte. El tope se informa una sola vez,
 * aunque sobren varias: es el mismo motivo.
 */
export function addToQueue(
  queue: QueuedPhoto[],
  files: File[],
  newId: () => string = () => crypto.randomUUID(),
): { queue: QueuedPhoto[]; rejected: string[] } {
  const added: QueuedPhoto[] = [];
  const rejected: string[] = [];
  let full = false;
  for (const file of files) {
    const rejection = rejectionOf(file);
    if (rejection !== null) {
      rejected.push(rejection);
      continue;
    }
    if (queue.length + added.length >= MAX_QUEUED_PHOTOS) {
      full = true;
      continue;
    }
    added.push({ id: newId(), file, error: null });
  }
  if (full) rejected.push(`Máximo ${MAX_QUEUED_PHOTOS} fotos por vez`);
  return { queue: [...queue, ...added], rejected };
}

export function removeFromQueue(queue: QueuedPhoto[], id: string): QueuedPhoto[] {
  return queue.filter((photo) => photo.id !== id);
}

/** Deja en la cola solo las que fallaron, con su error, para poder reintentarlas. */
export function afterUpload(queue: QueuedPhoto[], outcomes: UploadOutcome[]): QueuedPhoto[] {
  const failed = new Map(
    outcomes.filter((outcome) => !outcome.ok).map((outcome) => [outcome.id, outcome.error ?? null]),
  );
  return queue
    .filter((photo) => failed.has(photo.id))
    .map((photo) => ({ ...photo, error: failed.get(photo.id) ?? null }));
}

import { useEffect, useRef, useState } from "preact/hooks";
import {
  addToQueue,
  afterUpload,
  MAX_QUEUED_PHOTOS,
  removeFromQueue,
} from "../../lib/photo-queue.ts";
import type { QueuedPhoto, UploadOutcome } from "../../lib/photo-queue.ts";

interface Props {
  uploadUrl: string;
  stage: "recepcion" | "reparacion" | "terminado";
  label?: string;
}

const UPLOAD_ERROR = "No se pudo subir la foto. Intenta de nuevo.";
const touchStyle = { minHeight: "48px", minWidth: "48px" };

function uploadPhoto(
  url: string,
  stage: Props["stage"],
  file: File,
  onProgress: (value: number) => void,
) {
  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    const form = new FormData();
    form.append("foto", file);
    form.append("etapa", stage);
    request.open("POST", url);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress((event.loaded / event.total) * 100);
    };
    request.onload = () => {
      if (request.status === 201) return resolve();
      reject(
        new Error(
          request.status === 413
            ? "La foto pesa más de 15 MB"
            : request.status === 415
              ? "Ese archivo no es una foto"
              : UPLOAD_ERROR,
        ),
      );
    };
    request.onerror = request.onabort = request.ontimeout = () => reject(new Error(UPLOAD_ERROR));
    request.send(form);
  });
}

async function shrinkPhoto(file: File): Promise<File> {
  let bitmap: ImageBitmap | undefined;
  try {
    if (typeof createImageBitmap !== "function") return file;
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, 2560 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) return file;
    context.fillStyle = "white";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.85),
    );
    if (!blob) return file;
    return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.jpg`, { type: "image/jpeg" });
  } catch {
    return file;
  } finally {
    bitmap?.close();
  }
}

function usePendingWarning(pending: boolean) {
  const warning = useRef((event: BeforeUnloadEvent) => {
    event.preventDefault();
    event.returnValue = "";
  });
  const clearWarning = () => window.removeEventListener("beforeunload", warning.current);
  useEffect(() => {
    if (pending) window.addEventListener("beforeunload", warning.current);
    return clearWarning;
  }, [pending]);
  return clearWarning;
}

function usePhotoQueue() {
  const [queue, setQueue] = useState<QueuedPhoto[]>([]);
  const current = useRef<QueuedPhoto[]>([]);
  const previews = useRef(new Map<string, string>());
  const clearWarning = usePendingWarning(queue.length > 0);
  useEffect(() => {
    const urls = previews.current;
    return () => {
      for (const url of urls.values()) URL.revokeObjectURL(url);
      urls.clear();
    };
  }, []);

  function replaceQueue(next: QueuedPhoto[]) {
    const ids = new Set(next.map((photo) => photo.id));
    for (const [id, url] of previews.current) {
      if (ids.has(id)) continue;
      URL.revokeObjectURL(url);
      previews.current.delete(id);
    }
    for (const photo of next) {
      if (!previews.current.has(photo.id)) {
        previews.current.set(photo.id, URL.createObjectURL(photo.file));
      }
    }
    if (next.length === 0) clearWarning();
    current.current = next;
    setQueue(next);
  }

  return { queue, current, previews: previews.current, replaceQueue };
}

type PhotoQueue = ReturnType<typeof usePhotoQueue>;

async function uploadQueuedPhoto(
  photo: QueuedPhoto,
  props: Props,
  onProgress: (value: number) => void,
): Promise<UploadOutcome> {
  try {
    const file = await shrinkPhoto(photo.file);
    await uploadPhoto(props.uploadUrl, props.stage, file, onProgress);
    return { id: photo.id, ok: true };
  } catch (error) {
    return {
      id: photo.id,
      ok: false,
      error: error instanceof Error ? error.message : UPLOAD_ERROR,
    };
  }
}

function usePhotoUpload(props: Props, photos: PhotoQueue) {
  const busy = useRef(false);
  const mounted = useRef(false);
  const [ready, setReady] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  useEffect(() => {
    mounted.current = true;
    setReady(true);
    return () => {
      mounted.current = false;
    };
  }, []);

  async function uploadAll() {
    const batch = photos.current.current;
    if (busy.current || batch.length === 0) return;
    busy.current = true;
    setUploading(true);
    setProgress(0);
    const outcomes: UploadOutcome[] = [];
    for (const [index, photo] of batch.entries()) {
      if (!mounted.current) return;
      setMessage(`Subiendo ${index + 1} de ${batch.length}`);
      const outcome = await uploadQueuedPhoto(photo, props, (value) => {
        if (mounted.current) setProgress((index * 100 + value) / batch.length);
      });
      outcomes.push(outcome);
      if (mounted.current) setProgress(((index + 1) / batch.length) * 100);
    }
    if (!mounted.current) return;
    const remaining = afterUpload(batch, outcomes);
    photos.replaceQueue(remaining);
    busy.current = false;
    setUploading(false);
    if (remaining.length === 0) window.location.reload();
    else setMessage(`Quedan ${remaining.length} fotos sin subir. Revisa los errores y reintenta.`);
  }

  return { ready, uploading, busy, progress, message, setMessage, setProgress, uploadAll };
}

type PhotoUpload = ReturnType<typeof usePhotoUpload>;

function selectFiles(event: Event, photos: PhotoQueue, upload: PhotoUpload) {
  const input = event.currentTarget as HTMLInputElement;
  const files = Array.from(input.files ?? []);
  input.value = "";
  if (upload.busy.current || files.length === 0) return;
  const result = addToQueue(photos.current.current, files);
  photos.replaceQueue(result.queue);
  upload.setProgress(0);
  upload.setMessage(result.rejected.join(". "));
}

interface PickerProps {
  label: string;
  camera?: boolean;
  disabled: boolean;
  onChange: (event: Event) => void;
}

function PhotoPicker({ label, camera, disabled, onChange }: PickerProps) {
  return (
    <label class="btn tap" style={{ ...touchStyle, position: "relative" }} aria-disabled={disabled}>
      {label}
      <input
        type="file"
        aria-label={label}
        accept="image/*"
        capture={camera ? "environment" : undefined}
        multiple
        disabled={disabled}
        onChange={onChange}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0 }}
      />
    </label>
  );
}

interface QueueViewProps {
  photos: PhotoQueue;
  upload: PhotoUpload;
}

interface ThumbnailProps extends QueueViewProps {
  photo: QueuedPhoto;
  index: number;
}

function PhotoPreview({ photo, index, photos }: Omit<ThumbnailProps, "upload">) {
  return (
    <>
      <img
        src={photos.previews.get(photo.id)}
        alt={`Foto ${index + 1}: ${photo.file.name}`}
        width={120}
        height={120}
        style={{
          width: "100%",
          height: "120px",
          objectFit: "cover",
          border: "1px solid var(--rule)",
        }}
      />
      <span style={{ overflowWrap: "anywhere" }}>
        {index + 1}. {photo.file.name}
      </span>
    </>
  );
}

function PhotoThumbnail({ photo, index, photos, upload }: ThumbnailProps) {
  return (
    <li style={{ display: "grid", gap: "8px", minWidth: 0, alignContent: "start" }}>
      <PhotoPreview photo={photo} index={index} photos={photos} />
      {photo.error && <p>Error: {photo.error}</p>}
      <button
        type="button"
        class="btn tap"
        style={touchStyle}
        aria-label={`Quitar foto ${index + 1}: ${photo.file.name}`}
        disabled={upload.uploading}
        onClick={() => {
          if (upload.busy.current) return;
          photos.replaceQueue(removeFromQueue(photos.current.current, photo.id));
          upload.setProgress(0);
          upload.setMessage("");
        }}
      >
        Quitar
      </button>
    </li>
  );
}

function PhotoList({ photos, upload }: QueueViewProps) {
  return (
    <ul
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
        gap: "8px",
        listStyle: "none",
        padding: 0,
        margin: 0,
      }}
    >
      {photos.queue.map((photo, index) => (
        <PhotoThumbnail
          key={photo.id}
          photo={photo}
          index={index}
          photos={photos}
          upload={upload}
        />
      ))}
    </ul>
  );
}

function PhotoControls({ photos, upload, label }: QueueViewProps & { label?: string }) {
  const disabled = !upload.ready || upload.uploading || photos.queue.length >= MAX_QUEUED_PHOTOS;
  const onChange = (event: Event) => selectFiles(event, photos, upload);
  return (
    <>
      <PhotoPicker label={label ?? "Tomar foto"} camera disabled={disabled} onChange={onChange} />
      <PhotoPicker label="Elegir de la galería" disabled={disabled} onChange={onChange} />
    </>
  );
}

function UploadButton({ photos, upload }: QueueViewProps) {
  const retry = photos.queue.some((photo) => photo.error !== null);
  return (
    <button
      type="button"
      class="btn tap"
      style={touchStyle}
      disabled={!upload.ready || upload.uploading || photos.queue.length === 0}
      onClick={upload.uploadAll}
    >
      {retry ? "Reintentar" : `Subir ${photos.queue.length} fotos`}
    </button>
  );
}

export default function PhotoCapture(props: Props) {
  const photos = usePhotoQueue();
  const upload = usePhotoUpload(props, photos);
  const full = photos.queue.length >= MAX_QUEUED_PHOTOS;
  return (
    <div style={{ display: "grid", gap: "8px" }}>
      <PhotoControls photos={photos} upload={upload} label={props.label} />
      <p>
        {photos.queue.length} de {MAX_QUEUED_PHOTOS}
      </p>
      <PhotoList photos={photos} upload={upload} />
      <UploadButton photos={photos} upload={upload} />
      <progress max={100} value={upload.progress} aria-label="Progreso de la foto" />
      <p role="status" aria-live="polite">
        {upload.message}
        {full && ` Máximo ${MAX_QUEUED_PHOTOS} fotos por vez`}
      </p>
    </div>
  );
}

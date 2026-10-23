import { useEffect, useRef, useState } from "preact/hooks";
import type { JSX } from "preact";

interface Props {
  onCapture: (files: File[]) => void;
  queued: number;
  max: number;
  disabled?: boolean;
}

const touchStyle = { minHeight: "48px", minWidth: "48px" };
const layerStyle: JSX.CSSProperties = {
  position: "fixed",
  inset: 0,
  width: "100%",
  height: "100%",
  maxWidth: "none",
  maxHeight: "none",
  margin: 0,
  padding:
    "max(16px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) max(16px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left))",
  boxSizing: "border-box",
  border: 0,
  background: "var(--ground)",
  color: "var(--ink)",
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  overflowY: "auto",
};

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => {
    track.stop();
  });
}

function cameraError(error: unknown): string {
  if (error instanceof Error && error.name === "NotAllowedError") {
    return "No se autorizó la cámara. Puedes usar Tomar foto o Elegir de la galería.";
  }
  if (error instanceof Error && error.name === "NotFoundError") {
    return "No se encontró una cámara. Puedes usar Tomar foto o Elegir de la galería.";
  }
  return "No se pudo abrir la cámara. Puedes usar Tomar foto o Elegir de la galería.";
}

function useCamera() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [opening, setOpening] = useState(false);
  const [message, setMessage] = useState("");
  const current = useRef<MediaStream | null>(null);
  const request = useRef(0);
  const pending = useRef(false);
  useEffect(
    () => () => {
      request.current += 1;
      stopStream(current.current);
      current.current = null;
    },
    [],
  );
  function close() {
    request.current += 1;
    stopStream(current.current);
    current.current = null;
    pending.current = false;
    setOpening(false);
    setStream(null);
  }
  const state = { stream, current, opening, message, setMessage, close };
  async function open() {
    if (pending.current || current.current) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setMessage(
        "Este navegador no permite abrir la cámara en vivo. Usa Tomar foto o Elegir de la galería.",
      );
      return;
    }
    pending.current = true;
    setOpening(true);
    setMessage("");
    const id = ++request.current;
    await requestCamera(id, request, pending, state, setStream, setOpening);
  }
  return { ...state, open };
}

type Camera = ReturnType<typeof useCamera>;
type Current<T> = { current: T };

async function requestCamera(
  id: number,
  request: Current<number>,
  pending: Current<boolean>,
  camera: { current: Current<MediaStream | null>; setMessage: (message: string) => void },
  setStream: (stream: MediaStream) => void,
  setOpening: (opening: boolean) => void,
) {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1920 },
        height: { ideal: 1440 },
      },
      audio: false,
    });
    if (request.current !== id) return stopStream(stream);
    camera.current.current = stream;
    setStream(stream);
  } catch (error) {
    if (request.current === id) camera.setMessage(cameraError(error));
  } finally {
    if (request.current === id) {
      pending.current = false;
      setOpening(false);
    }
  }
}

function useCameraVideo(camera: Camera) {
  const video = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const element = video.current;
    if (!element || !camera.stream) return;
    element.srcObject = camera.stream;
    const stream = camera.stream;
    void element.play().catch(() => {
      if (camera.current.current !== stream) return;
      camera.close();
      camera.setMessage("No se pudo mostrar la cámara. Usa Tomar foto o Elegir de la galería.");
    });
    return () => {
      element.srcObject = null;
    };
  }, [camera.stream]);
  return { video, ready, setReady };
}

function captureFrame(video: HTMLVideoElement): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("No se pudo preparar la foto");
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
}

function useSnapshots(props: Props, camera: Camera, video: Current<HTMLVideoElement | null>) {
  const [previews, setPreviews] = useState<string[]>([]);
  const urls = useRef<string[]>([]);
  const busy = useRef(false);
  const [capturing, setCapturing] = useState(false);
  const latest = useRef(props);
  latest.current = props;
  useEffect(
    () => () => {
      for (const url of urls.current) URL.revokeObjectURL(url);
    },
    [],
  );
  async function capture() {
    const element = video.current;
    const stream = camera.current.current;
    if (busy.current || !stream || !element || !element.videoWidth || !element.videoHeight) return;
    if (latest.current.disabled || latest.current.queued >= latest.current.max) return;
    busy.current = true;
    setCapturing(true);
    try {
      const blob = await captureFrame(element);
      if (camera.current.current !== stream) return;
      if (!blob) throw new Error("No se pudo guardar la foto");
      if (latest.current.disabled || latest.current.queued >= latest.current.max) return;
      const file = new File([blob], `foto-${crypto.randomUUID()}.jpg`, { type: "image/jpeg" });
      latest.current.onCapture([file]);
      urls.current.push(URL.createObjectURL(file));
      setPreviews([...urls.current]);
      camera.setMessage("Foto agregada a la cola.");
    } catch {
      if (camera.current.current === stream)
        camera.setMessage("No se pudo sacar la foto. Intenta de nuevo.");
    } finally {
      busy.current = false;
      if (camera.current.current === stream) setCapturing(false);
    }
  }
  return { previews, capturing, capture };
}

interface LayerProps extends Props {
  camera: Camera;
}

function CameraButtons({
  props,
  snapshots,
  ready,
}: {
  props: LayerProps;
  snapshots: ReturnType<typeof useSnapshots>;
  ready: boolean;
}) {
  const full = props.queued >= props.max;
  return (
    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
      <button
        type="button"
        class="btn tap"
        style={{ minWidth: "72px", minHeight: "72px" }}
        disabled={props.disabled || full || snapshots.capturing || !ready}
        onClick={snapshots.capture}
      >
        {full ? `Máximo ${props.max} fotos por vez` : "Sacar foto"}
      </button>
      <p role="status">
        {props.queued} de {props.max}
      </p>
      <button type="button" class="btn ghost" style={touchStyle} onClick={props.camera.close}>
        Listo
      </button>
    </div>
  );
}

function CameraThumbnails({ previews }: { previews: string[] }) {
  return (
    <div style={{ display: "flex", gap: "8px", overflowX: "auto", flexShrink: 0 }}>
      {previews.map((url, index) => (
        <img
          key={url}
          src={url}
          alt={`Foto sacada ${index + 1}`}
          width={72}
          height={72}
          style={{ objectFit: "cover", flexShrink: 0, border: "1px solid var(--rule)" }}
        />
      ))}
    </div>
  );
}

function CameraLayer(props: LayerProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const playback = useCameraVideo(props.camera);
  const snapshots = useSnapshots(props, props.camera, playback.video);
  useEffect(() => {
    dialog.current?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      aria-label="Cámara de fotos"
      onCancel={props.camera.close}
      style={layerStyle}
    >
      <video
        ref={playback.video}
        autoPlay
        playsInline
        muted
        aria-label="Vista de la cámara"
        onLoadedData={() => playback.setReady(true)}
        style={{ width: "100%", flex: "1 1 0", minHeight: "120px", objectFit: "contain" }}
      />
      <CameraButtons props={props} snapshots={snapshots} ready={playback.ready} />
      <CameraThumbnails previews={snapshots.previews} />
      <p role="status">{props.camera.message}</p>
    </dialog>
  );
}

export default function CameraCapture(props: Props) {
  const camera = useCamera();
  return (
    <>
      <p>Al abrir la cámara, el navegador te pedirá permiso para usarla.</p>
      <button
        type="button"
        class="btn tap"
        style={touchStyle}
        disabled={props.disabled || camera.opening || props.queued >= props.max}
        onClick={camera.open}
      >
        {camera.opening ? "Abriendo cámara…" : "Abrir cámara"}
      </button>
      {!camera.stream && <p role="status">{camera.message}</p>}
      {camera.stream && <CameraLayer {...props} camera={camera} />}
    </>
  );
}

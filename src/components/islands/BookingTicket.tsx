import { type State, formatClp, ticketCode, timeRange } from "./booking-state.ts";
import { PICKUP_FEE_CLP } from "./booking-state.ts";

export function BookingTicket({
  state,
  chosen,
  isPickup,
  testMode = false,
}: {
  state: State;
  chosen: string[];
  isPickup: boolean;
  testMode?: boolean;
}) {
  const done = state.submit.status === "success" && state.result !== null;
  const confirmLabel = testMode ? "Confirmar reserva ficticia" : "Confirmar reserva";
  const submittingLabel = testMode ? "Confirmando prueba…" : "Confirmando…";
  return (
    <aside class="ticket" aria-live="polite">
      <div class="ticket-head">
        <span class="label">{testMode ? "Reserva ficticia" : "Orden de reserva"}</span>
        <span class="mono" style="font-size:.8rem">
          {state.selectedDate && state.selectedStart
            ? ticketCode(state.selectedDate, state.selectedStart)
            : "VB-——"}
        </span>
      </div>
      <dl class="ticket-body">
        <div class="row">
          <dt>Modalidad</dt>
          <dd>{isPickup ? "Retiro y devolución" : "La dejo en el taller"}</dd>
        </div>
        <div class="row">
          <dt>Día</dt>
          <dd>{state.selectedDate ?? "—"}</dd>
        </div>
        <div class="row">
          <dt>Hora</dt>
          <dd class="mono">{timeRange(chosen) ?? "Elige un bloque"}</dd>
        </div>
        <div class="row">
          <dt>Pago</dt>
          <dd>
            {testMode
              ? "Sin cobro · solo prueba"
              : "Efectivo, transferencia o tarjeta, al recibir tu bici"}
          </dd>
        </div>
      </dl>
      <div class="ticket-total">
        <span class="label">{testMode ? "Recargo de referencia" : "Recargo"}</span>
        <strong>{formatClp(isPickup ? PICKUP_FEE_CLP : 0)}</strong>
      </div>
      {!done && (
        <div class="ticket-foot">
          {state.submit.message && (
            <p class="err" role="alert">
              {state.submit.message}
            </p>
          )}
          <button
            type="submit"
            class="btn"
            id="submit"
            disabled={state.submit.status === "submitting"}
          >
            {state.submit.status === "submitting" ? submittingLabel : confirmLabel}
          </button>
          <p>
            {testMode
              ? "No se realizarán trabajos, retiros ni cobros. No se envían notificaciones."
              : "El diagnóstico y los repuestos se cotizan en el taller. Si hay un trabajo extra, te llamamos antes."}
          </p>
        </div>
      )}
      {done && state.result && (
        <div class="done">
          <span class="label">
            {testMode ? "Reserva ficticia registrada" : "Reserva confirmada"}
          </span>
          <strong>{state.result.code}</strong>
          {testMode ? (
            <>
              <p>
                Reserva ficticia guardada en el entorno de pruebas. No se enviaron correos ni
                mensajes de WhatsApp.
              </p>
              <p>
                Para revisar o cancelar, ingresa al <a href="/admin">panel de pruebas</a> con una
                cuenta de prueba autorizada.
              </p>
            </>
          ) : (
            <>
              <p>Te enviamos la confirmación a {state.form.correo}.</p>
              <p>Si necesitas cancelar, usa el enlace del correo.</p>
            </>
          )}
        </div>
      )}
    </aside>
  );
}

import { useEffect, useMemo, useState } from "preact/hooks";
import { bookingDateRange, bookingDateStatus } from "./booking-dates.ts";
import { useSantiagoDate } from "./useSantiagoDate.ts";
import "../../styles/public-date-selector.css";

function dateLabel(date: string, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("es-CL", { ...options, timeZone: "UTC" }).format(
    new Date(`${date}T12:00:00Z`),
  );
}

function DateButton({
  date,
  today,
  selected,
  onSelect,
}: {
  date: string;
  today: string;
  selected: boolean;
  onSelect: (date: string) => void;
}) {
  const status = bookingDateStatus(date);
  const label = `${dateLabel(date, { dateStyle: "full" })}${status.closed ? `, ${status.label}` : ""}`;
  return (
    <button
      type="button"
      class="day"
      data-date={date}
      aria-label={label}
      aria-pressed={selected}
      disabled={status.closed}
      onClick={() => onSelect(date)}
    >
      <span class="dw">{dateLabel(date, { weekday: "short" })}</span>
      <time class="dn" dateTime={date}>
        {date === today ? "Hoy" : dateLabel(date, { day: "2-digit", month: "short" })}
      </time>
      <span class="dc">
        {status.label.includes("Feriado") ? "Feriado" : status.closed ? "Cerrado" : ""}
      </span>
    </button>
  );
}

function ClosureReferences({ dates }: { dates: string[] }) {
  const closed = dates.filter((date) => bookingDateStatus(date).closed);
  if (closed.length === 0) return null;
  return (
    <ul class="public-date-selector__closures" aria-label="Referencias de cierres">
      {closed.map((date) => (
        <li key={date}>
          <time dateTime={date}>{dateLabel(date, { day: "2-digit", month: "short" })}</time>
          {": "}
          {bookingDateStatus(date).label}
        </li>
      ))}
    </ul>
  );
}

type DateSelection = {
  today: string;
  dates: string[];
  selected: string;
  onSelect: (date: string) => void;
};

function DateFieldset({ today, dates, selected, onSelect }: DateSelection) {
  return (
    <fieldset aria-busy={!today} aria-describedby="public-date-note">
      <legend>Día</legend>
      <p class="public-date-selector__range">14 días corridos desde hoy · hora de Chile</p>
      <p id="public-date-note" class="public-date-selector__note">
        Seleccionar una fecha no crea una reserva ni confirma disponibilidad.
      </p>
      <p class="ruler-note">Desliza la banda para ver todas las fechas.</p>
      <section class="days public-date-selector__strip" aria-label="Fechas de reserva o retiro">
        {dates.map((date) => (
          <DateButton
            key={date}
            date={date}
            today={today}
            selected={date === selected}
            onSelect={onSelect}
          />
        ))}
      </section>
      <ClosureReferences dates={dates} />
    </fieldset>
  );
}

export default function PublicDateSelector() {
  const today = useSantiagoDate();
  const dates = useMemo(() => (today ? bookingDateRange(today) : []), [today]);
  const [selectedDate, setSelectedDate] = useState("");
  const selected =
    dates.includes(selectedDate) && !bookingDateStatus(selectedDate).closed ? selectedDate : "";

  useEffect(() => {
    if (selectedDate && !selected) setSelectedDate("");
  }, [selectedDate, selected]);

  return (
    <div class="public-date-selector stage" data-testid="public-date-selector">
      <DateFieldset today={today} dates={dates} selected={selected} onSelect={setSelectedDate} />
      <p
        class="public-date-selector__selection"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        data-selected-date={selected || undefined}
      >
        {!today
          ? "Cargando las fechas de Chile…"
          : selected
            ? `Fecha seleccionada: ${dateLabel(selected, { dateStyle: "full" })}.`
            : "Aún no eliges una fecha."}
      </p>
    </div>
  );
}

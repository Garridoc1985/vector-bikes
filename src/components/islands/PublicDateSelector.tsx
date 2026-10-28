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
      class="public-date-day"
      data-date={date}
      aria-label={label}
      aria-pressed={selected}
      disabled={status.closed}
      onClick={() => onSelect(date)}
    >
      <span class="public-date-day__weekday">{dateLabel(date, { weekday: "short" })}</span>
      <time dateTime={date}>{dateLabel(date, { day: "numeric", month: "short" })}</time>
      <span class="public-date-day__state">
        {status.closed ? status.label : selected ? "Elegida" : date === today ? "Hoy" : ""}
      </span>
    </button>
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
    <div class="public-date-selector" data-testid="public-date-selector">
      <fieldset aria-busy={!today} aria-describedby="public-date-note">
        <legend>Selecciona una fecha para probar</legend>
        <p class="public-date-selector__range">14 días corridos desde hoy · hora de Chile</p>
        <p id="public-date-note" class="public-date-selector__note">
          Seleccionar una fecha no crea una reserva ni confirma disponibilidad.
        </p>
        <div class="public-date-selector__grid">
          {dates.map((date) => (
            <DateButton
              key={date}
              date={date}
              today={today}
              selected={date === selected}
              onSelect={setSelectedDate}
            />
          ))}
        </div>
      </fieldset>
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

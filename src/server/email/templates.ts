import { DateTime } from "luxon";
import { SITE } from "../../lib/site.ts";
import { RECEPTION_HOURS, TIMEZONE } from "../booking/rules.ts";
import type { Booking } from "../db/schema.ts";

export type RenderedEmail = { subject: string; html: string; text: string };

export type ReadyForPickup = {
  orderNumber: string;
  customerName: string;
  bike: string;
  totalClp: number;
  paidClp: number;
};

type Row = readonly [label: string, value: string];

/** Contenido de un correo como datos: `render` escapa todo antes de armar el HTML. */
type EmailContent = {
  heading: string;
  intro: string[];
  rows: Row[];
  notes: string[];
  link?: { label: string; href: string };
};

const HTML_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char] ?? char);
}

export function formatClp(amount: number): string {
  return `$${String(Math.round(amount)).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
}

function local(instant: Date): DateTime {
  return DateTime.fromJSDate(instant).setZone(TIMEZONE).setLocale("es-CL");
}

function formatDate(instant: Date): string {
  return local(instant).toFormat("cccc d 'de' LLLL 'de' yyyy");
}

function formatRange(booking: Booking): string {
  return `${local(booking.startsAt).toFormat("HH:mm")} a ${local(booking.endsAt).toFormat("HH:mm")} hrs`;
}

function scheduleRows(booking: Booking): Row[] {
  const rows: Row[] = [
    ["Código", booking.code],
    ["Fecha", formatDate(booking.startsAt)],
    ["Horario", formatRange(booking)],
  ];
  if (booking.mode === "retiro") {
    rows.push(["Modalidad", "Retiro a domicilio"]);
    rows.push(["Dirección de retiro", `${booking.address ?? ""}, ${booking.comuna ?? ""}`]);
    rows.push(["Retiro y entrega", formatClp(booking.pickupFeeClp)]);
  } else {
    rows.push(["Modalidad", "Entrega en el taller"]);
    rows.push(["Dirección del taller", SITE.addressShort]);
  }
  return rows;
}

function bikeRows(booking: Booking): Row[] {
  return [
    ["Bicicleta", booking.bike],
    ["Qué necesita", booking.description],
  ];
}

function renderHtml(content: EmailContent): string {
  const paragraph = (text: string) =>
    `<p style="margin:0 0 12px;line-height:1.55">${escapeHtml(text)}</p>`;
  const rows = content.rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:6px 16px 6px 0;color:#5A5E63;font-size:12px;text-transform:uppercase;letter-spacing:.08em;vertical-align:top">${escapeHtml(label)}</td><td style="padding:6px 0;vertical-align:top">${escapeHtml(value)}</td></tr>`,
    )
    .join("");
  const link = content.link
    ? `<p style="margin:16px 0"><a href="${escapeHtml(content.link.href)}" style="color:#0C0D0E">${escapeHtml(content.link.label)}</a></p>`
    : "";
  return [
    '<!doctype html><html lang="es-CL"><body style="margin:0;background:#F6F6F4">',
    '<div style="max-width:560px;margin:0 auto;padding:24px;font-family:Arial,Helvetica,sans-serif;font-size:16px;color:#0C0D0E">',
    `<p style="margin:0 0 16px;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#5A5E63">${escapeHtml(SITE.name)}</p>`,
    `<h1 style="margin:0 0 16px;font-size:22px;font-weight:600">${escapeHtml(content.heading)}</h1>`,
    content.intro.map(paragraph).join(""),
    `<table role="presentation" style="border-collapse:collapse;border-top:1px solid #D9D9D5;border-bottom:1px solid #D9D9D5;margin:16px 0;width:100%">${rows}</table>`,
    content.notes.map(paragraph).join(""),
    link,
    `<p style="margin:24px 0 0;font-size:13px;color:#5A5E63">${escapeHtml(`${SITE.name} · ${SITE.addressShort} · ${SITE.email}`)}</p>`,
    "</div></body></html>",
  ].join("");
}

function renderText(content: EmailContent): string {
  const lines = [content.heading, "", ...content.intro, ""];
  for (const [label, value] of content.rows) {
    lines.push(`${label}: ${value}`);
  }
  lines.push("", ...content.notes);
  if (content.link) {
    lines.push("", `${content.link.label}: ${content.link.href}`);
  }
  lines.push("", `${SITE.name} · ${SITE.addressShort} · ${SITE.email}`);
  return lines.join("\n");
}

function render(subject: string, content: EmailContent): RenderedEmail {
  return { subject, html: renderHtml(content), text: renderText(content) };
}

const EXTRA_WORK_NOTE =
  "El diagnóstico y los repuestos se cotizan en el taller. Si encontramos un problema extra, te llamamos antes de hacer cualquier trabajo que no estaba en tu descripción: te explicamos la solución y tú decides.";

/** Confirmación al cliente, con el enlace de cancelación de un solo uso. */
export function customerConfirmationEmail(booking: Booking, cancelUrl: string): RenderedEmail {
  const firstName = booking.customerName.split(" ")[0] ?? booking.customerName;
  return render(`Reserva confirmada ${booking.code} · ${SITE.name}`, {
    heading: "Tu reserva está confirmada",
    intro: [`Hola ${firstName}, te esperamos. Estos son los datos de tu reserva.`],
    rows: [...scheduleRows(booking), ...bikeRows(booking)],
    notes: [
      EXTRA_WORK_NOTE,
      "Adjuntamos la reserva para tu calendario. Si no puedes venir, cancélala con el enlace de abajo para liberar el horario.",
    ],
    link: { label: "Cancelar mi reserva", href: cancelUrl },
  });
}

/** Aviso al taller de una reserva nueva, con los datos de contacto completos. */
export function shopNewBookingEmail(booking: Booking): RenderedEmail {
  return render(`Nueva reserva ${booking.code}`, {
    heading: "Nueva reserva",
    intro: ["Entró una reserva desde el sitio."],
    rows: [
      ...scheduleRows(booking),
      ["Cliente", booking.customerName],
      ["Teléfono", booking.phoneE164],
      ["Correo", booking.email ?? "Sin correo"],
      ...bikeRows(booking),
    ],
    notes: [],
  });
}

/** Recordatorio al cliente el día anterior. Sin enlace: el token solo existe en la confirmación. */
export function reminderEmail(booking: Booking): RenderedEmail {
  return render(`Recordatorio: tu reserva ${booking.code} es mañana · ${SITE.name}`, {
    heading: "Te esperamos mañana",
    intro: ["Te recordamos tu reserva en Vector Bikes."],
    rows: [...scheduleRows(booking), ...bikeRows(booking)],
    notes: [
      EXTRA_WORK_NOTE,
      "Si no puedes venir, cancela con el enlace del correo de confirmación o responde este correo.",
    ],
  });
}

/** Aviso al taller de una reserva cancelada. */
export function shopCancellationEmail(booking: Booking): RenderedEmail {
  const by = booking.cancelledBy === "admin" ? "el taller" : "el cliente";
  return render(`Reserva cancelada ${booking.code}`, {
    heading: "Reserva cancelada",
    intro: [`La reserva fue cancelada por ${by}. El horario quedó libre.`],
    rows: [
      ...scheduleRows(booking),
      ["Cliente", booking.customerName],
      ["Teléfono", booking.phoneE164],
      ["Correo", booking.email ?? "Sin correo"],
    ],
    notes: [],
  });
}

/** Horario de retiro desde `RECEPTION_HOURS`, agrupando los días seguidos que coinciden. */
function receptionHours(): string[] {
  const names = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];
  const label = (day: number) => {
    const schedule = RECEPTION_HOURS[day];
    return schedule ? `${schedule.open} a ${schedule.close}` : "cerrado";
  };
  const groups: { from: number; to: number; hours: string }[] = [];
  for (let day = 1; day <= 7; day++) {
    const hours = label(day);
    const last = groups.at(-1);
    if (last && last.hours === hours) last.to = day;
    else groups.push({ from: day, to: day, hours });
  }
  return groups.map(({ from, to, hours }) => {
    const first = names[from - 1] ?? "";
    const last = names[to - 1] ?? "";
    const span = from === to ? first : `${first} a ${last}`;
    return `${capitalize(span)}${hours === "cerrado" ? " y feriados" : ""}: ${hours}`;
  });
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** Aviso al cliente después de aprobar el control de calidad, sin enlaces. */
export function readyForPickupEmail(order: ReadyForPickup): RenderedEmail {
  const firstName = order.customerName.split(" ")[0] ?? order.customerName;
  const hours = receptionHours();
  return render(`Tu bicicleta está lista para retirar · ${order.orderNumber} · ${SITE.name}`, {
    heading: "Tu bicicleta está lista para retirar",
    intro: [`Hola ${firstName}, tu bicicleta ya pasó el control de calidad. Te esperamos.`],
    rows: [
      ["Orden", order.orderNumber],
      ["Bicicleta", order.bike],
      ["Total", formatClp(order.totalClp)],
      ["Abonado", formatClp(order.paidClp)],
      [
        "Saldo",
        order.paidClp >= order.totalClp ? "Pagado" : formatClp(order.totalClp - order.paidClp),
      ],
    ],
    notes: [
      `Dirección del taller: ${SITE.streetAddress}, ${SITE.locality}.`,
      `Horario de retiro: ${hours.join("; ")}.`,
      "Puedes pagar con efectivo, transferencia o tarjeta.",
      "Si coordinamos la devolución a domicilio, te llamaremos para acordar la hora.",
    ],
  });
}

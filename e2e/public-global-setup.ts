import postgres from "postgres";
import { hashCancelToken } from "../src/server/booking/tokens.ts";
import { hashShareToken } from "../src/server/taller/share-tokens.ts";
import { E2E_CANCEL_TOKEN_SECRET, E2E_DATABASE_URL, PUBLIC_TEST_TOKENS, SEED } from "./fixtures.ts";
import globalSetup from "./global-setup.ts";

function assertLocalE2EDatabase(): void {
  const target = new URL(E2E_DATABASE_URL);
  const database = decodeURIComponent(target.pathname.slice(1));
  if (
    !["127.0.0.1", "::1", "localhost"].includes(target.hostname) ||
    database !== "vector_bikes_e2e"
  ) {
    throw new Error(
      `La suite pública solo puede usar vector_bikes_e2e local (host=${target.hostname}, base=${database}).`,
    );
  }
}

/** Extiende las semillas comunes solo para la suite pública; no cambia la suite tablet. */
export default async function publicGlobalSetup(): Promise<void> {
  assertLocalE2EDatabase();
  await globalSetup();
  const sql = postgres(E2E_DATABASE_URL, { max: 1 });
  const now = new Date();

  try {
    await sql`
      update bookings
      set cancel_token_hash = ${hashCancelToken(PUBLIC_TEST_TOKENS.cancelDesktop, E2E_CANCEL_TOKEN_SECRET)}
      where id = ${SEED.bookingInicioId}
    `;
    await sql`
      update bookings
      set cancel_token_hash = ${hashCancelToken(PUBLIC_TEST_TOKENS.cancelMobile, E2E_CANCEL_TOKEN_SECRET)}
      where id = ${SEED.bookingCompletaId}
    `;

    await sql`
      update work_orders
      set status = 'esperando_aprobacion'
      where id = ${SEED.orderControlId}
    `;
    await sql`
      insert into work_order_approvals (
        branch_id, work_order_id, description, recommendation, price_clp, token_hash, created_by
      ) values (
        ${SEED.branchId}, ${SEED.orderControlId}, 'Pastillas de freno gastadas',
        'Cambiar las pastillas y centrar el disco', 18000,
        ${hashShareToken(PUBLIC_TEST_TOKENS.approval)}, ${SEED.ownerId}
      )
    `;

    const snapshot = {
      version: 1,
      orderNumber: "OT-0003",
      customerFirstName: "Cliente E2E",
      bike: {
        brand: "Specialized",
        model: "Rockhopper",
        year: null,
        type: "MTB",
        size: null,
        color: null,
        serialNumber: null,
        kmNoted: null,
      },
      receivedAt: now.toISOString(),
      deliveredAt: null,
      diagnosis: "Revisión de prueba sintética.",
      workDone: [{ description: "Mantención general", quantity: 1 }],
      problemsFound: [],
      componentsReplaced: [],
      photosBefore: [],
      photosAfter: [],
      recommendations: "Revisar frenos antes de cada salida.",
      nextChecks: "Control sugerido en 30 días.",
      rejectedWork: [],
      totalClp: 25000,
    };
    await sql`
      insert into service_reports (
        branch_id, work_order_id, generated_at, generated_by, snapshot, share_token_hash
      ) values (
        ${SEED.branchId}, ${SEED.orderListaId}, ${now}, ${SEED.ownerId},
        ${sql.json(snapshot)}, ${hashShareToken(PUBLIC_TEST_TOKENS.report)}
      )
    `;
  } finally {
    await sql.end();
  }
}

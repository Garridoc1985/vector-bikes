# Vector Bikes — Sistema de Gestión Integral, Fase 1 "El taller funcionando" — Blueprint de cambio

> Generado por The Architect el 2026-10-05 (modo brownfield, `/the-architect:architect-brownfield`)
> Forma: herramienta interna agregada a un sitio de marketing + reservas existente
> Runtime track: el del repo (Node 24, pnpm 12.4.2, Astro 7, TypeScript 6) — pins de `package.json`/`pnpm-lock.yaml`
> Modo de emisión: bundle (`blueprint.md`, `tasks.json`, `epics/01…05`, `workspace/`)
> Versión del blueprint: 3 (corrige la ronda 1 de validación y la prueba de humo del Bootstrap bajo pnpm 12.4.2) · Versiones verificadas: 2026-10-05 — ver §11
> Fuente autoritativa: `blueprints/vector-taller-f1/FASE1.md` (decisiones §2 cerradas, cerca §2.4, tarea 0 §3.0, criterios §14). Este documento no la modifica.

Identificadores: cada paso se llama `F1-NN`; su tarea en `tasks.json` es `E<épica>-T<n>` (forma que exige el esquema) y su tag de checkpoint es `f1-NN` (el espacio `step-NN-*` ya lo ocupan los 14 tags del sitio). Equivalencias en el mapa de §9.

La construcción es **supervisada**: Claude ejecuta cada paso con `/architect-next` en una sesión interactiva con el dueño y delega la construcción a Codex según "Reparto con Codex" de `CLAUDE.md`.

---

## 1. Visión general y No-Objetivos

### Visión
Reemplazar el papel y el WhatsApp desordenado en la operación diaria del taller Vector Bikes (Av. Kennedy 7666, Vitacura). Al terminar, una bicicleta recorre todo el camino dentro del sistema: **reserva → recepción con fotos y firma en tablet → orden de trabajo → presupuesto → aprobación de adicionales por enlace → reparación → control de calidad del dueño → pago → entrega firmada → informe final → historial permanente de la bicicleta**. La unidad de información es CLIENTE → BICICLETA → COMPONENTES → HISTORIAL (FASE1 §4).

### Current state
Repo `~/Documents/vector-bikes`: Astro 7 SSR (`@astrojs/node` standalone) en Replit Autoscale, Postgres 16 vía Drizzle 0.45 (`src/server/db/schema.ts`, 9 tablas, migraciones en `drizzle/` generadas por `pnpm db:generate`), isla Preact de reserva, API `/api/disponibilidad` y `/api/reservas`, cancelación por token, panel `/admin` con sesión propia scrypt sobre `admin_users`/`admin_sessions`, correos Resend, recordatorios `pnpm reminders:send` (la Scheduled Deployment prevista **nunca operó**), módulo WhatsApp opcional con cron externo. Tests: Vitest + PGlite, `tests/build`, `scripts/smoke.sh`; compuerta `pnpm gate`. Convenciones: imports relativos con `.ts`, `erasableSyntaxOnly`, `verbatimModuleSyntax`, entorno solo por `src/lib/env.ts`, logs por `src/lib/log.ts`, biome 2 espacios/comillas dobles/ancho 100. `pnpm-workspace.yaml` hace de la raíz un paquete de workspace, así que agregar dependencias a la raíz exige `pnpm add -w`.

### Target state
Mismo proyecto, base y despliegue (FASE1 decisión 1). Nuevo: `/api/tareas/*` con bearer (recordatorios, alertas, retención) disparado por Make.com; `branches` + `users` con roles (expand → copia al ingresar → contract); área `/taller/**` de páginas Astro con formularios POST y dos islas (`PhotoCapture`, `SignaturePad`); dominio en `src/server/taller/**`; almacenamiento `src/server/storage/**` (disco local en el Mac, App Storage de Replit en producción, sharp); 19 tablas nuevas en `schema.ts`, `schema-taller.ts`, `schema-orders.ts`; páginas públicas `/aprobacion/[token]` e `/informe/[token]`; Playwright solo para `/taller` en viewport de tablet (`pnpm test:tablet`, dentro de `pnpm gate` desde F1-06).

### Usuarios
| Persona | Qué viene a hacer | Frecuencia |
|---|---|---|
| Dueño (`owner`) | Recepción, precios, control de calidad, usuarios, auditoría, informes | Diaria |
| Mecánico (`mechanic`, tablet) | Recepción (decisión A de §20.3 #26), sus órdenes: diagnóstico, estados, fotos, componentes | Diaria |
| Administrador / recepción (`admin`, `reception`, futuros) | Clientes, reservas, recepción, pagos | Cuando existan |
| Cliente final (sin cuenta) | Aprobar o rechazar un adicional; ver su informe | Por visita |

### Objetivos — alcance de la fase 1
1. Recordatorios por correo funcionando de nuevo vía cron externo autenticado (tarea 0).
2. Usuarios con cuatro roles y permisos verificados en el servidor; auditoría de acciones sensibles.
3. Recepción completa en tablet, hecha por cualquier rol: cliente/bici (desde reserva o sin ella), checklist, accesorios, servicio, fecha sugerida, fotos, firma, número `OT-00001`.
4. Orden de trabajo con estados e historial, líneas con precio por tipo de bici, etiqueta con QR, adicionales aprobados por enlace de un solo uso.
5. Control de calidad del dueño, pagos (un abono + finales), entrega con saldo cero y firma — garantizado por la base.
6. Componentes, informe final compartible, historial por bicicleta y cliente, garantía vinculada, dashboards por rol, alertas de atraso y retención de fotos.

### No-Objetivos — fuera de alcance
**El builder no implementa nada de esta tabla.** Si un paso parece requerirlo, es un defecto del blueprint: detenerse y reportarlo.

| No se construye | Por qué no ahora | Se revisa cuando |
|---|---|---|
| Inventario, consumo de repuestos, alertas de stock | Fase 2; el repuesto es una línea con precio | Fase 1 en uso dos semanas (FASE1 §14.14) |
| Proveedores y órdenes de compra | Fase 2 | Ídem |
| Caja POS, Mercado Pago, devoluciones, descuentos | Fase 2; la fase 1 solo **registra** pagos | Ídem |
| Códigos de barra de productos, bicicletas usadas | Fase 2 (el QR de la orden sí es fase 1) | Ídem |
| Strava, kilometraje de componentes, desgaste, predictivo | Fase 3 (decisión 12) | Fase 2 cerrada |
| Asistente de WhatsApp, reseñas de Google, envío automático del enlace | Fase 3 | Fase 2 cerrada |
| Fichas de suspensiones | Fase 3 | Fase 2 cerrada |
| Campañas y recuperación de clientes | Descartado; exige consentimiento de marketing | Decisión del dueño |
| Multi-sucursal, convenios, tienda online | Fase 4; solo queda `branch_id` | Segunda sucursal |
| Portal de clientes, puntos, VIP, cronometraje, comparativas financieras | Fuera del sistema (spec punto 48) | — |
| Pago en línea, cuentas de clientes, reprogramación, E2E con navegador fuera de `/taller`, feriados 2027 inventados | No-Objetivos del sitio, vigentes | `blueprints/vector-bikes` §20.4 |
| Emisión de documentos tributarios | Decisión 10: solo se anotan tipo, folio y fecha | Integración SII decidida aparte |
| **Constante:** flujo público de reserva y su API | Interfaz congelada (§5) | — |
| **Constante:** `/reservas/cancelar`, `createBooking`/`cancelBooking` (solo `source` opcional) | Interfaz congelada | — |
| **Constante:** columnas y estados de `bookings` (solo `+source`), 1/bloque, 4/día, teléfono, orden de locks | Interfaz congelada | — |
| **Constante:** correos transaccionales y `sendReminders` | Interfaz congelada | — |
| **Constante:** `/admin` agenda, mes, bloqueos, detalle (solo filtro por rol y enlace "Taller") | Interfaz congelada | — |
| **Constante:** cookie de sesión (`vb_admin_session`, 7 días, scrypt) — solo cambia la tabla | Interfaz congelada | — |
| **Constante:** módulo WhatsApp (D-E) — único cambio: `getCronEnv()` | Interfaz congelada | — |
| **Constante:** variables `PUBLIC_*`, tokens de `global.css`, `.replit` | Interfaz congelada | — |

### Métricas de éxito
| Métrica | Meta | Cómo se mide |
|---|---|---|
| Operación sin papel | 2 semanas seguidas (FASE1 §14.14) | El dueño lo confirma; toda bici del período tiene `work_orders` |
| Recepciones completas | 100 % con firma y ≥ 1 foto | `select count(*) from work_orders w where received_at is not null and not exists (select 1 from order_signatures s where s.work_order_id = w.id and s.kind = 'recepcion')` = 0 |
| Recordatorios | Toda corrida diaria con `"ok":true` | Historial del escenario de Make.com |
| `pnpm gate` | Verde en cada paso y antes de publicar | Salida de la compuerta |

---

## 2. Stack

**Runtime track: el del repo.** Ningún pin cambia salvo los seis paquetes nuevos (§11).

| Capa | Elección | Por qué esto y no lo otro |
|---|---|---|
| Lenguaje / runtime | TypeScript 6 sobre Node 24 | El del repo; Node quita tipos en `scripts/` |
| Framework | Astro 7 SSR (`prerender = false` en `/taller/**`) | Patrón probado de `/admin`; rechazado: SPA aparte (segundo despliegue) |
| Estilos | `global.css` aprobado + `<style is:global>` de `TallerLayout.astro` | Sin hex nuevos |
| Componentes | HTML de servidor + 2 islas Preact | Cámara y firma necesitan JS (D-B) |
| Base de datos | Postgres 16 de Replit (misma base) | Decisión 1 |
| Acceso a datos | Drizzle, reglas en CHECK/índices sin triggers | Triggers exigirían SQL a mano (D-G) |
| Auth | Sesión propia sobre `users` + `can(role, action)` | Ya probada en producción |
| Segundo plano | `/api/tareas/*` llamados por Make.com | Replit no permitió otra deployment (6b) |
| Pagos | NOT APPLICABLE — solo registro manual (cerca §2.4) | — |
| Archivos | `ObjectStorage`: disco local / `@replit/object-storage`; sharp | Decisión 7; vía de escape `@google-cloud/storage` (§20.2) |
| Correo | Resend existente | Ya configurado |
| Hosting | Replit Autoscale (`.replit` intacto) | Decisiones 1–2 |
| Gestor | pnpm 12.4.2 (vía corepack si el global es más antiguo) | El del repo |

### Chequeo de compatibilidad
Revisado contra `knowledge/stack-compatibility.md`: ninguna combinación conocida como mala. Riesgo propio: binario nativo de sharp con lockfile hecho en macOS → `supportedArchitectures` (§19.6) + post-condición del Bootstrap que exige `@img/sharp-linux-x64` y `@img/sharp-libvips-linux-x64` en `pnpm-lock.yaml`.

---

## 3. Estructura de directorios

```
vector-bikes/
├── CLAUDE.md · AGENTS.md · .gitignore · pnpm-workspace.yaml · drizzle.config.ts · playwright.config.ts  # workspace/
├── .claude/settings.json · rules/                       # workspace/
├── e2e/fixtures.ts · global-setup.ts                    # workspace/
├── e2e/*.spec.ts                                        # F1-06, 11, 16, 17, 21, 22, 23, 25, 28, 30, 35
├── drizzle/                                             # generado por pnpm db:generate
├── scripts/smoke.sh (F1-01, F1-19) · admin-set-password.ts (F1-04) · db-check.ts (F1-37)
├── src/
│   ├── lib/env.ts (F1-01, F1-08) · rut.ts (F1-10)
│   ├── layouts/TallerLayout.astro (F1-06)
│   ├── components/taller/PhotoCapture.tsx · SignaturePad.tsx (F1-21) · ReportView.astro (F1-32)
│   ├── pages/
│   │   ├── api/tareas/recordatorios.ts (F1-01) · alertas.ts · retencion.ts (F1-36)
│   │   ├── admin/login.astro · index.astro · bloqueos.astro · reservas/[id].astro (F1-05)
│   │   ├── aprobacion/[token].astro (F1-27) · informe/[token].astro (F1-33)
│   │   └── taller/
│   │       ├── index.astro (F1-06, F1-35) · usuarios.astro (F1-07) · buscar.astro (F1-13)
│   │       ├── catalogo/index.astro · [id].astro (F1-09)
│   │       ├── clientes/index.astro · nuevo.astro (F1-11) · [id].astro (F1-11, 12, 34)
│   │       ├── bicicletas/[id].astro (F1-12, 34)
│   │       ├── reservas/index.astro (F1-14, 16) · nueva.astro (F1-14)
│   │       ├── recepcion/nueva.astro (F1-16) · media/[...key].ts (F1-19)
│   │       └── ordenes/index.astro (F1-22) · [id]/index.astro (F1-22, 25) · recepcion.astro (F1-16, 17, 18, 21)
│   │           · cierre.astro (F1-21) · fotos.ts (F1-19) · etiqueta.ts (F1-23) · lineas.astro (F1-24)
│   │           · galeria.astro (F1-25) · adicional.astro (F1-26) · control.astro (F1-28)
│   │           · entrega.astro (F1-29, 30) · componentes.astro (F1-31) · informe.astro (F1-32)
│   └── server/
│       ├── api/task-handlers.ts (F1-01, 36) · handlers.ts (F1-27: dos `export`)
│       ├── auth/permissions.ts (F1-03) · admin-auth.ts (F1-04, 37)
│       ├── booking/create-booking.ts (F1-14: `source` opcional)
│       ├── db/schema.ts (F1-03, 37) · schema-taller.ts (F1-07, 09, 10, 12) · schema-orders.ts (F1-15…32)
│       ├── storage/storage.ts · images.ts (F1-08)
│       ├── whatsapp/cron.ts (F1-02)
│       └── taller/ audit · users · rules · catalog · customers · bikes · search · manual-booking · orders
│                   · intake · items · delivery-date · photos · reception · status · label · share-tokens
│                   · approvals · qc · payments · delivery · components · reports · history · dashboard · maintenance (.ts)
└── tests/unit/permissions.test.ts · tests/integration/*.test.ts
```

**Reglas de frontera.** Las de `CLAUDE.md` más: `src/layouts/**` solo importa de `src/server/**` el módulo puro `permissions.ts`; `src/components/taller/**` nunca importa `src/server/**`; `e2e/**` habla por HTTP salvo `hashPassword` en `global-setup.ts`. La convención de importación se reconcilia en §19.6.

### Delta
- **Nuevos:** lo marcado arriba bajo `src/server/taller/`, `src/server/storage/`, `src/pages/taller/`, `aprobacion/`, `informe/`, `api/tareas/`, `src/components/taller/`, `TallerLayout.astro`, `rut.ts`, `permissions.ts`, `schema-taller.ts`, `schema-orders.ts`, `e2e/`, `playwright.config.ts`, tests.
- **Modificados:** `env.ts`, `schema.ts`, `admin-auth.ts`, `create-booking.ts`, `handlers.ts` (solo `export`), `cron.ts`, las 4 páginas de `src/pages/admin/`, `admin-set-password.ts`, `db-check.ts`, `smoke.sh`, `admin-auth.test.ts`, `package.json`, `.env.example`, `README.md`, `drizzle.config.ts`, `.gitignore`, `pnpm-workspace.yaml`, `CLAUDE.md`, `AGENTS.md`, reglas; una fila y un punto de `blueprints/vector-bikes/blueprint.md` (FASE1 §3.0).
- **Eliminados:** tabla `admin_users`, columna `admin_sessions.admin_user_id` y el código de copia (F1-37).

---

## 4. Modelo de datos

Reglas (`database.md`): `id uuid defaultRandom()`, `created_at`/`updated_at` timestamptz (helpers `instant`, `createdAt`, `updatedAt` de `schema.ts`, exportados en F1-03), dinero `integer` CLP, `branch_id uuid not null → branches.id restrict` en toda tabla de operación (**B**), FKs `restrict` salvo `admin_sessions.user_id` (`cascade`), CHECK con SQL literal, sin triggers. **V** = `voided_at` + `voided_by → users`. **CB** = `created_by uuid not null → users`.

### Entidades (estado final; paso que crea entre paréntesis)

**`schema.ts`**
- `bookings` (+F1-03): `source text not null default 'web'`; `bookings_source_check`: `source in ('web', 'telefono', 'whatsapp', 'presencial')`.
- `branches` (F1-03): `name text not null` (`uq_branches_name`), `next_order_number integer not null default 1` (`next_order_number >= 1`). Una fila: "Vitacura".
- `users` (F1-03): B, `email` (`uq_users_email`), `password_hash`, `name`, `role` (`users_role_check`: `role in ('owner', 'admin', 'reception', 'mechanic')`), `is_active boolean not null default true`, `created_by uuid null → users` (`(): AnyPgColumn => users.id`, restrict); índice `idx_users_branch_role`.
- `admin_sessions` (F1-03): + `user_id uuid null → users cascade` (`idx_admin_sessions_user_id`); `admin_user_id` nullable. **F1-37:** se elimina `admin_user_id`; `user_id` NOT NULL.
- `admin_users`: intacta hasta F1-37, que la elimina. `allTables` += `branches`, `users` (−`adminUsers` en F1-37).

**`schema-taller.ts`** (`tallerTables`)
- `audit_log` (F1-07): B, `actor_user_id uuid null → users` (nulo = cliente vía token), `action`, `entity` (text not null), `entity_id uuid null`, `details jsonb not null default '{}'::jsonb`; índices `(branch_id, created_at)`, `(entity, entity_id)`.
- `services` (F1-09): B, `name`, `description` (default `''`), `estimated_minutes integer not null` (`> 0`), `usual_materials`, `aftercare` (null), `is_active`; `uq_services_branch_name (branch_id, name)`.
- `service_prices` (F1-09): B, `service_id → services`, `bike_type` (`in ('mtb', 'ruta', 'gravel', 'urbana', 'ebike')`), `price_clp integer not null` (`>= 0`); `uq_service_prices_service_bike_type (service_id, bike_type)`.
- `customers` (F1-10): B, `name`, `rut` (null; `uq_customers_rut` único global `where rut is not null`), `phone_e164 not null`, `email`, `discovery_channel` (`is null or in ('instagram', 'google', 'recomendacion', 'sitio_web', 'paso_por_el_taller', 'otro')`), `notes`; índices `(branch_id, phone_e164)`, `(branch_id, name)`.
- `bikes` (F1-12): B, `customer_id → customers`, `brand`, `model` (not null), `year` (`is null or 1980..2100`), `bike_type` (los 5), `size`, `color`, `serial_number`, `km_noted` (`is null or >= 0`), `notes`; índices `(customer_id)`, `(branch_id, serial_number)`.

**`schema-orders.ts`** (`orderTables`)
- `work_orders` (F1-15): B, `number integer not null` (`>= 1`; `uq_work_orders_branch_number`), `customer_id`, `bike_id`, `booking_id uuid null → bookings` (`uq_work_orders_booking`), `status text not null default 'reservada'`, `requested_service not null`, `diagnosis`, `observations`, `notes`, `assigned_mechanic_id → users`, `estimated_delivery_date date`, `delivery_date_confirmed_at`, `estimated_minutes`/`total_clp`/`paid_clp integer not null default 0`, `qc_approved_at`, `qc_approved_by → users`, `qc_self_checked boolean not null default false`, `warranty_of_order_id → work_orders`, `tax_doc_type` (`is null or in ('boleta', 'factura')`), `tax_doc_number`, `tax_doc_date date`, `received_at`, `delivered_at`, V, CB. CHECKs: los 11 estados; `total_clp >= 0 and paid_clp >= 0 and estimated_minutes >= 0`; **`work_orders_delivered_paid_check`: `status <> 'entregada' or paid_clp = total_clp`**; **`work_orders_qc_check`: `status not in ('lista_para_retirar', 'entregada') or qc_approved_at is not null`**. Índices `(branch_id, status)`, `(assigned_mechanic_id, status)`, `(bike_id)`, `(customer_id)`, `(branch_id, estimated_delivery_date)`.
- `work_order_status_history` (F1-15): B, `work_order_id`, `from_status` (null), `to_status`, `actor_user_id` (null = cliente), `note`; índice `(work_order_id, created_at)`.
- `intake_checks` (F1-17): B, `work_order_id`, `item_key` (`in ('frenos', 'cadena', 'transmision', 'ruedas', 'neumaticos', 'estado_general', 'problemas_visibles')`), `result` (`in ('ok', 'revisar', 'malo')`), `note`, CB; único `(work_order_id, item_key)`.
- `intake_accessories` (F1-17): B, `work_order_id`, `description`, V, CB.
- `work_order_items` (F1-18): B, `work_order_id`, `kind` (`servicio|repuesto`), `origin` (`inicial|adicional`), `service_id` (null), `description`, `quantity` (`> 0`, default 1), `unit_price_clp`, `estimated_minutes` (default 0; ambos `>= 0`), V, CB. **F1-26:** + `approval_id uuid null → work_order_approvals`.
- `order_photos` (F1-19): B, `work_order_id`, `stage` (`recepcion|reparacion|terminado`), `retention_class` (`(stage = 'recepcion' and retention_class = 'recepcion_6m') or (stage <> 'recepcion' and retention_class = 'permanente')`), `full_key`, `thumb_key` (únicos), `width`, `height`, `full_purged_at`, V, CB; índices `(work_order_id, stage)`, `(retention_class, created_at)`.
- `order_signatures` (F1-20): B, `work_order_id`, `kind` (`recepcion|entrega`), `storage_key` (único), `signed_by_name`, `signed_at`, CB; único `(work_order_id, kind)`.
- `work_order_approvals` (F1-26): B, `work_order_id`, `description`, `recommendation`, `price_clp` (`> 0`), `token_hash` (único), `decided_at`, `decision` (`(decided_at is null and decision is null) or (decided_at is not null and decision in ('aprobado', 'rechazado'))`), `decided_ip_hash`, V, CB.
- `qc_checks` (F1-28): B, `work_order_id`, `item_key` (`in ('frenos', 'cambios', 'ruedas', 'apriete', 'neumaticos', 'prueba_de_rodaje', 'limpieza')`), `result` (`ok|falla`), `note`, `actor_user_id not null`, `self_check boolean`.
- `payments` (F1-29): B, `work_order_id`, `kind` (`abono|final`), `method` (`transferencia|tarjeta|efectivo|otro`), `amount_clp` (`> 0`), `received_by not null`, `received_at not null`, V; **`uq_payments_one_abono (work_order_id) where kind = 'abono' and voided_at is null`**; índice `(branch_id, received_at)`.
- `bike_components` (F1-31): B, `bike_id`, `work_order_id`, `work_order_item_id` (null), `component_type`, `brand`, `model`, `serial_number`, `installed_at date`, `price_clp` (default 0, `>= 0`), `replaced_at date` (`is null or >= installed_at`), `replaced_by_component_id → bike_components`, V, CB. Sin kilómetros.
- `service_reports` (F1-32): B, `work_order_id` (único), `generated_at`, `generated_by`, `snapshot jsonb not null` (forma en §5), `share_token_hash` (único).

19 tablas nuevas (2 + 5 + 12), las de FASE1 §5.

### Relaciones
branches 1—N users y tablas de operación · customers 1—N bikes · bikes 1—N work_orders, bike_components · work_orders 1—N history, intake_*, items, photos, signatures (≤ 1 por tipo), approvals, qc_checks, payments, components; 1—1 service_reports; N—1 bookings (opcional, único); N—1 work_orders (garantía). Borrado: `restrict` (nada se borra; se anula); `admin_sessions.user_id` `cascade`.

### Migraciones
`pnpm db:generate` emite el SQL con un nombre elegido por drizzle-kit ("la migración que emite `pnpm db:generate`"). **Cada paso de esquema es solo aditivo**; F1-37 es solo de borrado. Nunca `--custom`, nunca editar `drizzle/`. `pnpm db:migrate` solo contra la base dev. Replit propaga el esquema al publicar **sin datos y sin correr `drizzle/`**; `scripts/db-migrate.ts` se niega dentro de una deployment. `pnpm db:check` deriva las tablas esperadas de `drizzle/*.sql` (desde F1-37 resta `DROP TABLE`) y revisa columnas de `allTables` (y de `tallerTables`/`orderTables` desde F1-37).

### Datos iniciales
Producción: la sucursal "Vitacura" y el dueño nacen en la copia al ingresar (F1-04) o con `pnpm admin:set-password`. Pruebas: PGlite por test; E2E: `e2e/global-setup.ts` (§19.6).

### Delta
+19 tablas, +`bookings.source`, +`admin_sessions.user_id`, `admin_user_id` nullable (F1-03) y luego eliminado junto con `admin_users` (F1-37).

---

## 5. Diseño de API

### Convenciones
- Tareas: `{ "ok": boolean, … }`. Subida de fotos: éxito `{ id, thumbUrl }`; error `{ error, code }` con `unauthenticated` 401, `forbidden` 403, `not_found` 404, `invalid_status` 409, `too_large` 413, `invalid_image` 415, `validation_error` 422.
- Páginas `/taller/**`: POST → 303 a la misma página con `?hecho=<acción>`, o la página con 4xx y errores en texto.
- Validación: esquemas zod exportados por cada módulo de `src/server/taller/**`.
- Errores de dominio: `{ ok: false, code }`; solo lo inesperado lanza.
- Sin paginación salvo límites fijos (50–100 filas).
- Límite de tasa: POST de `/aprobacion/[token]` reutiliza el contador de `booking_requests` (5 por IP en 10 min → 429).

### Rutas
| Método | Ruta | Descripción | Auth | Límite |
|---|---|---|---|---|
| POST | `/api/tareas/recordatorios` | `sendReminders` (F1-01) | Bearer `TASKS_SECRET` | — |
| POST | `/api/tareas/alertas` | Resumen de órdenes atrasadas (F1-36) | Bearer | — (no idempotente; 1 vez/día) |
| POST | `/api/tareas/retencion` | Purga copias completas de recepción > 6 meses (F1-36) | Bearer | — |
| GET/POST | `/taller/**` | Área interna | Sesión + `can` | — |
| POST | `/taller/ordenes/[id]/fotos` | Subida de 1 foto (F1-19) | Sesión + `can` + Origin | 15 MB |
| GET | `/taller/media/[...key]` | Foto o firma (F1-19/20) | Sesión + acceso a la orden | — |
| GET | `/taller/ordenes/[id]/etiqueta` | HTML de 62 mm (F1-23) | Sesión + acceso | — |
| GET/POST | `/aprobacion/[token]` | Ver y decidir un adicional (F1-27) | Token | 5/IP/10 min |
| GET | `/informe/[token]` | Informe de solo lectura (F1-33) | Token | — |

### Endpoints críticos
- **`POST /api/tareas/recordatorios`**: método ≠ POST → 405 `{"ok":false,"error":"method_not_allowed"}`; bearer ausente/erróneo o `TASKS_SECRET` sin configurar → 401 `{"ok":false,"error":"unauthorized"}` + log `tasks.unauthorized` (sin IP ni datos). 200 `{"ok":true,"sent":n}`; envíos fallidos → 500 `{"ok":false,"sent":n,"failed":m}`; excepción → 500 `{"ok":false,"error":"internal_error"}`. Idempotente por `reminder_sent_at`.
- **`POST /api/tareas/alertas`**: 200 `{"ok":true,"overdue":n,"sent":true|false}`; fallo de correo → 500 `{"ok":false,"overdue":n,"sent":false}`.
- **`POST /api/tareas/retencion`**: 200 `{"ok":true,"purged":n}`; fallos → 500 `{"ok":false,"purged":n,"failed":m}`.
- **`POST /taller/ordenes/[id]/fotos`**: multipart `foto` + `etapa`. Orden: sesión (401; la primera comprobación, antes de Origin y del id — el smoke lo afirma con `POST /taller/ordenes/x/fotos` sin sesión) → Origin (403) → `content-length` > 16 MiB (413) → zod (422) → > 15 MiB (413) → `image/*` (415) → permiso/acceso (403) → estado admite la etapa (409) → sharp (415) → almacenamiento → fila → 201.
- **`POST /aprobacion/[token]`** `decision=aprobar|rechazar`: rate limit → token (vista inválida, 404) → `update … where token_hash = $1 and decided_at is null and voided_at is null returning` → efectos (F1-27) → vista "respondida".
- **Snapshot del informe** (`service_reports.snapshot`, versión 1): `{ version: 1, orderNumber, customerFirstName, bike: { brand, model, year, type, size, color, serialNumber, kmNoted }, receivedAt, deliveredAt, diagnosis, workDone: [{ description, quantity }], problemsFound: [{ item, result, note }], componentsReplaced: [{ componentType, brand, model, replaces }], photosBefore: [{ photoId, thumbKey }], photosAfter: [{ photoId, thumbKey }], recommendations, nextChecks, rejectedWork: [{ description, recommendation, decidedAt }], totalClp }`. Nunca teléfono, correo ni RUT.

### Delta
Nuevas: las rutas de la tabla. Modificados: `handleWhatsAppCron` lee `CRON_SECRET` con `getCronEnv()`; `createBooking` acepta `source?`; `checkRateLimit`/`recordAttempt` pasan a exportarse; `requireAdmin` devuelve `SessionUser` con rol; `/admin/login` acepta `next`.

### Interfaces held constant
| Interfaz | Garantía | Prueba |
|---|---|---|
| `GET /api/disponibilidad`, `POST /api/reservas` | Sin cambios | `tests/integration/api.test.ts` |
| `/reservas/cancelar`, `cancelBooking` | Sin cambios | `cancel-flow.test.ts` |
| `bookings` (columnas, estados, 1/bloque, 4/día, teléfono, locks) | Solo `+source` | `concurrency.test.ts`, `create-booking.test.ts` |
| `createBooking(db, input, now)` | `source` opcional, default `web` | `manual-booking.test.ts` (F1-14) |
| Correos y `sendReminders(db, now, deps)` | Sin cambios | `email.test.ts`, `reminders.test.ts` |
| `/admin` agenda, mes, bloqueos, detalle | Solo rol + enlace | `admin-panel.test.ts`, `admin-month.test.ts`, smoke `/admin` 303 |
| Cookie `vb_admin_session`, 7 días, Lax, scrypt, 5 fallos/15 min | Solo cambia la tabla | `admin-auth.test.ts` |
| Módulo WhatsApp, `CRON_SECRET`, `ready_for_pickup` | Solo `getCronEnv()` | `whatsapp.test.ts` sin cambios |
| `PUBLIC_*`, tokens de `global.css`, `.replit` | Sin cambios | `tests/build/**`, `replit-config.test.ts` |

---

## 6. Arquitectura de frontend

### Rutas
| Ruta | Página | Datos | Auth |
|---|---|---|---|
| `/taller` | Dashboard por rol | `dashboard.ts` | sesión |
| `/taller/usuarios` | Usuarios + auditoría | `users.ts`, `audit.ts` | `users.manage` |
| `/taller/catalogo`, `/[id]` | Servicios y precios | `catalog.ts` | `catalog.view` / `catalog.edit` |
| `/taller/clientes`, `/nuevo`, `/[id]` | Clientes, bicis, historial | `customers.ts`, `bikes.ts`, `history.ts` | `customers.manage` |
| `/taller/bicicletas/[id]` | Bici + historial | `bikes.ts`, `history.ts` | `customers.manage` |
| `/taller/buscar` | Búsqueda única | `search.ts` | sesión |
| `/taller/reservas`, `/nueva` | Reservas próximas y manuales | `manual-booking.ts` | `bookings.manage` |
| `/taller/recepcion/nueva` | Inicio de recepción | `orders.ts` | `reception.perform` (los 4 roles) |
| `/taller/ordenes`, `/[id]` y subpantallas | Orden | módulo homónimo | sesión + acceso + acción de §8 |
| `/aprobacion/[token]`, `/informe/[token]` | Públicas | `approvals.ts`, `reports.ts` | token |

### Estrategia de renderizado
Todo `/taller/**`, `/aprobacion/**`, `/informe/**` con `prerender = false`, `cache-control: no-store`, `noindex`. Islas `client:load`. Sin caché de datos.

### Jerarquía de componentes
```
TallerLayout (servidor: header, nav filtrada con can, <style is:global>)
└─ ordenes/[id]/cierre.astro (servidor)
   ├─ miniaturas (<img src="/taller/media/…">)
   ├─ PhotoCapture (isla: input file capture=environment, XHR con progreso, recarga)
   └─ <form method=post> SignaturePad (isla: canvas + input oculto "firma") + nombre + "Finalizar recepción"
```

### Estado
Todo en el servidor; las páginas recargan tras cada POST. Las islas solo guardan estado local.

### Estados de carga, vacío y error
Cada lista tiene texto vacío ("No hay órdenes abiertas.", "Sin fotos todavía.", "Sin propuestas."); cada POST con error muestra `role="alert"`; `PhotoCapture` muestra progreso y error por foto; la firma vacía muestra "Falta la firma del cliente".

---

## 7. Sistema de diseño

Se mantiene el sistema aprobado (tabla literal en `workspace/CLAUDE.md`). **Ningún token ni hex nuevo.**

### Colores
Los nueve tokens de `global.css`, claro y oscuro. **Contraste (calculado 2026-10-05):** `--ink` #0C0D0E sobre #FFFFFF ≈ 19,4:1; `--steel` #5A5E63 sobre #FFFFFF ≈ 6,5:1; `--steel` #9C9FA4 sobre #151618 ≈ 6,8:1 — los tres cumplen AA.

### Tipografía
Michroma 400 (h1), Archivo Variable 400/600 cuerpo 16px/1.55, IBM Plex Mono 400/500 para números de orden y montos (`tabular-nums`); autoalojadas (`@fontsource`).

### Espaciado, radio, elevación
Radio 2px, reglas 1px, sin sombras. En `/taller`: objetivos ≥ 48px, separación ≥ 8px; tablet de referencia 820×1180.

### Movimiento
`--dur-fast` 140ms, `--dur` 160ms; `prefers-reduced-motion` → 0ms. Las islas no animan.

### Estilo de componentes
Monocromo con más densidad. Estados como `span.status.status--<estado>`: borde sólido (abiertos), punteado (`esperando_*`), doble (`control_calidad`, `lista_para_retirar`), fondo `--hatch` (terminales), siempre con el texto de `STATUS_LABELS`. Opciones del checklist como etiquetas-botón segmentadas.

---

## 8. Autenticación y autorización

### Proveedor
Sesión propia existente: cookie `vb_admin_session` HttpOnly, `SameSite=Lax`, Secure si `PUBLIC_SITE_URL` es https, 7 días, token de 32 bytes guardado como sha256, scrypt, 5 fallos por IP+correo en 15 min.

### Flujos
- **Login:** `/admin/login?next=…` → POST (Origin) → rate limit → `users` por correo (activo + clave) → sesión con `user_id` → 303 a `safeNextPath(next)` o `defaultLanding(role)` (`/admin` si `admin.panel`, si no `/taller`).
- **Copia al ingresar (F1-04 → F1-37):** correo ausente en `users` pero presente en `admin_users` con clave correcta → una transacción: sucursal "Vitacura" si falta, `users` con el **mismo id**, rol `owner`, nombre = parte local del correo; borrar `admin_sessions` con `user_id` nulo; crear la sesión. Ocurre dentro de un login, no al arrancar.
- **Sin sesión** en páginas de `/taller/**` o `/admin/**` → 303 `/admin/login?next=<ruta>`; en los endpoints `.ts` de subida y medios → 401. **Clave:** el dueño la resetea en `/taller/usuarios` (revoca sesiones) o con `pnpm admin:set-password`. Desactivar revoca sesiones.

### Protección de rutas
| Superficie | Regla | Dónde |
|---|---|---|
| `/admin/**` | sesión + `admin.panel` (mecánico → 403) | las 4 páginas de `src/pages/admin/` (F1-05) |
| `/taller/**` | sesión + acción + `canAccessOrder` en órdenes | cada página/endpoint + cada función de dominio |
| `/api/tareas/*` | bearer `TASKS_SECRET` | `task-handlers.ts` |
| `/aprobacion/*`, `/informe/*` | token sha256 | `approvals.ts`, `reports.ts` |

**Regla:** la autorización se decide en el servidor en cada petición; ocultar un botón no es un permiso.

### Roles y permisos (`permissions.ts`, `can(role, action)`)
| Acción | owner | admin | reception | mechanic |
|---|---|---|---|---|
| `admin.panel`, `customers.manage`, `bookings.manage`, `orders.view_all`, `orders.assign`, `orders.cancel`, `items.add_part`, `tax_doc.edit`, `warranty.open`, `approvals.create`, `payments.record`, `delivery.complete`, `reports.generate`, `dashboard.admin` | ✓ | ✓ | ✓ | — |
| `catalog.edit`, `items.override_price`, `items.void`, `payments.void` | ✓ | ✓ | — | — |
| `users.manage`, `audit.view`, `qc.approve` | ✓ | — | — | — |
| `reception.perform`, `catalog.view`, `orders.edit`, `items.add_catalog`, `photos.upload`, `components.manage` | ✓ | ✓ | ✓ | ✓ (órdenes accesibles) |
| `dashboard.mechanic` | — | — | — | ✓ |

**Recepción por el mecánico (decisión A del hilo principal, §20.3 #26):** `reception.perform` incluye al mecánico. Una orden que crea un mecánico queda **asignada a él**; `startReception` crea cliente y bici con funciones internas sin exigir `customers.manage`; `searchTaller` devuelve clientes con `customers.manage` **o** `reception.perform`. `ROLE_LABELS`: Dueño, Administrador, Recepción, Mecánico. **`canAccessOrder`** (F1-22): no mecánico → sí; mecánico → asignada a él, o sin asignar en `reservada`, `recibida` o `diagnostico`. Ese mismo conjunto es el de `listOrders` (F1-22) y el de `mechanicDashboard.unassigned` (F1-35). El mecánico **nunca cambia un precio** (403). La fase 1 no guarda costos ni márgenes. Control de calidad: solo el dueño aprueba; si la orden la hizo el dueño (asignada a él o sin mecánico) queda `qc_self_checked = true`; `QC_REQUIRE_SECOND_PERSON = false` deja preparada la exigencia de una segunda persona (decisión 14).

**Estados (D-P)** y `ORDER_TRANSITIONS`: `reservada → recibida | cancelada` · `recibida → diagnostico | cancelada` · `diagnostico → esperando_aprobacion | esperando_repuesto | en_reparacion | trabajo_rechazado | cancelada` · `esperando_aprobacion → en_reparacion | trabajo_rechazado | cancelada` · `esperando_repuesto → en_reparacion | esperando_aprobacion | cancelada` · `en_reparacion → esperando_repuesto | esperando_aprobacion | control_calidad | cancelada` · `control_calidad → en_reparacion | lista_para_retirar` · `lista_para_retirar → entregada` · `entregada`, `cancelada`, `trabajo_rechazado` terminales. **Solo por flujo** (fuera de `MANUAL_TRANSITIONS`): `reservada→recibida`, `*→esperando_aprobacion`, `esperando_aprobacion→en_reparacion`, `control_calidad→lista_para_retirar`, `lista_para_retirar→entregada`. `cancelada`/`trabajo_rechazado` exigen `orders.cancel`. `STATUS_LABELS`: Reservada, Recibida, Diagnóstico, Esperando aprobación, Esperando repuesto, En reparación, Control de calidad, Lista para retirar, Entregada, Cancelada, Trabajo rechazado. Pasar a `lista_para_retirar` **no envía nada** (D-E).

### Sesiones
Sin cambios de token, duración ni flags. CSRF: `isAllowedOrigin` en todo POST con cookie; los POST con token público no chequean Origin (lo registran).

### Aislamiento por sucursal
Toda función de dominio recibe `actor: SessionUser` y filtra por `actor.branchId`; toda fila nueva usa ese `branch_id`.

---

## 9. ORDEN DE CONSTRUCCIÓN

### Reglas de un paso
1. Una sesión por paso; **≤ 5 archivos escritos a mano, máximo 6 cuando el sexto es una página `.astro` o un endpoint `.ts` delgado, o una sola línea agregada a `scripts/smoke.sh`** (solo F1-09: `schema-taller.ts`, `rules.ts`, `catalog.ts`, `catalogo/index.astro`, `catalogo/[id].astro`, `catalog.test.ts`; F1-19: `schema-orders.ts`, `photos.ts`, `fotos.ts`, `media/[...key].ts`, `photos.test.ts`, `smoke.sh`; y F1-36: `task-handlers.ts`, `api/tareas/alertas.ts`, `api/tareas/retencion.ts`, `maintenance.ts`, `tasks-maintenance.test.ts`, `README.md`). Lo generado en `drizzle/` no cuenta. ≤ 6 criterios.
2. Cada paso tiene Hacer, Done when, Verify y Checkpoint; la dirección de implementación completa está repetida en su épica, que es autocontenida.
3. Verify es shell literal desde la raíz; toda línea sale 0 cuando el paso es correcto; los fallos esperados afirman el código **y** el mensaje. La última línea siempre es `pnpm format && pnpm gate   # expect: exit 0`.
4. Ningún Verify afirma estado de git: eso va en el Checkpoint, después del commit.
5. Un paso no está hecho hasta que su Verify y los anteriores sigan pasando; las variables nuevas son por accesor, con valores por defecto o solo en el endpoint que las usa.
6. **Checkpoint:** `git add -A && git commit -m "<tipo>: f1-NN <descripción en inglés>" && git tag f1-NN` (sin trailers de atribución). **Reversión de un paso:** `git reset --hard f1-<NN-1>` y, si el paso o uno posterior migró la base dev, restaurar la base dev desde cero:
   ```bash
   test -z "$REPLIT_DEPLOYMENT" && psql "$(node --env-file-if-exists=.env -p 'process.env.DATABASE_URL')" -v ON_ERROR_STOP=1 -c 'drop schema public cascade; create schema public; drop schema if exists drizzle cascade;' && pnpm db:migrate
   ```
   Solo contra la base dev del workspace: toma `DATABASE_URL` de `.env` (con el rol local, ver §10) y se niega dentro de una deployment (`REPLIT_DEPLOYMENT`). **Ni este comando ni `git reset --hard` tienen entrada propia en el allowlist, pero eso no los impide técnicamente:** `node -e:*` (entrada existente del dueño, que se conserva) y `node -p:*` permiten ejecutar JS arbitrario. Lo que los resguarda es la confirmación del operador en la sesión supervisada: el builder los propone, el operador los aprueba cada vez (§14, §20.3 #27). La base E2E se recrea sola en cada `pnpm test:tablet`.
7. Nunca saltar adelante; un paso bloqueado se reporta.
8. **Prueba en tablet real** (F1-16, 17, 18, 21, 25, 28, 30): línea manual separada del Verify, la marca el dueño; Playwright no la reemplaza y no es compuerta de máquina (también en §20.1). F1-19 (subida de fotos) y F1-20 (firma y cierre) son solo servidor y no tienen pantalla: su cobertura de tablet es `e2e/recepcion-completa.spec.ts` de F1-21, que sube cuatro fotos por el endpoint de F1-19 y finaliza con la firma de F1-20 en el viewport táctil.
9. Pasos de esquema: editar el esquema → `pnpm db:generate` (si drizzle-kit pregunta algo, detenerse: el cambio no es aditivo) → `pnpm db:migrate` → tests PGlite → `pnpm db:check`.
10. **Confirmación previa de F1-03 (operador, no es compuerta de máquina):** antes de delegar F1-03, el operador confirma con el dueño que los respaldos programados de la base de Replit están activos (FASE1 §12.1). Es el prerrequisito explícito que pidió el dueño (§20.3 #25).

### Un paso, una unidad
37 pasos = 37 tareas = 37 bloques en 5 épicas (8 + 8 + 8 + 6 + 7). Supera el rango orientativo de 10–18 porque cada paso se limitó a 5 archivos (§20.3 #16).

### Mapa de pasos
| Paso | Tarea | Tag | Título | Depende de | Épica |
|---|---|---|---|---|---|
| F1-01 | E1-T1 | f1-01 | Endpoint de recordatorios por cron externo | — | 01 |
| F1-02 | E1-T2 | f1-02 | `CRON_SECRET` por env.ts y corte documentado | F1-01 | 01 |
| F1-03 | E1-T3 | f1-03 | Esquema expand + matriz de roles | F1-02 | 01 |
| F1-04 | E1-T4 | f1-04 | Sesión sobre `users`, copia al ingresar, `admin:set-password` | F1-03 | 01 |
| F1-05 | E1-T5 | f1-05 | Login con `next` y `/admin` por rol | F1-04 | 01 |
| F1-06 | E1-T6 | f1-06 | Área `/taller` y arnés de tablet | F1-05 | 01 |
| F1-07 | E1-T7 | f1-07 | Usuarios y auditoría | F1-06 | 01 |
| F1-08 | E1-T8 | f1-08 | Almacenamiento de imágenes | F1-02 | 01 |
| F1-09 | E2-T1 | f1-09 | Catálogo y precios | F1-07 | 02 |
| F1-10 | E2-T2 | f1-10 | Clientes: esquema, RUT y servidor | F1-09 | 02 |
| F1-11 | E2-T3 | f1-11 | Clientes: pantallas | F1-10 | 02 |
| F1-12 | E2-T4 | f1-12 | Bicicletas | F1-11 | 02 |
| F1-13 | E2-T5 | f1-13 | Búsqueda unificada | F1-12 | 02 |
| F1-14 | E2-T6 | f1-14 | Reservas manuales | F1-06 | 02 |
| F1-15 | E2-T7 | f1-15 | Orden: esquema, estados y número | F1-13 | 02 |
| F1-16 | E2-T8 | f1-16 | Inicio de recepción en tablet | F1-14, F1-15 | 02 |
| F1-17 | E3-T1 | f1-17 | Checklist y accesorios | F1-16 | 03 |
| F1-18 | E3-T2 | f1-18 | Líneas, totales y fecha sugerida | F1-17 | 03 |
| F1-19 | E3-T3 | f1-19 | Fotos: servidor y medios | F1-18, F1-08 | 03 |
| F1-20 | E3-T4 | f1-20 | Firma y cierre: servidor | F1-19 | 03 |
| F1-21 | E3-T5 | f1-21 | Recepción completa en tablet | F1-20 | 03 |
| F1-22 | E3-T6 | f1-22 | Detalle, estados y asignación | F1-21 | 03 |
| F1-23 | E3-T7 | f1-23 | Etiqueta con QR y búsqueda por número | F1-22 | 03 |
| F1-24 | E3-T8 | f1-24 | Líneas, precios y documento tributario | F1-22 | 03 |
| F1-25 | E4-T1 | f1-25 | Galería por etapa y garantía | F1-24, F1-23 | 04 |
| F1-26 | E4-T2 | f1-26 | Propuesta de adicional | F1-25 | 04 |
| F1-27 | E4-T3 | f1-27 | Página pública de aprobación | F1-26 | 04 |
| F1-28 | E4-T4 | f1-28 | Control de calidad | F1-27 | 04 |
| F1-29 | E4-T5 | f1-29 | Pagos | F1-28 | 04 |
| F1-30 | E4-T6 | f1-30 | Entrega con saldo cero y firma | F1-29 | 04 |
| F1-31 | E5-T1 | f1-31 | Componentes | F1-30 | 05 |
| F1-32 | E5-T2 | f1-32 | Informe final | F1-31 | 05 |
| F1-33 | E5-T3 | f1-33 | Informe público | F1-32 | 05 |
| F1-34 | E5-T4 | f1-34 | Historial de bici y cliente | F1-33 | 05 |
| F1-35 | E5-T5 | f1-35 | Dashboards por rol | F1-34 | 05 |
| F1-36 | E5-T6 | f1-36 | Alertas de atraso y retención | F1-35 | 05 |
| F1-37 | E5-T7 | f1-37 | Contracción de usuarios y compuerta de la fase | F1-36 | 05 |

Cada paso lleva archivos, lo esencial de Hacer, criterios (idénticos a `tasks.json` y a la épica), Verify y Checkpoint. **La dirección completa está en la épica.**

---

#### F1-01 — Endpoint de recordatorios por cron externo (E1-T1)
**Archivos:** `src/lib/env.ts` · `src/server/api/task-handlers.ts` · `src/pages/api/tareas/recordatorios.ts` · `tests/integration/tasks.test.ts` · `scripts/smoke.sh`
**Hacer:** `getTasksEnv()` (`TASKS_SECRET` ≥ 32) y `getCronEnv()` (`CRON_SECRET` opcional, sin mínimo); `isAuthorizedTask` + guardia común + `handleRemindersTask` (llama `sendReminders` sin cambios); envoltorio de 3 líneas; smoke afirma 401.
**Done when**
- [ ] WHEN `handleRemindersTask` recibe un POST sin cabecera `Authorization`, con un bearer distinto de `TASKS_SECRET` o sin `TASKS_SECRET` configurado THE SYSTEM SHALL responder 401 con `{"ok":false,"error":"unauthorized"}` sin llamar a `sendReminders`
- [ ] WHEN recibe un POST con `Authorization: Bearer <TASKS_SECRET>` y hay una reserva confirmada para mañana sin recordatorio THE SYSTEM SHALL responder 200 con `{"ok":true,"sent":1}` y marcar `reminder_sent_at`
- [ ] WHEN el mismo POST se repite el mismo día THE SYSTEM SHALL responder 200 con `{"ok":true,"sent":0}` sin enviar un segundo correo
- [ ] WHEN algún envío falla THE SYSTEM SHALL responder 500 con `{"ok":false,"sent":n,"failed":m}`
- [ ] WHEN se rechaza un intento THE SYSTEM SHALL registrar `tasks.unauthorized` sin correos, teléfonos ni el secreto en los logs
- [ ] WHEN `sh scripts/smoke.sh` corre contra el build THE SYSTEM SHALL obtener 401 de `POST /api/tareas/recordatorios` sin cabecera
**Verify**
```bash
pnpm test tests/integration/tasks.test.ts tests/integration/reminders.test.ts tests/integration/whatsapp.test.ts   # expect: exit 0, 0 failed
pnpm format && pnpm gate   # expect: exit 0
```
**Checkpoint**
```bash
git add -A && git commit -m "feat: f1-01 add authenticated reminders task endpoint" && git tag f1-01
git tag -l f1-01 | grep -qx f1-01   # expect: exit 0
```

#### F1-02 — `CRON_SECRET` por env.ts y corte documentado (E1-T2)
**Archivos:** `src/server/whatsapp/cron.ts` · `.env.example` · `README.md` · `blueprints/vector-bikes/blueprint.md`
**Hacer:** default de `secret` = `getCronEnv().CRON_SECRET`; `TASKS_SECRET=dev-tasks-secret-change-me-0123456789ab`; sección README; la única edición permitida del blueprint del sitio (texto literal en la épica 01).
**Done when**
- [ ] WHEN `handleWhatsAppCron` se llama sin el argumento `secret` THE SYSTEM SHALL leer `CRON_SECRET` con `getCronEnv()` de `src/lib/env.ts`, sin `process.env` en `src/server/whatsapp/cron.ts`
- [ ] WHEN corre `pnpm test tests/integration/whatsapp.test.ts` THE SYSTEM SHALL pasar sin cambios en ese archivo
- [ ] WHEN se lee `.env.example` THE SYSTEM SHALL contener una línea `TASKS_SECRET=` con un valor de al menos 32 caracteres
- [ ] WHEN se lee `README.md` THE SYSTEM SHALL contener la sección `## Recordatorios por correo (cron externo)` con `POST https://vectorbikes.cl/api/tareas/recordatorios`
- [ ] WHEN se lee `blueprints/vector-bikes/blueprint.md` THE SYSTEM SHALL contener la fila `| 25 | Recordatorios por correo disparados por un cron externo de Make.com` y el punto `**Lanzamiento — cron externo de recordatorios**`, y ninguna línea con `Lanzamiento — Scheduled Deployment`
**Verify**
```bash
pnpm test tests/integration/whatsapp.test.ts tests/integration/tasks.test.ts   # expect: exit 0, 0 failed
grep -q 'getCronEnv' src/server/whatsapp/cron.ts   # expect: exit 0
grep -q 'process.env' src/server/whatsapp/cron.ts; test $? -eq 1   # expect: 1 = sin coincidencias → la línea sale 0
grep -Eq '^TASKS_SECRET=.{32,}$' .env.example   # expect: exit 0
grep -qF '## Recordatorios por correo (cron externo)' README.md   # expect: exit 0
grep -qF 'POST https://vectorbikes.cl/api/tareas/recordatorios' README.md   # expect: exit 0
grep -qF '| 25 | Recordatorios por correo disparados por un cron externo de Make.com' blueprints/vector-bikes/blueprint.md   # expect: exit 0
grep -qF -- '- [ ] **Lanzamiento — cron externo de recordatorios**' blueprints/vector-bikes/blueprint.md   # expect: exit 0
grep -qF 'Lanzamiento — Scheduled Deployment' blueprints/vector-bikes/blueprint.md; test $? -eq 1   # expect: 1 = el punto viejo ya no está
pnpm format && pnpm gate   # expect: exit 0
```
**Checkpoint**
```bash
git add -A && git commit -m "docs: f1-02 document reminders cutover and read CRON_SECRET via env" && git tag f1-02
git tag -l f1-02 | grep -qx f1-02   # expect: exit 0
```

#### F1-03 — Esquema expand + matriz de roles (E1-T3)
**Confirmación previa del operador (no es compuerta de máquina):** antes de delegar este paso, el operador confirma con el dueño que los respaldos programados de la base de Replit están activos (FASE1 §12.1).
**Archivos:** `src/server/db/schema.ts` · `src/server/auth/permissions.ts` · `tests/integration/users-schema.test.ts` · `tests/unit/permissions.test.ts`
**Hacer:** exportar `instant`/`createdAt`/`updatedAt`; `branches`, `users`, `admin_sessions.user_id`, `admin_user_id` nullable, `bookings.source`; `allTables` += 2; generate (aditivo) → migrate; `permissions.ts` con la matriz de §8.
**Done when**
- [ ] WHEN `pnpm db:migrate` aplica la migración que emite `pnpm db:generate` THE SYSTEM SHALL crear `branches` y `users`, agregar `admin_sessions.user_id` y `bookings.source` y dejar `admin_users` intacta
- [ ] WHEN se inserta en `users` un `role` fuera de `owner`, `admin`, `reception` y `mechanic` THE SYSTEM SHALL rechazarlo con código `23514`
- [ ] WHEN se inserta una reserva sin `source` THE SYSTEM SHALL guardar `web`
- [ ] WHEN se inserta `bookings.source` fuera de `web`, `telefono`, `whatsapp` y `presencial` THE SYSTEM SHALL rechazarlo con código `23514`
- [ ] WHEN se inserta una sesión en `admin_sessions` sin `admin_user_id` THE SYSTEM SHALL aceptarla
- [ ] WHEN `can(role, action)` se evalúa THE SYSTEM SHALL devolver `true` para `owner` en toda acción salvo `dashboard.mechanic`, `true` para `mechanic` en `reception.perform`, `false` para `mechanic` en `admin.panel`, `catalog.edit`, `items.override_price` y `qc.approve`, y `false` para `admin` en `users.manage`
**Verify**
```bash
pnpm test tests/integration/users-schema.test.ts tests/unit/permissions.test.ts tests/integration/foundation.test.ts   # expect: exit 0, 0 failed
pnpm db:migrate   # expect: exit 0
pnpm db:check   # expect: exit 0, {"ok":true,...}
pnpm format && pnpm gate   # expect: exit 0
```
**Checkpoint**
```bash
git add -A && git commit -m "feat: f1-03 expand schema with branches, users and booking source" && git tag f1-03
git tag -l f1-03 | grep -qx f1-03   # expect: exit 0
```

#### F1-04 — Sesión sobre `users`, copia al ingresar, `admin:set-password` (E1-T4)
**Archivos:** `src/server/auth/admin-auth.ts` · `scripts/admin-set-password.ts` · `tests/integration/admin-auth.test.ts`
**Hacer:** `SessionUser`; `loginAdmin` sobre `users` con copia desde `admin_users`; `requireAdmin` por `user_id` activo; `setAdminPassword` sobre `users` (borra sesiones legadas); `safeNextPath`, `loginRedirect`, `defaultLanding`, `revokeUserSessions`. Las páginas `/admin` siguen compilando porque solo prueban si `requireAdmin` devuelve algo; su filtro por rol llega en F1-05.
**Done when**
- [ ] WHEN un correo existe solo en `admin_users` e inicia sesión con su clave correcta THE SYSTEM SHALL, en una transacción, crear la sucursal `Vitacura` si no hay ninguna, insertar en `users` una fila con el mismo `id`, rol `owner` y el nombre de la parte local del correo, borrar las filas de `admin_sessions` con `user_id` nulo y crear la sesión con `user_id`
- [ ] WHEN ese usuario vuelve a iniciar sesión THE SYSTEM SHALL autenticarlo contra `users` sin crear otra fila en `users`
- [ ] WHEN `requireAdmin` recibe el token de una sesión con `user_id` nulo, revocada, expirada o de un usuario con `is_active = false` THE SYSTEM SHALL devolver `null`
- [ ] WHEN `setAdminPassword` corre THE SYSTEM SHALL crear en `users` un usuario `owner` para un correo nuevo (y la sucursal si falta) o cambiar el `password_hash` y revocar las sesiones de uno existente, y borrar las sesiones con `user_id` nulo
- [ ] WHEN `safeNextPath` evalúa un `next` THE SYSTEM SHALL aceptar solo rutas relativas bajo `/taller` o `/admin` (`/taller/ordenes?x=1` sí; `//evil.com`, `https://evil.com` y `/otra` → `null`)
- [ ] WHEN `scripts/admin-set-password.ts` corre sin `ADMIN_EMAIL` ni `ADMIN_PASSWORD` y con un `DATABASE_URL` inalcanzable THE SYSTEM SHALL salir con código 1 y un mensaje que nombra `ADMIN_EMAIL`, sin intentar conectarse a la base
**Verify**
```bash
pnpm test tests/integration/admin-auth.test.ts tests/integration/admin-panel.test.ts   # expect: exit 0, 0 failed
out="$(DATABASE_URL=postgres://127.0.0.1:1/x env -u ADMIN_EMAIL -u ADMIN_PASSWORD node scripts/admin-set-password.ts 2>&1)"; test $? -eq 1 && printf '%s' "$out" | grep -q ADMIN_EMAIL   # expect: exit 0 — código 1 y error de configuración, no de conexión
pnpm format && pnpm gate   # expect: exit 0
```
**Checkpoint**
```bash
git add -A && git commit -m "feat: f1-04 move sessions to users with copy-on-login" && git tag f1-04
git tag -l f1-04 | grep -qx f1-04   # expect: exit 0
```

#### F1-05 — Login con `next` y `/admin` por rol (E1-T5)
**Archivos:** `src/pages/admin/login.astro` · `src/pages/admin/index.astro` · `src/pages/admin/bloqueos.astro` · `src/pages/admin/reservas/[id].astro`
**Hacer:** login con `next` oculto y destino `safeNextPath(next) ?? defaultLanding(role)`; las otras tres: sin sesión → 303 `loginRedirect(...)`, sin `admin.panel` → `forbiddenResponse()`, enlace `<a href="/taller">Taller</a>`. Este paso se verifica por el código fuente y las pruebas existentes; el comportamiento (403 del mecánico, aterrizaje en `/taller`) lo afirma `e2e/login.spec.ts` en F1-06, el primer paso con navegador.
**Done when**
- [ ] WHEN un grep recorre `src/pages/admin/index.astro`, `src/pages/admin/bloqueos.astro` y `src/pages/admin/reservas/[id].astro` THE SYSTEM SHALL encontrar en cada una `"admin.panel"`, `forbiddenResponse()` y `href="/taller"`
- [ ] WHEN un grep recorre `src/pages/admin/login.astro` THE SYSTEM SHALL encontrar `name="next"` y `safeNextPath`
- [ ] WHEN `sh scripts/smoke.sh` corre THE SYSTEM SHALL seguir obteniendo 303 en `/admin` sin sesión
- [ ] WHEN corren `tests/integration/admin-panel.test.ts` y `tests/integration/admin-month.test.ts` THE SYSTEM SHALL pasar sin cambios en esos archivos
**Verify**
```bash
grep -q '"admin.panel"' src/pages/admin/index.astro && grep -q 'forbiddenResponse()' src/pages/admin/index.astro && grep -q 'href="/taller"' src/pages/admin/index.astro   # expect: exit 0
grep -q '"admin.panel"' src/pages/admin/bloqueos.astro && grep -q 'forbiddenResponse()' src/pages/admin/bloqueos.astro && grep -q 'href="/taller"' src/pages/admin/bloqueos.astro   # expect: exit 0
grep -q '"admin.panel"' 'src/pages/admin/reservas/[id].astro' && grep -q 'forbiddenResponse()' 'src/pages/admin/reservas/[id].astro' && grep -q 'href="/taller"' 'src/pages/admin/reservas/[id].astro'   # expect: exit 0
grep -q 'name="next"' src/pages/admin/login.astro && grep -q 'safeNextPath' src/pages/admin/login.astro   # expect: exit 0
pnpm test tests/integration/admin-panel.test.ts tests/integration/admin-month.test.ts   # expect: exit 0, 0 failed
pnpm format && pnpm gate   # expect: exit 0 (el smoke afirma /admin 303)
```
**Checkpoint**
```bash
git add -A && git commit -m "feat: f1-05 add login next param and role gate on admin pages" && git tag f1-05
git tag -l f1-05 | grep -qx f1-05   # expect: exit 0
```

#### F1-06 — Área `/taller` y arnés de tablet (E1-T6)
**Archivos:** `src/layouts/TallerLayout.astro` · `src/pages/taller/index.astro` · `e2e/login.spec.ts` · `package.json` · `.env.example`
**Hacer:** `pnpm pkg set 'scripts["test:tablet"]=playwright test'` y `pnpm pkg set scripts.gate="pnpm check && pnpm test && pnpm build && pnpm test:build && pnpm test:tablet && pnpm smoke"`; `E2E_DATABASE_URL` en `.env.example` (el literal de abajo no cambia; en `.env` local usa el mismo rol que `DATABASE_URL`, §10); layout con nav filtrada y estilos del área; `/taller` con h1 "Taller" y "Hola, <nombre> · <rol>"; primer spec.
**Done when**
- [ ] WHEN se pide `/taller` sin sesión THE SYSTEM SHALL redirigir a `/admin/login?next=%2Ftaller`
- [ ] WHEN el dueño inicia sesión con toques en el viewport de tablet THE SYSTEM SHALL llevarlo a `/taller` con el `h1` `Taller` y el texto exacto `Dueño` visible
- [ ] WHEN el mecánico con sesión pide `/admin` THE SYSTEM SHALL responder 403
- [ ] WHEN `node -p` lee `scripts['test:tablet']` y `scripts.gate` de `package.json` THE SYSTEM SHALL obtener `playwright test` y `pnpm check && pnpm test && pnpm build && pnpm test:build && pnpm test:tablet && pnpm smoke`
- [ ] WHEN se lee `.env.example` THE SYSTEM SHALL contener la línea `E2E_DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/vector_bikes_e2e`
**Verify**
```bash
test "$(node -p "require('./package.json').scripts['test:tablet']")" = "playwright test"   # expect: exit 0
test "$(node -p "require('./package.json').scripts.gate")" = "pnpm check && pnpm test && pnpm build && pnpm test:build && pnpm test:tablet && pnpm smoke"   # expect: exit 0
grep -qx 'E2E_DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/vector_bikes_e2e' .env.example   # expect: exit 0
pnpm build && pnpm test:tablet e2e/login.spec.ts   # expect: exit 0, 0 failed
pnpm format && pnpm gate   # expect: exit 0
```
**Checkpoint**
```bash
git add -A && git commit -m "feat: f1-06 add taller area and tablet test harness" && git tag f1-06
git tag -l f1-06 | grep -qx f1-06   # expect: exit 0
```

#### F1-07 — Usuarios y auditoría (E1-T7)
**Archivos:** `src/server/db/schema-taller.ts` · `src/server/taller/audit.ts` · `src/server/taller/users.ts` · `src/pages/taller/usuarios.astro` · `tests/integration/users-admin.test.ts`
**Done when**
- [ ] WHEN el dueño crea un usuario rol `mechanic` con clave de al menos 12 caracteres THE SYSTEM SHALL insertarlo activo en la sucursal del dueño, de modo que `loginAdmin` con esas credenciales devuelve `ok: true`
- [ ] WHEN un usuario `admin` llama `createUser` THE SYSTEM SHALL devolver `{ ok: false, code: "forbidden" }` sin insertar filas
- [ ] WHEN el dueño desactiva un usuario o le resetea la clave THE SYSTEM SHALL revocar todas las sesiones abiertas de ese usuario
- [ ] WHEN el dueño intenta desactivarse o cambiar su propio rol THE SYSTEM SHALL devolver `{ ok: false, code: "self_change" }`
- [ ] WHEN se crea, desactiva, cambia de rol o resetea la clave de un usuario THE SYSTEM SHALL escribir una fila en `audit_log` con `actor_user_id`, `action`, `entity = 'users'` y `details` sin correos ni claves
**Verify**
```bash
pnpm test tests/integration/users-admin.test.ts   # expect: exit 0, 0 failed
pnpm db:migrate   # expect: exit 0
pnpm db:check   # expect: exit 0
pnpm format && pnpm gate   # expect: exit 0
```
**Checkpoint**
```bash
git add -A && git commit -m "feat: f1-07 add user management and audit log" && git tag f1-07
git tag -l f1-07 | grep -qx f1-07   # expect: exit 0
```

#### F1-08 — Almacenamiento de imágenes (E1-T8)
**Archivos:** `src/server/storage/storage.ts` · `src/server/storage/images.ts` · `src/lib/env.ts` · `.env.example` · `tests/integration/storage.test.ts`
**Hacer:** `getStorageEnv()` (local por defecto; en `REPLIT_DEPLOYMENT` exige `replit`); `ObjectStorage`, driver local atómico, driver Replit sobre cliente inyectable, `getStorage()`; `processPhoto`. **Verificado el 2026-10-05 por el hilo principal:** los tipos de `@replit/object-storage@1.0.0` encajan en `ReplitClientLike` (`Result` = `{ok:true,value}|{ok:false,error}`; `uploadFromBytes`/`delete` → `Result<null>`, `downloadAsBytes` → `Result<[Buffer]>`, `exists` → `Result<boolean>`; `ClientOptions.bucketId` opcional), sharp 0.35.5 conserva `withMetadata({ orientation: 6 })` y, bajo pnpm 12.4.2, las dos líneas `pnpm add -w` del Bootstrap dejan `@img/sharp-linux-x64` y `@img/sharp-libvips-linux-x64` en el lockfile. La prueba del driver Replit real es del checklist de lanzamiento.
**Done when**
- [ ] WHEN el driver `local` guarda, lee, consulta y borra una clave en un directorio temporal THE SYSTEM SHALL devolver los mismos bytes y `exists` verdadero antes del borrado y `get` nulo y `exists` falso después
- [ ] WHEN el driver `replit` corre con un cliente falso inyectado THE SYSTEM SHALL traducir `uploadFromBytes`, `downloadAsBytes`, `exists` y `delete` a la misma interfaz y lanzar `StorageError` ante un resultado `ok: false`
- [ ] WHEN `processPhoto` recibe un JPEG de 3000×2000 generado con sharp THE SYSTEM SHALL devolver una copia completa JPEG con lado mayor ≤ 2000 px y una miniatura con lado mayor ≤ 400 px
- [ ] WHEN `processPhoto` recibe un JPEG de 300×100 con orientación EXIF 6 THE SYSTEM SHALL devolver una copia de 100×300 sin orientación EXIF
- [ ] WHEN `processPhoto` recibe bytes que no son imagen THE SYSTEM SHALL lanzar `InvalidImageError`
- [ ] WHEN `getStorageEnv` corre con `REPLIT_DEPLOYMENT` definida y `STORAGE_DRIVER` distinto de `replit` THE SYSTEM SHALL lanzar `EnvError` que nombra `STORAGE_DRIVER`
**Verify**
```bash
pnpm test tests/integration/storage.test.ts   # expect: exit 0, 0 failed
grep -qx 'STORAGE_DRIVER=local' .env.example   # expect: exit 0
grep -q '@img/sharp-linux-x64' pnpm-lock.yaml   # expect: exit 0 — binario de sharp para Replit
grep -q '@img/sharp-libvips-linux-x64' pnpm-lock.yaml   # expect: exit 0
pnpm format && pnpm gate   # expect: exit 0
```
**Checkpoint**
```bash
git add -A && git commit -m "feat: f1-08 add image storage layer with local and replit drivers" && git tag f1-08
git tag -l f1-08 | grep -qx f1-08   # expect: exit 0
```

#### F1-09 — Catálogo y precios (E2-T1)
**Archivos (6; el sexto es una página delgada):** `src/server/db/schema-taller.ts` · `src/server/taller/rules.ts` · `src/server/taller/catalog.ts` · `src/pages/taller/catalogo/index.astro` · `src/pages/taller/catalogo/[id].astro` · `tests/integration/catalog.test.ts`
**Done when**
- [ ] WHEN el dueño o un administrador crea un servicio con nombre, descripción, duración estimada, materiales habituales y recomendaciones THE SYSTEM SHALL guardarlo en `services` con el `branch_id` de su sucursal
- [ ] WHEN se fija el precio de un servicio para un tipo `mtb`, `ruta`, `gravel`, `urbana` o `ebike` THE SYSTEM SHALL mantener una sola fila por (`service_id`, `bike_type`) en `service_prices`
- [ ] WHEN un mecánico llama `setServicePrice` THE SYSTEM SHALL devolver `{ ok: false, code: "forbidden" }` y dejar `service_prices` sin cambios
- [ ] WHEN el dueño cambia un precio THE SYSTEM SHALL escribir en `audit_log` una fila `catalog.price_changed` con su `actor_user_id`, `created_at` y `details` con `before` y `after`
**Verify**
```bash
pnpm test tests/integration/catalog.test.ts   # expect: exit 0, 0 failed
pnpm db:migrate   # expect: exit 0
pnpm db:check   # expect: exit 0
pnpm format && pnpm gate   # expect: exit 0
```
**Checkpoint**
```bash
git add -A && git commit -m "feat: f1-09 add service catalog with prices per bike type" && git tag f1-09
git tag -l f1-09 | grep -qx f1-09   # expect: exit 0
```

#### F1-10 — Clientes: esquema, RUT y servidor (E2-T2)
**Archivos:** `src/server/db/schema-taller.ts` · `src/lib/rut.ts` · `src/server/taller/customers.ts` · `tests/integration/customers.test.ts`
**Done when**
- [ ] WHEN `normalizeRut` recibe `12.345.678-5`, `123456785`, `10.000.013-k` o `12.345.675-0` THE SYSTEM SHALL devolver `12345678-5`, `12345678-5`, `10000013-K` y `12345675-0`
- [ ] WHEN `normalizeRut` recibe `12.345.678-4`, `12345678`, `abc` o una cadena vacía THE SYSTEM SHALL devolver `null`
- [ ] WHEN se crea un cliente con un teléfono o un RUT que ya existe en la sucursal THE SYSTEM SHALL devolver `{ ok: false, code: "duplicate", existing }` con el `id` y el nombre de la ficha existente, sin insertar
- [ ] WHEN se reintenta con el mismo teléfono y `allowPhoneDuplicate: true` THE SYSTEM SHALL crear la ficha, y con un RUT repetido seguir devolviendo `duplicate`
- [ ] WHEN se crea un cliente con RUT con puntos y teléfono `9 1234 5678` THE SYSTEM SHALL guardar el RUT normalizado y el teléfono `+56912345678`
**Verify**
```bash
pnpm test tests/integration/customers.test.ts   # expect: exit 0, 0 failed
pnpm db:migrate   # expect: exit 0
pnpm db:check   # expect: exit 0
pnpm format && pnpm gate   # expect: exit 0
```
**Checkpoint**
```bash
git add -A && git commit -m "feat: f1-10 add customers with rut validation and duplicate detection" && git tag f1-10
git tag -l f1-10 | grep -qx f1-10   # expect: exit 0
```

#### F1-11 — Clientes: pantallas (E2-T3)
**Archivos:** `src/pages/taller/clientes/index.astro` · `src/pages/taller/clientes/nuevo.astro` · `src/pages/taller/clientes/[id].astro` · `e2e/clientes.spec.ts`
**Done when**
- [ ] WHEN el dueño completa `Nuevo cliente` con nombre `Laura Prueba` y teléfono `9 5555 6666` en el viewport de tablet THE SYSTEM SHALL mostrar la ficha con el nombre `Laura Prueba`
- [ ] WHEN intenta crear otro cliente con el mismo teléfono THE SYSTEM SHALL mostrar `Ya existe: Laura Prueba` con el enlace `Usar ficha existente`
- [ ] WHEN el mecánico pide `/taller/clientes` THE SYSTEM SHALL responder 403
**Verify**
```bash
pnpm build && pnpm test:tablet e2e/clientes.spec.ts   # expect: exit 0, 0 failed
pnpm format && pnpm gate   # expect: exit 0
```
**Checkpoint**
```bash
git add -A && git commit -m "feat: f1-11 add customer screens" && git tag f1-11
git tag -l f1-11 | grep -qx f1-11   # expect: exit 0
```

#### F1-12 — Bicicletas (E2-T4)
**Archivos:** `src/server/db/schema-taller.ts` · `src/server/taller/bikes.ts` · `src/pages/taller/clientes/[id].astro` · `src/pages/taller/bicicletas/[id].astro` · `tests/integration/bikes.test.ts`
**Done when**
- [ ] WHEN se crea una bicicleta para un cliente con marca, modelo, tipo y datos opcionales (año, talla, color, número de serie, kilometraje anotado) THE SYSTEM SHALL guardarla con el `customer_id` y el `branch_id` del cliente
- [ ] WHEN el tipo no es `mtb`, `ruta`, `gravel`, `urbana` ni `ebike` THE SYSTEM SHALL rechazarlo como error de validación sin insertar
- [ ] WHEN `listBikesOfCustomer` corre para un cliente con dos bicicletas THE SYSTEM SHALL devolver ambas
- [ ] WHEN se guarda un kilometraje anotado negativo THE SYSTEM SHALL rechazarlo sin cambiar la fila
**Verify**
```bash
pnpm test tests/integration/bikes.test.ts   # expect: exit 0, 0 failed
pnpm db:migrate   # expect: exit 0
pnpm db:check   # expect: exit 0
pnpm format && pnpm gate   # expect: exit 0
```
**Checkpoint**
```bash
git add -A && git commit -m "feat: f1-12 add bikes under customers" && git tag f1-12
git tag -l f1-12 | grep -qx f1-12   # expect: exit 0
```

#### F1-13 — Búsqueda unificada (E2-T5)
**Archivos:** `src/server/taller/search.ts` · `src/pages/taller/buscar.astro` · `tests/integration/search.test.ts`
**Hacer:** devuelve `{ customers, orders }`; clientes con `customers.manage` o `reception.perform`; `orders` vacío hasta F1-23.
**Done when**
- [ ] WHEN `searchTaller` recibe parte de un nombre en minúsculas THE SYSTEM SHALL devolver los clientes de la sucursal cuyo nombre la contiene sin distinguir mayúsculas
- [ ] WHEN recibe un teléfono como `9 1111 2222` o `+56911112222` THE SYSTEM SHALL devolver el cliente con `phone_e164` `+56911112222`
- [ ] WHEN recibe un RUT con o sin puntos THE SYSTEM SHALL devolver el cliente con ese RUT normalizado
- [ ] WHEN recibe `%` o `_` THE SYSTEM SHALL tratarlos como texto literal y no como comodín
- [ ] WHEN el actor pertenece a otra sucursal THE SYSTEM SHALL devolver una lista vacía de clientes
**Verify**
```bash
pnpm test tests/integration/search.test.ts   # expect: exit 0, 0 failed
pnpm format && pnpm gate   # expect: exit 0
```
**Checkpoint**
```bash
git add -A && git commit -m "feat: f1-13 add unified search by name, phone or rut" && git tag f1-13
git tag -l f1-13 | grep -qx f1-13   # expect: exit 0
```

#### F1-14 — Reservas manuales (E2-T6)
**Archivos:** `src/server/booking/create-booking.ts` · `src/server/taller/manual-booking.ts` · `src/pages/taller/reservas/index.astro` · `src/pages/taller/reservas/nueva.astro` · `tests/integration/manual-booking.test.ts`
**Done when**
- [ ] WHEN el personal crea una reserva manual con `source` `telefono` THE SYSTEM SHALL guardarla con `source = 'telefono'` mediante `createBooking`, y una reserva del sitio SHALL seguir guardándose con `source = 'web'`
- [ ] WHEN se piden cinco reservas manuales para el mismo día en bloques distintos THE SYSTEM SHALL aceptar cuatro y rechazar la quinta con `slot_unavailable`
- [ ] WHEN 20 reservas manuales concurrentes piden el mismo bloque THE SYSTEM SHALL aceptar exactamente una
- [ ] WHEN el teléfono ya tiene una reserva futura THE SYSTEM SHALL rechazar la manual con `phone_limit`
- [ ] WHEN la reserva manual se confirma THE SYSTEM SHALL enviar después del commit el correo `Reserva confirmada` al cliente, igual que una reserva del sitio
- [ ] WHEN un mecánico llama `createManualBooking` THE SYSTEM SHALL devolver `{ ok: false, code: "forbidden" }`
**Verify**
```bash
pnpm test tests/integration/manual-booking.test.ts tests/integration/create-booking.test.ts tests/integration/concurrency.test.ts tests/integration/api.test.ts   # expect: exit 0, 0 failed
pnpm format && pnpm gate   # expect: exit 0
```
**Checkpoint**
```bash
git add -A && git commit -m "feat: f1-14 add manual bookings for staff" && git tag f1-14
git tag -l f1-14 | grep -qx f1-14   # expect: exit 0
```

#### F1-15 — Orden: esquema, estados y número (E2-T7)
**Archivos:** `src/server/db/schema-orders.ts` · `src/server/taller/rules.ts` · `src/server/taller/orders.ts` · `tests/integration/work-orders.test.ts`
**Hacer:** `startReception` exige `reception.perform` (los cuatro roles); si el actor es mecánico, la orden nace asignada a él.
**Done when**
- [ ] WHEN `startReception` crea 10 órdenes concurrentes en la misma sucursal THE SYSTEM SHALL asignar los números 1 a 10 sin repetir y dejar `branches.next_order_number` en 11
- [ ] WHEN `formatOrderNumber` recibe 1 y 12345 THE SYSTEM SHALL devolver `OT-00001` y `OT-12345`
- [ ] WHEN `prefillFromBooking` lee una reserva cuyo teléfono ya tiene ficha THE SYSTEM SHALL devolver esa ficha en `existingCustomer`, y si no la tiene SHALL devolver nombre, teléfono y correo de la reserva en `prefill`
- [ ] WHEN se crea una orden THE SYSTEM SHALL dejarla en `reservada` con una fila de historial (`from_status` nulo → `reservada`, con autor) y una fila `order.created` en `audit_log`, asignada al actor si es mecánico
- [ ] WHEN un UPDATE directo en SQL pone `entregada` con `paid_clp` distinto de `total_clp` THE SYSTEM SHALL rechazarlo con código `23514`
- [ ] WHEN un UPDATE directo en SQL pone `lista_para_retirar` con `qc_approved_at` nulo THE SYSTEM SHALL rechazarlo con código `23514`
**Verify**
```bash
pnpm test tests/integration/work-orders.test.ts   # expect: exit 0, 0 failed
pnpm db:migrate   # expect: exit 0
pnpm db:check   # expect: exit 0
pnpm format && pnpm gate   # expect: exit 0
```
**Checkpoint**
```bash
git add -A && git commit -m "feat: f1-15 add work orders schema, statuses and numbering" && git tag f1-15
git tag -l f1-15 | grep -qx f1-15   # expect: exit 0
```

#### F1-16 — Inicio de recepción en tablet (E2-T8)
**Archivos:** `src/pages/taller/recepcion/nueva.astro` · `src/pages/taller/ordenes/[id]/recepcion.astro` · `src/server/taller/manual-booking.ts` · `src/pages/taller/reservas/index.astro` · `e2e/recepcion-inicio.spec.ts`
**Done when**
- [ ] WHEN el dueño toca `Recibir` en la reserva sembrada de `Carla Reserva` THE SYSTEM SHALL mostrar el formulario con nombre, teléfono y correo de la reserva ya escritos
- [ ] WHEN toca el tipo `MTB` y `Crear orden` THE SYSTEM SHALL crear la orden en `reservada` y mostrar en `/taller/ordenes/<id>/recepcion` un número `OT-` de cinco dígitos y el nombre `Carla Reserva`
- [ ] WHEN la reserva ya tiene una orden THE SYSTEM SHALL mostrar en `/taller/reservas` el número de esa orden en lugar de `Recibir`
- [ ] WHEN el mecánico pide `/taller/reservas` THE SYSTEM SHALL responder 403
**Verify**
```bash
pnpm build && pnpm test:tablet e2e/recepcion-inicio.spec.ts   # expect: exit 0, 0 failed
pnpm format && pnpm gate   # expect: exit 0
```
**Prueba en tablet real (manual — no es compuerta de máquina):** el dueño o el mecánico inicia una recepción en la tablet del taller con el dedo, sin zoom. Lo marca el dueño; no lo reemplaza Playwright.
**Checkpoint**
```bash
git add -A && git commit -m "feat: f1-16 start reception on tablet from booking or walk-in" && git tag f1-16
git tag -l f1-16 | grep -qx f1-16   # expect: exit 0
```

#### F1-17 — Checklist y accesorios (E3-T1)
**Archivos:** `src/server/db/schema-orders.ts` · `src/server/taller/intake.ts` · `src/pages/taller/ordenes/[id]/recepcion.astro` · `tests/integration/intake.test.ts` · `e2e/recepcion-checklist.spec.ts`
**Done when**
- [ ] WHEN se guardan los siete puntos del checklist (`frenos`, `cadena`, `transmision`, `ruedas`, `neumaticos`, `estado_general`, `problemas_visibles`) con resultado `ok`, `revisar` o `malo` THE SYSTEM SHALL guardar una fila por punto en `intake_checks` y `isChecklistComplete` SHALL devolver `true`
- [ ] WHEN se vuelve a guardar un punto THE SYSTEM SHALL actualizar su fila sin duplicarla
- [ ] WHEN se agrega un accesorio y luego se quita THE SYSTEM SHALL conservar la fila con `voided_at` y `voided_by` y dejar de listarlo
- [ ] WHEN se guardan las observaciones THE SYSTEM SHALL dejarlas en `work_orders.observations`
- [ ] WHEN el mecánico inicia una recepción sin reserva para el cliente sembrado y toca `OK` en los siete puntos y `Guardar checklist` en el viewport de tablet THE SYSTEM SHALL mostrar `Checklist completo`
**Verify**
```bash
pnpm test tests/integration/intake.test.ts   # expect: exit 0, 0 failed
pnpm db:migrate   # expect: exit 0
pnpm db:check   # expect: exit 0
pnpm build && pnpm test:tablet e2e/recepcion-checklist.spec.ts e2e/recepcion-inicio.spec.ts   # expect: exit 0, 0 failed
pnpm format && pnpm gate   # expect: exit 0
```
**Prueba en tablet real (manual — no es compuerta de máquina):** el mecánico completa el checklist con el dedo en la tablet real, sin zoom. Lo marca el dueño.
**Checkpoint**
```bash
git add -A && git commit -m "feat: f1-17 add intake checklist and accessories" && git tag f1-17
git tag -l f1-17 | grep -qx f1-17   # expect: exit 0
```

#### F1-18 — Líneas, totales y fecha sugerida (E3-T2)
**Archivos:** `src/server/db/schema-orders.ts` · `src/server/taller/items.ts` · `src/server/taller/delivery-date.ts` · `src/pages/taller/ordenes/[id]/recepcion.astro` · `tests/integration/items.test.ts`
**Done when**
- [ ] WHEN se agrega desde el catálogo un servicio a una orden de una bicicleta tipo `mtb` THE SYSTEM SHALL crear una línea `servicio` de origen `inicial` con el precio de `service_prices` para `mtb` y la duración estimada del servicio
- [ ] WHEN se agregan o anulan líneas THE SYSTEM SHALL dejar `total_clp` y `estimated_minutes` iguales a la suma recalculada desde las filas no anuladas
- [ ] WHEN el servicio no tiene precio para el tipo de la bicicleta THE SYSTEM SHALL devolver `{ ok: false, code: "no_price" }` sin insertar
- [ ] WHEN `suggestDeliveryDate` corre con `now` `2026-10-05T15:00:00.000Z` y todos los días hábiles THE SYSTEM SHALL devolver `2026-10-06` sin carga, `2026-10-07` con 300 minutos el 06 y una orden de 90, `2026-10-06` con 270 minutos el 06 y una orden de 90, y `2026-10-07` para una orden de 400 minutos con 30 minutos el 06
- [ ] WHEN `suggestDeliveryDate` corre con el calendario real y `now` `2026-10-10T15:00:00.000Z` sin carga THE SYSTEM SHALL saltar el domingo 11 y el feriado del 12 y devolver `2026-10-13`
- [ ] WHEN la persona confirma una fecha THE SYSTEM SHALL guardar `estimated_delivery_date` y `delivery_date_confirmed_at`
**Verify**
```bash
pnpm test tests/integration/items.test.ts   # expect: exit 0, 0 failed
pnpm db:migrate   # expect: exit 0
pnpm db:check   # expect: exit 0
pnpm build && pnpm test:tablet e2e/recepcion-checklist.spec.ts   # expect: exit 0, 0 failed
pnpm format && pnpm gate   # expect: exit 0
```
**Prueba en tablet real (manual — no es compuerta de máquina):** agregar un servicio y confirmar la fecha sugerida con el dedo. Lo marca el dueño.
**Checkpoint**
```bash
git add -A && git commit -m "feat: f1-18 add order lines, totals and suggested delivery date" && git tag f1-18
git tag -l f1-18 | grep -qx f1-18   # expect: exit 0
```

#### F1-19 — Fotos: servidor y medios (E3-T3)
**Archivos (6; el sexto es una línea del smoke):** `src/server/db/schema-orders.ts` · `src/server/taller/photos.ts` · `src/pages/taller/ordenes/[id]/fotos.ts` · `src/pages/taller/media/[...key].ts` · `tests/integration/photos.test.ts` · `scripts/smoke.sh`
**Hacer:** `handlePhotoUpload` revisa la sesión primero (401 sin actor, antes de Origin y del id); `scripts/smoke.sh` agrega, tras la línea de `/api/tareas/recordatorios` y en su mismo estilo `curl`, `test "$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE/taller/ordenes/x/fotos")" = 401`. Sin cookie, `requireAdmin` devuelve `null` y el endpoint responde 401 (es un endpoint `.ts`, no redirige como las páginas).
**Done when**
- [ ] WHEN `handlePhotoUpload` recibe un `multipart/form-data` con un JPEG y `etapa=recepcion` de un usuario con permiso THE SYSTEM SHALL guardar la copia completa y la miniatura en el almacenamiento, insertar una fila en `order_photos` con `retention_class = 'recepcion_6m'` y responder 201 con `{ id, thumbUrl }`, y con `etapa=terminado` SHALL guardar `retention_class = 'permanente'`
- [ ] WHEN el archivo supera 15 MB o no es una imagen THE SYSTEM SHALL responder 413 o 415 respectivamente, sin filas ni objetos nuevos
- [ ] WHEN la inserción de la fila falla después de subir los objetos THE SYSTEM SHALL borrar ambos objetos del almacenamiento
- [ ] WHEN `handleMediaRequest` recibe la clave de la miniatura de una orden accesible THE SYSTEM SHALL responder 200 con `content-type: image/jpeg` y `cache-control: private, max-age=300`, y 404 para una clave inexistente o con forma inválida
- [ ] WHEN un mecánico sube una foto de etapa `reparacion` a una orden que no tiene asignada THE SYSTEM SHALL responder 403
- [ ] WHEN `sh scripts/smoke.sh` corre contra el build THE SYSTEM SHALL obtener 401 de `POST /taller/ordenes/x/fotos` sin sesión
**Verify**
```bash
pnpm test tests/integration/photos.test.ts   # expect: exit 0, 0 failed
pnpm db:migrate   # expect: exit 0
pnpm db:check   # expect: exit 0
pnpm build && sh scripts/smoke.sh   # expect: exit 0 — incluye 401 de POST /taller/ordenes/x/fotos sin sesión
pnpm format && pnpm gate   # expect: exit 0
```
**Checkpoint**
```bash
git add -A && git commit -m "feat: f1-19 add photo upload and authenticated media route" && git tag f1-19
git tag -l f1-19 | grep -qx f1-19   # expect: exit 0
```

#### F1-20 — Firma y cierre: servidor (E3-T4)
**Archivos:** `src/server/db/schema-orders.ts` · `src/server/taller/reception.ts` · `src/server/taller/photos.ts` · `tests/integration/reception.test.ts`
**Done when**
- [ ] WHEN `finalizeReception` corre sin checklist completo, sin fotos de recepción, sin fecha confirmada o sin firma THE SYSTEM SHALL devolver `{ ok: false, code: "incomplete", missing }` nombrando cada faltante con `checklist`, `fotos`, `fecha` o `firma` y dejar la orden en `reservada`
- [ ] WHEN corre con todo completo y una firma PNG válida THE SYSTEM SHALL guardar la firma en el almacenamiento, insertar `order_signatures` tipo `recepcion` con el nombre de quien firma, pasar la orden a `recibida` con `received_at` y escribir historial y auditoría
- [ ] WHEN la firma no es un `data:image/png;base64,` válido o supera 2 MB THE SYSTEM SHALL devolver `{ ok: false, code: "invalid_signature" }` sin subir nada
- [ ] WHEN la transacción falla después de subir la firma THE SYSTEM SHALL borrar el objeto subido
- [ ] WHEN la orden ya tiene firma de recepción THE SYSTEM SHALL devolver `{ ok: false, code: "already_signed" }`
- [ ] WHEN `handleMediaRequest` recibe la clave de una firma de una orden accesible THE SYSTEM SHALL responder 200 con `content-type: image/png`
**Verify**
```bash
pnpm test tests/integration/reception.test.ts tests/integration/photos.test.ts   # expect: exit 0, 0 failed
pnpm db:migrate   # expect: exit 0
pnpm db:check   # expect: exit 0
pnpm format && pnpm gate   # expect: exit 0
```
**Checkpoint**
```bash
git add -A && git commit -m "feat: f1-20 add reception signature and finalization" && git tag f1-20
git tag -l f1-20 | grep -qx f1-20   # expect: exit 0
```

#### F1-21 — Recepción completa en tablet (E3-T5)
**Archivos:** `src/components/taller/PhotoCapture.tsx` · `src/components/taller/SignaturePad.tsx` · `src/pages/taller/ordenes/[id]/cierre.astro` · `src/pages/taller/ordenes/[id]/recepcion.astro` · `e2e/recepcion-completa.spec.ts`
**Done when**
- [ ] WHEN el dueño hace en el viewport de tablet una recepción completa desde la reserva de `Pedro Reserva` (checklist con toques, servicio, fecha confirmada, cuatro fotos y firma dibujada) THE SYSTEM SHALL mostrar el estado `Recibida`
- [ ] WHEN se suben las cuatro fotos THE SYSTEM SHALL mostrar cuatro miniaturas servidas desde `/taller/media/`
- [ ] WHEN se toca `Finalizar recepción` sin firma THE SYSTEM SHALL mostrar `Falta la firma del cliente` y mantener el estado `Reservada`
- [ ] WHEN se toca `Borrar` en el panel de firma THE SYSTEM SHALL dejar vacío el campo oculto `firma`
**Verify**
```bash
pnpm build && pnpm test:tablet e2e/recepcion-completa.spec.ts e2e/recepcion-checklist.spec.ts e2e/recepcion-inicio.spec.ts   # expect: exit 0, 0 failed
pnpm format && pnpm gate   # expect: exit 0
```
**Prueba en tablet real (manual — no es compuerta de máquina):** recepción completa en la tablet del taller con cuatro fotos de la cámara trasera y una firma con el dedo (FASE1 §14.3). Lo marca el dueño.
**Checkpoint**
```bash
git add -A && git commit -m "feat: f1-21 complete reception on tablet with photos and signature" && git tag f1-21
git tag -l f1-21 | grep -qx f1-21   # expect: exit 0
```

#### F1-22 — Detalle, estados y asignación (E3-T6)
**Archivos:** `src/server/taller/status.ts` · `src/pages/taller/ordenes/index.astro` · `src/pages/taller/ordenes/[id]/index.astro` · `tests/integration/order-status.test.ts` · `e2e/orden-mecanico.spec.ts`
**Done when**
- [ ] WHEN `changeOrderStatus` pide una transición que no está en `MANUAL_TRANSITIONS`, como `recibida` → `lista_para_retirar` THE SYSTEM SHALL devolver `{ ok: false, code: "invalid_transition" }` sin cambiar la orden
- [ ] WHEN una transición manual válida se aplica THE SYSTEM SHALL escribir una fila en `work_order_status_history` con `from_status`, `to_status`, autor y nota, y una fila `order.status_changed` en `audit_log`
- [ ] WHEN un mecánico abre una orden asignada a otro mecánico THE SYSTEM SHALL devolver `{ ok: false, code: "forbidden" }`
- [ ] WHEN un mecánico toma una orden sin asignar en `recibida` o `diagnostico` THE SYSTEM SHALL asignársela y escribir `order.assigned` en `audit_log`
- [ ] WHEN `listOrders` corre para un mecánico THE SYSTEM SHALL devolver solo sus órdenes asignadas y las sin asignar en `reservada`, `recibida` o `diagnostico`
- [ ] WHEN el mecánico toca `Pasar a Diagnóstico` en la orden sembrada `OT-00001` en el viewport de tablet THE SYSTEM SHALL mostrar el estado `Diagnóstico`
**Verify**
```bash
pnpm test tests/integration/order-status.test.ts   # expect: exit 0, 0 failed
pnpm build && pnpm test:tablet e2e/orden-mecanico.spec.ts   # expect: exit 0, 0 failed
pnpm format && pnpm gate   # expect: exit 0
```
**Checkpoint**
```bash
git add -A && git commit -m "feat: f1-22 add order detail, status changes and assignment" && git tag f1-22
git tag -l f1-22 | grep -qx f1-22   # expect: exit 0
```

#### F1-23 — Etiqueta con QR y búsqueda por número (E3-T7)
**Archivos:** `src/server/taller/label.ts` · `src/pages/taller/ordenes/[id]/etiqueta.ts` · `src/server/taller/search.ts` · `tests/integration/label.test.ts` · `e2e/etiqueta.spec.ts`
**Done when**
- [ ] WHEN `qrPayload` recibe `https://vectorbikes.cl` y el id de una orden THE SYSTEM SHALL devolver `https://vectorbikes.cl/taller/ordenes/<id>`, y `buildLabel` SHALL pasar exactamente ese texto al generador de QR inyectado
- [ ] WHEN se genera la etiqueta de una orden THE SYSTEM SHALL devolver HTML con el número `OT-`, el nombre del cliente, la fecha estimada, un `<svg`, `size: 62mm` y el atributo `data-qr-url` con la URL codificada
- [ ] WHEN el nombre del cliente contiene `<b>` THE SYSTEM SHALL escaparlo como `&lt;b&gt;`
- [ ] WHEN `searchTaller` recibe `OT-00001`, `ot1` o `1` THE SYSTEM SHALL devolver la orden número 1 de la sucursal si el usuario puede verla
- [ ] WHEN el dueño abre la etiqueta de `OT-00001` y luego la URL de su `data-qr-url` en el viewport de tablet THE SYSTEM SHALL mostrar `OT-00001` en ambas
**Verify**
```bash
pnpm test tests/integration/label.test.ts tests/integration/search.test.ts   # expect: exit 0, 0 failed
pnpm build && pnpm test:tablet e2e/etiqueta.spec.ts   # expect: exit 0, 0 failed
pnpm format && pnpm gate   # expect: exit 0
```
**Checkpoint**
```bash
git add -A && git commit -m "feat: f1-23 add printable qr label and order number search" && git tag f1-23
git tag -l f1-23 | grep -qx f1-23   # expect: exit 0
```

#### F1-24 — Líneas, precios y documento tributario (E3-T8)
**Archivos:** `src/server/taller/items.ts` · `src/server/taller/orders.ts` · `src/pages/taller/ordenes/[id]/lineas.astro` · `tests/integration/order-items.test.ts`
**Done when**
- [ ] WHEN un mecánico intenta cambiar el precio de una línea o agregar un repuesto con precio THE SYSTEM SHALL devolver `{ ok: false, code: "forbidden" }` sin cambiar ninguna fila
- [ ] WHEN el dueño o un administrador cambia el precio de una línea THE SYSTEM SHALL guardar el nuevo `unit_price_clp`, recalcular `total_clp` y escribir `item.price_changed` en `audit_log` con `before` y `after`
- [ ] WHEN se anula una línea THE SYSTEM SHALL conservar la fila con `voided_at` y `voided_by` y excluirla de `total_clp`
- [ ] WHEN se agrega un repuesto con descripción, cantidad y precio THE SYSTEM SHALL crear una línea `repuesto` y sumar su subtotal al total
- [ ] WHEN se guardan tipo, folio y fecha del documento tributario THE SYSTEM SHALL dejarlos en `tax_doc_type`, `tax_doc_number` y `tax_doc_date` y escribir `order.tax_document` en `audit_log`
**Verify**
```bash
pnpm test tests/integration/order-items.test.ts tests/integration/items.test.ts   # expect: exit 0, 0 failed
pnpm format && pnpm gate   # expect: exit 0
```
**Checkpoint**
```bash
git add -A && git commit -m "feat: f1-24 add line editing, price override and tax document" && git tag f1-24
git tag -l f1-24 | grep -qx f1-24   # expect: exit 0
```

#### F1-25 — Galería por etapa y garantía (E4-T1)
**Archivos:** `src/server/taller/orders.ts` · `src/pages/taller/ordenes/[id]/galeria.astro` · `src/pages/taller/ordenes/[id]/index.astro` · `tests/integration/warranty.test.ts` · `e2e/galeria.spec.ts`
**Hacer:** las fotos de recepción son `recepcion_6m` y las de terminado `permanente`; el "antes" del informe usa la **miniatura** de recepción, que nunca se purga. El spec sube una foto de etapa `terminado` sobre `OT-00002`: es la etapa que esa orden admite tanto en `control_calidad` como en `lista_para_retirar` (otro spec puede cambiarle el estado), así el spec no depende del orden de ejecución.
**Done when**
- [ ] WHEN `openWarrantyOrder` corre sobre una orden `entregada` THE SYSTEM SHALL crear una orden nueva en `reservada` con el mismo cliente y bicicleta y `warranty_of_order_id` apuntando a la original
- [ ] WHEN la orden original no está `entregada` THE SYSTEM SHALL devolver `{ ok: false, code: "not_delivered" }` sin crear orden
- [ ] WHEN se abre una garantía THE SYSTEM SHALL escribir `order.warranty_opened` en `audit_log`
- [ ] WHEN `orderDetail` lee una orden de garantía THE SYSTEM SHALL incluir el número de la orden original para mostrar `Garantía de OT-…`
- [ ] WHEN `listOrderPhotos` lee una orden con fotos de las tres etapas THE SYSTEM SHALL agruparlas por `recepcion`, `reparacion` y `terminado` sin incluir las anuladas
- [ ] WHEN el mecánico sube en el viewport de tablet una foto de trabajo terminado en la orden sembrada `OT-00002` desde su galería THE SYSTEM SHALL mostrar su miniatura en la sección `Trabajo terminado`
**Verify**
```bash
pnpm test tests/integration/warranty.test.ts   # expect: exit 0, 0 failed
pnpm build && pnpm test:tablet e2e/galeria.spec.ts   # expect: exit 0, 0 failed
pnpm format && pnpm gate   # expect: exit 0
```
**Prueba en tablet real (manual — no es compuerta de máquina):** el mecánico toma una foto de reparación y una de trabajo terminado con la cámara de la tablet y las ve en la galería. Lo marca el dueño.
**Checkpoint**
```bash
git add -A && git commit -m "feat: f1-25 add stage photo gallery and linked warranty orders" && git tag f1-25
git tag -l f1-25 | grep -qx f1-25   # expect: exit 0
```

#### F1-26 — Propuesta de adicional (E4-T2)
**Archivos:** `src/server/db/schema-orders.ts` · `src/server/taller/share-tokens.ts` · `src/server/taller/approvals.ts` · `src/pages/taller/ordenes/[id]/adicional.astro` · `tests/integration/approvals.test.ts`
**Done when**
- [ ] WHEN el personal crea una propuesta con problema, recomendación y precio sobre una orden en `diagnostico`, `en_reparacion` o `esperando_repuesto` THE SYSTEM SHALL insertar `work_order_approvals` y pasar la orden a `esperando_aprobacion` con historial
- [ ] WHEN se crea la propuesta THE SYSTEM SHALL devolver un token de 43 caracteres base64url y guardar solo su sha256 en hex de 64 caracteres en `token_hash`
- [ ] WHEN se arma el enlace para WhatsApp THE SYSTEM SHALL devolver `https://wa.me/<dígitos del teléfono>?text=` con el enlace `<PUBLIC_SITE_URL>/aprobacion/<token>` codificado
- [ ] WHEN un mecánico crea una propuesta THE SYSTEM SHALL devolver `{ ok: false, code: "forbidden" }`
- [ ] WHEN se regenera el enlace de una propuesta sin responder THE SYSTEM SHALL reemplazar `token_hash`, de modo que el token anterior deja de encontrarla
- [ ] WHEN se crea la propuesta THE SYSTEM SHALL escribir `approval.created` en `audit_log` sin el token
**Verify**
```bash
pnpm test tests/integration/approvals.test.ts   # expect: exit 0, 0 failed
pnpm db:migrate   # expect: exit 0
pnpm db:check   # expect: exit 0
pnpm format && pnpm gate   # expect: exit 0
```
**Checkpoint**
```bash
git add -A && git commit -m "feat: f1-26 add additional work proposal with single-use link" && git tag f1-26
git tag -l f1-26 | grep -qx f1-26   # expect: exit 0
```

#### F1-27 — Página pública de aprobación (E4-T3)
**Archivos:** `src/pages/aprobacion/[token].astro` · `src/server/taller/approvals.ts` · `src/server/api/handlers.ts` · `tests/integration/approvals.test.ts`
**Done when**
- [ ] WHEN el cliente aprueba con un token válido THE SYSTEM SHALL marcar `decided_at` y `decision = 'aprobado'`, crear una línea `servicio` de origen `adicional` con el precio de la propuesta, recalcular `total_clp`, devolver la orden a `en_reparacion` si no quedan propuestas pendientes y escribir `approval.decided` con `actor_user_id` nulo
- [ ] WHEN el cliente rechaza THE SYSTEM SHALL guardar `decision = 'rechazado'` sin crear línea y devolver la orden a `en_reparacion` si no quedan propuestas pendientes
- [ ] WHEN dos respuestas llegan a la vez con el mismo token THE SYSTEM SHALL aplicar exactamente una y devolver `already_decided` a la otra
- [ ] WHEN el token no existe o tiene forma inválida THE SYSTEM SHALL devolver `{ view: "invalid" }`
- [ ] WHEN `viewApproval` arma la vista THE SYSTEM SHALL incluir el primer nombre del cliente, el problema, la recomendación y el precio, sin teléfono ni correo
- [ ] WHEN se registran 5 intentos desde la misma IP en 10 minutos THE SYSTEM SHALL hacer que `checkRateLimit` devuelva una respuesta 429
**Verify**
```bash
pnpm test tests/integration/approvals.test.ts tests/integration/api.test.ts   # expect: exit 0, 0 failed
pnpm format && pnpm gate   # expect: exit 0
```
**Checkpoint**
```bash
git add -A && git commit -m "feat: f1-27 add public approval page for the customer" && git tag f1-27
git tag -l f1-27 | grep -qx f1-27   # expect: exit 0
```

#### F1-28 — Control de calidad (E4-T4)
**Archivos:** `src/server/db/schema-orders.ts` · `src/server/taller/qc.ts` · `src/pages/taller/ordenes/[id]/control.astro` · `tests/integration/qc.test.ts` · `e2e/control-calidad.spec.ts`
**Done when**
- [ ] WHEN el dueño aprueba con todos los puntos en `ok` el control de una orden en `control_calidad` asignada a un mecánico THE SYSTEM SHALL guardar los puntos en `qc_checks`, fijar `qc_approved_at` y `qc_approved_by`, dejar `qc_self_checked = false` y pasar la orden a `lista_para_retirar`
- [ ] WHEN el dueño aprueba una orden asignada a sí mismo o sin mecánico THE SYSTEM SHALL marcar `qc_self_checked = true` y `self_check = true` en los puntos
- [ ] WHEN un mecánico, un administrador o recepción intentan aprobar THE SYSTEM SHALL devolver `{ ok: false, code: "forbidden" }`
- [ ] WHEN algún punto queda en `falla` THE SYSTEM SHALL guardar los puntos, no fijar `qc_approved_at` y devolver la orden a `en_reparacion`
- [ ] WHEN la orden no está en `control_calidad` THE SYSTEM SHALL devolver `{ ok: false, code: "invalid_status" }`
- [ ] WHEN el dueño toca `OK` en cada punto y `Aprobar control` en la orden sembrada `OT-00002` en el viewport de tablet THE SYSTEM SHALL mostrar `Lista para retirar`
**Verify**
```bash
pnpm test tests/integration/qc.test.ts   # expect: exit 0, 0 failed
pnpm db:migrate   # expect: exit 0
pnpm db:check   # expect: exit 0
pnpm build && pnpm test:tablet e2e/control-calidad.spec.ts   # expect: exit 0, 0 failed
pnpm format && pnpm gate   # expect: exit 0
```
**Prueba en tablet real (manual — no es compuerta de máquina):** el dueño hace un control de calidad completo en la tablet del taller (FASE1 §14.7). Lo marca el dueño.
**Checkpoint**
```bash
git add -A && git commit -m "feat: f1-28 add quality control approved by the owner" && git tag f1-28
git tag -l f1-28 | grep -qx f1-28   # expect: exit 0
```

#### F1-29 — Pagos (E4-T5)
**Archivos:** `src/server/db/schema-orders.ts` · `src/server/taller/payments.ts` · `src/pages/taller/ordenes/[id]/entrega.astro` · `tests/integration/payments.test.ts`
**Done when**
- [ ] WHEN se registra un abono con método y monto THE SYSTEM SHALL insertarlo en `payments`, recalcular `paid_clp` desde los pagos no anulados en la misma transacción y escribir `payment.recorded` en `audit_log`
- [ ] WHEN se registra un segundo abono vigente en la misma orden THE SYSTEM SHALL rechazarlo por el índice único parcial y devolver `{ ok: false, code: "deposit_exists" }`
- [ ] WHEN el monto supera el saldo (`total_clp - paid_clp`) o no es positivo THE SYSTEM SHALL devolver `{ ok: false, code: "invalid_amount" }`
- [ ] WHEN se anula un pago THE SYSTEM SHALL conservar la fila con `voided_at` y `voided_by`, recalcular `paid_clp` y permitir un nuevo abono
- [ ] WHEN un mecánico registra un pago THE SYSTEM SHALL devolver `{ ok: false, code: "forbidden" }`
**Verify**
```bash
pnpm test tests/integration/payments.test.ts   # expect: exit 0, 0 failed
pnpm db:migrate   # expect: exit 0
pnpm db:check   # expect: exit 0
pnpm format && pnpm gate   # expect: exit 0
```
**Checkpoint**
```bash
git add -A && git commit -m "feat: f1-29 record deposit and final payments" && git tag f1-29
git tag -l f1-29 | grep -qx f1-29   # expect: exit 0
```

#### F1-30 — Entrega con saldo cero y firma (E4-T6)
**Archivos:** `src/server/taller/delivery.ts` · `src/pages/taller/ordenes/[id]/entrega.astro` · `tests/integration/delivery.test.ts` · `e2e/entrega.spec.ts`
**Done when**
- [ ] WHEN `completeDelivery` corre sobre una orden `lista_para_retirar` con saldo distinto de cero THE SYSTEM SHALL devolver `{ ok: false, code: "balance_pending" }` y dejar la orden sin cambios
- [ ] WHEN el saldo es cero y la firma es válida THE SYSTEM SHALL guardar la firma de tipo `entrega`, pasar la orden a `entregada` con `delivered_at` y escribir historial y `order.delivered` en `audit_log`
- [ ] WHEN la orden no está en `lista_para_retirar` THE SYSTEM SHALL devolver `{ ok: false, code: "invalid_status" }`
- [ ] WHEN el dueño registra en el viewport de tablet el pago final de la orden sembrada `OT-00003`, dibuja la firma y toca `Entregar bicicleta` THE SYSTEM SHALL mostrar `Entregada`
**Verify**
```bash
pnpm test tests/integration/delivery.test.ts tests/integration/payments.test.ts   # expect: exit 0, 0 failed
pnpm build && pnpm test:tablet e2e/entrega.spec.ts   # expect: exit 0, 0 failed
pnpm format && pnpm gate   # expect: exit 0
```
**Prueba en tablet real (manual — no es compuerta de máquina):** registrar un pago y hacer firmar la entrega con el dedo en la tablet. Lo marca el dueño.
**Checkpoint**
```bash
git add -A && git commit -m "feat: f1-30 complete delivery with zero balance and signature" && git tag f1-30
git tag -l f1-30 | grep -qx f1-30   # expect: exit 0
```

#### F1-31 — Componentes (E5-T1)
**Archivos:** `src/server/db/schema-orders.ts` · `src/server/taller/components.ts` · `src/pages/taller/ordenes/[id]/componentes.astro` · `tests/integration/components.test.ts`
**Done when**
- [ ] WHEN se instala un componente ligado a una línea `repuesto` de la orden THE SYSTEM SHALL guardar tipo, marca, modelo, número de serie, fecha de instalación y el precio de esa línea, con la bicicleta y la orden
- [ ] WHEN se instala un componente que reemplaza a otro THE SYSTEM SHALL fijar en el anterior `replaced_at` y `replaced_by_component_id` sin borrarlo
- [ ] WHEN se anula un componente THE SYSTEM SHALL conservar la fila con `voided_at` y `voided_by`
- [ ] WHEN `listComponentsOfBike` corre THE SYSTEM SHALL incluir los componentes reemplazados con su fecha de reemplazo
- [ ] WHEN la línea indicada no es un `repuesto` de esa orden THE SYSTEM SHALL devolver `{ ok: false, code: "invalid_item" }`
**Verify**
```bash
pnpm test tests/integration/components.test.ts   # expect: exit 0, 0 failed
pnpm db:migrate   # expect: exit 0
pnpm db:check   # expect: exit 0
pnpm format && pnpm gate   # expect: exit 0
```
**Checkpoint**
```bash
git add -A && git commit -m "feat: f1-31 record installed and replaced components" && git tag f1-31
git tag -l f1-31 | grep -qx f1-31   # expect: exit 0
```

#### F1-32 — Informe final (E5-T2)
**Archivos:** `src/server/db/schema-orders.ts` · `src/server/taller/reports.ts` · `src/components/taller/ReportView.astro` · `src/pages/taller/ordenes/[id]/informe.astro` · `tests/integration/reports.test.ts`
**Done when**
- [ ] WHEN se genera el informe de una orden THE SYSTEM SHALL guardar en `service_reports.snapshot` datos de la bicicleta, trabajo realizado, problemas encontrados, componentes reemplazados, fotos de antes (`recepcion`) y después (`terminado`), kilometraje anotado, recomendaciones, próximas revisiones, trabajos rechazados y un único total
- [ ] WHEN el informe se genera THE SYSTEM SHALL devolver un token de 43 caracteres y guardar solo su sha256 en `share_token_hash`
- [ ] WHEN se regenera THE SYSTEM SHALL reemplazar el snapshot y el hash, de modo que el token anterior deja de servir
- [ ] WHEN el snapshot se arma THE SYSTEM SHALL incluir solo el primer nombre del cliente y ningún teléfono, correo ni RUT
- [ ] WHEN un mecánico genera el informe THE SYSTEM SHALL devolver `{ ok: false, code: "forbidden" }`
**Verify**
```bash
pnpm test tests/integration/reports.test.ts   # expect: exit 0, 0 failed
pnpm db:migrate   # expect: exit 0
pnpm db:check   # expect: exit 0
pnpm format && pnpm gate   # expect: exit 0
```
**Checkpoint**
```bash
git add -A && git commit -m "feat: f1-32 generate the final service report" && git tag f1-32
git tag -l f1-32 | grep -qx f1-32   # expect: exit 0
```

#### F1-33 — Informe público (E5-T3)
**Archivos:** `src/pages/informe/[token].astro` · `src/server/taller/reports.ts` · `tests/integration/reports.test.ts`
**Done when**
- [ ] WHEN `viewReportByToken` recibe el token vigente THE SYSTEM SHALL devolver el snapshot y las miniaturas de antes y después como `data:image/jpeg;base64,`
- [ ] WHEN recibe un token anterior a una regeneración, inexistente o con forma inválida THE SYSTEM SHALL devolver `null`
- [ ] WHEN la copia completa de una foto de recepción fue purgada por retención THE SYSTEM SHALL seguir devolviendo su miniatura
- [ ] WHEN arma la vista pública THE SYSTEM SHALL no incluir teléfono, correo ni RUT del cliente
**Verify**
```bash
pnpm test tests/integration/reports.test.ts   # expect: exit 0, 0 failed
pnpm format && pnpm gate   # expect: exit 0
```
**Checkpoint**
```bash
git add -A && git commit -m "feat: f1-33 add public read-only report page" && git tag f1-33
git tag -l f1-33 | grep -qx f1-33   # expect: exit 0
```

#### F1-34 — Historial de bici y cliente (E5-T4)
**Archivos:** `src/server/taller/history.ts` · `src/pages/taller/bicicletas/[id].astro` · `src/pages/taller/clientes/[id].astro` · `tests/integration/history.test.ts`
**Done when**
- [ ] WHEN `bikeTimeline` corre para una bicicleta con dos visitas THE SYSTEM SHALL devolver ambas órdenes en orden cronológico con sus servicios, componentes instalados y reemplazados, adicionales rechazados e informes
- [ ] WHEN un componente fue reemplazado THE SYSTEM SHALL incluir en la línea de tiempo tanto su instalación como su reemplazo
- [ ] WHEN un adicional fue rechazado THE SYSTEM SHALL incluirlo como evento `approval_rejected` con su descripción y fecha
- [ ] WHEN `customerTimeline` corre THE SYSTEM SHALL devolver visitas, órdenes, pagos no anulados y garantías del cliente en orden cronológico
- [ ] WHEN `sortTimeline` recibe eventos desordenados con el mismo instante THE SYSTEM SHALL ordenarlos por instante y, a igualdad, por tipo en forma estable
**Verify**
```bash
pnpm test tests/integration/history.test.ts   # expect: exit 0, 0 failed
pnpm format && pnpm gate   # expect: exit 0
```
**Checkpoint**
```bash
git add -A && git commit -m "feat: f1-34 add bike and customer timelines" && git tag f1-34
git tag -l f1-34 | grep -qx f1-34   # expect: exit 0
```

#### F1-35 — Dashboards por rol (E5-T5)
**Archivos:** `src/server/taller/dashboard.ts` · `src/pages/taller/index.astro` · `tests/integration/dashboard.test.ts` · `e2e/dashboard-mecanico.spec.ts`
**Hacer:** `mechanicDashboard.unassigned` usa el mismo conjunto que `canAccessOrder` y `listOrders` (sin asignar en `reservada`, `recibida` o `diagnostico`).
**Done when**
- [ ] WHEN `adminDashboard` corre con órdenes sembradas en cada estado THE SYSTEM SHALL poner cada orden en su grupo nombrado (`waitingApproval`, `waitingParts`, `inRepair`, `qcPending`, `readyForPickup`) según su estado
- [ ] WHEN una orden abierta tiene `estimated_delivery_date` anterior a hoy THE SYSTEM SHALL incluirla en `overdue`, y una `entregada` con fecha pasada SHALL quedar fuera
- [ ] WHEN hay pagos recibidos hoy THE SYSTEM SHALL sumar en `incomeTodayClp` solo los no anulados de hoy
- [ ] WHEN `mechanicDashboard` corre para un mecánico THE SYSTEM SHALL incluir solo sus órdenes asignadas en los grupos y las sin asignar en `reservada`, `recibida` o `diagnostico` en `unassigned`
- [ ] WHEN el mecánico entra en el viewport de tablet THE SYSTEM SHALL mostrar en `/taller` el encabezado `Bicicletas asignadas` con `OT-00001`
**Verify**
```bash
pnpm test tests/integration/dashboard.test.ts   # expect: exit 0, 0 failed
pnpm build && pnpm test:tablet e2e/dashboard-mecanico.spec.ts e2e/login.spec.ts   # expect: exit 0, 0 failed
pnpm format && pnpm gate   # expect: exit 0
```
**Checkpoint**
```bash
git add -A && git commit -m "feat: f1-35 add role dashboards for admin and mechanic" && git tag f1-35
git tag -l f1-35 | grep -qx f1-35   # expect: exit 0
```

#### F1-36 — Alertas de atraso y retención (E5-T6)
**Archivos (6; el sexto es un endpoint delgado):** `src/server/api/task-handlers.ts` · `src/pages/api/tareas/alertas.ts` · `src/pages/api/tareas/retencion.ts` · `src/server/taller/maintenance.ts` · `tests/integration/tasks-maintenance.test.ts` · `README.md`
**Hacer:** `alertas` envía un resumen cada vez que se llama (aceptado; Make.com la llama una vez al día). `retencion` es idempotente.
**Done when**
- [ ] WHEN `POST /api/tareas/alertas` o `POST /api/tareas/retencion` llegan sin el bearer de `TASKS_SECRET` THE SYSTEM SHALL responder 401 con `{"ok":false,"error":"unauthorized"}`
- [ ] WHEN hay órdenes con fecha estimada anterior a hoy en Santiago en estados distintos de `entregada`, `cancelada` y `trabajo_rechazado` THE SYSTEM SHALL enviar un correo a `SHOP_NOTIFY_EMAIL` que lista sus números y responder 200 con `{"ok":true,"overdue":n,"sent":true}`
- [ ] WHEN no hay órdenes atrasadas THE SYSTEM SHALL responder `{"ok":true,"overdue":0,"sent":false}` sin enviar correo
- [ ] WHEN corre la retención THE SYSTEM SHALL borrar del almacenamiento solo las copias completas de fotos `recepcion_6m` con más de 6 meses, conservar sus miniaturas, fijar `full_purged_at` y responder `{"ok":true,"purged":n}`
- [ ] WHEN la retención corre por segunda vez THE SYSTEM SHALL responder `{"ok":true,"purged":0}`
- [ ] WHEN se lee `README.md` THE SYSTEM SHALL listar `POST https://vectorbikes.cl/api/tareas/alertas` y `POST https://vectorbikes.cl/api/tareas/retencion`
**Verify**
```bash
pnpm test tests/integration/tasks-maintenance.test.ts tests/integration/tasks.test.ts   # expect: exit 0, 0 failed
grep -qF 'POST https://vectorbikes.cl/api/tareas/alertas' README.md   # expect: exit 0
grep -qF 'POST https://vectorbikes.cl/api/tareas/retencion' README.md   # expect: exit 0
pnpm format && pnpm gate   # expect: exit 0
```
**Checkpoint**
```bash
git add -A && git commit -m "feat: f1-36 add overdue alerts and photo retention tasks" && git tag f1-36
git tag -l f1-36 | grep -qx f1-36   # expect: exit 0
```

#### F1-37 — Contracción de usuarios y compuerta de la fase (E5-T7)
**Precondición de publicación (checklist §20.1, no es compuerta de build):** producción corre una publicación ≥ `f1-07`, el dueño ingresó una vez y `/taller/usuarios` de producción lo muestra como Dueño. Solo entonces se publica algo que contenga `f1-37`.
**Archivos:** `src/server/db/schema.ts` · `src/server/auth/admin-auth.ts` · `scripts/db-check.ts` · `tests/integration/admin-auth.test.ts` · `README.md`
**Hacer:** primero, solo base dev, borrar las sesiones legadas (sin tocar ninguna clave). El comando sale 2 sin hacer nada dentro de una deployment; esa guarda y la confirmación del operador en la sesión supervisada son su resguardo (tiene entrada propia en el allowlist, pero `node -e:*` permite JS arbitrario, así que el allowlist no es una barrera técnica):
```bash
node --env-file-if-exists=.env --input-type=module -e "if (process.env.REPLIT_DEPLOYMENT) process.exit(2); const { default: postgres } = await import('postgres'); const sql = postgres(process.env.DATABASE_URL, { max: 1 }); await sql\`delete from admin_sessions where user_id is null\`; await sql.end();"
```
Luego quitar `adminUsers` y `admin_user_id`, `user_id` NOT NULL; `pnpm db:generate` (solo borrados) → `pnpm db:migrate`; quitar la copia; `db-check.ts` resta `DROP TABLE` y revisa columnas de los tres arreglos; README `## Operación del taller`.
**Done when**
- [ ] WHEN `pnpm db:migrate` aplica la migración que emite `pnpm db:generate` THE SYSTEM SHALL eliminar `admin_users` y `admin_sessions.admin_user_id` y dejar `admin_sessions.user_id` NOT NULL
- [ ] WHEN se busca `adminUsers` en `src/` y `scripts/` THE SYSTEM SHALL no encontrar ninguna referencia
- [ ] WHEN `pnpm db:check` corre THE SYSTEM SHALL restar las tablas eliminadas por `DROP TABLE` en `drizzle/*.sql`, no esperar `admin_users` y verificar las columnas de `allTables`, `tallerTables` y `orderTables`
- [ ] WHEN corre `pnpm test tests/integration/admin-auth.test.ts` THE SYSTEM SHALL pasar con login, sesión, cambio de clave y límite de intentos sobre `users`
- [ ] WHEN se lee `README.md` THE SYSTEM SHALL contener la sección `## Operación del taller`
- [ ] WHEN corre `pnpm gate` THE SYSTEM SHALL salir 0 con todos los tests y specs de la tabla de criterios de FASE1 §14 en verde
**Verify**
```bash
pnpm test tests/integration/admin-auth.test.ts   # expect: exit 0, 0 failed
grep -rq 'adminUsers' src scripts; test $? -eq 1   # expect: 1 = sin referencias → la línea sale 0
pnpm db:migrate   # expect: exit 0
pnpm db:check   # expect: exit 0, {"ok":true,...}
grep -qF '## Operación del taller' README.md   # expect: exit 0
pnpm format && pnpm gate   # expect: exit 0
```
**Checkpoint**
```bash
git add -A && git commit -m "refactor: f1-37 contract legacy admin tables and close phase gate" && git tag f1-37
git tag -l f1-37 | grep -qx f1-37   # expect: exit 0
```

**Criterios FASE1 §14 → prueba** (también en §20.1): 1 `users-admin.test.ts` + `order-status.test.ts` + `e2e/dashboard-mecanico.spec.ts` · 2 `e2e/recepcion-inicio.spec.ts` + `work-orders.test.ts` · 3 `e2e/recepcion-completa.spec.ts` (+ tablet real) · 4 `label.test.ts` + `e2e/etiqueta.spec.ts` (+ impresión real) · 5 `approvals.test.ts` · 6 `history.test.ts` · 7 `work-orders.test.ts` + `qc.test.ts` + `e2e/control-calidad.spec.ts` · 8 `work-orders.test.ts` + `delivery.test.ts` + `e2e/entrega.spec.ts` · 9 `reports.test.ts` · 10 `history.test.ts` · 11 `warranty.test.ts` · 12 `catalog.test.ts` + `order-items.test.ts` · 13 `pnpm gate` · 14 checklist de lanzamiento.

---

### 9.1 Paridad y corte

Dos migraciones: (a) recordatorios Scheduled Deployment → cron externo; (b) `admin_users` → `users`.

#### Parity set
| # | Comportamiento constante | Cómo se prueba | Tolerancia |
|---|---|---|---|
| a1 | Envía a reservas `confirmed` y `ready_for_pickup` de mañana (fecha local) sin `reminder_sent_at`, un correo cada una | `reminders.test.ts` + `tasks.test.ts` (mismos datos por función y por endpoint) | Exacta |
| a2 | Marca `reminder_sent_at`; segunda corrida envía 0 | Ídem | Exacta |
| a3 | Un fallo no detiene a los demás; `failed` > 0 → script exit 1 / endpoint 500 `ok:false` | Ídem | Exacta |
| b1 | Login: clave mala → `invalid`, 6.º intento en 15 min → `rate_limited` (que `login.astro` traduce a 401 "Correo o clave incorrectos." y 429) | `tests/integration/admin-auth.test.ts` (existente, conservado) | Exacta |
| b2 | Sesión 7 días, cookie HttpOnly/Lax/Secure según https, hash sha256 | `admin-auth.test.ts` | Exacta |
| b3 | Logout revoca; cambio de clave revoca todas las sesiones | `admin-auth.test.ts` | Exacta |
| b4 | La fila copiada conserva id y correo, con rol owner | `admin-auth.test.ts` (F1-04) + consulta de §20.1 en producción | Exacta |

**Harness:** `pnpm test tests/integration/reminders.test.ts tests/integration/tasks.test.ts` y `pnpm test tests/integration/admin-auth.test.ts`.
**Convivencia:** (a) script y endpoint llaman al mismo `sendReminders`; `reminder_sent_at` hace segura la doble invocación. (b) ventana expand F1-03…F1-36: `admin_users` intacta; el login lee `users` y copia una sola vez.
**Período sombra:** no hace falta; (a) comparte la función y (b) mueve una sola fila verificable con una consulta.

#### Corte
| Fase | Qué cambia | Afecta a | Reversible por | Verify |
|---|---|---|---|---|
| a. Endpoint publicado | `/api/tareas/recordatorios` en producción (≥ f1-01) | nadie hasta Make.com | republicar el anterior | `pnpm test tests/integration/tasks.test.ts` |
| a. Make.com activo | escenario diario 10:00 | clientes con reserva | desactivar el escenario; `pnpm reminders:send` manual | §20.1 |
| a. Decomisión | README sin Scheduled Deployment (F1-02); el script **se conserva** como respaldo manual (no cuesta nada y cubre una caída de Make.com) | — | — | greps de F1-02 |
| b. Publicación A | código ≥ f1-07 (expand + copia + `/taller/usuarios`) | dueño | republicar anterior; `admin_users` intacta | `admin-auth.test.ts` |
| b. Copia | el dueño ingresa una vez en producción | dueño | — | consulta de §20.1 |
| b. Publicación B / decomisión | código con f1-37 | dueño | **no se revierte hacia atrás**: se corrige hacia adelante | F1-37 Verify + §20.1 |

**Interruptor:** volver a publicar el deployment anterior desde *Deployments* de Replit (minutos).

#### Criterios de aborto
- [ ] WHEN el escenario de Make.com recibe HTTP ≠ 200 o `"ok"` distinto de `true` en cualquier corrida THE SYSTEM SHALL avisar por correo al dueño (umbral: una corrida; de guardia: el dueño), que corre `pnpm reminders:send` a mano y revisa logs.
- [ ] WHEN el dueño recibe 401 con la clave correcta tras la Publicación A THE SYSTEM SHALL volver al deployment anterior (umbral: un intento; de guardia: el dueño).
- [ ] WHEN la propagación de esquema de la Publicación B falla por `SET NOT NULL` en `admin_sessions.user_id` THE SYSTEM SHALL no publicar (Replit aborta): la copia no ocurrió; el dueño ingresa una vez con la publicación anterior y reintenta.

#### Migración de datos
NOT APPLICABLE para recordatorios. Usuarios: una fila (el dueño) se copia con el mismo id en su primer login; punto de no retorno = Publicación B. Si B se publicara antes de la copia: con sesiones legadas (lo normal; nunca se borran) la propagación falla y nada se pierde; sin ninguna sesión, `admin_users` desaparece y el dueño recupera acceso con `pnpm admin:set-password` contra producción (escribe en `users`).

#### Decomisión
`admin_users` y `admin_user_id`: paso F1-37 (código) y Publicación B (checklist). Recordatorios: la Scheduled Deployment nunca existió; solo cambia la documentación.

---

## 10. Configuración del entorno

### Prerrequisitos
| Herramienta | Versión | Check |
|---|---|---|
| Node | 24 (`.nvmrc`) | `node -v` → `v24.…` |
| pnpm | 12.4.2 | `pnpm --version` debe imprimir `12.4.2` |
| Postgres local + `psql` | 16 en `127.0.0.1:5432`, con un rol que pueda crear bases, el que fija `DATABASE_URL` en `.env`; base `vector_bikes` migrada | `pg_isready -h 127.0.0.1 -p 5432` · `pnpm db:check` |
| rsync, git | los de macOS | `rsync --version`, `git --version` |
| Chromium de Playwright | el de `@playwright/test` | lo instala el Bootstrap |

**pnpm:** si `pnpm --version` no imprime `12.4.2` porque el `pnpm` global es más antiguo (el Mac del dueño tiene hoy 10.33.0 en el PATH), activar la versión del repo con `corepack enable` y `corepack prepare pnpm@12.4.2 --activate` (ambos están en el allowlist) y volver a comprobar antes del Bootstrap.

**Postgres:** el usuario `postgres`/`postgres` que documenta `.env.example` es solo un ejemplo; en el Mac del dueño ese rol no existe y Postgres acepta al usuario del sistema por TCP. El prerrequisito es **un rol que pueda crear bases en 127.0.0.1:5432, tal como lo fija `.env`**; `E2E_DATABASE_URL` en `.env` usa ese mismo rol (`global-setup.ts` crea `vector_bikes_e2e` con él). Los literales de `.env.example` no cambian (F1-06 los afirma).

### Cuentas
Make.com (dueño, antes de publicar f1-01) · Replit App Storage (dueño, antes de la primera recepción real). Ninguna para el build local.

### Variables de entorno
| Variable | Propósito | Dónde se obtiene | Requerida desde | Secreta |
|---|---|---|---|---|
| `DATABASE_URL` | Base dev / prod | Postgres local con el rol local (ver Prerrequisitos); Replit Database | existente | sí |
| `PUBLIC_SITE_URL` | Origin, cookies, QR, enlaces | `https://vectorbikes.cl` | existente | no |
| `PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | Antispam | Cloudflare | existente | la secreta sí |
| `SESSION_SECRET`, `CANCEL_TOKEN_SECRET` | HMAC | generar ≥ 32 | existente | sí |
| `EMAIL_TRANSPORT`, `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_REPLY_TO`, `SHOP_NOTIFY_EMAIL` | Correo (alertas a `SHOP_NOTIFY_EMAIL`) | Resend | existente | la clave sí |
| `PUBLIC_WHATSAPP_NUMBER`, `WHATSAPP_*`, `CRON_SECRET` | WhatsApp opcional (congelado) | Meta | existente | sí |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Solo `admin:set-password` | el dueño | existente | sí |
| `TASKS_SECRET` | Bearer de `/api/tareas/*` (≥ 32) | generar | F1-01 (solo el endpoint; sin ella responde 401) | sí |
| `E2E_DATABASE_URL` | Base de Playwright; por defecto `postgres://postgres:postgres@127.0.0.1:5432/vector_bikes_e2e`; en `.env` usa el mismo rol que `DATABASE_URL` | local | F1-06 (opcional) | no |
| `STORAGE_DRIVER` | `local` (dev, por defecto) o `replit` (obligatorio en deployments) | — | F1-08 | no |
| `STORAGE_LOCAL_DIR` | Directorio local, por defecto `.storage` | — | F1-08 | no |
| `STORAGE_BUCKET_ID` | Bucket de App Storage si no es el por defecto | Replit | F1-08 (opcional) | no |
| `REPLIT_DEPLOYMENT` | La define Replit dentro de una deployment | la plataforma | la lee `getStorageEnv` desde F1-08 (y `db-migrate.ts`, el reinicio de la base dev y la limpieza de F1-37) | no; nunca se define en local |

Validación por accesor, nunca global al arrancar. Carga: app y scripts con `node --env-file-if-exists=.env`; `drizzle.config.ts` y `e2e/fixtures.ts` con `process.loadEnvFile(".env")` si existe; Playwright pasa al servidor un `env` explícito; Vitest fuerza sus valores en `tests/setup.ts`; el reinicio de la base dev lee `DATABASE_URL` con `node --env-file-if-exists=.env -p`.

### Archivos que deben commitearse
| Archivo | Por qué | Excepción en el ignore |
|---|---|---|
| `.env.example` | Plantilla de entorno | `!.env.example` (existente, tras `.env.*`) |
| `playwright.config.ts`, `drizzle.config.ts`, `e2e/*.ts` | Configs de compuertas | — no coincide con ningún patrón |
| `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `package.json` | Instalación reproducible y binario linux de sharp | — |
| `CLAUDE.md`, `AGENTS.md`, `.claude/settings.json`, `.claude/rules/*.md` | Agentes | — |
| `drizzle/**` | Migraciones generadas | — |

### Bootstrap
```bash
# Desde la raíz del repo (~/Documents/vector-bikes), con el bundle commiteado, el árbol limpio y
# `pnpm --version` = 12.4.2 (Prerrequisitos).
# El orden importa: archivos que gobiernan comandos posteriores (.gitignore, pnpm-workspace.yaml,
# drizzle.config.ts, configs de pruebas, reglas) → install → dependencias nuevas → post-condición del
# lockfile → navegador → .env → chequeo estático → commit. No crea ni altera ninguna base de datos.
git rev-parse --git-dir >/dev/null 2>&1 || git init -b main   # el repo ya existe: no hace nada
rsync -a blueprints/vector-taller-f1/workspace/ ./   # reemplaza con versiones fusionadas; sale 0 aunque no haya cambios
pnpm install --frozen-lockfile
pnpm add -w --save-exact sharp@0.35.5 @replit/object-storage@1.0.0 qrcode@1.5.4 signature_pad@5.1.4   # -w: la raíz es paquete de workspace
pnpm add -w --save-dev --save-exact @playwright/test@1.63.0 @types/qrcode@1.5.6
grep -q '@img/sharp-linux-x64' pnpm-lock.yaml   # post-condición: el lockfile trae el binario de Replit
grep -q '@img/sharp-libvips-linux-x64' pnpm-lock.yaml
pnpm exec playwright install chromium
test -f .env || cp .env.example .env
pnpm check
git add -A && (git diff --cached --quiet || git commit -m "chore: bootstrap phase 1 workspace")
```
**`-w` es obligatorio.** `pnpm-workspace.yaml` hace de la raíz un paquete de workspace, y sin `-w` pnpm 12.4.2 sale 1 con `ERR_PNPM_ADDING_TO_ROOT` en ambas líneas. Verificado por el hilo principal el 2026-10-05 bajo pnpm 12.4.2 vía corepack: con `-w` las dos líneas salen 0, el lockfile gana `@img/sharp-linux-x64` y `@img/sharp-libvips-linux-x64`, y `pnpm-workspace.yaml` no se modifica, así que no hace falta ningún `minimumReleaseAgeExclude`.
**Permisos:** la primera corrida del `rsync` pide permiso una vez, porque el allowlist antiguo del repo solo tenía `rsync -a --ignore-existing`; después de la copia, el `.claude/settings.json` nuevo lo incluye literal, igual que las dos líneas `pnpm add -w`.
**Seguro de correr dos veces.** La copia sobrescribe a propósito (`CLAUDE.md`, `AGENTS.md`, `.gitignore`, `.claude/**` son versiones fusionadas que reemplazan a las del repo) y es idempotente porque **ningún paso edita un archivo que entrega `workspace/`**. `package.json` y `pnpm-lock.yaml` nunca están en `workspace/`; solo los cambian las líneas `pnpm add -w` y los `pnpm pkg set` de F1-06, así que una segunda corrida no revierte dependencias. `pnpm add -w` con las mismas versiones, los `grep`, `playwright install` con el navegador presente, `test -f .env ||` y el commit condicionado salen 0. Si pnpm rechaza alguna versión por antigüedad mínima de publicación, se reporta; no se adivina una exclusión.

---

## 11. Dependencias

Pins nuevos del informe de `stack-researcher` (2026-10-05). Los existentes vienen de `package.json`/`pnpm-lock.yaml` y no cambian. Los seis nuevos los instalan las dos líneas `pnpm add -w` del Bootstrap (§10).

### Runtime
| Paquete | Versión | Publicado | Fuente | Verificado | Instalado por | Propósito |
|---|---|---|---|---|---|---|
| sharp | 0.35.5 | 2026-09-27 (GitHub release) | https://registry.npmjs.org/-/package/sharp/dist-tags | 2026-10-05 (instalación con `-w` bajo pnpm 12.4.2 verificada por el hilo principal) | §10 Bootstrap (`pnpm add -w`) | Fotos; binarios `@img/sharp-*` sin script de instalación (fuera de `allowBuilds`) |
| @replit/object-storage | 1.0.0 | 2024-04-18 | https://registry.npmjs.org/-/package/@replit%2fobject-storage/dist-tags | 2026-10-05 (tipos verificados por el hilo principal) | §10 Bootstrap (`pnpm add -w`) | App Storage; poca actividad; configuración del bucket en Autoscale se prueba en §20.1 |
| qrcode | 1.5.4 | fecha no verificada | https://registry.npmjs.org/-/package/qrcode/dist-tags | 2026-10-05 (salida `<svg` e import por defecto verificados) | §10 Bootstrap (`pnpm add -w`) | QR de la etiqueta; CommonJS |
| signature_pad | 5.1.4 | 2026-07-31 (GitHub release) | https://registry.npmjs.org/-/package/signature_pad/dist-tags | 2026-10-05 | §10 Bootstrap (`pnpm add -w`) | Isla `SignaturePad` |
| astro 7.3.2 · @astrojs/node 11.1.5 · @astrojs/preact 6.0.5 · preact 10.29.8 · drizzle-orm 0.45.2 · postgres 3.4.9 · zod 4.6.5 · luxon 3.7.2 · resend 6.28.1 | existentes | — | `package.json` del repo | 2026-10-05 | `pnpm install --frozen-lockfile` | Sin cambios |

### Desarrollo
| Paquete | Versión | Publicado | Fuente | Verificado | Instalado por | Propósito |
|---|---|---|---|---|---|---|
| @playwright/test | 1.63.0 | 2026-09-04 (GitHub release) | https://registry.npmjs.org/-/package/@playwright%2ftest/dist-tags | 2026-10-05 | §10 Bootstrap (`pnpm add -w --save-dev`) | Pruebas de tablet; navegador solo en el Mac |
| @types/qrcode | 1.5.6 | 2025-10-24 | https://registry.npmjs.org/-/package/@types%2fqrcode/dist-tags | 2026-10-05 | §10 Bootstrap (`pnpm add -w --save-dev`) | Tipos de qrcode |
| drizzle-kit 0.31.10 · vitest ^5.0.1 · @electric-sql/pglite 0.5.8 · @biomejs/biome 2.5.13 · typescript ~6.0.3 · @astrojs/check 0.9.10 | existentes | — | `package.json` del repo | 2026-10-05 | `pnpm install --frozen-lockfile` | Sin cambios |

Runtimes y sistema (Node 24, pnpm 12.4.2 vía corepack si hace falta, Postgres 16, Chromium): §10.

### Deliberadamente no usados
| Rechazado | En su lugar | Por qué |
|---|---|---|
| `@google-cloud/storage` | `@replit/object-storage` tras `ObjectStorage` | Vía de escape (§20.2) |
| multer / busboy | `Request.formData()` | Una foto por petición |
| Lector de QR | Afirmar el texto pasado al generador | Sin dependencia extra |
| Triggers de Postgres | CHECK + recálculo en la transacción | SQL a mano en `drizzle/` |
| React, librerías de UI | Preact + HTML de servidor | Dos islas |
| dotenv | `process.loadEnvFile` / `--env-file-if-exists` | Nativo en Node 24 |

---

## 12. Estrategia de despliegue

### Hosting
Replit Autoscale existente; `.replit` intacto. Se construye en el Mac; Replit hace `git pull` y publica (decisión 2). `rm -rf node_modules` antes de cada Publish (README; lo hace el dueño; `rm -rf` está en la lista `deny` del allowlist).

### Entornos
| Entorno | Rama | URL | Base | Terceros |
|---|---|---|---|---|
| Local (Mac) | — | http://localhost:4321 | `vector_bikes` (dev), `vector_bikes_e2e` (Playwright), con el rol de `.env` | correo `console`, Turnstile de prueba, almacenamiento `local` |
| Producción | `main` | https://vectorbikes.cl | Postgres de producción | Resend, Turnstile real, App Storage (`STORAGE_DRIVER=replit`) |

### CI/CD
Sin CI externo: `pnpm gate` en el Mac antes de cada commit de paso y de cada publicación.

### Publicación y reversión
- Esquema: Replit propaga dev → prod al publicar; todo paso de esquema es aditivo salvo F1-37.
- **Secuencia:** Publicación A = tag ≥ `f1-07` → el dueño ingresa una vez → `/taller/usuarios` lo muestra y la consulta de §20.1 sale bien → recién entonces Publicación B (con `f1-37`).
- **Producción:** volver a publicar el deployment anterior. Hasta F1-36 cualquier reversión es segura (el esquema solo creció). Después de publicar F1-37, revertir a < f1-37 no está soportado: se corrige hacia adelante.
- **Local:** `git reset --hard f1-<NN-1>` y, si la base dev ya tiene migraciones de pasos revertidos, reiniciarla:
  ```bash
  test -z "$REPLIT_DEPLOYMENT" && psql "$(node --env-file-if-exists=.env -p 'process.env.DATABASE_URL')" -v ON_ERROR_STOP=1 -c 'drop schema public cascade; create schema public; drop schema if exists drizzle cascade;' && pnpm db:migrate
  ```
  Solo la base dev del workspace (la de `DATABASE_URL` en `.env`); se niega dentro de una deployment. Ni este comando ni `git reset --hard` tienen entrada propia en el allowlist, pero eso no los impide técnicamente (`node -e:*` y `node -p:*` permiten JS arbitrario): los resguarda la confirmación del operador en la sesión supervisada, cada vez (§14).

### Dominio, DNS, TLS
Sin cambios.

---

## 13. Estrategia de pruebas

| Capa | Framework | Cubre | Dónde | Corre |
|---|---|---|---|---|
| Unit | Vitest | permisos, funciones puras | `tests/unit/` | `pnpm test` |
| Integración | Vitest + PGlite | dominio, CHECK, concurrencia | `tests/integration/` | `pnpm test` |
| Build | Vitest | sitio público sin regresiones | `tests/build/` | `pnpm test:build` |
| Tablet E2E | Playwright (Chromium 820×1180 táctil) | flujos de `/taller` | `e2e/` | `pnpm test:tablet` (en `pnpm gate` desde F1-06) |
| Smoke | sh + curl | servidor construido, `/admin` 303, 401 de tareas sin bearer (F1-01) y 401 de subida de fotos sin sesión (F1-19) | `scripts/smoke.sh` | `pnpm smoke` |
| Manual | tablet real | recepción, galería, control, entrega | §20.1 | antes de lanzar |

### Flujos críticos E2E
1. Login por toques y 403 del mecánico en `/admin` (`login.spec.ts`).
2. Recepción completa con cuatro fotos y firma (`recepcion-completa.spec.ts`), y recepción hecha por el mecánico (`recepcion-checklist.spec.ts`).
3. Control de calidad (`control-calidad.spec.ts`) y entrega con pago y firma (`entrega.spec.ts`).

### Datos de prueba
PGlite nuevo por test. Playwright: `global-setup.ts` crea/migra/vacía `vector_bikes_e2e` (con el rol de `E2E_DATABASE_URL`) y siembra ids fijos (dueño, mecánico, 2 reservas de mañana, catálogo, cliente, bici, `OT-00001` recibida, `OT-00002` en control, `OT-00003` lista con 25.000). Cada grupo se siembra solo si su tabla existe. Servicio requerido: Postgres local; los tests nunca comparten base con dev.

### Lo que no se prueba
Comparaciones de píxeles; el driver real de App Storage, la impresión física, Make.com (checklist); el sitio público con navegador (No-Objetivo).

---

## 14. Seguridad y secretos

| Tema | Control | Dónde |
|---|---|---|
| Secretos | *Secrets* de Replit; `.env` ignorado | §10 |
| Rotación | `TASKS_SECRET`: Replit y Make.com a la vez | README |
| Validación | zod en cada borde | `src/server/taller/**` |
| XSS | Astro escapa; `set:html` solo JSON-LD; etiqueta con `escapeHtml` | `label.ts` |
| SQL | Drizzle y `sql` parametrizado | todo |
| AuthN/AuthZ | §8, en cada petición; el smoke prueba que la subida de fotos responde 401 sin sesión | páginas + dominio + `smoke.sh` |
| CSRF | `isAllowedOrigin` en POST con cookie; tokens en páginas públicas | `handlers.ts` |
| Abuso | rate limit de login y de aprobaciones; tokens de 256 bits | `admin-auth.ts`, `approvals.ts` |
| Subidas | ≤ 15 MB, `image/*`, decodificación por sharp, claves del servidor | `photos.ts` |
| Cabeceras | `no-store`; `referrer-policy: no-referrer` con token; `nosniff` en medios | páginas |
| PII (Ley 21.719) | RUT, teléfono, correo, fotos; finalidad: servicio y garantía; fotos de recepción 6 meses a tamaño completo; primer nombre en vistas públicas; nunca en logs ni auditoría | `audit.ts`, `maintenance.ts` |
| Comandos destructivos | Reinicio de la base dev, `git reset --hard` y la limpieza de sesiones legadas de F1-37: **resguardados por la confirmación del operador en la sesión supervisada**, más la guarda `REPLIT_DEPLOYMENT` en el reinicio y la limpieza. El allowlist **no** los impide técnicamente: `node -e:*` (entrada existente del dueño, que se conserva) y `node -p:*` permiten JS arbitrario. `rm -rf` y `git push` están en `deny` | sesión supervisada; `.claude/settings.json` |
| Dependencias | `pnpm add` solo tiene entrada para las dos líneas `pnpm add -w` del Bootstrap; no hay comodín `pnpm add:*` | `.claude/settings.json` |

Régimen: Ley 21.719 (Chile). Sin fecha de nacimiento; el consentimiento de la reserva no habilita marketing.

---

## 15. Accesibilidad

WCAG 2.2 AA. En `/taller`: objetivos ≥ 48px, `label` en todo control, `fieldset`/`legend` en grupos, estados con texto, `role="status"`/`role="alert"`, foco visible. La firma es un arrastre **esencial** (excepción de 2.5.7). Verificación automática: los specs ubican cada control por rol y nombre accesible; un control sin etiqueta rompe el spec. Manual antes de lanzar: teclado en `/taller/usuarios` y `/taller/catalogo`, VoiceOver en la recepción, zoom 200 %.

---

## 16. Observabilidad y costo

| Señal | Herramienta | Qué | Quién |
|---|---|---|---|
| Logs | `log.ts` → logs de Replit | `tasks.*`, `email.failed`, almacenamiento | dueño |
| Tareas | historial y alerta de Make.com | respuestas de `/api/tareas/*` | dueño |
| Uptime | monitor existente sobre `/api/health` | — | dueño |

| Métrica | Meta | Alerta |
|---|---|---|
| Corridas de tareas con `"ok":true` | 100 % | cualquier fallo (Make.com) |
| Órdenes atrasadas | 0 | correo diario de alertas |
| Recepciones sin firma | 0 | consulta de §1 |

Health sin cambios. **Costo:** solo App Storage de Replit, cobrado por GB según el plan vigente (tarifa no verificada en esta sesión). Volumen estimado: 20 bicis/semana × ~6 fotos × ~0,45 MB ≈ 54 MB/semana antes de la purga de 6 meses. Make.com: 3 operaciones/día (plan gratuito, no verificado).

---

## 17. Enrutamiento de modelos

NOT APPLICABLE — this project does not call an LLM at runtime.

---

## 18. Skills para usar durante el build

| Skill | Pasos | Por qué | Instalación |
|---|---|---|---|
| playwright-cli (se activa sola) | F1-06, 11, 16, 17, 21, 22, 23, 25, 28, 30, 35 | Depurar specs de tablet | `npm install -g @playwright/cli@latest` y luego `playwright-cli install --skills` |
| frontend-design (se activa sola) | F1-06, 11, 16–21, 35 | Pantallas densas fieles al sistema existente | `/plugin marketplace add anthropics/skills` y luego `/plugin install example-skills@anthropic-agent-skills` |

Si una no está instalada, se sigue con este blueprint y se anota en una línea. `add-migration` y `add-holidays` se conservan sin cambios.

---

## 19. Espacio de trabajo del agente

`workspace/` refleja la raíz del repo y lo copia el Bootstrap (§10). **En brownfield, `CLAUDE.md`, `AGENTS.md`, `.gitignore`, `pnpm-workspace.yaml`, `drizzle.config.ts`, `.claude/settings.json` y las reglas existentes son versiones fusionadas**: conservan el contenido del repo y agregan lo de esta fase; reemplazan a las actuales al copiarse. Ningún paso edita un archivo de esta lista. Nunca se emite `.claude/commands/`. Los archivos bajo `workspace/` son la fuente literal; esta sección describe su contenido.

### 19.1 `CLAUDE.md`
`workspace/CLAUDE.md` (179 líneas): comandos primero (incluye `pnpm test:tablet`, que entra a `pnpm gate` desde F1-06), estado del build, stack, caminos de reserva y recepción, fronteras, "dónde vive cada cosa" con el esquema en tres archivos, reglas 1–12, sistema de diseño con la nota de `/taller`, entorno con `TASKS_SECRET`, `CRON_SECRET`, `WHATSAPP_*`, `E2E_DATABASE_URL`, `STORAGE_*`, reglas diferidas, No negociable 1–13 (6 reformulado según D-C) y "Reparto con Codex" literal.

### 19.2 `AGENTS.md`
`workspace/AGENTS.md`: neutral respecto de la herramienta; comandos (misma nota sobre `test:tablet`), reglas 1–13, fronteras, reglas por carpeta, "Al recibir un encargo delegado" literal, No negociable sincronizado.

### 19.3 `.claude/settings.json`
El allowlist existente más: `pnpm test:tablet`, las **dos líneas exactas `pnpm add -w`** del Bootstrap (sin comodín `pnpm add:*`: `AGENTS.md` prohíbe dependencias no autorizadas), `pnpm pkg set:*`, `pnpm exec playwright:*`, la línea literal de `rsync`, `pg_isready:*`, `node -p:*`, `printf:*`, los dos `grep` del lockfile, la línea exacta de `admin-set-password.ts` de F1-04 y la limpieza de sesiones legadas de F1-37. Conserva `node -e:*` (entrada del dueño) y `corepack enable:*`/`corepack prepare:*`. Cubre cada Verify, cada Checkpoint y §20.1. El reinicio de la base dev y `git reset --hard` no tienen entrada propia, pero el allowlist no los impide técnicamente: `node -e:*` y `node -p:*` permiten JS arbitrario, así que su resguardo es la confirmación del operador en la sesión supervisada (§9 regla 6, §14). Deny: `.env`, `git push`, `rm -rf`, `drizzle-kit push/drop/generate --custom`.

### 19.4 Skills del proyecto
Se conservan `add-migration` y `add-holidays` sin cambios.

| Skill | Se activa con | Automatiza |
|---|---|---|
| add-migration | "agregar un campo", "nueva tabla" | esquema → generate → test → migrate → check |
| add-holidays | feriados de un año nuevo | carga y prueba de feriados |

### 19.5 `.claude/rules/*.md`
| Archivo | `paths` | Cubre |
|---|---|---|
| `database.md` (fusionado) | `src/server/db/**`, `drizzle/**`, `scripts/db-*.ts` | esquema en 3 archivos, solo aditivo, nunca `--custom`, `branch_id`, anular, CHECK sin triggers |
| `server-api.md` (fusionado) | + `src/pages/taller/**`, `aprobacion/**`, `informe/**`, `src/server/taller/**`, `storage/**` | sesión → permiso, Origin, tareas con bearer, páginas con token, medios |
| `ui-design.md` (fusionado) | sin cambios | "una sola isla" limitado al sitio público |
| `taller-ui.md` (nuevo) | `src/pages/taller/**`, `src/components/taller/**`, `TallerLayout.astro` | tablet primero, recepción para todos los roles, ≥ 48px, estados con forma, dos islas |
| `taller-domain.md` (nuevo) | `src/server/taller/**`, `src/server/storage/**` | actor/branch, anular, totales en la transacción, auditoría, E/S fuera de la transacción |
| `e2e.md` (nuevo) | `e2e/**`, `playwright.config.ts` | solo `/taller`, tablet, sin píxeles, base `_e2e` |

### 19.6 Configuración crítica para las compuertas
| Archivo | Ruta | Verify que lo necesita | Resolución / entorno | Exclusión del bundle |
|---|---|---|---|---|
| `playwright.config.ts` | raíz | todo `pnpm test:tablet` desde F1-06 | importa `./e2e/fixtures.ts` (carga `.env`); `env` explícito al servidor (4322, `PUBLIC_SITE_URL=http://127.0.0.1:4322`, `.storage-e2e`, base E2E) | `testDir: "./e2e"` |
| `e2e/global-setup.ts` | `e2e/` | ídem | crea/migra/vacía/siembra la base `_e2e` con el rol de `E2E_DATABASE_URL`; importa `hashPassword` | n/a |
| `e2e/fixtures.ts` | `e2e/` | ídem | `process.loadEnvFile(".env")` si existe; `E2E_DATABASE_URL` con valor por defecto | n/a |
| `drizzle.config.ts` | raíz | pasos de esquema | `process.loadEnvFile`; `schema: "./src/server/db/schema*.ts"` | el glob solo mira `src/server/db/` |
| `pnpm-workspace.yaml` | raíz | Bootstrap, F1-08 | `supportedArchitectures` (binario linux de sharp); hace de la raíz un paquete de workspace, por eso `pnpm add -w` | `"!blueprints/**"` (existente) |
| `.gitignore` | raíz | §20.1 | `.storage/`, `.storage-e2e/`, `test-results/`, `playwright-report/`, `blob-report/` | n/a |
| `vitest.config.ts` | raíz (sin cambios) | todo `pnpm test` | `include` solo `tests/unit` y `tests/integration` (no toma `e2e/`) | `exclude: "blueprints/**"` (existente) |
| `tsconfig.json`, `biome.json` | raíz (sin cambios) | `pnpm check` | — | `exclude: ["blueprints"]`, `"!!**/blueprints"` (existentes) |

**Cuándo se ejerce la siembra:** `global-setup.ts` corre en cada `pnpm test:tablet`, y `pnpm gate` lo incluye desde F1-06. Cada grupo se ejecuta por primera vez en el `pnpm gate` del paso que crea su última tabla: usuarios y reservas en F1-06, catálogo en F1-09, cliente/bici/órdenes en F1-15, la línea de `OT-00003` en F1-18. Ningún spec lee esas filas antes: las reservas en F1-16, el cliente en F1-17, las órdenes en F1-22/23/25/28/35 y el saldo de `OT-00003` en F1-30.

Ningún servicio en contenedor: Postgres local es prerrequisito (con el rol de `.env`, §10); la base `_e2e` la crea `global-setup.ts`.

#### Resolution convention matrix
**Convención:** importación relativa con extensión `.ts`/`.tsx` explícita, sin alias ni barrels.

| Contexto | Comando | Forma | Config que lo hace funcionar |
|---|---|---|---|
| App | `pnpm build` / `pnpm dev` | `../db/client.ts` | `tsconfig.json` `allowImportingTsExtensions: true`; Vite resuelve la ruta literal |
| Tests | `pnpm test` | igual | `vitest.config.ts` (`getViteConfig`) |
| Scripts | `node --env-file-if-exists=.env scripts/db-check.ts` | igual | Node 24 quita tipos y resuelve la ruta literal; `tsc` la acepta por `allowImportingTsExtensions` + `noEmit` |
| Build | `pnpm build` | salida `dist/server/entry.mjs` | Vite reescribe los especificadores |
| drizzle-kit | `pnpm db:generate` | `./schema.ts` desde `schema-taller.ts` | cargador TS de drizzle-kit; glob de `drizzle.config.ts` |
| Playwright | `pnpm test:tablet` | `./e2e/fixtures.ts`, `../src/server/auth/admin-auth.ts` | transformación TS de Playwright, ruta literal |

Paquetes con resolución no trivial: **sharp** (nativo; Vite SSR lo deja externo; `supportedArchitectures`), **@replit/object-storage** (import dinámico solo con `STORAGE_DRIVER=replit`; tests con cliente falso), **qrcode** (CJS con import por defecto, verificado), **signature_pad** (ESM, bundle del cliente).

#### Cross-artifact value reconciliation
| Valor | Fuente | Literal | Otras apariciones | Comparado |
|---|---|---|---|---|
| Puerto E2E | `e2e/fixtures.ts` | `4322` | `playwright.config.ts` (importa), `e2e.md` | yes |
| Base E2E (valor por defecto) | `e2e/fixtures.ts` | `postgres://postgres:postgres@127.0.0.1:5432/vector_bikes_e2e` | `.env.example` (F1-06), §10, `e2e.md`, `CLAUDE.md` | yes |
| Base dev (valor por defecto) | `.env.example` existente | `postgres://postgres:postgres@127.0.0.1:5432/vector_bikes` | `drizzle.config.ts`; el reinicio de §9 regla 6 y §12 ya no lo repite: lee `DATABASE_URL` de `.env` | yes |
| Dir. almacenamiento E2E | `e2e/fixtures.ts` | `.storage-e2e` | `.gitignore`, `playwright.config.ts` | yes |
| Dir. almacenamiento dev | `getStorageEnv` (F1-08) | `.storage` | `.env.example`, `.gitignore` | yes |
| Entrada del servidor | adaptador Node de Astro | `dist/server/entry.mjs` | `package.json` `start`, `smoke.sh`, `playwright.config.ts`, `.replit` | yes |
| Script de tablet | `package.json` (F1-06) | `playwright test` | `CLAUDE.md`, `AGENTS.md`, `settings.json`, Verify F1-06 (`node -p`) | yes |
| Compuerta | `package.json` (F1-06) | `pnpm check && pnpm test && pnpm build && pnpm test:build && pnpm test:tablet && pnpm smoke` | `CLAUDE.md`, `AGENTS.md`, Verify F1-06 (`node -p`) | yes |
| Glob de esquema | `drizzle.config.ts` | `./src/server/db/schema*.ts` | los tres archivos de esquema, `database.md` | yes |
| Columnas sembradas | §4 | columnas de `branches`, `users`, `bookings`, `services`, `service_prices`, `customers`, `bikes`, `work_orders`, `work_order_items` | `e2e/global-setup.ts` | yes |
| Etiquetas | `rules.ts`, `permissions.ts` | `Dueño`, `Recibida`, `Diagnóstico`, `Lista para retirar`, `Entregada`, `Trabajo terminado`, `OK`, puntos del checklist | specs E2E | yes |
| Rutas de tareas | F1-01/F1-36 | `/api/tareas/recordatorios`, `/alertas`, `/retencion` | README, `smoke.sh`, blueprint del sitio | yes |
| Ruta de subida | `fotos.ts` (F1-19) | `/taller/ordenes/[id]/fotos` | `smoke.sh` (`/taller/ordenes/x/fotos`, F1-19), `uploadUrl` de `PhotoCapture` en `cierre.astro` y `galeria.astro` | yes |
| Ruta de medios | `photos.ts` | `/taller/media/` | `media/[...key].ts`, specs | yes |
| Comandos de Bootstrap | §10 | dos líneas `pnpm add -w …` | `settings.json` (literal), §11 `Instalado por` | yes |
| Ruta del bundle | — | `blueprints/` | `tsconfig`, `biome.json`, `vitest.config.ts`, `pnpm-workspace.yaml` | yes |

Cada contrato se ejerce en el primer paso donde existen ambos lados: el servidor construido corre en F1-01 (smoke) y F1-06 (Playwright); la ruta de subida, en el smoke de F1-19.

#### Byte-exact artifact reconciliation
| Artefacto | Autor | Primer diff | Reglas que lo restringen | Llamada del runtime | Confirmado |
|---|---|---|---|---|---|
| Fila 25 y punto de §20.1 del blueprint del sitio | F1-02 | F1-02 (`grep -qF`) | texto literal de la épica 01; guion largo `—` | n/a (texto) | yes |
| Líneas de `.env.example` | F1-02, 06, 08 | mismo paso | §10 (los literales no cambian aunque el rol local sea otro) | n/a | yes |
| Mensaje de `admin-set-password.ts` sin entorno | existente (`EnvError`) | F1-04 (`grep -q ADMIN_EMAIL`) | `EnvError` nombra las variables faltantes | `getAdminSetupEnv({})` lanza "…faltante o inválida: ADMIN_EMAIL, ADMIN_PASSWORD" (código del repo) | yes |
| Tabla de RUT | F1-10 | F1-10 | módulo 11 calculado a mano: 12345678→5, 10000013→K, 12345675→0 | n/a (aritmética) | yes |
| Fechas sugeridas | F1-18 | F1-18 | 2026-10-05 lunes, 2026-10-10 sábado, 2026-10-12 feriado en `feriados-cl.json`, `RECEPTION_HOURS[7] = null` | luxon `plus({ days })` | yes |
| `OT-00001` | F1-15 | F1-15 | `padStart(5, "0")` | n/a | yes |
| Token 43 / hash 64 | F1-26 | F1-26 | 32 bytes base64url sin relleno; sha256 hex | n/a | yes |
| `<svg` en la etiqueta | F1-23 | F1-23 (`toContain`) | propiedad | `QRCode.toString(text, { type: "svg" })` empieza con `<svg` — verificado 2026-10-05 por el hilo principal | yes |
| Orientación EXIF en el fixture | F1-08 | F1-08 | 300×100 → 100×300 | sharp 0.35.5 `withMetadata({ orientation: 6 })` conserva 6 — verificado 2026-10-05 | yes |
| Código 401 de la subida sin sesión | F1-19 | F1-19 (smoke) | §5: sesión es la primera comprobación de `POST /taller/ordenes/[id]/fotos`; `requireAdmin` devuelve `null` sin cookie | `handlePhotoUpload` con `actor: null` → 401 (código del paso) | yes |

---

## 20. Compuerta de aceptación, riesgos y registro de decisiones

### 20.1 Compuerta global de aceptación
```bash
pnpm install --frozen-lockfile   # expect: exit 0, lockfile sin cambios
pnpm check                       # expect: exit 0
pnpm test                        # expect: exit 0, 0 failed, 0 skipped
pnpm db:migrate                  # expect: exit 0
pnpm db:check                    # expect: exit 0, {"ok":true,...}
pnpm build                       # expect: exit 0
pnpm test:build                  # expect: exit 0
pnpm test:tablet                 # expect: exit 0, 0 failed (todos los specs de e2e/)
sh scripts/smoke.sh              # expect: exit 0 — salud, /admin 303, tareas 401, subida de fotos sin sesión 401
grep -q '@img/sharp-linux-x64' pnpm-lock.yaml   # expect: exit 0
pnpm gate                        # expect: exit 0
```
**Criterios FASE1 §14 → prueba:** tabla al final de F1-37 (§9).

**Compuertas manuales (una vez, después del build):**
- [ ] Un tag por paso: `test "$(git tag -l 'f1-*' | wc -l | tr -d ' ')" = 37` sale 0.
- [ ] Archivos commiteados, uno por invocación: `git ls-files --error-unmatch playwright.config.ts`, `… drizzle.config.ts`, `… e2e/global-setup.ts`, `… e2e/fixtures.ts`, `… .env.example`, `… pnpm-lock.yaml`, `… pnpm-workspace.yaml`, `… .claude/settings.json`, `… CLAUDE.md`, `… AGENTS.md` — cada uno sale 0; y `git check-ignore -q .env.example; test $? -eq 1` (1 = no ignorado; 128 = uso, y entonces falla).
- [ ] El `.gitignore` llegó en el commit del Bootstrap y ningún paso lo cambió: `test "$(git log -1 --format=%s -- .gitignore)" = "chore: bootstrap phase 1 workspace"` sale 0, y `test -z "$(git ls-files .storage .storage-e2e test-results playwright-report)"` sale 0.
- [ ] Bootstrap re-ejecutado sobre el árbol terminado: **sale 0**, `package.json` conserva las seis dependencias nuevas y `pnpm test` sigue en 0.
- [ ] §19.6: cada fila de valores dice `Comparado: yes` y `pnpm check` se corrió con `blueprints/vector-taller-f1/` presente.
- [ ] §9.1: harness verde e interruptor ensayado una vez (republicar el deployment anterior y volver).
- [ ] Ningún No-Objetivo de §1 construido.
- [ ] **Lanzamiento — respaldos:** activos en Replit antes de F1-03 (el dueño lo ve en el panel *Database*).
- [ ] **Lanzamiento — secretos:** `TASKS_SECRET` y `STORAGE_DRIVER=replit` (y `STORAGE_BUCKET_ID` si aplica) en *Secrets*; ninguno en el repo.
- [ ] **Lanzamiento — App Storage:** bucket creado; tras publicar, subir una foto en `/taller` de producción y ver su miniatura (prueba el driver Replit y el binario linux de sharp).
- [ ] **Lanzamiento — reservas de prueba:** antes de la primera recepción real, cada reserva de prueba de producción que siga `confirmed` o `ready_for_pickup` se cancela desde `/admin/reservas/[id]` con «Cancelar reserva». Eso cambia su `status` a `cancelled` y libera sus bloques; no borra nada ni envía correos o WhatsApp. `booking_requests` no se toca. Verificación en el panel *Database* de producción, solo lectura: `select count(*) from bookings where status in ('confirmed', 'ready_for_pickup');` devuelve `0`. Si para entonces ya existe alguna reserva real, esa no se cancela y el conteo esperado es el número de reservas reales activas.
- [ ] **Lanzamiento — catálogo real:** antes de la primera recepción real, el dueño carga en `/taller/catalogo` de producción el catálogo real de servicios, cada uno con su precio por tipo de bicicleta. Para verificar que la lista quedó completa, el dueño la compara contra su lista de precios vigente: ningún servicio que ofrece puede faltar y ningún servicio de prueba puede quedar activo. Además, en el panel *Database* de producción, solo lectura, `select s.name, t.bike_type from services s cross join (values ('mtb'), ('ruta'), ('gravel'), ('urbana'), ('ebike')) as t(bike_type) left join service_prices p on p.service_id = s.id and p.bike_type = t.bike_type where s.is_active and p.id is null order by s.name, t.bike_type;` no devuelve filas. Solo puede devolver las combinaciones que el dueño confirma que el taller no ofrece.
- [ ] **Lanzamiento — publicación:** `rm -rf node_modules` antes de cada Publish; Publicación A (tag ≥ f1-07) → el dueño ingresa una vez → `/taller/usuarios` lo muestra como Dueño → en el panel *Database* de producción, `select u.id = a.id as same_id, u.role, u.email = a.email as same_email from users u join admin_users a on a.id = u.id;` devuelve una fila con `true`, `owner`, `true` → recién entonces Publicación B (con f1-37).
- [ ] **Lanzamiento — Make.com:** escenario diario 10:00 America/Santiago con los tres POST, cabecera bearer y aviso por correo al dueño si alguna respuesta no es 200 con `"ok":true`; la primera corrida lo cumple.
- [ ] **Lanzamiento — etiqueta:** imprimir en la impresora de 62 mm y escanear el QR con un teléfono con sesión: abre la orden correcta (FASE1 §14.4).
- [ ] **Lanzamiento — tablet real:** las líneas manuales de F1-16, 17, 18, 21, 25, 28 y 30 marcadas por el dueño.
- [ ] **Lanzamiento — accesibilidad:** teclado en `/taller/usuarios` y `/taller/catalogo`, VoiceOver en la recepción, zoom 200 %.
- [ ] **Lanzamiento — recepción por el mecánico:** el dueño confirma explícitamente la decisión A (§20.3 #26) al recibir el sistema.
- [ ] **Cierre de fase:** dos semanas de operación real sin papel (FASE1 §14.14). La fase 2 no empieza antes.

### 20.2 Registro de riesgos
| Riesgo | Prob. | Impacto | Señal temprana | Mitigación |
|---|---|---|---|---|
| Recepción inutilizable en una tablet real | M | A | El taller vuelve al papel | `taller-ui.md`, spec por paso, líneas manuales (builder/dueño) |
| `@replit/object-storage` mal configurado en Autoscale | M | A | Subida en producción falla | Interfaz `ObjectStorage` + tests con cliente inyectado (F1-08); subida de prueba en §20.1; vía de escape: driver con `@google-cloud/storage` tras la misma interfaz |
| Contracción publicada antes de la copia | B | A | Error de `SET NOT NULL` al publicar | Orden D-F, consulta de §20.1; riesgo residual aceptado: sin sesiones legadas el dueño recupera con `admin:set-password` |
| Respaldos apagados con el historial ya en la base | M | A | Panel sin respaldos | Confirmación previa de F1-03 + ítem de lanzamiento |
| Escenario de Make.com nunca creado | M | M | No llegan recordatorios | Ítem de lanzamiento; respuesta `ok` verificable |
| Binario de sharp ausente en Replit | B | A | 500 al subir en producción | `supportedArchitectures` + post-condición del Bootstrap + subida de prueba |
| Fotos HEIC de iPad que sharp no decodifica | B | M | 415 "Ese archivo no es una foto" | Safari entrega JPEG con `accept="image/*"`; las líneas de tablet real lo detectan antes de lanzar |
| `pnpm` global más antiguo que 12.4.2 | A | M | `pnpm --version` ≠ `12.4.2`; el Bootstrap falla | Prerrequisito explícito en §10 con `corepack enable` + `corepack prepare pnpm@12.4.2 --activate` |
| Comando destructivo aprobado por error | B | A | Base dev vacía o commits perdidos | Confirmación del operador cada vez; guarda `REPLIT_DEPLOYMENT`; checkpoints `f1-NN` como puntos de vuelta |
| Alcance que crece y la fase nunca entra en uso | M | A | Pedidos fuera de §2.4 | No-Objetivos de §1; criterio 14 cierra la fase |
| Subida de fotos sin `content-length` (aceptado en F1-19, 2026-10-07): el corte de 16 MiB de `handlePhotoUpload` se basa en esa cabecera; un usuario **con sesión** que envía el cuerpo en chunked la evita, y `formData()` carga todo en memoria antes del corte de 15 MB del archivo | B | M | Memoria alta o reinicio del proceso en Autoscale durante una subida | Aceptado por ahora: solo personal autenticado (dos personas). **Pendiente:** límite de tamaño de cuerpo en el adaptador de Node (o leer el stream con tope antes de `formData()`), en un commit propio |

Aceptado: `/api/tareas/alertas` envía un resumen cada vez que se llama (no idempotente por diseño; Make.com lo llama una vez al día).

### 20.3 Registro de decisiones
| # | Decisión | Alternativa rechazada | Por qué | Se revierte si |
|---|---|---|---|---|
| 1 | Extender el proyecto actual (FASE1 1–2) | App nueva | Misma base y despliegue | — |
| 2 | Usuarios: expand → copia al ingresar → contract en dos publicaciones (D-F), en vez del renombre literal de la decisión 6 | `RENAME TO users` | drizzle-kit preguntaría por el renombre y Replit propaga sin datos; el resultado final es el mismo | drizzle-kit permite renombres no interactivos y Replit migra datos |
| 3 | Recordatorios por cron externo con bearer (6b, D-J) | Scheduled Deployment | Replit no permitió la segunda publicación | Replit lo permite en la misma App |
| 4 | Área `/taller` con páginas Astro y POST (D-A) | SPA o API + cliente | Patrón de `/admin`, cero JS por defecto | Se necesita operación sin conexión |
| 5 | Dos islas en `/taller` (D-B) | Formularios sin cámara/firma | Cámara y firma necesitan JS | Hay soporte nativo sin JS |
| 6 | Playwright solo para `/taller` (D-C), reformulando el No negociable 6 | Sin E2E | La recepción en tablet es el riesgo principal | La fase deja de ser tablet-first |
| 7 | Reservas manuales reutilizando `createBooking` con `source` (D-D); correo obligatorio | Tabla aparte | Mismas garantías | Muchos clientes sin correo |
| 8 | Reglas en CHECK y recálculo en la transacción (D-G) | Triggers | Sin SQL a mano | Escrituras fuera del ORM |
| 9 | Tokens de 32 bytes, sha256, un solo uso con `update … where decided_at is null` (D-H) | HMAC con secreto | Sin secreto nuevo | Se exige revocación por secreto |
| 10 | Almacenamiento local/Replit con sharp 2000/400 (D-I) | Solo Replit | Recepción desarrollable en el Mac | — |
| 11 | Etiqueta de 62 mm en un endpoint `.ts` (D-K) | Página `.astro` | `@page` necesita el ancho literal y `set:html` está prohibido | Astro permite estilos con expresiones |
| 12 | Informe con snapshot y token sin vencimiento, revocable regenerando (D-L) | Vista viva | El informe no cambia si se edita la orden | Se pide vencimiento |
| 13 | Fecha sugerida desde mañana, 360 min/día (D-M) | Automática | Decisión 13 | Hay datos reales de duración |
| 14 | Matriz `can(role, action)` en el servidor (D-N) | Permisos por pantalla | FASE1 §3.8 | — |
| 15 | Auditoría en la misma transacción, `details` redactado (D-O) | Logs | Consultable por el dueño | — |
| 16 | 37 pasos (encargo: 25) | 25 pasos de 6–9 archivos | La regla de ≤ 5 archivos por paso (máximo 6 cuando el sexto es una página o endpoint delgado o una línea del smoke: solo F1-09, F1-19 y F1-36) exigió partir pasos | — |
| 17 | Ids `E<n>-T<n>`, tags `f1-NN` | Ids `F1-NN`; tags `step-NN-*` | El esquema exige `E<n>-T<n>`; `step-NN-*` ya lo usa el sitio | — |
| 18 | Esquema en tres archivos | Un `schema.ts` de ~650 líneas | Regla de < 400 líneas | — |
| 19 | El POST de `/aprobacion` no chequea `Origin` | Exigir Origin | Mismo caso que la cancelación | El token viaja fuera del enlace |
| 20 | Rate limit de aprobaciones con el contador de `booking_requests` | Tabla nueva | Sin esquema extra | Aprobaciones y reservas chocan |
| 21 | La recepción no cambia el estado de la reserva | Marcarla `completed` | `bookings` es interfaz congelada | Recordatorios duplicados |
| 22 | `rsync -a` sin `--ignore-existing` en el Bootstrap | Copia sin sobrescribir | Los archivos fusionados deben reemplazar a los del repo | Un paso necesita editar un archivo de `workspace/` |
| 23 | **D-E:** módulo WhatsApp congelado; único cambio `getCronEnv()`; `lista_para_retirar` no envía nada | Notificar al pasar a lista | Sin plantillas aprobadas ni alcance de fase 1 | Fase 3 (asistente de WhatsApp) |
| 24 | **D-P:** estados de la OT en español snake_case con transiciones fijas en `rules.ts` y saltos solo por flujo | Estados libres | Los lee el negocio; los flujos garantizan reglas | El taller necesita un estado nuevo |
| 25 | Respaldos activos como prerrequisito explícito de F1-03, confirmado por el operador con el dueño (decisión del dueño) | Compuerta de máquina | No hay forma local de verificarlo; la construcción es supervisada | Los respaldos se confirman antes de empezar el build |
| 26 | **Decisión A:** el mecánico hace recepciones y la orden que crea queda asignada a él. Es una decisión de diseño del hilo principal, **inferida** de FASE1 decisión 5 (recepción tablet-first para el mecánico), de la spec §9 ("El mecánico o encargado") y de que el taller es de dos personas; FASE1 no la dice literalmente. **Pendiente de la confirmación explícita del dueño en la entrega** (ítem de §20.1) | Recepción solo para owner/admin/reception (tabla de FASE1 §3.8) | Con dos personas, el mecánico recibe bicis a diario; la tabla de §3.8 lo dejaría fuera de su propia tablet | El dueño restringe la recepción a roles de personal |
| 27 | El reinicio de la base dev y `git reset --hard` no tienen entrada propia en el allowlist; su resguardo es la confirmación del operador en la sesión supervisada, cada vez, más la guarda `REPLIT_DEPLOYMENT` en el reinicio. Se declara que el allowlist **no** los impide técnicamente: `node -e:*` (del dueño, se conserva) y `node -p:*` permiten JS arbitrario | Pre-aprobarlos; o quitar `node -e:*` del allowlist | Son destructivos; la entrada `node -e:*` pertenece al dueño y no se toca | La construcción deja de ser supervisada |
| 28 | `pnpm add` solo con las dos líneas exactas `pnpm add -w` del Bootstrap; la limpieza de F1-37 borra solo sesiones legadas sin tocar claves | `pnpm add:*`; `pnpm add` sin `-w`; credencial de dev fija | `AGENTS.md` prohíbe dependencias no autorizadas; sin `-w` pnpm 12.4.2 sale 1 con `ERR_PNPM_ADDING_TO_ROOT`; una clave fija pisaría la del dueño | — |
| 29 | **Correo opcional en reservas manuales** (`telefono`, `whatsapp`, `presencial`), decisión del dueño del 2026-10-07: `bookings.email` pasa a nullable con un `DROP NOT NULL` aditivo (migración 0008); la reserva web lo sigue exigiendo por zod; sin correo no se envía confirmación ni recordatorio y no hay error, y el aviso al taller dice "Sin correo". Relaja dos interfaces que §5 congelaba (columnas de `bookings` y `sendReminders`, que ahora salta las reservas sin correo); las garantías de 1 bici por bloque y 4 por día no cambian | Correo obligatorio también en las manuales | Un cliente que llama o escribe por WhatsApp a menudo no da correo; exigirlo obligaba a inventar uno | Se quiere avisar por otro canal (WhatsApp, fase 3) y el correo deja de ser el único medio de confirmación |
| 30 | **Excepción a "ningún hex nuevo"** (decisión del dueño, 2026-10-07, F1-21): `src/components/taller/SignaturePad.tsx` fija la firma en tinta `#0C0D0E` sobre papel `#FFFFFF` (constantes `INK` y `PAPER`, valores claros aprobados de `--ink` y `--surface`) en cualquier tema, y `signature_pad` guarda el PNG con ese fondo blanco. Es la única excepción; el resto de `/taller` sigue solo con variables de `:root` | Pintar con `var(--ink)` sobre PNG transparente | En modo oscuro `--ink` es casi blanco: la firma guardada quedaba en trazo claro sobre fondo transparente, invisible al verla o imprimirla en blanco. La firma es un registro y debe leerse en cualquier tema | Las firmas pasan a guardarse como vector (SVG) con color definido al renderizar, o el sistema de diseño incorpora tokens fijos de "papel" independientes del tema |
| 31 | **`/aprobacion/[token]` no revela qué enlaces existen** (decisión del dueño, 2026-10-08, F1-27; reemplaza la vista "Ya respondiste: Aprobado/Rechazado el <fecha>" que pedía el epic de E4-T3): token inexistente, de forma inválida, ya usado, propuesta anulada, orden anulada u orden fuera de `esperando_aprobacion` dan la **misma** respuesta, 404 con el HTML fijo "Enlace no válido"; solo el POST exitoso muestra "Gracias, registramos tu respuesta: Aprobado/Rechazado" en su propio cuerpo, sin redirección. Las cuatro condiciones de rechazo viven en la primera sentencia atómica de `decideApproval` (`update … where … and exists(…) returning`). Internamente `decideApproval` sigue distinguiendo `already_decided` de `invalid` (lo exige la prueba de carrera); la página los iguala. Probado byte a byte en `tests/integration/approval-page.test.ts` | Mostrar al cliente su respuesta anterior al reabrir el enlace | Distinguir "ya usado" de "no existe" confirma a un tercero que un token es real y revela la decisión del cliente; el costo es que quien reabre su propio enlace ve "Enlace no válido" en vez de lo que eligió | El enlace pasa a requerir una segunda prueba de identidad (p. ej. los últimos dígitos del teléfono) o el cliente obtiene un portal con sesión (hoy fuera del sistema, FASE1 §2.4) |
| 32 | **Cuarto archivo de esquema `schema-reports.ts`** (decisión del dueño, 2026-10-08, antes de F1-32): `service_reports` va en `src/server/db/schema-reports.ts`, que importa de `schema-orders.ts` y exporta `reportTables`; la cadena queda `schema.ts` ← `schema-taller.ts` ← `schema-orders.ts` ← `schema-reports.ts`. E5-T2 cambia `schema-orders.ts` por `schema-reports.ts` en sus archivos, y la revisión de columnas de `db-check.ts` en F1-37 suma `reportTables`. `drizzle.config.ts` ya lee `schema*.ts`, así que no cambia su configuración | Agregar `service_reports` a `schema-orders.ts`; partir `schema-orders.ts` por tema | `schema-orders.ts` quedó en 397 líneas tras F1-31 y la regla 7 fija < 400; un archivo nuevo al final de la cadena es aditivo y no mueve tablas ya migradas | Otra tabla no cabe en `schema-reports.ts`: va a un quinto archivo al final de la cadena |
| 33 | **`/informe/[token]` sigue la regla de #31** (decisión del dueño, 2026-10-09, antes de F1-33; reemplaza el 404 "Informe no disponible" que pedía el epic de E5-T3). Un token inexistente, de forma inválida o reemplazado al regenerar da la **misma** respuesta: 404 con el HTML fijo "Enlace no válido". Todas las respuestas llevan `no-store`, `referrer-policy: no-referrer`, `<meta name="robots" content="noindex">` y `x-robots-tag: noindex`. Hay límite de intentos con `checkRateLimit`/`recordAttempt` (5 en 10 minutos por IP). Solo cuenta un enlace no válido, y al llegar al límite toda petición de esa IP recibe 429 sin consultar el informe, también la de un token vigente. Las pruebas van en archivos nuevos (`report-view.test.ts`, `report-page.test.ts`) porque `reports.test.ts` está en 397 líneas; las tres respuestas 404 se comparan byte a byte | 404 "Informe no disponible"; sin límite de intentos; contar también las vistas válidas | Distinguir un enlace reemplazado de uno inexistente confirma que un token fue real. Contar las vistas válidas haría que el cliente que reabre su informe se quede sin acceso. Bloquear toda la IP al llegar al límite evita seguir probando tokens mientras dura el bloqueo | El informe pasa a requerir una segunda prueba de identidad, o el límite compartido con `booking_requests` bloquea reservas legítimas detrás de una misma IP |
| 34 | **Datos financieros del panel solo para dueño y administración** (decisión del dueño, 2026-10-09, F1-35): nueva acción `dashboard.finance` (owner, admin) en `permissions.ts`, con 29 acciones en total. Sin ella, `adminDashboard` no consulta los pagos y devuelve `incomeTodayClp: null` y `pendingPayments: null`, y `/taller` no muestra "Ingresos de hoy" ni "Pagos pendientes". Recepción conserva el resto del panel (reservas de hoy, grupos por estado, atrasadas, próximas entregas, carga por mecánico). Probado en `tests/integration/dashboard-finance.test.ts` y en la matriz de `tests/unit/permissions.test.ts` | Ocultar las secciones solo en la página; quitarle a recepción todo el panel de administración | El permiso se decide en el servidor (CLAUDE.md regla 11); recepción necesita el resto del panel para recibir y entregar | Recepción pasa a cobrar o cuadrar caja y necesita ver los ingresos del día |
| 35 | **La contracción de F1-37 quedó en dos migraciones** (2026-10-13, aprobada por el dueño antes de aplicarla en dev): `0019` borra la FK `admin_sessions_admin_user_id_admin_users_id_fk`, deja `user_id` NOT NULL y borra `admin_user_id`; `0020` es solo `DROP TABLE "admin_users" CASCADE`. Las dos salen de `pnpm db:generate`, sin editar `drizzle/` a mano: primero se quitó la columna con `admin_users` todavía en el esquema y después la tabla. Ambas son solo de borrado. `tests/integration/users-schema.test.ts` pasó al estado contraído (sesión sin `user_id` → SQLSTATE 23502) | Una sola generación, como pedía el paso 3 del epic | La generación única emite `DROP TABLE "admin_users" CASCADE` antes de `DROP CONSTRAINT` de la FK; la cascada ya borra la FK y la sentencia siguiente falla con `constraint … does not exist` (42704), comprobado en PGlite. También agregaba `DISABLE ROW LEVEL SECURITY`, fuera de lo esperado | Una contracción futura borra una tabla y una columna que la referencia: se generan en pasos separados, la columna primero |
| 36 | **El retiro se muestra como una sola celda de 1 hora** (2026-10-20, rama `fix/retiro-bloque-unico`): en modo retiro, cuando el bloque elegido y el siguiente están ambos en `selectedBlocks`, `src/components/islands/BookingSchedule.tsx` emite **un** `<button class="slot sel">` con `grid-column: span 2`, el rango `17:00 – 18:00` que ya calcula `timeRange()`, `aria-pressed="true"` y `aria-label="Retiro de 17:00 a 18:00, 1 hora, seleccionado"`; el segundo botón no se renderiza y se quitó de `global.css` la regla `.slot.sel + .slot.sel`, que dibujaba el divisor interno y quedó sin uso. **La regla de negocio no cambia**: `BLOCKS_PER_MODE.retiro = 2` en `rules.ts` y `selectedBlocks()` siguen devolviendo dos bloques, y el cuerpo que se envía a `/api/reservas` es idéntico. Es una **diferencia visual deliberada respecto de `docs/design-preview.html`**, que dibuja dos celdas negras contiguas | Mantener las dos celdas con el divisor atenuado; o unirlas solo con CSS sin tocar el markup | Con dos botones, el contorno de selección rodeaba solo el primero y un lector de pantalla anunciaba dos botones presionados: el cliente creía haber marcado dos horarios. Una celda con el rango dice exactamente qué ocupa su reserva | El retiro deja de ocupar dos bloques contiguos, o se decide seguir el prototipo al pie de la letra |
| 37 | **H1 y title de la landing con la comuna** (decisión del dueño, 2026-10-20, rama `feat/seo-tecnico`, hallazgos 2.1 y 2.2 de `docs/auditoria-seo-2026-10-20.md`): el H1 pasa de `Mecánica de precisión.` a `Mecánica de precisión en Vitacura.`, y el `title` de `src/pages/index.astro` pasa a `Taller de bicicletas en Vitacura | Mecánica Vector Bikes`. Es una **diferencia deliberada respecto de `docs/design-preview.html`**, que fija el H1 corto. Con autorización expresa del dueño se actualizó **una sola aserción** de `tests/build/landing.test.ts` —el caso "tiene un solo h1 con el título del prototipo"— a la cadena nueva; el conteo de un único h1 y el resto del archivo quedaron intactos. Medido a 1280 y a 390, en claro y oscuro: el H1 ocupa tres líneas, corta en frontera de palabra y no desborda. **Revertido en parte el 2026-10-22** (decisión del dueño, rama `fix/landing-hero-corto`): el H1 vuelve a `Mecánica de precisión.`, como en el prototipo, y la bajada se acorta a "Reserva tu hora, déjala en nuestro local o te la vamos a buscar." El `title` con la comuna, el rótulo "Taller de bicicletas · Vitacura", la meta descripción y el `LocalBusiness` no cambian, así que la señal local sigue en el título y en los datos estructurados. La aserción del H1 en `tests/build/landing.test.ts` se actualizó con autorización expresa del dueño | Dejar el H1 de marca y cargar la comuna solo en el `<span class="label">` de encima | El H1 es la señal on-page de más peso y no contenía ni el servicio ni la comuna; la ubicación vivía en un rótulo que no pesa como encabezado. El título tampoco contenía "taller", que es como se busca esto en Chile | El prototipo se adopta al pie de la letra, o la marca deja de posicionarse por comuna |
| 38 | **Aviso por correo al pasar a Lista para retirar** (decisión del dueño, 2026-10-20, rama `feat/aviso-lista-para-retirar`): al aprobar el control de calidad, `submitQc` manda un correo al cliente **después del commit** de su transacción (regla 6 de CLAUDE.md), con la plantilla `readyForPickupEmail` de `templates.ts`: número de orden, bicicleta, total, abonado y saldo —o `Pagado` si no queda saldo—, dirección desde `SITE` y horario derivado de `RECEPTION_HOURS`, sin horas escritas a mano y **sin ningún enlace ni token**. **Revierte en parte la decisión 23**, que decía que `lista_para_retirar` no envía nada: eso queda acotado al módulo de WhatsApp, que sigue congelado y no se tocó. Sin correo del cliente no se envía nada y no hay error; si el envío falla se registra con `log.error` y la aprobación sigue siendo exitosa. El duplicado se evita con una fila de auditoría `notify.ready_for_pickup`, escrita **solo si el envío tuvo éxito**, de modo que un fallo del proveedor pueda reintentarse; sin columnas nuevas | Enviar dentro de la transacción; o guardar el envío en una columna de `work_orders` | Un correo dentro de la transacción la alarga y puede revertir un control ya aprobado. La auditoría ya existe, es consultable por el dueño y evita la migración | El aviso pasa a WhatsApp (fase 3), o se necesita reintento automático y conviene una tabla de envíos |
| 39 | **Quitar un precio del catálogo borra la fila de `service_prices`** (decisión del dueño, 2026-10-21, rama `feat/catalogo-precios-en-un-paso`): los cinco precios de un servicio se cargan con un solo botón; un campo vacío significa "el servicio no aplica a ese tipo", y si antes tenía precio, `setServicePrices` **borra** esa fila dentro de la misma transacción, auditando el cambio con `catalog.price_changed` y `after: null`. Es una excepción explícita al No negociable 9, que enumera orden, línea, accesorio, componente, aprobación y foto: `service_prices` no está en esa lista y no guarda historia, porque **cada línea de orden guarda su propio precio** al crearse (`work_order_items.unit_price_clp`), así que borrar el precio del catálogo no altera ninguna orden existente ni ningún informe ya emitido. Sin columnas nuevas | Marcar la fila con `voided_at`; o guardar el precio como `null` | Una fila anulada o en `null` obliga a filtrarla en cada consulta de catálogo y en el selector de servicios de la recepción, para representar lo mismo que su ausencia. La auditoría ya deja el rastro de qué precio había antes | El catálogo necesita historial de precios por fecha (p. ej. para reconstruir un presupuesto antiguo): entonces va una tabla de vigencias, no una fila mutable |
| 40 | **Aviso por correo al finalizar la recepción** (decisión del dueño, 2026-10-21, rama `feat/aviso-bicicleta-recibida`): cuando `finalizeReception` deja la orden en `recibida`, se manda al cliente el correo "Recibimos tu bicicleta" con la plantilla `receivedBikeEmail`: número de orden, bicicleta, servicio solicitado, líneas vigentes con su total —o "Te enviaremos el presupuesto después del diagnóstico" si todavía no hay—, accesorios, fecha estimada en formato largo y la mención "Orden de garantía de …" cuando corresponde. **Sin enlaces, sin tokens y sin datos internos**: el checklist y las observaciones no salen. Mismo patrón que la decisión 38: envío **después del commit** (regla 6 de CLAUDE.md), sin correo del cliente no se envía y no hay error, un fallo se registra con `log.error` y la recepción queda igual de finalizada, y el duplicado se evita con una fila de auditoría `notify.received` escrita **solo si el envío tuvo éxito**. El envío va **fuera** del `try` que compensa la subida de la firma, para que un fallo del correo no pueda borrar el objeto de una recepción ya confirmada. Sin columnas nuevas; WhatsApp sigue congelado | Enviar dentro de la transacción; o dentro del `try` de compensación, como quedó en el primer pase | Un correo dentro de la transacción la alarga y puede revertir una recepción ya escrita. Dentro del `try` de compensación, un error del correo borraría la firma del almacenamiento | El cliente pasa a avisarse por WhatsApp (fase 3), o se necesita reintento automático y conviene una tabla de envíos |
| 41 | **Reprogramar una reserva sin cancelarla** (decisión del dueño, 2026-10-21, rama `feat/reprogramar-reservas`): **reemplaza el No-Objetivo "Reprogramación directa" de §1 y la restricción "reprogramar" de §16 del blueprint del sitio**, que sigue siendo de solo lectura y no se editó: este registro es la única fuente de la decisión. `rescheduleBooking` (`src/server/booking/reschedule-booking.ts`) cambia **día y hora de la misma fila**: conserva `id`, `code`, `cancel_token_hash`, modalidad, comuna, dirección y datos del cliente, y deja `reminder_sent_at` en `null` para que el recordatorio salga en la fecha nueva. Una sola transacción con el orden de locks de `booking-engine.md`: la reserva `FOR UPDATE`, después `booking_days` de la fecha nueva y la antigua **en orden ascendente** —para que dos reprogramaciones cruzadas no se traben—, después el advisory por teléfono. Revalida todo con `checkStart` **excluyendo la propia reserva** de los bloques ocupados, del tope de 4 y de la regla del teléfono, así moverse dentro del mismo día no choca consigo misma. Solo una reserva `confirmed` y **sin orden de trabajo**, solo con `bookings.manage` (mecánico 403), y auditada como `booking.rescheduled` dentro de la misma transacción: es la **primera acción de reservas que se audita**, y por eso la firma lleva el `SessionUser` —`audit_log.branch_id` es NOT NULL y `bookings` no tiene sucursal—. El correo sale **después del commit** (regla 6 de CLAUDE.md) al cliente y al taller, con el `.ics` del **mismo UID** (sale del código, que no cambia) y un `SEQUENCE` mayor que cero calculado como segundos desde una fecha fija, para que el calendario mueva el evento en vez de duplicarlo. **El correo no trae enlace de cancelación**: el token solo se guarda como hash y no se puede regenerar, así que apunta al enlace del correo de confirmación, igual que ya hacía `reminderEmail`. Pantalla `/taller/reservas/[id]/reprogramar`, sin islas, con enlaces desde `/taller/reservas` y `/admin/reservas/[id]`. La modalidad no se cambia aquí | Cancelar y crear otra, como hasta hoy; regenerar el código al mover la fecha; rotar el token para incluir un enlace nuevo | Cancelar y crear otra bota el código que el cliente ya tiene, su enlace de cancelación y el historial, y ensucia la agenda con canceladas que no lo fueron. Regenerar el código rompe la referencia que el cliente cita por teléfono o WhatsApp. Rotar el token invalidaría el enlace del primer correo, que es justo lo que esta decisión quiere conservar | Hay que poder cambiar también la modalidad, la comuna o los datos del cliente (hoy eso sigue siendo cancelar y crear otra); o dos reprogramaciones dentro del mismo segundo tienen que distinguirse en el calendario, y entonces el `SEQUENCE` necesita un contador en columna |
| 42 | **El retiro a domicilio atiende de lunes a viernes desde las 09:00** (decisión del dueño, 2026-10-22, rama `feat/retiro-desde-las-9`): el horario pasa a depender de la modalidad. `PICKUP_HOURS` en `rules.ts` abre de lunes a viernes de 09:00 a 20:00 y deriva sábado y domingo de `RECEPTION_HOURS`, que **no cambia**: sigue siendo el horario del local y lo usan el correo "Lista para retirar" y la fecha de entrega. `hoursFor(mode, weekday)` es la única fuente, y `gridForDate` recibe la modalidad **con `"taller"` por defecto**, para que `calendarClosure` siga describiendo el calendario del local donde la consultan `src/server/admin/month.ts` y `src/server/taller/delivery-date.ts`. No cambian el tope de 4 reservas por día —que cuenta la mañana y la tarde juntas, en las dos modalidades—, 1 bici por bloque, los 2 bloques del retiro, los 120 minutos de antelación ni el horizonte de 30 días. Un retiro de las 19:00 todavía cabe; uno de las 19:30, no. **La portada no cambia de diseño** (decisión expresa del dueño ese mismo día, que reemplaza lo que pedía el encargo): las dos barras del hero siguen mostrando el horario del local, no se agrega una tercera barra ni una fila de retiro ni una línea de texto nueva, y `tests/build/landing.test.ts` no se tocó. Lo único que se ajustó en el sitio es el ancho mínimo de la regla de bloques, que `global.css` fija en 560px: con los 10 bloques del taller deja celdas de 56px, pero el retiro tiene 22 y quedaban en 24px, ilegibles e intocables con el dedo a 390px. Ahora la regla crece con la cantidad de bloques y `.ruler-box`, que ya tenía `overflow-x: auto`, la desplaza: misma celda, mismo diseño, se corre para ver la mañana | Un solo horario para las dos modalidades; o abrir el taller también a las 09:00 | El taller recibe bicis de 15:00 a 20:00 y eso no cambia: lo que se amplía es ir a buscarlas a domicilio, que ocupa a quien maneja, no al mecánico. Un horario único habría abierto la recepción en la mañana sin que haya nadie | El taller mismo abre en la mañana, y entonces `RECEPTION_HOURS` cambia y la separación por modalidad deja de tener sentido; o el horario de retiro pasa a depender de la comuna |
| 43 | **Una reserva puede traer hasta tres bicicletas** (decisión del dueño, 2026-10-22, rama `feat/reserva-varias-bicis`; primera etapa, solo desde el taller): el caso que lo pidió fue una clienta con tres bicis, que el sistema rechazaba por dos motivos distintos —una reserva próxima por teléfono y una orden por reserva—, los dos correctos para una bici y equivocados para tres. `bookings.bike_count` (1 a 3, CHECK) y la tabla `booking_bikes` para las posiciones 2 y 3; la bici 1 se queda en `bookings.bike`/`description`, así que **toda reserva existente y toda reserva de la web es de una bici y se comporta igual que antes**. El cupo diario pasa a contar **bicis** y no reservas (una de tres deja un cupo), con el tope en 4. Bloques: el retiro ocupa 2 sin importar la cantidad —es un solo viaje— y la entrega en taller ocupa uno por bici, seguidos; `blocksFor(mode, bikeCount)` es la única fuente y el `noroom` de `stateFor` se generalizó a los k bloques siguientes. El recargo del retiro se cobra una vez por reserva. **La garantía de la recepción se movió, no se perdió**: el índice único `uq_work_orders_booking` (una orden por reserva) se reemplazó por `work_orders.booking_position` con único `(booking_id, booking_position)`; la posición se calcula bajo el `FOR UPDATE` de la reserva y el índice es lo que impide recibir dos veces la misma bici si dos recepciones corren juntas. Esa columna además resuelve qué bici precargar en "Recibir (n de N)", sin comparar textos. **Reprogramar exige que ninguna bici esté recibida**: mover el día con una orden abierta dejaría esa bici en una fecha y las otras en otra. **Una orden anulada sigue contando como bici recibida**, igual que antes con el índice único: si una recepción se cancela por error, esa bici se recibe por Recepción sin reserva. El texto del calendario de la Agenda pasa a "N de 4 **cupos**", porque contando bicis la palabra "reservas" quedaba falsa; con autorización del dueño se actualizaron **cuatro** cadenas de `tests/integration/admin-month.test.ts` y nada más. Cuatro migraciones (`0021` aditiva, `0022` quita el índice viejo, `0023` agrega el CHECK de la posición, `0024` quita un índice que el único ya cubre), porque la regla separa expandir de contraer y cada borrado va en su propia generación | Una reserva por bici, como hasta hoy; o guardar las bicis extra en un campo de texto de la reserva | Tres reservas separadas obligan a repetir los datos del cliente, pelean con la regla de una reserva próxima por teléfono y dejan tres filas donde hay una sola visita. Un campo de texto no permite que cada bici tenga su orden, su checklist y su firma | Se necesita cambiar la cantidad de una reserva ya creada (hoy se cancela y se crea otra), o la reserva pública de la web pasa a ofrecer la cantidad (segunda etapa). También si una recepción anulada tiene que liberar su cupo de bici: eso pide mirar `voided_at` al contar órdenes |
| 44 | **Copia al taller de los dos correos de la orden** (decisión del dueño, 2026-10-22, rama `fix/copia-correos-taller`): cuando sale "Recibimos tu bicicleta" (decisión 40) o "Lista para retirar" (decisión 38), `info@vectorbikes.cl` (`SHOP_NOTIFY_EMAIL`) recibe **una copia exacta**: el mismo asunto con el prefijo "Copia · ", el mismo cuerpo HTML y de texto, y una sola línea al comienzo que dice a quién se le envió. `sendShopCopy` en `notifications.ts` es la única implementación y la usan `reception.ts` y `qc.ts`. **Es un envío aparte, no CC ni BCC**: el cliente no ve la dirección del taller y la copia queda con su propio registro en el proveedor. Se arma sobre el `RenderedEmail` que ya recibió el cliente, no regenerando la plantilla, para que no pueda divergir con el tiempo. Sale **solo si el correo al cliente salió bien**; sin correo del cliente no se envía nada, y si falla solo la copia se registra con `log.error` —con el número de orden, sin correo ni teléfono— y no cambia nada más: la recepción o la aprobación quedan hechas y la auditoría `notify.received` / `notify.ready_for_pickup` se escribe igual, porque depende del correo al cliente. La copia no se reintenta, y el duplicado lo evita esa misma auditoría. Se actualizaron **siete** conteos del buzón de pruebas (`consoleOutbox` pasa de 1 a 2 mensajes) en `ready-notification.test.ts` y `received-notification.test.ts`, con autorización expresa del dueño el 2026-10-22 ("autorizo el cambio de las 7 pruebas de 1 a 2 correos"); ninguna aserción de contenido ni de auditoría cambió —las cuatro de `readyAudits` y `receivedAudits` siguen esperando una sola fila—. La nota de la copia se inserta **dentro del `<body>`** del correo del cliente, no antes del doctype: `renderHtml` devuelve un documento completo y anteponerla dejaba la línea fuera del cuerpo y sin estilo | CC o BCC al taller en el mismo envío; o un correo propio del taller con otro formato | Un CC expone la dirección interna al cliente y deja un solo registro para dos destinatarios. Un formato propio obliga a mantener dos textos que deben decir lo mismo: el dueño quiere ver exactamente lo que ve el cliente | El taller necesita un resumen distinto del que recibe el cliente, o los envíos pasan a una tabla con reintentos |
| 45 | **La recepción no pierde el checklist y cierra con una confirmación** (decisión del dueño, 2026-10-23, rama `fix/mejoras-recepcion-y-reservas`): la página de Recepción tenía **cinco formularios** y los radios del checklist pertenecían solo al suyo, así que "Agregar accesorio", "Quitar", "Agregar servicio" o "Confirmar fecha" recargaban la página y descartaban lo marcado **sin aviso**. Dos órdenes reales (OT-00001 el 21-10 y OT-00004 el 23-10) llegaron a Fotos y firma con 1 de 7 puntos. Ahora es **un solo formulario**: cada botón lleva `name="accion"`, el de "Quitar" lleva el accesorio en `name="quitar"` —un hidden por fila habría enviado todos juntos—, y el servidor guarda los puntos marcados **antes** de ejecutar la acción. Se descartó el atributo `form`: un botón atado al formulario del checklist envía ese y solo ese, así que el campo del accesorio nunca llegaría. Los campos propios de cada acción perdieron su `required` de HTML y los valida el servidor, como ya lo hacía; por la misma razón el campo de fecha perdió su `min`, que con un formulario único bloqueaba **todos** los botones cuando la fecha estimada ya había pasado (`confirmDeliveryDate` sigue rechazando fechas pasadas con `invalid_date`). Lo que falta ahora se ve: el aviso dice "N de 7" y nombra los puntos pendientes, cada punto sin guardar muestra "Pendiente" junto a su etiqueta —con `aria-labelledby` para que el nombre accesible del grupo siga siendo exactamente el del punto, como lo buscan los specs— y Fotos y firma nombra los que faltan y enlaza a `…/recepcion#checklist`. **Al finalizar**, la página de destino (misma URL, `?hecho=recibida`, que dos specs verifican) abre con una tarjeta `role="status"`: orden, bicicleta, quién firmó, un botón "Inicio" y un enlace "Ver orden", más "Recibir la siguiente (N de M)" si la reserva trae más bicis; el formulario queda debajo para corregir. **Investigación de los siete puntos en "Malo" de la OT-00003: no se encontró defecto de código.** Se probaron y descartaron tres mecanismos: el toque que cae en otra opción (las siete etiquetas de "OK" tocadas al centro y al borde a 820×1180 quedaron en `ok`, y las cajas no se solapan), el servidor rellenando los puntos sin marcar (el esquema es un registro parcial y `saveChecklist` hace `if (check)`) y la página mandando otro valor (toma el del propio radio). La explicación que queda es humana, y lo que la facilitaba —no poder ver qué quedó guardado— es justamente lo que corrigen el "N de 7" y el "Pendiente". **Además**, la recepción sin reserva dejó de marcar una bici por defecto: con un cliente que ya tiene bicis hay que elegir una o "Bicicleta nueva", y sin elección el error sale junto al campo. Un marcador del formulario distingue "nadie eligió" de "no había nada que elegir". **Quedan pendientes** del mismo encargo, por decisión del dueño de priorizar: el aviso de error repetido en Nueva reserva y Reprogramar, `excludeBookingId` en `freeBlocks`, auditar `booking.created` y `booking.cancelled`, y dividir `taller.css` | Mantener los cinco formularios y avisar con JavaScript antes de salir; o guardar el checklist con una isla | Un aviso pide leerlo y se puede ignorar; el área no admite islas nuevas (`.claude/rules/taller-ui.md`) y el problema no era de interfaz sino de a qué formulario pertenecían los campos | La página supera las 400 líneas y hay que partirla, o la recepción pasa a varios pasos con su propia URL |
| 46 | **Fotos en lote y cámara dentro de la página** (decisión del dueño, 2026-10-23, rama `feat/fotos-en-lote`): cada foto se subía sola y recargaba la página, así que cuatro fotos de una bici eran cuatro esperas y cuatro recargas. Ahora se juntan en una **cola de hasta 20** —con miniaturas, contador y "Quitar" por foto— y **"Subir N fotos"** las manda todas, con progreso "Subiendo 3 de 12" y **una sola recarga al final**. Si alguna falla, queda en la cola con su motivo y el botón pasa a "Reintentar": una subida mala ya no arrastra a las demás. Salir con fotos sin subir avisa con `beforeunload`. Antes de viajar, cada foto se achica a 2560 px y se re-codifica en JPEG 0,85 leyéndola con `imageOrientation: "from-image"` para que no salga girada; si el navegador no puede, sube el original. Medido con una foto típica de iPad (4032×3024): de **8,23 MB a 1,91 MB**, el 23%. El servidor y el endpoint **no cambian**. Las reglas de la cola viven en `src/lib/photo-queue.ts`, puras y probadas aparte; la isla se ocupa de miniaturas, subida y de liberar las URL. **La cámara va dentro de la página** (pedido expreso del dueño: "prefiero sacar varias fotos a traves de la web app"): `src/components/taller/CameraCapture.tsx` abre `getUserMedia` con `facingMode environment` en una capa fija a pantalla completa, y cada toque de **"Sacar foto"** (≥72px) captura el cuadro en un canvas sin cerrar la cámara; **"Listo" detiene todas las pistas**, comprobado en el spec con `readyState === "ended"`, porque si no la cámara del iPad queda encendida. En iOS un input con `capture` vuelve con una sola foto, y por eso no alcanzaba. Si no hay `getUserMedia` o se niega el permiso, se avisa y quedan "Tomar foto" y "Elegir de la galería" como respaldo. **Dos excepciones autorizadas por el dueño ese día**: (a) ajustar `recepcion-completa.spec.ts`, `firma-rotacion.spec.ts` y `galeria.spec.ts` **solo** para agregar el clic en "Subir N fotos" —ninguna otra aserción cambió, y el input de cámara conservó su `multiple` justamente para no tocar nada más—; y (b) agregar a `playwright.config.ts` los flags `--use-fake-device-for-media-stream` y `--use-fake-ui-for-media-stream` del proyecto `tablet`, **excepción explícita** a la regla de `.claude/rules/e2e.md` que dice que ese archivo lo entrega el `workspace/` y ningún paso lo edita, acotada a esos dos flags de prueba | Subir cada foto al elegirla, como hasta hoy; o sacar varias con un input `capture multiple` | Subir de a una obliga a esperar la red y la recarga entre foto y foto, con la bici en la mano. El input con `capture` vuelve con una sola foto en iOS, que es justo lo que había que evitar | El taller necesita más de 20 por vez, o la subida en serie se hace lenta y conviene paralelizar de a 2 o 3 |
| 47 | **Líneas guarda todos los precios con un solo "Guardar cambios"** (decisión del dueño, 2026-10-26, rama `fix/lineas-y-mejoras`): la página de Líneas tenía la misma trampa que la Recepción antes de la decisión 45: un formulario por fila con "Cambiar precio" y cuatro formularios más ("Anular", "Agregar servicio", "Agregar repuesto", "Guardar documento tributario"), así que editar dos precios y pulsar un botón guardaba solo esa fila, y cualquier otro botón descartaba lo escrito **sin aviso**. Ahora es **un solo formulario**: cada botón lleva `name="action"`, "Anular" lleva su línea en `name="anular"`, y los precios de todas las líneas viajan en cada envío (`price_<itemId>`). **"Guardar cambios"**, bajo la tabla, llama a `overrideItemPrices` (`items.ts`): una sola transacción que bloquea la orden y **todas** las líneas antes de escribir nada, actualiza solo las que cambiaron, audita cada una con `item.price_changed` (`before`/`after`, igual que `overrideItemPrice`, que sigue existiendo por compatibilidad) y recalcula el total **una vez** con `recomputeOrderTotals`; una línea de otra orden o anulada devuelve `not_found` y no se guarda nada. El aviso dice "Precios actualizados: N." o "No había cambios de precio."; el conteo viaja en `?hecho=precios&actualizados=N` y se parsea con zod. **Ningún otro botón pierde lo escrito**: con precios editados sin guardar, "Anular", "Agregar servicio", "Agregar repuesto" y "Guardar documento tributario" los guardan **antes** de ejecutar su acción y el aviso agrega "Precios actualizados: N.". Un precio inválido (negativo, decimal, sobre el máximo) responde 422 con el error en su campo (`aria-invalid`, `aria-describedby`, `<p id="price-<id>-error">`), conserva todos los valores escritos y **no ejecuta nada**. **Permisos:** editar precios exige `items.override_price`; a un rol sin él la página no le pinta los campos, y si su envío trae alguno igual el servidor responde **403 sin escribir** (regla 12: quien intenta cambiar un precio sin permiso recibe 403; un envío con campos que la página nunca pintó es manipulado). Con la orden en estado terminal la página se ve como antes, sin campos ni botones de fila. **Validación del navegador:** con un solo formulario el navegador valida todos los campos en cada botón (lección del `min` de la fecha en 2fe038a), así que los campos numéricos son `type="text" inputmode="numeric"` sin `required`, `min`, `max`, `minlength` ni `step`: valida el servidor con `priceOverridesSchema`, `partItemSchema`, `catalogItemSchema` y `taxDocSchema`. Pruebas: `items-precios-en-lote.test.ts` (servidor), `lineas-un-formulario.test.ts` (página) y el spec de tablet `lineas-guardar-cambios.spec.ts` (dos precios editados + "Agregar repuesto" → los dos quedan guardados y el total cambia). Construido con TDD (pruebas primero, en rojo) y un pase de Codex para `items.ts` y `lineas.astro` | Mantener un formulario por fila y avisar con JavaScript antes de salir; el atributo `form` para atar botones al formulario de los precios; o una isla que guarde cada precio al cambiarlo | Un aviso se ignora y el área no admite islas nuevas (`.claude/rules/taller-ui.md`); un botón con `form` envía ese formulario y solo ese, así que el repuesto o el documento nunca llegarían junto con los precios; el problema era a qué formulario pertenecían los campos, no la interfaz | La página supera las 400 líneas y hay que partirla, o los precios pasan a editarse fila por fila con su propia URL |
| 48 | **Los cuatro pendientes de la decisión 45** (decisión del dueño, 2026-10-26, rama `fix/lineas-y-mejoras`, un commit por tema). **(a) Aviso repetido:** con el bloque tomado, Nueva reserva y Reprogramar mostraban el mismo texto en el `role="alert"` de arriba y bajo el select. El detalle ("El bloque ya no está disponible. Elige otro bloque o día.") queda **solo en su campo** y arriba va el aviso general "Revisa los datos de la reserva.", igual en las dos pantallas; Nueva reserva aplica la misma regla al límite por teléfono, que tenía el mismo duplicado. Los códigos no cambian: 409 en Nueva reserva (`slot_unavailable`, regla de `server-api.md`) y 422 en Reprogramar. **(b) Reprogramar dentro de un día lleno:** `freeBlocks` contaba la propia reserva contra sí misma, así que con cuatro cupos no ofrecía nada y un retiro no podía correrse 30 minutos porque su segundo bloque se veía ocupado. `readRange` recibe ahora el mismo `excludeBookingId` que ya tenía `readDay` (deja fuera sus bloques y su cupo), `freeBlocks` lo pasa como sexto parámetro y Reprogramar envía el id **y el `bikeCount`** de la reserva, que es lo que `rescheduleBooking` valida de todos modos. **(c) Auditoría de reservas desde el taller:** `booking.created` en `createManualBooking` y `booking.cancelled` en la cancelación desde la agenda (`applyAdminAction` con un quinto parámetro opcional `actor`, que la página `/admin/reservas/[id]` pasa), con actor y sin datos personales (`code`, `serviceDate`, `start`, `mode`, `bikeCount`, `source`). **Las firmas de `createBooking` y `cancelBooking` no cambian** y la auditoría va igual **en la misma transacción**: la función del taller abre `db.transaction` y les pasa `tx`; Drizzle anida la transacción interna como *savepoint*, así que si la auditoría falla la reserva no se crea (o sigue confirmada) y la violación de unicidad de `createBooking` sigue volviendo como `slot_unavailable`. El correo sale después del commit, como antes. **Sin actor no hay auditoría**: la reserva web, la cancelación por el enlace del cliente y cualquier llamada a `applyAdminAction` sin actor no se auditan, por decisión del dueño. **Excepción autorizada por el dueño el 2026-10-26, con el diff a la vista:** la fixture de `manual-booking.test.ts` cambió de un `ACTOR` con ids ficticios a una sucursal y un usuario reales sembrados en `beforeEach`, porque `audit_log` tiene llaves foráneas a `branches` y `users`; ninguna aserción cambió. **(d) `taller.css` partido** en `taller-layout.css` (base, identidad, menú y columna de escritorio, con la media query de 1024px) y `taller-components.css` (superficies, avisos, formularios, estados y tablas), cortado por rol y en el orden original; ninguna regla cambió, el único reordenamiento es la media query delante de reglas con las que no comparte selector, y las capturas de `/taller`, Líneas y Nueva recepción a 820×1180 y 1280×900 son **idénticas byte a byte** antes y después. `.claude/rules/taller-ui.md` y los comentarios que nombraban el archivo apuntan a los dos nuevos | (a) Dejar el detalle arriba y quitarlo del campo; (b) consultar `readDay` desde la página, que exige una transacción; (c) auditar después del commit con `log.error` si falla, o cambiar las firmas para recibir `tx`; (d) partir por pantalla o por media query | (a) El campo es donde está el error y donde lo busca el lector de pantalla; (b) `readRange` ya era la función consultiva y solo le faltaba el parámetro; (c) auditar después deja reservas sin rastro cuando la auditoría falla, y cambiar firmas estaba prohibido por el encargo; la transacción anidada cumple la regla de `taller-domain.md` sin tocarlas; (d) partir por rol mantiene el orden del archivo y deja cada parte bajo 220 líneas | (c) Si Drizzle deja de anidar transacciones como savepoint, o aparece una operación que exija auditar desde fuera del taller sin actor |

### 20.4 Qué construir después
1. **Fase 2 — dinero y piezas** (inventario, caja con Mercado Pago) — cuando la fase 1 lleve dos semanas sin papel.
2. **Envío automático del enlace de aprobación por WhatsApp** — fase 3.
3. **Kilometraje y desgaste de componentes** — fase 3.
4. **Multi-sucursal** — fase 4 (`branch_id` ya existe).

---

*Fin del blueprint. El orden de construcción es §9. Detenerse cuando §20.1 esté en verde.*

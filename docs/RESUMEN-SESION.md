# Vector Bikes — Revisión del 20 de octubre de 2026

Qué se revisó, qué se encontró y qué quedó pendiente. Lectura previa para retomar.

## 1. Dónde está el sistema

La fase 1 quedó cerrada en `9df8922` (f1-37) y el taller lleva **una semana de uso real**. Eso importa: la fase 2 no empieza hasta que la fase 1 lleve dos semanas sin papel (FASE1 §16).

Reservas reales en el sistema al 20 de octubre:

- Hoy 15:00 · Alejandra Guell · mantención general y revisar neumáticos.
- **OT-00001** creada desde esa reserva, estado `reservada`, entrega estimada el 21.
- Una segunda reserva para el miércoles.

## 2. El camino de una reserva, verificado

Una reserva de la web se inserta con `status: "confirmed"` y `source: "web"` dentro de la transacción de `createBooking`. Si el cliente vio la confirmación, la fila está. Eso se verificó leyendo el código, no suponiendo.

Dónde se ve después, que es donde estaba la confusión:

| Pantalla | Ventana | Función |
|---|---|---|
| `/taller` como **dueño** | **solo hoy** | `adminDashboard` → `activeBookings(db, today, today)` |
| `/taller` como **mecánico** | hoy + 2 días | `mechanicDashboard` → "Próximos ingresos" |
| `/taller/reservas` | **14 días**, con origen y botón Recibir | `listUpcomingBookings` |

**El panel del dueño mira solo hoy, a propósito.** Una reserva para mañana nunca va a aparecer ahí aunque todo funcione. Vive en `/taller/reservas`, que está publicada y respondiendo en producción (redirige al login, no da 404).

## 3. El correo al taller

Cada reserva nueva dispara `shopNewBookingEmail` a `SHOP_NOTIFY_EMAIL`, post-commit, en `notifyBookingCreated`. El 19 de octubre ese aviso no llegó. **Resuelto el 20.**

Si vuelve a pasar, son tres cosas y en este orden:

1. `SHOP_NOTIFY_EMAIL` apunta a otra dirección.
2. `EMAIL_TRANSPORT` está en `console`: es un valor legal, escribe el correo en el log y **no manda nada**.
3. `RESEND_API_KEY` ausente, o el dominio sin verificar en Resend y el envío rebota.

Los dos primeros se ven en los Secrets de Replit; el tercero en resend.com → Emails.

## 4. Pendiente: el resumen diario del día

Hoy hay tres tareas por cron (`/api/tareas/recordatorios`, `/alertas`, `/retencion`) y **la única que le escribe al taller es `sendOverdueDigest`**, que manda solo las órdenes atrasadas y solo si hay alguna. No existe un correo que diga qué entra hoy.

Propuesta, que encaja en lo que ya está: una tarea más con el mismo guard de `TASKS_SECRET`, que arme y envíe a `SHOP_NOTIFY_EMAIL`:

- Reservas de hoy: hora, cliente, bici, qué necesita, taller o retiro.
- Entregas prometidas para hoy, con su número de orden.
- Atrasadas, que hoy van en un correo aparte y tienen más sentido en la misma foto.

Se agenda en el cron externo a la hora de abrir. Es fase 1: usa datos que ya existen y no cobra nada.

## 5. Mercado Pago: es fase 2, y la cerca es propia

El blueprint lo dice en tres lugares:

- No-Objetivos: *"Caja POS, Mercado Pago, devoluciones, descuentos → Fase 2; la fase 1 solo **registra** pagos"*.
- FASE1 §16: la fase 2 es "el dinero y las piezas… caja con Mercado Pago".
- §20.4, con la condición de entrada: *"cuando la fase 1 lleve dos semanas sin papel"*.

**El plugin oficial de Mercado Pago está habilitado** en la cuenta (publicado por su equipo de Developer Experience). No es un conector que lea la cuenta: es un kit para construir la integración, con cuatro habilidades — `mp-integrate` (Checkout, QR, Point), `mp-webhooks` (receptor con validación HMAC), `mp-test-setup` (usuarios y tarjetas de prueba) y `mp-review`.

### Qué le falta al modelo de datos antes de conectarlo

`payments` hoy guarda tipo (`abono`/`final`), medio, monto, quién lo recibió y cuándo, con anulación por `voided_at`. La orden lleva `total_clp` y `paid_clp`, y un CHECK impide entregar con saldo pendiente. Para que Mercado Pago cuadre faltan cuatro cosas:

1. **Identificador externo**: nada amarra una fila de `payments` con el pago real en MP, así que no hay conciliación posible.
2. **Comisión y neto**: MP descuenta y deposita con desfase; lo que llega al banco nunca es `amount_clp`.
3. **`method` no contempla `mercadopago`**: los valores son `transferencia`, `tarjeta`, `efectivo`, `otro`.
4. **`received_by` exige un usuario**: un pago que entra por webhook no tiene humano que lo reciba.

### Los tres niveles, cuando toque

- **Nivel 0**: cobrar con QR o Point y registrar el pago a mano. Es lo de hoy.
- **Nivel 1**: conciliación diaria. Agregar `external_id`, `fee_clp`, `net_clp` y el medio, y una tarea que cruce los pagos aprobados de MP contra lo registrado. No cambia cómo se cobra.
- **Nivel 2**: link de pago por orden, con el número de orden como referencia externa y el webhook insertando el pago. Esto sí es pago en línea.

## 6. Encargado y no hecho: el rediseño de `/taller`

Se pidió barra lateral y un tablero legible, manteniendo el diseño de Vector.

El problema de fondo no es el menú: **de las doce secciones del tablero, nueve dicen "Sin órdenes"**. Hay que bajar por un muro de encabezados vacíos para encontrar la reserva de las 15:00 y la entrega de mañana. Cambiar solo la navegación deja el mismo muro con sidebar.

El encargo cubre dos partes: la barra lateral con los diez destinos actuales (cajón sin JavaScript en tablet vertical, fija en escritorio) y el tablero reorganizado en lo del día arriba, una fila de cifras, las secciones con contenido en grilla y las vacías reducidas a una línea. Sin tocar `adminDashboard` ni `mechanicDashboard`: es presentación.

Restricciones que no se negocian: tokens existentes y ningún hex nuevo, radio 2px, reglas de 1px, sin sombras, táctiles ≥48px, `global.css` intacto, y los specs de `e2e/` actualizados en vez de relajados.

## 7. Qué sigue, en orden

1. El resumen diario de trabajos (sección 4).
2. El rediseño de `/taller` (sección 6).
3. Completar las dos semanas de uso.
4. Recién ahí, fase 2 con Mercado Pago (sección 5).

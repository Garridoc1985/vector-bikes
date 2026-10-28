# Validación del selector de fechas — punto 7

Estado: **pendiente de completar y validar visualmente**. Este requisito no está aprobado ni se ha probado en navegador. Los resultados anteriores de escritorio y móvil no acreditan el cambio automático de día con la página abierta.

## Requisito

El selector operativo debe mostrar exactamente 30 fechas consecutivas desde hoy, calculado en `America/Santiago`: hoy inclusive y los 29 días siguientes. Los días cerrados, feriados o sin cupo conservan las reglas actuales de disponibilidad.

Al cambiar la fecha en Chile debe quitar las fechas vencidas, incorporar las nuevas y actualizar la etiqueta «Hoy» automáticamente, sin otro despliegue ni recarga manual. También debe ponerse al día cuando una pestaña vuelve del segundo plano o de una suspensión.

## Estado observado en el código

- `src/components/islands/booking-state.ts`: `BOOKING_AVAILABILITY_DAYS` vale 30 y `bookingAvailabilityUrl` lo envía a la API.
- `src/components/islands/BookingIsland.tsx`: `todayInSantiago` calcula la fecha chilena; cada llamada a `loadAvailability` obtiene una fecha actualizada. Sin embargo, la etiqueta `today` se memoriza una sola vez y la carga automática solo depende de la modalidad. No hay renovación por cambio de día o reanudación de la pestaña.
- `src/pages/api/disponibilidad.ts`: la ruta no se prerenderiza y recibe un reloj nuevo en cada petición. `src/server/api/handlers.ts` rechaza un inicio pasado y genera el rango solicitado.
- `src/server/booking/slots.ts`: `localToday` y `addDays` usan `America/Santiago` y suman días de calendario. El servidor permite hasta 31 resultados; la interfaz solicita 30 explícitamente.
- `bookingReducer` conserva la fecha y el bloque seleccionados al renovar la disponibilidad; falta comprobar e invalidar una selección que haya vencido.

Conclusión parcial: el rango se renueva por petición y no necesita despliegues, pero una pestaña que permanece abierta no lo renueva sola al pasar de día.

## Escenarios de aceptación pendientes

| Escenario | Resultado esperado |
|---|---|
| Carga inicial | Hay 30 fechas, desde hoy en Chile hasta hoy + 29; no aparecen fechas anteriores y «Hoy» corresponde a la fecha chilena. |
| Medianoche en Chile | Con la página abierta al cruzar medianoche, sale la fecha vencida, entra la nueva fecha final y quedan 30 fechas, sin recarga manual. |
| Pestaña reanudada | Tras permanecer oculta o suspendida durante un cambio de día, recupera el rango vigente al volver a mostrarse o recibir foco. |
| Selección vencida | Si la fecha o el bloque elegidos ya no son válidos, dejan de estar seleccionados y no se puede confirmar una reserva con esa selección. |
| Cambio de horario de Chile | El rango conserva fechas consecutivas, sin duplicados ni saltos por días de 23 o 25 horas, y no depende de la zona del dispositivo. |

Las pruebas actuales verifican la petición de 30 días, los límites de fechas y una reserva posterior al día 14. Falta cubrir el paso de medianoche, la reanudación y la selección vencida, y conservar evidencia visual de escritorio y móvil de estos escenarios.

## Límite del alcance

La validación corresponde al selector de la aplicación operativa en un entorno aislado de pruebas. El build `public-test` permanece informativo con `bookingEnabled=false`: este punto no activa reservas en `vectorbikestest.cl` ni incorpora allí rutas operativas.

No se declara una validación de tablet ni una aprobación de la compuerta global.

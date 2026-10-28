# Validación del selector de fechas — punto 7

## Criterio vigente

El responsable corrigió el rango a **14 días corridos**, incluido hoy y los 13 días siguientes, con fecha de `America/Santiago`. La prueba se realiza en el selector visible de `https://vectorbikestest.cl/#prueba-fechas`.

Sábados, domingos y feriados permanecen dentro de las 14 fechas. Los domingos se muestran cerrados; los feriados indican su nombre y están deshabilitados. Un sábado que no es feriado puede elegirse para la prueba. Esta selección no crea una reserva ni confirma cupos reales.

Las fechas se presentan en una sola banda horizontal deslizable, tanto en escritorio como en móvil, reutilizando las fichas `.days`/`.day` del selector original. Las etiquetas son «Día», «Hoy», «Cerrado» y «Feriado»; los motivos completos de cierre figuran debajo de la banda. No se simulan contadores de cupos.

El rango elimina fechas vencidas y agrega las nuevas automáticamente, sin recarga manual ni despliegue diario. Se comprueba cada 30 segundos y al recuperar foco o visibilidad de la pestaña. Si la fecha seleccionada vence o deja de ser válida, la selección se limpia. Una fecha futura que sigue válida se conserva.

## Implementación

- `booking-dates.ts`: fecha civil chilena, 14 fechas consecutivas y estado de domingos/feriados. Los feriados proceden del archivo existente `src/data/feriados-cl.json`; no se generan fechas festivas por suposición.
- `useSantiagoDate.ts`: reloj compartido entre el selector público y la aplicación operativa; obtiene la fecha al hidratar, evitando fijar la fecha del build estático.
- `PublicDateSelector.tsx`: selección visible y accesible, con motivos de cierre y anuncio de la fecha elegida.
- `BookingIsland.tsx`: vuelve a consultar disponibilidad al cambiar el día y descarta respuestas de peticiones que quedaron antiguas.
- `bookingReducer`: limpia la fecha y el bloque cuando la fecha elegida sale del rango vigente.

El rango visible de 14 días no cambia el límite independiente de la API, cuya prueba de máximo 31 / rechazo de 32 permanece en la suite operativa.

## Validaciones requeridas

| Escenario | Resultado esperado |
|---|---|
| Carga inicial | 14 fechas desde hoy en Chile hasta hoy + 13, incluso si el dispositivo tiene otra zona horaria. |
| Fin de semana y feriados | Sábados incluidos; domingos y feriados visibles, identificados y deshabilitados. |
| Medianoche en Chile | Sale la fecha vencida, entra la nueva final y quedan 14 fechas sin recargar. Una selección vencida se elimina. |
| Pestaña reanudada | Tras una suspensión, el rango se actualiza al recuperar el foco; conserva una selección que sigue válida. |
| Cambio de horario | 14 fechas consecutivas, sin duplicados ni saltos por jornadas de 23 o 25 horas. |

Las pruebas de navegador están en `e2e-dates/date-selector.spec.ts`, con escritorio y móvil. El servidor de esa suite solo sirve el build público local: no usa PostgreSQL, no crea reservas ni envía correos. La comprobación final de publicación y sus capturas se registran en el informe de entrega.

Validación local del 28 de octubre de 2026: los diez casos de navegador terminaron con sus aserciones correctas (cinco por tamaño), 64 pruebas unitarias focalizadas aprobadas y `pnpm check` con código 0. El build público también compiló correctamente. Se usó Chrome instalado, sin descargar un navegador en el equipo. El proceso local de Playwright no terminó después de los casos y se interrumpió durante el cierre; la ejecución de CI debe confirmar la salida completa de la suite.

Tablet continúa fuera del alcance acordado. La entrega histórica de Replit no se reescribe: sus pruebas de 30 días describen una versión anterior al cambio de criterio a 14.

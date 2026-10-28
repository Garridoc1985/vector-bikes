# Revisión de Vector Bikes — resultado

**Estado:** revisión terminada con la suite tablet excluida; la compuerta global no se declara aprobada.

## Rama y estado

- Rama probada: `codex/vectorbikes-replit-review`
- Base probada: `e5a081d723f01b7d92fcf6f23d41ef23d6172b31` más los cambios locales de esta revisión, que se verificaron antes de crear el commit de entrega.
- `main` permanece en `8a7a1fcfb0e67aa248de3b006d264a6db32257a5`.
- Los cambios de esta revisión están sin commit. No hubo merge ni publicación.
- `pnpm-lock.yaml` no cambió; la instalación usó el lockfile congelado.

## Baseline preservado

- Antes de restaurar dependencias, los cinco checks solicitados no pudieron arrancar por la ausencia de `node_modules` (Vitest, Biome y Astro). Se ejecutaron cero casos funcionales y no hubo servidor de preview.
- Con dependencias restauradas, antes de corregir la configuración: 83 archivos Vitest; 995 pruebas pasaron y 2 fallaron en las expectativas originales de instalación y arranque.
- Baseline histórico separado de los resultados funcionales finales.

## Cambios

- `.replit`: `minimumReleaseAge=0` queda solo en la instalación del build de publicación; el workflow de desarrollo instala con lockfile congelado y construye antes de arrancar en el puerto 5000. Se añadieron bibliotecas Nix para Chromium.
- `package.json`: `start` vuelve a `node dist/server/entry.mjs` como proceso standalone.
- `src/components/islands/BookingSchedule.tsx`: atributo de fecha para automatizar la selección por día en navegador.
- `src/styles/global.css`: los campos con `hidden` no se muestran al cambiar entre taller y retiro; se corrigió el selector CSS que los hacía visibles.
- `e2e/fixtures.ts`, `e2e/public-global-setup.ts`, `e2e/public-journeys.spec.ts`, `e2e/public-tokens.spec.ts`, `playwright.public.config.ts`: fixtures sintéticos, guardia de base local, proyectos desktop/móvil, recorridos públicos, límites y capturas con datos de contacto enmascarados.
- `.agents/memory/`: nota operativa sobre el socket PostgreSQL local y la duración de Vitest; no cambia el comportamiento de la app.
- La suite tablet existente no se modificó.

## Checks finales

| Comprobación | Resultado |
|---|---|
| `pnpm check` | Aprobado. Biome: 258 archivos, 0 errores, 5 advertencias y 1 aviso de configuración obsoleta. Astro: 251 archivos, 0 errores, 0 advertencias y 62 hints. `tsc --noEmit` pasó. |
| `pnpm test` | Aprobado: 83 archivos, 997 pruebas pasaron, 0 fallaron. Duración: 583,13 s. |
| `pnpm build` | Aprobado. |
| `pnpm test:build` | Aprobado: 4 archivos, 37 pruebas pasaron. |
| `scripts/smoke.sh` | Aprobado contra PostgreSQL local: `/api/health` informó `{"ok":true,"db":true}`; las rutas públicas, protegidas y de error devolvieron los códigos esperados. |
| `pnpm start` | Aprobado en puerto aislado: `/api/health` devolvió `ok:true`, `db:true`; `/` devolvió 200. |
| Workflow `Start application` | Reiniciado correctamente. Instalación congelada, build completo y servidor escuchando en el puerto 5000. |
| Playwright desktop | Aprobado: 4/4 pruebas. Viewport 1440×1000. |
| Playwright móvil | Aprobado: 4/4 pruebas. Viewport móvil 390×844, DPR 2 y eventos táctiles. |
| Suite tablet / `pnpm gate` | No ejecutados: `pnpm gate` incluye `pnpm test:tablet`, que se dejó sin cambios y fuera de alcance como se pidió. Por eso la compuerta global no queda aprobada. |

Los checks de build, smoke, startup y Playwright usaron explícitamente `127.0.0.1` y la base desechable `vector_bikes_e2e`. No se usó la base de producción.

## Recorridos verificados

| Flujo | Estado | Evidencia |
|---|---|---|
| Landing, sección del taller, dirección y horarios | Aprobado en desktop y móvil | `landing-{desktop,mobile}.png` |
| Contactos `tel:`, `mailto:`, Google Maps e Instagram | Aprobado: se comprobaron los enlaces; no se abrió ningún servicio externo | Logs Playwright |
| WhatsApp condicional | Aprobado para configuración sin número público: el enlace no aparece | Logs Playwright |
| Reserva en taller, validación y confirmación HTTP 201 | Aprobado en ambos viewports | `reserva-dia-15-a-30-{desktop,mobile}.png` |
| Reserva con retiro, $15.000, dos bloques y validación del formulario | Aprobado en ambos viewports | `reserva-confirmada-{desktop,mobile}.png` |
| Selección real de un día disponible posterior al 14 y reserva completa | Aprobado en ambos viewports | `reserva-dia-15-a-30-{desktop,mobile}.png` |
| Límite de disponibilidad | Aprobado: `dias=31` devuelve 31 fechas y `dias=32` devuelve 422 | Logs Playwright |
| Cancelación con token válido e inválido | Aprobado en ambos viewports | `cancelacion-token-valido-{desktop,mobile}.png` |
| Aprobación con token válido e inválido | Aprobado en ambos viewports | `aprobacion-token-valido-{desktop,mobile}.png` |
| Informe con token válido e inválido | Aprobado en ambos viewports | `informe-token-valido-{desktop,mobile}.png` |
| Catálogo interno, listado y detalle | Aprobado: redirección al login, no acceso público | Logs Playwright |
| Tablet | No ejecutado | Fuera del alcance indicado |

La interfaz solicita 30 fechas contando desde hoy; el endpoint permite 31 fechas calendario, que corresponden a hoy más 30 días adelante. La prueba de navegador selecciona y confirma un día de la lista posterior a la posición 14; el límite del endpoint se comprueba por separado. Si “30 días adelante” debe incluir exactamente `hoy + 30` en el selector, hará falta ampliar la lista visual a 31 fechas.

## Conexiones y datos

- Real: navegador Chromium local, servidor local y PostgreSQL local desechable.
- Simulado/desactivado: Turnstile usa el stub E2E; correo usa `EMAIL_TRANSPORT=console`; WhatsApp está deshabilitado. No se enviaron correos ni mensajes reales.
- Los enlaces a teléfono, correo, Maps e Instagram se validaron por `href`, pero no se abrieron.
- Se usaron reservas, órdenes y tokens sintéticos. Los correos se enmascararon en capturas y los logs compartidos eliminan correos, teléfonos y cadenas tipo token.
- En los logs finales no hubo errores de página ni peticiones fallidas. Los 404 de consola corresponden a los casos deliberados de tokens inválidos.

## Fallos intermedios resueltos

- El primer intento Playwright no pudo iniciar Chromium por faltar `libglib-2.0.so.0`; se instalaron dependencias Nix del sistema, sin actualizar dependencias pnpm.
- Una ejecución conjunta de ambos proyectos compartió el rate limiter del servidor y el segundo informe recibió 429. Se ejecutaron desktop y móvil en procesos independientes, con servidor y datos sintéticos nuevos; los dos resultados finales fueron 4/4.
- Se corrigió el CSS de los campos ocultos. Las demás expectativas ajustadas ahora reflejan el texto visible real y la navegación móvil por desplazamiento; no se eliminaron ni debilitaron pruebas.

## Evidencias

Capturas y logs finales: `generated-artifacts/playwright-evidence/`.

- 12 capturas Playwright: landing, confirmación de reserva, reserva posterior al día 14, cancelación, aprobación e informe; cada una en desktop y móvil.
- `playwright-desktop.log` y `playwright-mobile.log` contienen resúmenes saneados de las ejecuciones finales.
- Se eliminaron los trazados temporales de los intentos fallidos para no conservar URLs con tokens de prueba.

## Pendiente

- Ejecutar tablet por separado solo si se autoriza; hasta entonces, `pnpm gate` y la compuerta global siguen sin aprobarse.
- No se publicó ni se desplegó ningún cambio.

# Vector Bikes · Bitácora del proyecto

Registro de todo lo trabajado en el sitio y el sistema del taller, del 15 de septiembre al 23 de octubre de 2026: qué se construyó, qué se decidió, qué se publicó y qué queda pendiente.

Es un repositorio público, así que esta bitácora **no incluye datos de clientes, credenciales ni identificadores de infraestructura**. Los clientes se nombran por su rol ("una clienta", "la orden de prueba").

Documentos relacionados:

- `blueprints/vector-bikes/blueprint.md`: diseño del sitio y del motor de reservas.
- `blueprints/vector-taller-f1/blueprint.md`: diseño de la fase 1 del taller. Las decisiones están en §20.3.
- `blueprints/roadmap/`: hoja de ruta del dashboard financiero.
- `docs/RESUMEN-SESION.md`: revisión del 20 de octubre.
- `README.md`: operación diaria y configuración.

---

## 1. Estado al 23 de octubre de 2026

| | |
|---|---|
| Producción | [vectorbikes.cl](https://vectorbikes.cl), Replit Autoscale |
| `main` | `30b583d`, publicado |
| Pruebas | 946 de integración y unitarias, 37 sobre el build, 17 de tablet (Playwright), smoke ok |
| Decisiones registradas | 1 a 44 (blueprint fase 1, §20.3) |
| Migraciones | `0000` a `0024` |
| Tareas diarias | Escenario de Make.com activo a las 10:00 (hora de Chile): recordatorios, alertas y retención |

**En uso real desde el 13 de octubre:** reservas en línea y manuales, recepción en la tablet con checklist, fotos y firma, órdenes con estados, control de calidad, pagos, entrega, informe final y los correos automáticos al cliente y al taller.

---

## 2. Cómo se trabaja

### Roles
| Quién | Qué hace |
|---|---|
| **Dueño** | Decide y aprueba, prueba en el iPad y publica en Replit. Autoriza cualquier excepción a las reglas, incluido modificar una prueba existente. |
| **Sesión coordinadora** (Claude, escritorio) | Diagnostica, escribe los encargos, revisa cada commit con sus capturas, sube a GitHub cuando el dueño lo pide y verifica producción. |
| **Sesión de implementación** (Claude + Codex, VS Code) | Implementa cada encargo con TDD: las pruebas primero, en rojo. Corre `pnpm gate` hasta que sale en verde y nunca hace push. |

### Ciclo de un cambio
1. El encargo se escribe como un documento y la sesión de implementación lo recibe.
2. El dueño confirma el encargo en esa sesión.
3. Se implementa en una rama propia, con un commit por parte y `pnpm gate` en verde en cada uno.
4. La coordinadora revisa el diff, las pruebas nuevas y las capturas (tablet 820×1180 y escritorio 1280×800, en claro y oscuro).
5. Cuando el dueño dice "súbelo", la coordinadora sube con avance rápido (fast-forward) a `main`.
6. El dueño publica en Replit y la coordinadora verifica producción.

### Publicar en Replit
En el Shell:

```bash
git fetch origin
git reset --hard origin/main
git log --oneline -1          # comprobar el hash esperado
rm -rf node_modules
```

Después, **Deployments → Republish**.

- Se usa `git reset --hard` y no `git pull`, porque Replit agrega commits vacíos ("Published your App") que hacen fallar el pull.
- Después de cambiar un secreto de la publicación hay que hacer Republish; no hace falta `git`.

### Publicar con cambios de esquema
Hay que hacerlo con el taller cerrado y con un respaldo de la base del día. Antes de Republish:

```bash
corepack pnpm@12.4.2 install --frozen-lockfile
corepack pnpm@12.4.2 db:migrate      # base del workspace; se niega a correr dentro de una deployment
corepack pnpm@12.4.2 db:check
rm -rf node_modules
```

- Replit propaga el esquema a producción al publicar. La app nunca migra al arrancar.
- Si quitar un índice aparece como cambio "destructivo", se acepta solo si el encargo lo anticipó.

### Reglas que se mantuvieron en todos los encargos
- Ninguna prueba existente se modifica sin autorización expresa del dueño. Si una falla, la implementación se detiene y reporta.
- Correos siempre **después del commit**. Si el envío falla, se registra en el log y la operación igual queda hecha. Los duplicados se evitan con la auditoría.
- Las reservas y las órdenes nunca se borran: cambian de estado.
- Ningún archivo pasa de 400 líneas. Las páginas del taller no llevan islas nuevas.
- Migraciones solo con `pnpm db:generate`, sin editarlas a mano. Lo aditivo y lo destructivo van en migraciones separadas.

---

## 3. Cronología

### 15 al 17 de septiembre · Sitio y reservas en línea
- **Epic 1** (`3bea4b2` → `d8a24c1`):
  - Base del proyecto: Astro SSR, Postgres con Drizzle y servidor de salud.
  - Motor de agenda puro con zona horaria `America/Santiago`.
  - Escritura transaccional de reservas, con locks por día y por teléfono.
  - API pública de disponibilidad y reservas.
  - Landing fiel al diseño aprobado e isla de reserva en Preact.
- **Epic 2** (`564f6fd` → `6eaee7c`):
  - Correos con Resend.
  - Cancelación con enlace de un solo uso.
  - Acceso y panel de administración.
  - Recordatorios.
  - SEO, privacidad, la página 404 y la compuerta final.
- **Lanzamiento y ajustes:**
  - Logo nuevo, pnpm fijado en el build y prefijo `+56 9` en el teléfono.
  - IP real detrás del proxy (rightmost non-trusted).
  - Turnstile robusto y mensajes de error visibles.
  - `www` aceptado en el chequeo de Origin, y la cancelación protegida por su token.

### 25 de septiembre al 2 de octubre · Ajustes
- `e884d1b`: vista de mes en el panel de administración.
- `b3b50ed`: guía de operación y estado de producción.
- `91b98f8`: logo nuevo en el encabezado, la portada y el favicon.

### 5 al 13 de octubre · Fase 1: sistema del taller
Blueprint `vector-taller-f1`, 37 pasos (`f1-01` → `f1-37`):

- **Base:**
  - Usuarios con roles (dueño, administración, recepción y mecánico), sesiones y auditoría.
  - Almacenamiento de imágenes local y en Replit.
- **Datos:**
  - Catálogo de servicios con precio por tipo de bici.
  - Clientes con validación de RUT, y sus bicicletas.
  - Búsqueda unificada y reservas manuales.
- **Órdenes:**
  - Esquema, estados y numeración `OT-`.
  - Recepción en la tablet desde una reserva o sin reserva, con checklist de 7 puntos, accesorios, líneas, fotos y firma.
  - Detalle de la orden, etiqueta con QR, líneas con precio editable, galería por etapa y órdenes de garantía.
- **Cliente:**
  - Propuesta de trabajo adicional con enlace de un solo uso.
  - Página pública de aprobación.
  - Informe final con página pública de solo lectura.
- **Cierre:**
  - Control de calidad aprobado por el dueño, pagos (abono y saldo) y entrega con saldo cero y firma.
  - Componentes instalados y reemplazados, historial de la bici y del cliente.
  - Paneles por rol.
  - Alertas de atraso, retención de fotos y contracción de las tablas antiguas.

### 13 al 19 de octubre · Primera semana de uso real
El taller empieza a recibir bicicletas con el sistema. El 15 de octubre se revisan el resumen de la fase 1 y el repositorio, y se arma la lista de pasos siguientes:
- Tareas diarias externas.
- Borrar las credenciales iniciales del administrador.
- Probar fotos en producción y la tablet real.
- Cargar los feriados 2027 antes del 2 de diciembre.

Se diseña el escenario de Make.com: tres llamadas `POST` con `Authorization: Bearer <secreto>` a `/api/tareas/recordatorios`, `/alertas` y `/retencion`.

### 19 de octubre · Los avisos al taller no llegaban
- **Causa:** el proveedor de correo tenía la casilla del taller en su lista de supresión por rebotes antiguos, así que descartaba los avisos sin intentar enviarlos. La app y el DNS (DKIM, SPF y MX) estaban bien.
- **Arreglo:** el dueño quitó la casilla de la lista y se reenviaron los dos avisos perdidos.
- **Hallazgo pendiente:** el dominio tiene **dos registros DMARC**. Con dos registros, los servidores ignoran ambos.
- Ese día también se completó la ficha de información del negocio para posicionamiento (GEO), fuera del repositorio.

### 20 de octubre · Rediseño del taller, SEO y primer aviso automático
- **Rediseño del área `/taller`:**
  - `1312e41` y `268f5cf`: menú lateral con los grupos Operación y Gestión, y botón "Menú" en la tablet. Los estilos del área pasan a `src/styles/taller.css`.
  - `0b3c392`: inicio tipo panel.
  - `3dd2e58` → `874f131`: las 22 páginas internas, con `PageHeader`, `Card` y `OrderTabs`.
  - `61a8d46`: estado de la orden con una lista desplegable.
  - `18d6581`: la cancelación de la orden separada del cambio de estado.
- `7a372be`: hoja de ruta del dashboard financiero para fases posteriores.
- `95d96a6`: el retiro se muestra como una sola celda de una hora (decisión 36).
- `c6ae204`: las rutas privadas quedan fuera del sitemap y del robots.txt.
- **SEO técnico** (`3067ddb`, `d8bdea2`, `d3b0c5b`, `6752b28`): "taller" en el título, datos `LocalBusiness` más completos y el H1 con la comuna (decisión 37).
- `ffbfdbe`: correo **"Tu bicicleta está lista para retirar"** al aprobar el control (decisión 38).

### 21 de octubre · Producción en uso y mejoras del flujo
- **Tareas diarias:**
  - Devolvían 401. Se regeneró el secreto y se puso el mismo valor en Replit y en las tres cabeceras de Make; quedaron respondiendo 200.
  - El escenario quedó activo todos los días a las 10:00.
- **Fotos:**
  - En producción no se podía subir ninguna, porque la publicación no conocía el bucket de almacenamiento.
  - Se resolvió con el secreto `STORAGE_BUCKET_ID` y Republish. La foto y su miniatura quedaron verificadas.
- **Recepción real de la primera orden:** el checklist marcado no se guardó porque no se pulsó "Guardar checklist". No era un defecto del código sino del orden de la pantalla, y se resolvió con el rediseño de la recepción.
- **Cambios:**

  | Commit | Cambio | Decisión |
  |---|---|---|
  | `9b220a5` | Los 5 precios por tipo de bici se guardan con un solo botón; acepta "33.283" o "$33.283" | 39 |
  | `947fe6d`, `1705ef8` | Recepción de arriba hacia abajo: checklist → servicios → fecha → fotos → firma, con barra de pasos | — |
  | `58fbbe0`, `00c363f` | Correo **"Recibimos tu bicicleta"** al finalizar la recepción | 40 |
  | `215023a`, `9e4a03a` | La firma no se borra al girar el iPad ni al hacer scroll | — |
  | `472b1f5`, `6e3dbc9` | Feriados 2027 (17 días) | — |
- **Reprogramar reservas** (`aaad696`, `77e463b`, `7cc3a88`, `354dcc4`, `8290375`, decisión 41):
  - **Origen:** una clienta movió su reserva al día siguiente y el sistema no permitía cambiarle el día.
  - **Ahora:** se cambian el día y la hora de **la misma reserva**, con el mismo código y el mismo enlace de cancelación, revalidando todas las reglas.
  - Se libera el bloque anterior, el recordatorio se reinicia y queda auditado.
  - Le llega al cliente el correo "Cambiamos tu reserva", con el calendario actualizado (mismo UID y SEQUENCE mayor).
  - "Agenda" pasa al grupo Operación del menú.

### 22 de octubre · Agenda, horario de retiro, varias bicicletas y copia al taller
- `45cdaa0`: la portada vuelve a "**Mecánica de precisión.**" con la bajada "Reserva tu hora, déjala en nuestro local o te la vamos a buscar." Revierte en parte la decisión 37; la comuna sigue en el título, el rótulo y los datos estructurados.
- `1a82e58`, `ba91269`: la **Agenda**, los **Bloqueos** y el detalle de la reserva usan el mismo marco y menú lateral que el taller. "Bloqueos" entra al grupo Gestión.
- **Retiro a domicilio desde las 09:00** (`03ee018`, `534dfab`, `9796f7e`, decisión 42):
  - El retiro atiende de lunes a viernes de 09:00 a 20:00. La entrega en el taller sigue de 15:00 a 20:00, y el sábado de 10:00 a 14:00 para ambas.
  - La regla de bloques de la reserva crece con la cantidad de bloques para seguir siendo legible en el teléfono.
  - La portada mantiene su diseño y suma una frase.
- **Reservas con hasta tres bicicletas** (`dd220b8` → `127112b`, decisión 43). Primera etapa, solo en el taller:
  - **Base de datos:** `bookings.bike_count` y la tabla `booking_bikes`, en las migraciones `0021` a `0024`. La regla "una orden por reserva" pasa a ser "una orden por bici de la reserva".
  - **Cupo:** cada bici ocupa un cupo de los 4 del día.
  - **Bloques:** el retiro ocupa 2 bloques, sea una bici o varias; en el taller, un bloque por bici, seguidos.
  - **Cobro:** el recargo del retiro es uno solo.
  - **Pantallas:**
    - Nueva reserva con "Cantidad de bicicletas".
    - Lista con "Recibir (1 de 3)", que precarga la bici siguiente.
    - Agenda con "N de 4 cupos" y el detalle con cada bici.
  - **Correos:** listan todas las bicis; con una, quedan idénticos a antes.
  - Primera publicación con cambio de esquema desde el lanzamiento.
- **Copia de los correos de la orden a la casilla del taller** (`5b72bd7`, `30b583d`, decisión 44):
  - "Recibimos tu bicicleta" y "Lista para retirar" llegan también al taller como "Copia · …", con la misma información.
  - Es un envío aparte, solo si el correo al cliente salió bien.

### 23 de octubre · Etiqueta y QR
- La etiqueta mide 62 mm de ancho con largo variable. Se imprime desde el navegador.
- Se recomienda una impresora térmica de etiquetas con AirPrint y rollo continuo de 62 mm, por ejemplo la Brother QL-820NWB o la QL-810W. El rollo de film resistente al agua (DK-22212) es mejor que el de papel para usar en el taller.
- El QR abre la **orden interna** y requiere sesión, a propósito: la etiqueta cuelga en la bici y no debe exponer datos del cliente. En un teléfono, se inicia sesión una vez y la sesión dura 7 días.

---

## 4. Decisiones de esta etapa (blueprint fase 1, §20.3)

| # | Decisión |
|---|---|
| 36 | El retiro se muestra como una sola celda de una hora en la regla de horarios |
| 37 | H1 y título con la comuna. El H1 se revirtió en parte el 22-oct; el título se mantiene |
| 38 | Correo al cliente al pasar a "Lista para retirar" |
| 39 | Quitar un precio del catálogo borra su fila; cada línea de orden guarda su propio precio |
| 40 | Correo "Recibimos tu bicicleta" al finalizar la recepción |
| 41 | Reprogramar una reserva sin cancelarla. Reemplaza el No-Objetivo "Reprogramación directa" del blueprint del sitio, que es de solo lectura |
| 42 | Retiro a domicilio de lunes a viernes desde las 09:00 (horario por modalidad) |
| 43 | Una reserva puede traer hasta tres bicicletas |
| 44 | Copia al taller de los dos correos de la orden. Incluye la autorización del dueño para ajustar 7 aserciones del buzón de pruebas |

---

## 5. Configuración de producción hecha en esta etapa

Solo los nombres; los valores viven en los secretos de Replit:

| Componente | Qué se hizo |
|---|---|
| Correo | Se quitó la casilla del taller de la lista de supresión del proveedor |
| Secretos de la publicación | `STORAGE_BUCKET_ID` agregado; `TASKS_SECRET` regenerado |
| Make.com | Escenario de tareas diarias activo a las 10:00 |
| Base de datos | Migraciones `0021` a `0024` aplicadas y propagadas a producción el 22-oct |

---

## 6. Guías rápidas de operación

- **Cancelar una reserva:** Agenda → Detalle → "Cancelar reserva". Se cancela de inmediato, sin confirmación.
- **Reprogramar:** Taller → Reservas → "Reprogramar", o desde el detalle en la Agenda. Solo funciona con reservas confirmadas sin ninguna bici recibida.
- **Varias bicis en una reserva:** Nueva reserva → "Cantidad de bicicletas". Al llegar, "Recibir (1 de 3)", "(2 de 3)" y "(3 de 3)": cada bici es su propia orden, con su checklist, fotos y firma. Una reserva antigua de una bici no cambia de cantidad, así que las bicis adicionales se reciben por "Recepción" como cliente sin reserva.
- **Entrega:** orden → pestaña "Entrega" → "Registrar pago" → nombre de quien retira, firma y "Entregar bicicleta". Después, pestaña "Informe" → enviar el enlace al cliente.
- **Correos automáticos:**
  - Al cliente: confirmación de la reserva, recordatorio la víspera, cambio de reserva, "Recibimos tu bicicleta" y "Lista para retirar".
  - Al taller: el aviso de cada reserva nueva, cancelada o reprogramada, y la copia de los dos correos de la orden.

---

## 7. Pendientes

**En el taller**
1. Prueba completa en el iPad de todo lo nuevo: reprogramar, varias bicis, la Agenda con menú y la firma girando el iPad.
2. Cancelar las órdenes de prueba.
3. Catálogo: definir si los precios incluyen IVA, confirmar el precio de la mantención básica, cargar los servicios de suspensión, decidir si se atienden e-bikes y agregar los servicios que faltan.
4. Comprar la impresora de etiquetas, imprimir una de prueba y escanear su QR.

**Seguridad y correo**

5. Borrar los secretos de la cuenta inicial del administrador.
6. Rotar la credencial de la base de producción.
7. Dejar un solo registro DMARC en el DNS.

**Presencia en Google**

8. Google Business Profile, con el horario del local y el retiro desde las 09:00.
9. Search Console y el dominio con `www`.

**Decisiones**

10. ¿Una orden puede volver de "En reparación" a "Diagnóstico"?
11. Confirmar que los mecánicos pueden hacer recepciones (decisión A).

**Desarrollo**

12. Encargo chico de mejoras:
    - El aviso de error repetido en Nueva reserva y en Reprogramar.
    - Mover una reserva dentro de un día lleno.
    - Auditar la creación y la cancelación de reservas.
    - Dividir `taller.css`, que está en 398 de 400 líneas.
13. Varias bicis también en la reserva pública (segunda etapa de la decisión 43).
14. Opcional: un enlace para que el cliente vea el estado de su bici.
15. Después de dos semanas operando sin papel: la fase 2 (inventario y caja) y el dashboard financiero.

---

## 8. Lecciones de proceso

- **Encargos chicos para Codex.** Un encargo grande lo dejó dos horas sin escribir nada; uno acotado a un archivo, con la instrucción "escribe primero y verifica una vez al final", lo resolvió en minutos.
- **Las pruebas existentes no se tocan sin autorización.** Aunque el cambio sea obvio, como pasar de 1 a 2 correos en el buzón, se detiene y se pregunta con el diff a la vista. Que el dueño confirme el encargo no equivale a autorizar cambios en las pruebas.
- **Las fórmulas de los encargos también se revisan.** La primera versión del SEQUENCE del calendario podía dar 0, y el calendario del cliente habría ignorado el cambio. Codex lo detectó.
- **PGlite usa una sola conexión.** Las pruebas de concurrencia con `FOR UPDATE` se traban ahí; la garantía se prueba con índices únicos de forma determinista.
- **Pruebas de páginas con fecha fija:** las páginas `.astro` toman la hora con `new Date()`, así que necesitan `vi.useFakeTimers({ toFake: ["Date"] })`.
- **Revisar los joins cuando cambia una cardinalidad.** El `leftJoin` de la lista de reservas habría repetido una reserva de tres bicis tres veces.

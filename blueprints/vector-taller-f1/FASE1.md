# FASE 1 — El taller funcionando

**Sistema de Gestión Integral Vector Bikes**
Documento de definición de fase · 5 de octubre de 2026

Este documento es la entrada para generar el blueprint de la fase 1. No es el blueprint: el blueprint se genera desde aquí con `/the-architect:architect-brownfield` (ver §15) y vive dentro del repositorio.

Ubicación: `blueprints/vector-taller-f1/FASE1.md`, en el repositorio. La copia de OneDrive es respaldo; la que manda es la del repo.

Fuentes, las dos en `fuentes/`:

- `Especificacion sistema de gestion - 49 secciones.md` — los requisitos originales, textuales.
- `Analisis sistema de gestion - 3 oct 2026.md` — el análisis técnico de esos requisitos.

Este documento ya incorpora todo lo que importa de las dos. Donde las contradiga, manda este: las decisiones de §2 son posteriores y cerradas. No hay ninguna otra fuente que buscar.

---

## Cómo se trabaja esta fase

Rige la sección "Reparto con Codex" de `CLAUDE.md` y las reglas de `AGENTS.md`. No se repiten aquí para que exista una sola versión: si el reparto cambia, se cambia allá.

Dos cosas propias de esta fase, además de ese reparto:

- La construcción es **local**, en VS Code en el Mac, con Claude y Codex. Replit solo recibe `git pull` y publica (decisión 2).
- Cada paso del blueprint se ejecuta con `/the-architect:architect-next`, y un paso de `tasks.json` equivale a un pase a Codex.

---

## 1. Objetivo y criterio de término

Reemplazar el papel y el WhatsApp desordenado en la operación diaria del taller. Al terminar la fase 1, una bicicleta debe poder recorrer todo el camino dentro del sistema, sin anotar nada afuera:

**reserva → recepción con fotos y firma → orden de trabajo → presupuesto → aprobación de adicionales → reparación → control de calidad → pago → entrega → informe final → historial**

**La fase 1 está lista cuando el taller lleva dos semanas operando con ella y sin papel.** No cuando el código pasa la compuerta. Ese es el criterio y por eso la fase 2 no empieza antes.

Escala real de partida: una sucursal, dos personas (el dueño y un mecánico), del orden de 10 a 20 bicicletas por semana.

---

## 2. Decisiones cerradas

Estas ya están tomadas. No se re-discuten al construir.

### 2.1 Arquitectura y entorno

| # | Decisión |
|---|---|
| 1 | **Se extiende el proyecto actual**, no se crea uno nuevo. Misma base de datos, mismo dominio, mismo despliegue. El sistema interno es un área nueva dentro de `~/Documents/vector-bikes`. |
| 2 | **Se construye local**, en VS Code en el Mac, con Claude y Codex. Replit deja de ser donde se programa y queda solo como producción: recibe `git pull` y publica. |
| 3 | **Un blueprint por fase.** El de la fase 1 se escribe en `blueprints/vector-taller-f1/` y no toca `blueprints/vector-bikes/`, que es el registro del sitio ya construido. |
| 4 | **`branch_id` en todas las tablas nuevas desde el primer día**, aunque multi-sucursal sea fase 4. Agregarlo después obliga a reescribir todas las consultas y todas las reglas de acceso. Hoy es gratis. Se crea una sucursal única ("Vitacura") y todo cuelga de ella. |
| 5 | **Los mecánicos trabajan con tablet.** La recepción, el checklist, las fotos y el control de calidad se diseñan primero para tablet y después para escritorio. Objetivos táctiles ≥ 44px, nada que dependa de pasar el mouse por encima, nada que requiera teclear párrafos largos. |
| 6 | **La tabla de usuarios se amplía**, no se reemplaza. Hoy `admin_users` tiene un solo administrador con sesión propia ya construida y probada. En la primera migración de la fase se **renombra a `users`** y se le agregan nombre, rol, estado, `branch_id` y quién la creó; el mecanismo de sesión se mantiene tal cual y solo cambia la referencia a la tabla. Renombrar hoy es gratis (una fila, sin datos reales); mantener dos tablas de usuarios o un nombre que ya no describe lo que guarda, no. |
| 6b | **Los recordatorios del sitio pasan a un endpoint protegido disparado por cron externo (Make.com).** Replit no permitió una segunda publicación, así que la Scheduled Deployment prevista en el blueprint del sitio no opera y los recordatorios están caídos en producción. Es la **tarea 0** del blueprint de esta fase (ver §3.0): se construye antes que cualquier tabla nueva porque arregla algo roto hoy y la fase 1 lo reutiliza para las alertas de atraso. |

### 2.2 Fotografías

| # | Decisión |
|---|---|
| 7 | **Capa de almacenamiento con dos modos:** archivos en disco local durante el desarrollo en el Mac, App Storage de Replit en producción. Se elige por variable de entorno. Es medio día de trabajo extra y permite probar la carga de fotos local, que es el corazón de la recepción. Sin esta capa, la recepción no se puede desarrollar fuera de Replit. |
| 8 | **Retención en dos niveles.** Las fotos de **recepción** se conservan 6 meses a tamaño completo y después queda solo la miniatura, que pesa casi nada. Las del **informe final** (el antes y después) se conservan de forma permanente. Así se cubre la garantía, se cumple la Ley 21.719 y no se pierde la memoria del taller. |
| 9 | Toda imagen se comprime y se redimensiona al subirla: lado mayor máximo 2000 px para la copia completa, 400 px para la miniatura. La base de datos guarda la referencia, nunca el archivo. |

### 2.3 Operación

| # | Decisión |
|---|---|
| 10 | **El sistema no emite documentos tributarios.** Emite órdenes de trabajo e informes. La boleta sale del SII y del POS. La orden guarda un campo para anotar tipo, folio y fecha del documento, y poder cruzar después. |
| 11 | **Aprobación de trabajos adicionales por enlace con clave única**, igual que la cancelación de reservas que ya funciona. El sistema genera el enlace, el taller lo envía a mano por WhatsApp desde su teléfono, el cliente abre una página simple con el problema, la recomendación y el precio, y aprueba o rechaza. Quedan registrados fecha, hora y decisión. En la fase 3 se automatiza el envío y la página sigue igual. |
| 12 | **Componentes sin kilómetros.** Se registra qué se instaló, cuándo, a qué precio y en qué orden. El kilometraje, el desgaste y la clasificación de estado son fase 3. |
| 13 | **La fecha de entrega se sugiere y la persona confirma.** El sistema propone una fecha con la duración estimada del catálogo y la carga del taller; quien recibe la puede cambiar. Automatizarla requiere datos reales que todavía no existen. |
| 14 | **Control de calidad: el dueño revisa el trabajo del mecánico.** Cuando el trabajo lo hizo el dueño, se permite el autocontrol y la orden queda marcada como autocontrolada, para que se note. El diseño queda preparado para exigir una segunda persona cuando el equipo crezca. |
| 15 | **Etiquetas para rollo de 62 mm de ancho**, el estándar más común (Brother QL y equivalentes), con el tamaño configurable. Todavía no hay modelo de impresora definido; se deja lista la estructura y la plantilla. |
| 16 | **El dueño crea y administra los usuarios** desde una pantalla del sistema: crea cuentas, asigna rol y resetea claves. Hoy eso se hace con un comando en la terminal. |
| 17 | **La ficha de cliente se crea solo cuando alguien deja una bicicleta.** Nada de ficha obligatoria para vender un accesorio. La venta de mostrador es fase 2. |
| 18 | **Sin fecha de nacimiento.** Se guardan nombre, RUT, teléfono, correo y fotografías de la bicicleta. El RUT sí se guarda. |

### 2.4 Lo que queda afuera y por qué

| Tema | Destino | Razón |
|---|---|---|
| Inventario, consumo de repuestos, alertas de stock | Fase 2 | La fase 1 registra el repuesto como línea de la orden, con su precio. Descontar stock exige el inventario completo. |
| Proveedores y órdenes de compra | Fase 2 | Depende del inventario. |
| Caja tipo POS, Mercado Pago, devoluciones, descuentos con responsable | Fase 2 | La fase 1 solo **registra** el pago que se recibió por fuera. |
| Códigos de barra y lectura de productos | Fase 2 | Depende del inventario. La etiqueta con QR de la orden sí es fase 1. |
| Bicicletas usadas | Fase 2 | Es inventario de otro tipo. |
| Strava, kilometraje, desgaste, mantenimiento predictivo | Fase 3 | Decisión del usuario: no se trabaja por ahora. |
| Asistente de WhatsApp, reseñas automáticas de Google | Fase 3 | Requiere verificación de Meta, número dedicado y plantillas aprobadas. |
| Fichas específicas de suspensiones | Fase 3 | Se cubre con el registro de componentes genérico. |
| Recuperación de clientes y campañas | Descartado por ahora | Decisión del usuario. Además exige consentimiento de marketing, distinto del de la reserva. |
| Multi-sucursal, convenios, tienda online | Fase 4 | Solo queda la columna `branch_id` preparada. |
| Portal de clientes, puntos, membresías, clasificación VIP, cronometraje de mecánicos, comparativas financieras | Fuera del sistema | Punto 48 de la especificación. |

**Esta tabla es la cerca del alcance.** Si algo no está en §3 y sí está acá, no se construye en la fase 1, aunque sea fácil.

---

## 3. Alcance de la fase 1

### 3.0 Tarea 0 — Recordatorios por cron externo

Va primero, antes de tocar el esquema. Arregla algo roto en producción y deja lista la pieza que la fase 1 usa para las alertas de atraso.

- Endpoint `POST /api/tareas/recordatorios` que ejecuta la misma lógica que hoy corre `pnpm reminders:send`. Idempotente: llamarlo dos veces el mismo día no manda dos correos (la garantía ya existe en el script; se reutiliza, no se reescribe).
- Protegido por un secreto en cabecera (`TASKS_SECRET`, nuevo en `src/lib/env.ts` y en `.env.example`), comparado en tiempo constante. Sin secreto o con secreto incorrecto responde 401 y registra el intento sin datos personales.
- Responde `{"ok":true,"sent":n}` para que el escenario de Make.com pueda verificar la ejecución y avisar si falla.
- El escenario en Make.com (cron diario 10:00 America/Santiago → HTTP POST con la cabecera) lo configura el dueño; es el pendiente operativo 2 de §12.
- La misma estructura queda disponible para la fase 1: las alertas de atraso de órdenes se cuelgan de un segundo endpoint con el mismo secreto, en su propio paso.

**Única excepción a la decisión 3:** este cambio afecta al sitio ya construido, así que se agrega una fila al registro de decisiones §20.3 de `blueprints/vector-bikes/blueprint.md` y se ajusta el punto "Lanzamiento — Scheduled Deployment" de la compuerta §20.1 para que apunte al cron externo. Nada más de ese blueprint se toca.

### 3.1 Clientes y bicicletas

- Ficha de cliente: nombre, RUT, teléfono, correo, canal por el que conoció Vector Bikes, notas.
- Un cliente, varias bicicletas. Sin categorías de cliente.
- Ficha de bicicleta: marca, modelo, año, tipo (MTB / ruta / gravel / urbana / e-bike), talla, color, número de serie (opcional, puede estar borrado), kilometraje anotado a mano, fotografías.
- Detección de duplicados al crear: avisa si el teléfono o el RUT ya existen y ofrece usar la ficha existente.
- Búsqueda por nombre, teléfono, RUT o número de orden, en un solo campo.

### 3.2 Recepción

- Desde una reserva del sitio o cargada a mano (presencial, teléfono, WhatsApp).
- Identificar o crear cliente y bicicleta.
- Confirmar el servicio solicitado.
- Checklist de inspección inicial estandarizado: frenos, cadena, transmisión, ruedas, neumáticos, estado general, problemas visibles, observaciones.
- Registrar problemas adicionales detectados y accesorios que vinieron con la bicicleta.
- Fotografías de ingreso.
- Fecha de entrega: el sistema sugiere, la persona confirma.
- Firma digital del cliente en la tablet.
- Genera la orden de trabajo con número único.

### 3.3 Orden de trabajo

- Número único, cliente, bicicleta, sucursal.
- Estados y su historial completo, con quién hizo cada cambio y cuándo.
- Diagnóstico, servicio solicitado, servicios adicionales, observaciones.
- Mecánico responsable; otros participantes en las notas.
- Líneas de servicio y de repuesto con precio; para el cliente se muestra **un total**, sin separar mano de obra y repuestos. Internamente la composición queda registrada.
- Fotografías en tres etapas: recepción, durante la reparación, trabajo terminado.
- Campos de documento tributario: tipo, folio, fecha.
- Etiqueta física imprimible con número de orden, cliente, fecha estimada y código QR. El QR abre la orden para personal autenticado.

**Estados:** `reservada → recibida → diagnóstico → esperando_aprobacion → esperando_repuesto → en_reparacion → control_calidad → lista_para_retirar → entregada`, más `cancelada` y `trabajo_rechazado`.

`esperando_repuesto` existe en la fase 1 como estado que se pone a mano. El aviso automático por falta de stock llega con el inventario, en la fase 2.

### 3.4 Catálogo de servicios y presupuesto

- Catálogo maestro: nombre, descripción, duración estimada, materiales habituales, recomendaciones posteriores.
- Precio por tipo de bicicleta (MTB / ruta / gravel / urbana / e-bike).
- El mecánico **no** puede cambiar precios. Solo dueño y administrador, y el cambio queda auditado.

### 3.5 Trabajos adicionales

- El trabajo se detiene antes de ejecutar un adicional. Sin monto mínimo autorizado automáticamente: todo adicional necesita consentimiento.
- La propuesta lleva descripción del problema, recomendación y precio.
- Enlace con clave única de un solo uso. Queda registrado qué se propuso, cuándo, qué decidió el cliente y a qué hora.
- Un rechazo queda en el historial de la bicicleta, no se borra.

### 3.6 Control de calidad y entrega

- Checklist de control final obligatorio antes de pasar a `lista_para_retirar`.
- Lo aprueba el dueño cuando el trabajo lo hizo el mecánico. Si lo hizo el dueño, se permite autocontrol y la orden queda marcada.
- Registro de pago: abono inicial (uno solo) y pago final, con método y monto.
- **No se puede completar la entrega con saldo distinto de cero.** La regla vive en la base, no solo en la pantalla.
- Informe final: datos de la bicicleta, trabajo realizado, problemas encontrados, componentes reemplazados, fotografías del antes y después, kilometraje anotado, recomendaciones, próximas revisiones y trabajos que el cliente rechazó.

### 3.7 Historial

- Línea de tiempo permanente por bicicleta: órdenes, servicios, componentes instalados y reemplazados, recomendaciones rechazadas, informes.
- Los componentes reemplazados nunca desaparecen del historial.
- Línea de tiempo por cliente: visitas, órdenes, pagos, garantías.
- Garantía: cuando una bicicleta vuelve por garantía se abre una orden nueva **vinculada** a la original, para distinguir trabajo nuevo de corrección en garantía.

### 3.8 Usuarios, roles y auditoría

Cuatro roles:

| Rol | Puede | No puede |
|---|---|---|
| **Dueño** | Todo: precios, descuentos, usuarios, métricas, costos y márgenes | — |
| **Administrador** | Clientes, bicicletas, órdenes, agenda, precios, pagos | Crear usuarios |
| **Recepción** | Clientes, bicicletas, reservas, recepción, pagos, estados, precios de venta | Ver costos ni márgenes |
| **Mecánico** | Sus trabajos, diagnósticos, fotos, reparaciones, componentes, controles, precios de los trabajos | Ver costos, márgenes ni rentabilidad |

- Pantalla de administración de usuarios, operada por el dueño.
- Auditoría de: cambios de precio, modificaciones de orden, pagos, aprobaciones del cliente, cambios de estado, garantías y altas y bajas de usuario. Queda quién, qué y cuándo.

### 3.9 Dashboards

**Administrador:** reservas de hoy, ingresos de hoy, bicicletas en taller, esperando aprobación, esperando repuesto, en reparación, control de calidad pendiente, listas para retiro, atrasadas, próximas entregas, carga por mecánico, pagos pendientes.

**Mecánico:** próximos ingresos, bicicletas asignadas, trabajos pendientes, atrasados, esperando aprobación, esperando repuesto, próximos a entrega, control de calidad pendiente.

Fuera de la fase 1: ventas del día, stock crítico y alertas de mantenimiento. Los tres dependen de fases posteriores.

---

## 4. Principio central

La unidad de información **no es la reparación**. Es:

```
CLIENTE → BICICLETA → COMPONENTES → HISTORIAL
```

Cada reparación agrega información a esa línea de vida. Toda decisión de modelo de datos que se tome durante la construcción se resuelve a favor de este principio. Es lo más valioso de la especificación original y lo que diferencia esto de una agenda de taller.

---

## 5. Modelo de datos

Tablas nuevas, sobre `src/server/db/schema.ts`, respetando `.claude/rules/database.md`: `id uuid` con `defaultRandom()`, `created_at` y `updated_at` en `timestamptz`, dinero en enteros CLP, nunca decimales.

| Tabla | Para qué |
|---|---|
| `branches` | Sucursal. Una fila en la fase 1. |
| `users` | Es `admin_users` renombrada (decisión 6), más nombre, rol, activo, `branch_id` y quién la creó. La fila del administrador actual se conserva con rol dueño. |
| `customers` | Ficha de cliente. |
| `bikes` | Ficha de bicicleta, cuelga de `customers`. |
| `services` | Catálogo maestro. |
| `service_prices` | Precio por servicio y tipo de bicicleta. |
| `work_orders` | Orden de trabajo. |
| `work_order_items` | Líneas de servicio y repuesto, con origen inicial o adicional. |
| `work_order_approvals` | Propuestas de adicional, con token y decisión del cliente. |
| `work_order_status_history` | Todo cambio de estado, con autor. |
| `intake_checks` | Checklist de recepción. |
| `intake_accessories` | Accesorios recibidos con la bicicleta. |
| `qc_checks` | Checklist de control final, con autor y marca de autocontrol. |
| `order_photos` | Referencias a imágenes, con etapa y clase de retención. |
| `order_signatures` | Firmas de recepción y de entrega. |
| `bike_components` | Componentes instalados y reemplazados. Sin kilómetros en esta fase. |
| `payments` | Abono y pago final, con método. |
| `service_reports` | Informe final generado. |
| `audit_log` | Registro de acciones sensibles. |

Reglas que viven en la base y no solo en la pantalla:

1. `branch_id` presente y obligatorio en todas las tablas de operación.
2. Número de orden único por sucursal.
3. Una orden no pasa a `entregada` si el saldo no es cero.
4. Una orden no pasa a `lista_para_retirar` sin control de calidad aprobado.
5. Un token de aprobación se usa una sola vez.
6. Nunca se borra una orden, una línea, una foto de informe ni un componente: se marcan.

---

## 6. Integración con lo ya construido

El sitio público ya guarda reservas en `bookings` con nombre, teléfono, correo, bicicleta y descripción, y tiene sesión de administrador, correos transaccionales y tokens de un solo uso funcionando en producción.

- Una reserva se convierte en recepción con un botón. La orden guarda la referencia a `bookings.id`.
- El teléfono de la reserva se usa para buscar cliente existente antes de crear uno nuevo.
- **Las reservas nunca se borran**, se cambia su estado. Esa regla ya existe y se mantiene.
- No hay reservas reales todavía, solo las de prueba, así que no hay migración de datos históricos que hacer. Esta es la única ventana para cambiar el modelo sin costo.
- Se reutiliza tal cual: el mecanismo de sesión, el patrón de token de un solo uso con hash, `src/lib/env.ts`, `src/lib/log.ts` y los tokens de diseño de `src/styles/global.css`.

---

## 7. Protección de datos personales

La Ley 21.719 está vigente y el sistema va a guardar RUT, teléfono, correo y fotografías.

- Finalidad declarada: gestionar el servicio del taller y su garantía. Nada más.
- Sin fecha de nacimiento.
- Retención de fotos según §2.2 decisión 8.
- El consentimiento de la reserva no habilita comunicaciones de marketing. Si alguna vez se hacen campañas, se pide aparte.
- Los registros nunca guardan correos, teléfonos ni tokens sin redactar. Esa regla ya está en `CLAUDE.md` y aplica igual acá.

---

## 8. Dispositivos

| Pantalla | Dispositivo principal |
|---|---|
| Recepción, checklist, fotos, firma, control de calidad | Tablet |
| Orden de trabajo, dashboard del mecánico | Tablet |
| Catálogo, precios, usuarios, dashboard del administrador, informes | Escritorio |

Una recepción diseñada para computador es inutilizable con las manos sucias al lado de la bicicleta. La recepción se prueba en tablet antes de darla por hecha.

---

## 9. Diseño visual

Se mantiene el sistema aprobado del sitio: monocromo, reglas de 1px, radio 2px, sin sombras, Michroma + Archivo + IBM Plex Mono, tokens en `src/styles/global.css`. El área interna es la misma marca, con más densidad de información.

Lo que cambia respecto del sitio público: tablas densas con `tabular-nums`, estados con forma propia además de color (un rol no se distingue solo por el tono), y objetivos táctiles más grandes en las pantallas de taller.

---

## 10. Tamaño estimado

Del orden de **19 a 23 pasos**, contra los 14 del sitio. Reparto aproximado:

| Bloque | Pasos |
|---|---|
| Tarea 0: recordatorios por cron externo | 1 |
| Esquema, sucursal, usuarios y roles | 3 |
| Clientes y bicicletas | 2 |
| Capa de almacenamiento de imágenes | 1 |
| Catálogo y precios | 2 |
| Recepción, checklist, firma y etiqueta | 4 |
| Orden de trabajo y estados | 3 |
| Aprobación de adicionales | 2 |
| Control de calidad, pago y entrega | 2 |
| Informe final e historial | 2 |
| Dashboards, auditoría y compuerta final | 2 |

---

## 11. Riesgos

| Riesgo | Mitigación |
|---|---|
| La recepción se diseña para escritorio y no se usa en el taller | Probarla en tablet en cada paso que la toque, no al final |
| El almacenamiento de fotos no se puede probar local | Resuelto por la decisión 7. Si esa capa no se construye en el paso que corresponde, el resto de la recepción se bloquea |
| El alcance crece y la fase 1 nunca entra en uso | La cerca de §2.4. Lo que está ahí no se construye, aunque sea fácil |
| `branch_id` se deja para después | Va en el primer paso del esquema. Agregarlo luego obliga a reescribir todas las consultas |
| El esquema cambia cuando ya hay datos reales del taller | Cambios destructivos con expand → migrate → contract en publicaciones separadas, como ya está definido en `.claude/rules/database.md` |

---

## 12. Pendientes operativos, fuera del diseño

Tres cosas no son código y conviene cerrarlas antes o durante la fase 1:

1. **Activar los respaldos programados de la base en Replit.** Hoy están apagados. Van a vivir ahí el historial completo de cada cliente y cada bicicleta. Se hace **antes de la tarea 0**, no después: es lo único urgente de esta lista.
2. **Crear el escenario de Make.com** que dispara el endpoint de la tarea 0 (§3.0): cron diario 10:00 America/Santiago, HTTP POST con la cabecera del secreto, aviso al dueño si la respuesta no es `ok:true`. El secreto se carga en *Secrets* de Replit y en Make.com, nunca en el repo. La parte de código es la tarea 0; esta es la parte operativa.
3. **Definir el modelo de impresora de etiquetas** cuando se compre, para ajustar la plantilla de 62 mm.

---

## 13. Lo que no se negocia al construir

Además de los siete puntos de `CLAUDE.md`, en esta fase:

1. `branch_id` en toda tabla de operación, desde el primer paso.
2. Nunca borrar una orden, una línea, un componente, una aprobación ni una foto de informe: se marcan.
3. Saldo cero antes de entregar, garantizado en la base.
4. Control de calidad aprobado antes de `lista_para_retirar`, garantizado en la base.
5. Un token de aprobación se usa una sola vez, con hash guardado, nunca el token en claro.
6. El mecánico no cambia precios. La regla se verifica en el servidor, no en la pantalla.
7. Toda entrada externa pasa por zod antes de tocar `src/server/**`.
8. La recepción se prueba en tablet antes de marcarse como hecha.
9. No se construye nada de la cerca de §2.4.

---

## 14. Criterios de aceptación de la fase

La fase 1 se cierra cuando todo esto se puede demostrar sobre el sistema andando:

1. El dueño crea una cuenta de mecánico, el mecánico entra con ella y ve solo sus trabajos.
2. Una reserva del sitio se convierte en recepción sin volver a escribir los datos del cliente.
3. Una recepción completa se hace entera desde una tablet: checklist, cuatro fotos, fecha confirmada y firma.
4. La etiqueta se imprime y su QR abre la orden correcta.
5. Un adicional detiene el trabajo, genera un enlace, el cliente aprueba desde su teléfono y el monto entra a la orden.
6. Un adicional rechazado queda visible en el historial de la bicicleta.
7. El sistema impide pasar a `lista_para_retirar` sin control de calidad.
8. El sistema impide entregar con saldo pendiente.
9. El informe final muestra el antes y el después, lo realizado, lo reemplazado y lo rechazado.
10. El historial de una bicicleta con dos visitas muestra ambas en orden, con sus componentes.
11. Una orden de garantía queda vinculada a la original y se distingue de un trabajo nuevo.
12. El registro de auditoría muestra quién cambió un precio y cuándo.
13. `pnpm gate` en verde.
14. Dos semanas de operación real del taller sin papel.

Los primeros trece se verifican en el blueprint, paso por paso. El catorce lo verifica el taller.

---

## 15. Cómo generar el blueprint

**Requisitos previos, en este orden:**

1. Este documento leído y aprobado. El plan generado va a ser tan bueno como las definiciones que reciba.
2. El plugin `the-architect` cargando. Verificado el 5 de octubre: `claude plugin list` lo muestra como `the-architect@soyenriquerocha` v2.5.0, enabled. Si alguna vez aparece como `failed to load`, se repara con `claude plugin marketplace update soyenriquerocha` y `claude plugin install the-architect@soyenriquerocha`.
3. Este archivo y sus fuentes commiteados en `blueprints/vector-taller-f1/`, con el árbol de git limpio.
4. Respaldos de la base activados en Replit (§12, punto 1).

Desde la raíz del repositorio, en `~/Documents/vector-bikes`:

```
/the-architect:architect-brownfield
```

Y se le entrega este encargo:

```
Lee el documento de definición de fase en blueprints/vector-taller-f1/FASE1.md
y sus dos fuentes en blueprints/vector-taller-f1/fuentes/, y construye el blueprint
de la fase 1 del Sistema de Gestión Integral sobre este proyecto existente.

Escribe el bundle en blueprints/vector-taller-f1/. No modifiques
blueprints/vector-bikes/, que es el registro del sitio ya construido y
terminado, salvo la única excepción que FASE1.md §3.0 describe (una fila en
§20.3 y el ajuste del punto de Scheduled Deployment en §20.1).

Las decisiones de la sección 2 de FASE1.md están cerradas: no las re-preguntes.
La sección 2.4 es la cerca del alcance. La sección 3.0 es la tarea 0 y va
primero. La sección 14 son los criterios de aceptación de la fase.

Respeta CLAUDE.md, AGENTS.md y .claude/rules/ del proyecto. Cada paso lleva un
Verify observable y un tag de checkpoint. Los pasos que tocan recepción,
checklist, fotos, firma o control de calidad incluyen en su Verify una prueba
en tablet (viewport táctil), no solo en escritorio.
```

Después, un `/the-architect:architect-next` por paso, igual que en las 14 tareas del sitio. Cada paso sigue el reparto de `CLAUDE.md`: Claude planifica y revisa, Codex construye.

---

## 16. Documentos de las otras fases

- `FASE2.md` — El dinero y las piezas: inventario, consumo de repuestos, alertas de stock, proveedores y compras, caja con Mercado Pago, descuentos, devoluciones, códigos de barra y bicicletas usadas.
- `FASE3.md` — La inteligencia: componentes con kilómetros, Strava, mantenimiento predictivo, asistente de WhatsApp, reseñas de Google y fichas de suspensiones.
- `FASE4.md` — Crecimiento: multi-sucursal, convenios y tienda online.
- `../roadmap/dashboard-financiero.md` — Dashboard financiero y operativo completo, pedido el 20-10-2026: qué indicadores salen de la fase 1, cuáles dependen de la fase 2 y cuáles cierran después. La fase 2 debe guardar desde el inicio los datos que ese panel necesita.

**La fase 1 tiene que estar en uso antes de empezar la fase 2.** Es la única garantía de que el sistema se diseñe alrededor de cómo trabajan realmente los mecánicos, y no alrededor de cómo se imaginó que trabajarían.

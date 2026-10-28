# Publicación compartida de Vector Bikes Test

La publicación parte de la rama recuperada de Replit, commit
`62776473cd1cbabf47aa595a9ef6caf82306ffd3`. La aplicación operativa y sus pruebas
permanecen en el repositorio; Netlify compila una variante pública informativa
para `https://vectorbikestest.cl`.

## Una fuente para web y asistente

Los cuatro archivos revisados de `public/geo/` publican siete registros públicos
de Vector Bikes. `src/lib/public-knowledge.ts` valida la empresa y el contenido,
y exporta los mismos datos para la página de servicios y el asistente.

- Página legible: `/geo/`.
- Datos: `/geo/knowledge.json`.
- Manifiesto: `/geo/manifest.json`.
- Sitemap específico: `/geo/sitemap.xml`.
- Servicios: `/servicios/`.
- Asistente: `/asistente/`, con endpoint `/api/asistente`.
- Versión de conocimiento:
  `2ba9fd191e2638399c7f4fd1708f7390a53b6c86282689e7c9222b84b7f9a451`.

Es un snapshot aprobado incluido en cada despliegue. Una actualización de la
base de conocimiento requiere revisar e instalar un nuevo release y desplegar;
no existe sincronización automática con PostgreSQL en producción.

## Dos builds

`pnpm build` conserva la aplicación operativa de Replit. El build público usa
`astro.public-test.config.mjs`, publica solo `dist-public-test` y una Netlify
Function para el asistente. La configuración está en `netlify.toml`.

La variante pública ofrece contacto por teléfono o correo. No publica reservas,
paneles, datos de clientes ni endpoints operativos. El paquete de conocimiento
describe expresamente esta condición informativa.

Por solicitud del responsable, la portada incluye en `/#prueba-fechas` un
selector de prueba con 14 días corridos de Chile. Muestra sábados, domingos y
feriados e identifica los cierres. La fecha se actualiza en el navegador sin
despliegues diarios. Elegir una fecha no crea una reserva ni confirma cupos.
El criterio y la validación están en `VALIDACION-SELECTOR-FECHAS.md`.

Las variables `AI_ASSISTANT_ENABLED`, `AI_MODEL`, `OPENAI_API_KEY` y
`OPENAI_BASE_URL` se configuran en Netlify con alcance de Functions. Sus valores
no se guardan en Git. El paquete `/geo/` funciona independientemente del proveedor
de IA. Las respuestas del asistente identifican el release con
`X-Knowledge-Version`.

## Validación y actualización

La compilación verifica empresa, canonical y hashes del release. El instalador
`scripts/geo-install.mjs` rechaza archivos alterados o paquetes de otra empresa.
El formateador excluye los archivos generados de `public/geo/` para conservar sus
hashes.

El workflow `shared-knowledge.yml` verifica integridad, servicios/asistente,
tipos, build público y regresión operativa con PostgreSQL desechable. Tablet
sigue excluida por indicación del propietario. Las comprobaciones de esta
integración se registran aparte de la entrega de QA de Replit.

La disponibilidad pública y los sitemaps permiten el descubrimiento; no
confirman por sí mismos indexación, menciones ni posiciones en buscadores.

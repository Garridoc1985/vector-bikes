---
name: Verificación local en Replit
description: Notas operativas sobre PostgreSQL local y la duración de la suite Vitest en este entorno.
---

En este entorno Nix, el clúster PostgreSQL local puede fallar al usar su socket predeterminado porque `/run/postgresql` no existe. Arráncalo con un socket en `/tmp` y verifica que escucha antes de ejecutar smoke o Playwright. Mantén las comprobaciones sobre una base local desechable y nunca dejes que hereden una URL de producción.

**Why:** La ruta de socket predeterminada no está disponible en el contenedor y los checks de navegador necesitan PostgreSQL operativo.

**How to apply:** Antes de pruebas locales, confirma host loopback y base de pruebas; si el clúster no inicia, usa `-k /tmp` y confirma con `pg_isready`.

La suite Vitest completa es CPU-intensiva y puede tardar varios minutos sin mostrar avance por archivo.

**Why:** Lanzar ejecuciones duplicadas consume recursos y alarga la revisión sin aportar una señal útil.

**How to apply:** Ejecuta una sola instancia en segundo plano y espera su resultado final antes de iniciar otra.

import node from "@astrojs/node";
import preact from "@astrojs/preact";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

export default defineConfig({
  site: process.env.PUBLIC_SITE_URL || "https://vectorbikes.cl",
  output: "server",
  adapter: node({ mode: "standalone" }),
  integrations: [
    preact(),
    sitemap({
      // Lista blanca a propósito: solo entran las páginas públicas que nombramos
      // aquí. Con una lista negra, cada ruta nueva se publicaba sola (así se
      // colaron 8 rutas de /taller al sitemap de producción).
      filter: (page) =>
        ["/", "/privacidad"].includes(new URL(page).pathname.replace(/\/$/, "") || "/"),
    }),
  ],
  security: {
    checkOrigin: false,
  },
  vite: {
    plugins: [tailwindcss()],
  },
});

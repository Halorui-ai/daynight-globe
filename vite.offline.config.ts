import { resolve } from "node:path";
import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [tailwindcss(), viteReact()],
  resolve: {
    alias: { "@": resolve(import.meta.dirname, "src") },
  },
  publicDir: "public",
  base: "./",
  build: {
    outDir: "offline-dist",
    emptyOutDir: true,
    assetsInlineLimit: 0,
    rollupOptions: {
      input: resolve(import.meta.dirname, "offline.html"),
    },
  },
});

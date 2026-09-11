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
    cssCodeSplit: false,
    modulePreload: false,
    rollupOptions: {
      input: resolve(import.meta.dirname, "offline.html"),
      output: {
        format: "iife",
        name: "DayNightGlobe",
        inlineDynamicImports: true,
        entryFileNames: "assets/app.js",
        chunkFileNames: "assets/[name].js",
        assetFileNames: "assets/[name][extname]",
      },
    },
  },
});

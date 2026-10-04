import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

/**
 * The dev server proxies the two API surfaces to uvicorn so the browser only
 * ever talks to one origin, exactly as it does in production. That is what
 * lets the admin session cookie work in development with no CORS setup and no
 * differences to remember.
 */
const API_TARGET = process.env.FASTAPI_URL ?? "http://localhost:8000";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "src") },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": API_TARGET,
      "/media": API_TARGET,
    },
  },
  build: {
    outDir: "dist",
    // Nastaliq and Inter are the two faces of the site; keeping them in
    // separate files lets a browser fetch only the weight it needs for the
    // language actually on screen.
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          fonts: ["@fontsource-variable/inter", "@fontsource/noto-nastaliq-urdu"],
        },
      },
    },
  },
});
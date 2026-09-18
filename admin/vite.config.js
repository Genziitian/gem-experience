import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/* The admin ships inside the storefront deploy at /admin, so it builds into
   frontend/ (Vercel's output directory) and addresses its assets from that
   subpath rather than the site root. */
export default defineConfig({
  plugins: [react()],
  base: "/admin/",
  build: { outDir: "../frontend/admin", emptyOutDir: true },
  server: { port: 5173, host: true },
});

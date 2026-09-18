import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/* The admin ships inside the storefront deploy at /admin, so it builds into
   frontend/ (Vercel's output directory) and addresses its assets from that
   subpath rather than the site root. */
export default defineConfig({
  plugins: [react()],
  base: "/admin/",
  build: { outDir: "../frontend/admin", emptyOutDir: true },
  server: {
    port: 5173,
    host: true,
    /* In production the admin and the storefront share an origin, so the
       catalog import fetches the data.js files directly. In dev they do not —
       proxy them to `npm run dev:frontend` so the import works the same way. */
    proxy: {
      "/fine-jewellery": "http://localhost:8000",
      "/high-jewellery": "http://localhost:8000",
    },
  },
});

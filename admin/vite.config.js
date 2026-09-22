import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

/* The admin ships inside the storefront deploy at /admin, so it builds into
   frontend/ (Vercel's output directory) and addresses its assets from that
   subpath rather than the site root. */
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    mode === "harness" && {
      name: "harness-stub-supabase",
      enforce: "pre",
      resolveId(source) {
        if (/(^|[./])supabase\.js$/.test(source)) {
          return path.resolve(__dirname, "src/__harness/stub.js");
        }
        return null;
      },
    },
  ].filter(Boolean),
  base: "/admin/",
  build: { outDir: "../frontend/admin", emptyOutDir: true },
  /* `npm run harness` swaps the Supabase client for an in-memory stand-in so
     the content pages can be opened and driven without a database or a login.
     A resolver rather than an alias: the pages import "../lib/supabase.js"
     and content.js imports "./supabase.js", and one rule has to catch both
     regardless of where the importer sits. Scoped to the mode, so the
     production build never sees it. */
  resolve: {},

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
}));

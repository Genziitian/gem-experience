import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anon) {
  console.warn("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in admin/.env");
}

export const supabase = createClient(url || "http://localhost", anon || "public-anon-key");

export function configStatus() {
  const u = (url || "").trim();
  const k = (anon || "").trim();
  if (!u || !k) {
    return {
      ok: false,
      reason:
        "Vite only loads admin/.env (not .env.example). Create admin/.env with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then restart npm run dev.",
    };
  }
  if (u.includes("YOUR_PROJECT") || k === "YOUR_ANON_KEY") {
    return { ok: false, reason: "Replace placeholder values in admin/.env with your Supabase project URL and anon key." };
  }
  return { ok: true, reason: "" };
}

export function isConfigured() {
  return configStatus().ok;
}

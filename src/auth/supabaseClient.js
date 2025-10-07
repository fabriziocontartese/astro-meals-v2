// filepath: src/auth/supabaseClient.js
import { createClient } from "@supabase/supabase-js";

// Vite uses import.meta.env for env vars
const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anon) {
  console.error("ERROR: Missing Supabase env vars", { url, anonPresent: !!anon });
} else {
  console.log("Supabase client initialized");
}

export const supabase = createClient(url, anon, {
  auth: { persistSession: true, autoRefreshToken: true },
});
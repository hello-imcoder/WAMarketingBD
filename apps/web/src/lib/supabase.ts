// apps/web/src/lib/supabase.ts
// Supabase browser client — uses the ANON KEY only.
// The service-role key never ships to the browser (REQUIREMENT.md §12, SECURITY.md §3).
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
config({ path: resolve(__dirname, "../apps/web/.env.local") }); // fallback to .env.local

const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://vjlfgckyevouostaapqt.supabase.co";
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqbGZnY2t5ZXZvdW9zdGFhcHF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxOTE4ODIsImV4cCI6MjEwMzc2Nzg4Mn0.CISP6mw2mCQmG4g0syjWf5xAEBdgB01TEB8Rr6SJ3ns";

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("Running DB Join Tests...");
  let allPass = true;

  const queries = [
    { name: "Submissions with profiles", query: supabase.from("submissions").select("id, profiles(name)").limit(1) },
    { name: "Withdrawals with profiles", query: supabase.from("withdrawals").select("id, profiles(name)").limit(1) },
    { name: "Support tickets with profiles", query: supabase.from("support_tickets").select("id, profiles(name)").limit(1) },
    { name: "Submissions with tasks", query: supabase.from("submissions").select("id, tasks(payout_amount)").limit(1) }
  ];

  for (const q of queries) {
    const { data, error } = await q.query;
    if (error) {
      console.error(`❌ ${q.name} failed:`, error.message);
      allPass = false;
    } else {
      console.log(`✅ ${q.name} passed.`);
    }
  }

  if (allPass) {
    console.log("All DB tests passed successfully!");
    process.exit(0);
  } else {
    console.error("Some DB tests failed.");
    process.exit(1);
  }
}

main();

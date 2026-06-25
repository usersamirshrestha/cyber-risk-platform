import { createClient } from '@supabase/supabase-js';

// Hardcoding both values bypasses the Next.js/Turbopack environment variable cache bug completely
const supabaseUrl = "https://ecraxufrtxaurevoupng.supabase.co";
const supabaseAnonKey = "sb_publishable_r2pD2x7A3e9wbqlCyDgx1A_djyH2wOj";

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase variables are missing!");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);



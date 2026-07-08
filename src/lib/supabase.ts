import { createClient } from "@supabase/supabase-js";

// Read connection info from environment variables (set these in .env.local).
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and " +
      "NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.",
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  // Opt in to the passkey (WebAuthn) API. Requires passkeys enabled on the
  // Supabase project too (Auth settings: passkey_enabled + relying party).
  auth: { experimental: { passkey: true } },
});

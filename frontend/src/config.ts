import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase environment variables");
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  realtime: {
    heartbeatIntervalMs: 30000,
    timeout: 10000,
  },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// Types for the database schema
export interface Agent {
  id: number;
  created_at: string;
  prompt: string | null;
  user_id: string | null;
  image: string | null;
  description: string | null;
  name: string | null;
  updated_at: string | null;
  agent_wallet: string | null;
  agent_deployed: boolean | null;
  agent_aws: string | null;
  owner_address: string | null;
  slippage_tolerance: number | null;
  gas_limit: number | null;
  selected_chains: string[] | null;
  strategy_type: string | null;
  trading_pairs: string[] | null;
  risk_level: string | null;
}

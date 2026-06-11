import { createClient } from "@supabase/supabase-js";
import ws from "ws";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn("⚠️ Supabase credentials missing in .env");
}

const supabase = createClient(
  supabaseUrl,
  supabaseKey,
  {
    realtime: {
      transport: ws
    }
  }
);

const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseKey,
  {
    realtime: {
      transport: ws
    }
  }
);

export default supabase;
export { supabaseAdmin };
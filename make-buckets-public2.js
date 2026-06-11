import dotenv from "dotenv";
dotenv.config({ path: ".env" });
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const buckets = [
  'bedah', 'dve-1', 'dve-2', 'endokrin', 'forensik',
  'gastro-entero-hepatologi', 'hematologi', 'infeksi-tropis',
  'kardiologi', 'mata-1', 'mata-2', 'nefro-reumatologi',
  'neurologi-1', 'neurologi-2', 'obsgyn-1', 'obsgyn-2',
  'pediatri', 'ph-biostatik', 'psikiatri', 'pulmo', 'tht'
];

async function run() {
  for (const bucket of buckets) {
    const { data, error } = await supabaseAdmin.storage.updateBucket(bucket, {
      public: true
    });
    if (error) {
      console.log("Error updating", bucket, ":", error.message);
    } else {
      console.log("Updated", bucket, "to public!");
    }
  }
}
run();

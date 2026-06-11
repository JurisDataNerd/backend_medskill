import dotenv from "dotenv";
dotenv.config({ path: ".env" });
import { createClient } from "@supabase/supabase-js";
const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const filePath = 'https://djigelqahkzfmwvpncvr.supabase.co/storage/v1/object/public/forensik/Medskill_Forensik%20&%20Medikolegal.pdf';
  const urlParts = filePath.split('/storage/v1/object/public/')[1];
  const firstSlash = urlParts.indexOf('/');
  const bucket = urlParts.substring(0, firstSlash);
  const path = decodeURIComponent(urlParts.substring(firstSlash + 1));
  console.log({bucket, path});
  const { data, error } = await supabaseAdmin.storage.from(bucket).createSignedUrl(path, 7200);
  console.log("data:", data, "error:", error);
}
run();

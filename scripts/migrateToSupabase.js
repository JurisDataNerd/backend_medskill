import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.join(__dirname, "../../");
const uploadsRoot = path.join(projectRoot, "uploads", "materials");

async function migrate() {
  console.log("🚀 Mulai migrasi materi ke Supabase Storage...");

  if (!fs.existsSync(uploadsRoot)) {
    console.log("Folder materials tidak ditemukan:", uploadsRoot);
    return;
  }

  const stases = fs.readdirSync(uploadsRoot);
  const bucketsNeeded = [];

  for (const stase of stases) {
    const stasePath = path.join(uploadsRoot, stase);
    if (!fs.lstatSync(stasePath).isDirectory()) continue;

    const files = fs.readdirSync(stasePath).filter(f => f.endsWith('.pdf')).sort();
    
    if (files.length === 0) continue;

    console.log(`\n📦 Memproses stase: ${stase} (${files.length} PDF)`);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      // Jika ada > 1 PDF, tambahkan index (stase-1, stase-2)
      const bucketName = files.length > 1 ? `${stase}-${i + 1}` : stase;
      
      if (!bucketsNeeded.includes(bucketName)) {
        bucketsNeeded.push(bucketName);
      }

      const filePath = path.join(stasePath, file);
      const oldDbPath = `uploads/materials/${stase}/${file}`;
      
      console.log(`   - [Bucket: ${bucketName}] Mengupload: ${file}`);
      
      const fileBuffer = fs.readFileSync(filePath);
      
      // Upload ke supabase storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(file, fileBuffer, {
          contentType: 'application/pdf',
          upsert: true
        });

      if (uploadError) {
        console.error(`     ❌ Gagal upload: ${uploadError.message}`);
        continue;
      }

      // Ambil Public URL
      const { data: publicUrlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(file);
        
      const newUrl = publicUrlData.publicUrl;
      console.log(`     ✅ Tersimpan: ${newUrl}`);

      // Update Database
      const { data: updated, error: updateError } = await supabase
        .from('class_contents')
        .update({ file_path: newUrl })
        .eq('file_path', oldDbPath);

      if (updateError) {
        console.error(`     ❌ Gagal update DB: ${updateError.message}`);
      } else {
        console.log(`     🔄 DB terupdate.`);
      }
    }
  }
  
  console.log("\n=================================");
  console.log("💡 Pastikan Anda sudah membuat bucket-bucket berikut di Supabase Anda sebelum menjalankan script ini:");
  console.log("=================================");
  console.log(`
INSERT INTO storage.buckets (id, name, public) VALUES 
${bucketsNeeded.map(b => `  ('${b}', '${b}', false)`).join(',\n')}
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Allow authenticated users to read objects"
ON storage.objects FOR SELECT TO authenticated
USING ( bucket_id IN (
${bucketsNeeded.map(b => `  '${b}'`).join(',\n')}
) );
  `);
  
  console.log("\n🎉 Proses Migrasi Selesai!");
}

migrate();

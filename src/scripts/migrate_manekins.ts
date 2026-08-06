import { supabaseAdmin } from '../../utils/supabase.js';

async function run() {
  console.log('Fetching old manekins...');
  const { data: oldManekins, error: fetchErr } = await supabaseAdmin.from('manekin').select('*');
  
  if (fetchErr) {
    console.error('Error fetching old manekins:', fetchErr);
    return;
  }

  if (!oldManekins || oldManekins.length === 0) {
    console.log('No old manekins found.');
    return;
  }

  console.log(`Found ${oldManekins.length} old manekins. Migrating...`);

  const newMannequins = oldManekins.map(m => ({
    name: m.nama_manekin,
    slug: m.nama_manekin.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    description: m.deskripsi || m.deksripsi, // Typo from user message 'deksripsi'
    price_per_billing_unit: m.harga_sewa_per_3_jam || m.harga_sewa_per_hari || 0,
    billing_unit_hours: 3,
    stock: 5, // Default stock
    max_stock: 5,
    image_urls: m.foto_url ? [m.foto_url] : [],
    features: [],
    is_active: true
  }));

  const { error: insertErr } = await supabaseAdmin.from('mannequins').insert(newMannequins);
  if (insertErr) {
    console.error('Error inserting into mannequins:', insertErr);
  } else {
    console.log('Successfully migrated old manekins to the new table!');
  }
}

run();

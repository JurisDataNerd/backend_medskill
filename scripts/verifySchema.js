import supabase from '../utils/supabase.js';

async function test() {
  const { data, error } = await supabase
    .from('simulation_sets')
    .select('id, title, registration_closed, price, month, year')
    .limit(1);

  if (error) {
    console.error("❌ Verification failed:", error);
  } else {
    console.log("✅ Verification successful! Data:", data);
  }
}

test();

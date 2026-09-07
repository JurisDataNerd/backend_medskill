import supabase from '../utils/supabase.js';

async function verify() {
  const { data, error } = await supabase
    .from('simulation_registrations')
    .select('id, user_id, simulation_id, verified, package_type, paid_amount');

  if (error) {
    console.error("❌ RLS verification error:", error);
  } else {
    console.log(`✅ Success! Retrieved ${data?.length} simulation registrations:`, data);
  }
}

verify();

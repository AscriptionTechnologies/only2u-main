const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://ljnheixbsweamlbntwvh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqbmhlaXhic3dlYW1sYm50d3ZoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDc1ODgyOSwiZXhwIjoyMDY2MzM0ODI5fQ.RYiLZQB_YX8XlUQu6sRXamitaboTB3n2CMknIskkiFs'
);

async function run() {
  const { data, error } = await supabase.auth.admin.getUserById('8a553cdf-d008-44fd-8013-6b15c65abd41');
  if (error) {
    console.log("Error:", error);
  } else {
    console.log("Email confirmed at:", data.user.email_confirmed_at);
  }
}
run();

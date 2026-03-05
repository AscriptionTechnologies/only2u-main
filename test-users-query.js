const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
    'https://ljnheixbsweamlbntwvh.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqbmhlaXhic3dlYW1sYm50d3ZoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDc1ODgyOSwiZXhwIjoyMDY2MzM0ODI5fQ.RYiLZQB_YX8XlUQu6sRXamitaboTB3n2CMknIskkiFs'
);

async function testFetch() {
    const { data, error } = await supabase
        .from('users')
        .select('role, vendor_id, is_active')
        .limit(1);

    if (error) {
        console.error("DB Error:", error.message);
    } else {
        console.log("DB Success:", data);
    }
}
testFetch().then(() => process.exit(0));

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
    'https://ljnheixbsweamlbntwvh.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqbmhlaXhic3dlYW1sYm50d3ZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3NTg4MjksImV4cCI6MjA2NjMzNDgyOX0.a7aZsKPzKfK0UxuzP4Ihg7cR5tiR_1UrX4PTo08Ik90'
);

async function runTest() {
    console.log("Starting test...");
    try {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: 'nrrfashion@only2u.com',
            password: 'Password123!'
        });

        if (authError) {
            console.log("Login Auth error:", authError.message);
            return;
        }
        console.log("Logged in OK. User ID:", authData.user.id);

        const { data, error } = await supabase
            .from('users')
            .select('role, vendor_id, is_active')
            .eq('id', authData.user.id)
            .single();

        if (error) {
            console.log("DB Error message:", error.message);
            console.log("DB Error details:", error.details);
        } else {
            console.log("DB Data:", data);
        }
    } catch (e) {
        console.log("Exception:", e);
    }
}

runTest().then(() => process.exit(0));

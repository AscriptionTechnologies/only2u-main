const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
    'https://ljnheixbsweamlbntwvh.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxqbmhlaXhic3dlYW1sYm50d3ZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3NTg4MjksImV4cCI6MjA2NjMzNDgyOX0.a7aZsKPzKfK0UxuzP4Ihg7cR5tiR_1UrX4PTo08Ik90'
);

async function testLogin() {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: 'nrrfashion@only2u.com',
            password: 'Password123!'
        });

        if (error) {
            console.log('Login Error ->', error.message);
        } else {
            console.log('Login Success -> Token generated.');

            // Let's also check the role in the user table
            const { data: userRecord, error: dbError } = await supabase
                .from('users')
                .select('*')
                .eq('id', data.user.id)
                .single();

            if (dbError) {
                console.log('DB Error ->', dbError.message);
            } else {
                console.log('User Role ->', userRecord.role);
                console.log('User Active ->', userRecord.is_active);
            }
        }
    } catch (err) {
        console.log('Exception ->', err);
    }
}

testLogin().then(() => process.exit(0));

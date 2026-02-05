import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
    console.log('--- DEEP DB CHECK ---');
    try {
        // Check if we can even get the current user session (should be null in node without auth)
        // But what if we check the table without policies? (service role would be better but we only have anon)

        // This query often fails if there is recursion in ANY policy on the table
        const { data, error } = await supabase.from('profiles').select('id, email, role');
        if (error) console.error('Error fetching profiles:', error.message);
        else console.log('Profiles found:', data.length);

    } catch (e) {
        console.error(e);
    }
}
check();

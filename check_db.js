import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
    console.log('--- DB CHECK ---');
    try {
        const { count: resCount, error: errRes } = await supabase.from('reservations').select('*', { count: 'exact', head: true });
        console.log('Reservas count:', resCount, errRes ? errRes.message : '');

        const { count: roomsCount, error: errRooms } = await supabase.from('rooms').select('*', { count: 'exact', head: true });
        console.log('Habitaciones count:', roomsCount, errRooms ? errRooms.message : '');

        const { data: prof, error: errProf } = await supabase.from('profiles').select('email, role');
        console.log('Perfiles count:', prof ? prof.length : 'Error', errProf ? errProf.message : '');
    } catch (e) {
        console.error(e);
    }
}
check();

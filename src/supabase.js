import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const db = {
    // Auth
    async signIn(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (error) throw error;
        return data;
    },

    async signUp(email, password) {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
        });
        if (error) throw error;
        return data;
    },

    async signOut() {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    },

    async getSession() {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        return session;
    },

    onAuthStateChange(callback) {
        return supabase.auth.onAuthStateChange(callback);
    },

    // Profiles & Roles
    async getMyProfile() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();

        if (error) throw error;
        return data;
    },

    async getAllProfiles() {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    },

    async updateProfileRole(userId, newRole) {
        const { data, error } = await supabase
            .from('profiles')
            .update({ role: newRole })
            .eq('id', userId);

        if (error) throw error;
        return data;
    },

    async deleteProfile(userId) {
        const { error } = await supabase
            .from('profiles')
            .delete()
            .eq('id', userId);
        if (error) throw error;
    },

    async sendPasswordReset(email) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin,
        });
        if (error) throw error;
    },

    // Reservations
    async getReservations() {
        const { data, error } = await supabase
            .from('reservations')
            .select(`
                *,
                rooms:habitacion_id (*)
            `)
            .order('fecha_entrada', { ascending: true });

        if (error) throw error;
        // Map snake_case to camelCase for frontend compatibility
        return data.map(r => ({
            id: r.id,
            nombreHuesped: r.nombre_huesped,
            fechaEntrada: r.fecha_entrada,
            fechaSalida: r.fecha_salida,
            habitacion: r.habitacion_id,
            numPersonas: r.num_personas,
            precio: r.precio_noche,
            anticipo: r.anticipo,
            notas: r.notas,
            checkedIn: r.checked_in,
            checkedOut: r.checked_out,
            estadoPago: r.estado_pago || 'pendiente',
            metodoPago: r.metodo_pago || 'efectivo',
            montoTotal: r.monto_total || 0,
            room: r.rooms
        }));
    },

    async createReservation(reserva) {
        const { data, error } = await supabase
            .from('reservations')
            .insert([{
                nombre_huesped: reserva.nombreHuesped,
                fecha_entrada: reserva.fechaEntrada,
                fecha_salida: reserva.fechaSalida,
                habitacion_id: reserva.habitacion,
                num_personas: reserva.numPersonas,
                precio_noche: reserva.precio,
                anticipo: reserva.anticipo || 0,
                notas: reserva.notas,
                checked_in: reserva.checkedIn || false,
                checked_out: reserva.checkedOut || false,
                estado_pago: reserva.estadoPago || 'pendiente',
                metodo_pago: reserva.metodoPago || 'efectivo',
                monto_total: reserva.montoTotal || 0
            }])
            .select();

        if (error) throw error;
        return data[0];
    },

    async updateReservation(id, reserva) {
        const { data, error } = await supabase
            .from('reservations')
            .update({
                nombre_huesped: reserva.nombreHuesped,
                fecha_entrada: reserva.fechaEntrada,
                fecha_salida: reserva.fechaSalida,
                habitacion_id: reserva.habitacion,
                num_personas: reserva.numPersonas,
                precio_noche: reserva.precio,
                anticipo: reserva.anticipo || 0,
                notas: reserva.notas,
                checked_in: reserva.checkedIn,
                checked_out: reserva.checkedOut,
                estado_pago: reserva.estadoPago,
                metodo_pago: reserva.metodoPago,
                monto_total: reserva.montoTotal,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select();

        if (error) throw error;
        return data[0];
    },

    async deleteReservation(id) {
        const { error } = await supabase
            .from('reservations')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    // Rooms (if needed)
    async getRooms() {
        const { data, error } = await supabase
            .from('rooms')
            .select('*')
            .order('id', { ascending: true });

        if (error) throw error;
        return data;
    }
};

import { db } from './supabase.js';
import { showToast } from './utils.js';

export async function migrateLocalStorageToSupabase() {
    const localData = JSON.parse(localStorage.getItem('hostalReservas')) || [];
    if (localData.length === 0) {
        showToast('No hay datos locales para migrar', 'info');
        return;
    }

    if (!confirm(`¿Deseas migrar ${localData.length} reservas desde el almacenamiento local a Supabase?`)) {
        return;
    }

    let successCount = 0;
    let errorCount = 0;

    showToast('Migrando datos...', 'info');

    for (const reserva of localData) {
        try {
            await db.createReservation(reserva);
            successCount++;
        } catch (error) {
            console.error("Error migrando reserva:", reserva, error);
            errorCount++;
        }
    }

    showToast(`Migración completada: ${successCount} éxito, ${errorCount} errores`, successCount > 0 ? 'success' : 'error');

    if (successCount > 0) {
        if (confirm('¿Deseas limpiar los datos locales ahora que han sido migrados?')) {
            localStorage.removeItem('hostalReservas');
            location.reload();
        }
    }
}

// Expose to window for manual trigger if needed
window.migrateData = migrateLocalStorageToSupabase;

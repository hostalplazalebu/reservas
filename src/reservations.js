import { habitacionesConfig, calcularNoches } from './utils.js';

export function renderReservationsList(reservas, container) {
    if (!container) return;

    container.innerHTML = '';

    if (reservas.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8" style="color: var(--text-secondary);">
                <i class="fas fa-calendar-times text-4xl mb-3"></i>
                <p>No hay reservas para mostrar</p>
            </div>
        `;
        return;
    }

    reservas.forEach(reserva => {
        const hab = habitacionesConfig[reserva.habitacion];
        const noches = calcularNoches(reserva.fechaEntrada, reserva.fechaSalida);
        const total = noches * reserva.precio;

        const fechaEntrada = new Date(reserva.fechaEntrada);
        const fechaSalida = new Date(reserva.fechaSalida);

        const reservaCard = document.createElement('div');
        reservaCard.className = `reserva-card hab-${reserva.habitacion}-border`;
        reservaCard.onclick = () => window.abrirEditarReserva(reserva);

        reservaCard.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4 p-4">
                <div class="md:col-span-2">
                    <h3 class="text-lg font-semibold mb-2" style="color: var(--text-primary);">
                        <i class="fas fa-user mr-2"></i>${reserva.nombreHuesped}
                    </h3>
                    <div class="flex items-center mb-2">
                        <span class="inline-block w-3 h-3 rounded-full mr-2" style="background: ${hab.color};"></span>
                        <span style="color: var(--text-secondary);">${hab.nombre}</span>
                        <span class="ml-3 text-sm bg-gray-100 px-2 py-1 rounded" style="background: var(--bg-secondary); color: var(--text-secondary);">
                            ${reserva.numPersonas} persona${reserva.numPersonas > 1 ? 's' : ''}
                        </span>
                    </div>
                </div>
                <div>
                    <div class="text-sm mb-2">
                        <div style="color: var(--text-secondary);">Entrada</div>
                        <div class="font-medium" style="color: var(--text-primary);">
                            ${fechaEntrada.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </div>
                    </div>
                    <div class="text-sm">
                        <div style="color: var(--text-secondary);">Salida</div>
                        <div class="font-medium" style="color: var(--text-primary);">
                            ${fechaSalida.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </div>
                    </div>
                </div>
                <div class="text-right">
                    <div class="text-sm mb-1" style="color: var(--text-secondary);">
                        ${noches} noche${noches > 1 ? 's' : ''} × $${reserva.precio.toLocaleString()}
                    </div>
                    <div class="text-xl font-bold" style="color: var(--primary-color);">
                        $${total.toLocaleString()}
                    </div>
                    <div class="flex flex-col items-end space-y-1 mt-2">
                        ${reserva.estadoPago ? `<span class="status-badge status-pago-${reserva.estadoPago}">${reserva.estadoPago === 'pagado' ? '🟢 Pagado' : (reserva.estadoPago === 'parcial' ? '🟡 Parcial' : '🔴 Pendiente')}</span>` : ''}
                        ${reserva.checkedIn ? '<span class="status-badge status-available">Check-in ✅</span>' : ''}
                        ${reserva.checkedOut ? '<span class="status-badge status-available">Check-out ✅</span>' : ''}
                    </div>
                    ${reserva.notas ? `<div class="text-xs mt-2" style="color: var(--text-secondary); line-clamp: 1; overflow: hidden;"><i class="fas fa-sticky-note mr-1"></i>${reserva.notas}</div>` : ''}
                </div>
            </div>
        `;

        container.appendChild(reservaCard);
    });
}

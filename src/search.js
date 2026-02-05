import { renderReservationsList } from './reservations.js';
import { habitacionesConfig, calcularNoches, showToast } from './utils.js';
import { generarMensajeWhatsApp } from './notifications.js';
import { generarPDFReserva } from './pdf_generator.js';

export function initializeSearch(reservas, container) {
    const searchInput = document.getElementById('buscadorReservas');
    const filtroHabitacion = document.getElementById('filtroHabitacion');

    if (!searchInput || !filtroHabitacion) return;

    // Función para filtrar y mostrar reservas
    const filterReservations = () => {
        const searchTerm = searchInput.value.toLowerCase().trim();
        const selectedRoom = filtroHabitacion.value;

        let filtered = reservas;

        // Filtrar por habitación
        if (selectedRoom) {
            filtered = filtered.filter(r => r.habitacion === parseInt(selectedRoom));
        }

        // Filtrar por nombre
        if (searchTerm) {
            filtered = filtered.filter(r =>
                r.nombreHuesped.toLowerCase().includes(searchTerm)
            );
        }

        // Si hay búsqueda por nombre, agrupar por persona
        if (searchTerm && filtered.length > 0) {
            showGroupedReservations(filtered, container, searchTerm);
        } else {
            renderReservationsList(filtered, container);
        }
    };

    // Event listeners
    searchInput.addEventListener('input', filterReservations);
    filtroHabitacion.addEventListener('change', filterReservations);

    // Inicializar con todas las reservas
    filterReservations();
}

function showGroupedReservations(reservas, container, searchTerm) {
    // Agrupar reservas por nombre de huésped
    const grouped = {};
    reservas.forEach(reserva => {
        const nombre = reserva.nombreHuesped;
        if (!grouped[nombre]) {
            grouped[nombre] = [];
        }
        grouped[nombre].push(reserva);
    });

    container.innerHTML = '';

    // Mostrar cada grupo
    Object.keys(grouped).forEach(nombreHuesped => {
        const reservasPersona = grouped[nombreHuesped];
        const cantidadReservas = reservasPersona.length;

        // Crear card de resumen si tiene múltiples reservas
        if (cantidadReservas > 1) {
            const summaryCard = createSummaryCard(nombreHuesped, reservasPersona);
            container.appendChild(summaryCard);
        } else {
            // Si solo tiene una reserva, mostrar la tarjeta normal
            renderSingleReservation(reservasPersona[0], container);
        }
    });
}

function createSummaryCard(nombreHuesped, reservas) {
    const card = document.createElement('div');
    card.className = 'reserva-card bg-gradient-to-r from-blue-50 to-purple-50';
    card.style.borderLeft = '4px solid #3b82f6';
    card.style.marginBottom = '16px';

    // Calcular totales
    let totalNoches = 0;
    let totalMonto = 0;
    let totalPersonas = 0;
    const habitaciones = [];

    reservas.forEach(r => {
        const noches = calcularNoches(r.fechaEntrada, r.fechaSalida);
        totalNoches += noches;
        totalMonto += noches * r.precio;
        totalPersonas += r.numPersonas || 0;
        habitaciones.push(habitacionesConfig[r.habitacion].nombre);
    });

    card.innerHTML = `
        <div class="p-4">
            <div class="flex justify-between items-start mb-4">
                <div>
                    <h3 class="text-xl font-bold mb-2" style="color: var(--text-primary);">
                        <i class="fas fa-user-circle mr-2"></i>${nombreHuesped}
                    </h3>
                    <div class="text-sm" style="color: var(--text-secondary);">
                        <i class="fas fa-layer-group mr-2"></i>
                        <strong>${reservas.length} Reservas</strong> | 
                        ${habitaciones.join(', ')} | 
                        ${totalPersonas} personas total
                    </div>
                </div>
                <div class="text-right">
                    <div class="text-2xl font-bold" style="color: var(--primary-color);">
                        $${totalMonto.toLocaleString()}
                    </div>
                    <div class="text-sm" style="color: var(--text-secondary);">
                        ${totalNoches} noches total
                    </div>
                </div>
            </div>

            <!-- Detalle de cada reserva -->
            <div class="grid grid-cols-1 md:grid-cols-${Math.min(reservas.length, 3)} gap-3 mb-4">
                ${reservas.map(r => {
        const hab = habitacionesConfig[r.habitacion];
        const noches = calcularNoches(r.fechaEntrada, r.fechaSalida);
        const fechaE = new Date(r.fechaEntrada);
        const fechaS = new Date(r.fechaSalida);

        return `
                        <div class="border rounded-lg p-3 cursor-pointer hover:shadow-md transition-all" 
                             style="border-color: ${hab.color}; background: white;"
                             onclick="window.abrirEditarReserva(${JSON.stringify(r).replace(/"/g, '&quot;')})">
                            <div class="flex items-center mb-2">
                                <span class="inline-block w-3 h-3 rounded-full mr-2" style="background: ${hab.color};"></span>
                                <span class="font-semibold text-sm">${hab.nombre}</span>
                            </div>
                            <div class="text-xs mb-1">
                                <i class="fas fa-calendar-alt mr-1"></i>
                                ${fechaE.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} - 
                                ${fechaS.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                            </div>
                            <div class="text-xs">
                                <i class="fas fa-users mr-1"></i>${r.numPersonas} pers. • ${noches} noches
                            </div>
                            <div class="font-bold text-sm mt-2" style="color: ${hab.color};">
                                $${(noches * r.precio).toLocaleString()}
                            </div>
                        </div>
                    `;
    }).join('')}
            </div>

            <!-- Botones de acción -->
            <div class="flex gap-3 justify-end">
                <button onclick='window.generarInformeConsolidado(${JSON.stringify({ nombre: nombreHuesped, reservas })})' 
                        class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-all flex items-center">
                    <i class="fab fa-whatsapp mr-2"></i>WhatsApp Consolidado
                </button>
                <button onclick='window.generarPDFConsolidado(${JSON.stringify({ nombre: nombreHuesped, reservas })})' 
                        class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-all flex items-center">
                    <i class="fas fa-file-pdf mr-2"></i>PDF Consolidado
                </button>
            </div>
        </div>
    `;

    return card;
}

function renderSingleReservation(reserva, container) {
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
}

// Funciones globales para generar informes consolidados
window.generarInformeConsolidado = function (data) {
    const { nombre, reservas } = data;

    let mensaje = `🏨 *RESUMEN DE RESERVAS*\n`;
    mensaje += `👤 Cliente: *${nombre}*\n`;
    mensaje += `📋 Total de Reservas: *${reservas.length}*\n\n`;

    let montoTotal = 0;
    let nochesTotal = 0;

    reservas.forEach((r, index) => {
        const hab = habitacionesConfig[r.habitacion];
        const noches = calcularNoches(r.fechaEntrada, r.fechaSalida);
        const monto = noches * r.precio;
        montoTotal += monto;
        nochesTotal += noches;

        const fechaE = new Date(r.fechaEntrada);
        const fechaS = new Date(r.fechaSalida);

        mensaje += `*Reserva ${index + 1}:* ${hab.nombre}\n`;
        mensaje += `📅 ${fechaE.toLocaleDateString('es-ES')} → ${fechaS.toLocaleDateString('es-ES')}\n`;
        mensaje += `👥 ${r.numPersonas} persona${r.numPersonas > 1 ? 's' : ''} • ${noches} noche${noches > 1 ? 's' : ''}\n`;
        mensaje += `💰 $${monto.toLocaleString()}\n`;
        mensaje += `💳 ${r.estadoPago === 'pagado' ? '✅ Pagado' : r.estadoPago === 'parcial' ? '🟡 Parcial' : '⏳ Pendiente'}\n\n`;
    });

    mensaje += `━━━━━━━━━━━━━━━\n`;
    mensaje += `📊 *TOTALES:*\n`;
    mensaje += `🛏️ ${reservas.length} Habitación${reservas.length > 1 ? 'es' : ''}\n`;
    mensaje += `🌙 ${nochesTotal} Noche${nochesTotal > 1 ? 's' : ''}\n`;
    mensaje += `💵 *$${montoTotal.toLocaleString()}*\n\n`;
    mensaje += `📍 *Hostal Plaza Lebu*`;

    // Copiar al portapapeles
    navigator.clipboard.writeText(mensaje).then(() => {
        showToast('✅ Mensaje consolidado copiado al portapapeles', 'success');
    }).catch(err => {
        console.error('Error al copiar:', err);
        showToast('❌ Error al copiar mensaje', 'error');
    });
};

window.generarPDFConsolidado = function (data) {
    const { nombre, reservas } = data;
    showToast('📄 Preparando informe PDF de ' + reservas.length + ' reservas...', 'info');

    // Si jsPDF está disponible, podemos intentar un reporte más bonito
    // Por ahora, usamos el generador existente para cada una pero intentamos dar feedback
    let count = 0;
    const interval = setInterval(() => {
        if (count < reservas.length) {
            generarPDFReserva(reservas[count]);
            count++;
        } else {
            clearInterval(interval);
            showToast('✅ Se han generado ' + count + ' folios PDF', 'success');
        }
    }, 800);
};

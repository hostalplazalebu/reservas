import { habitacionesConfig, calcularNoches } from './utils.js';

export function updateHeaderStats(reservas) {
    const hoy = new Date().toISOString().split('T')[0];

    const ocupadasHoy = reservas.filter(r => {
        const entrada = r.fechaEntrada;
        const salida = r.fechaSalida;
        return hoy >= entrada && hoy < salida;
    }).length;

    const checkinsHoy = reservas.filter(r => r.fechaEntrada === hoy).length;
    const checkoutsHoy = reservas.filter(r => r.fechaSalida === hoy).length;

    // Estadísticas financieras
    const ingresosTotales = reservas.reduce((acc, r) => {
        if (r.estadoPago === 'pagado') return acc + r.montoTotal;
        if (r.estadoPago === 'parcial') return acc + (r.anticipo || 0);
        return acc;
    }, 0);

    const pendientesCobro = reservas.reduce((acc, r) => {
        const total = r.montoTotal || 0;
        const abono = r.anticipo || 0;
        return acc + (total - abono);
    }, 0);

    // Update header
    const elOcupadas = document.getElementById('header-ocupadas');
    const elDisponibles = document.getElementById('header-disponibles');
    const elCheckins = document.getElementById('header-checkins');
    const elCheckouts = document.getElementById('header-checkouts');
    const elIngresos = document.getElementById('header-ingresos');
    const elPendientes = document.getElementById('header-pendientes');

    const totalHabitaciones = Object.keys(habitacionesConfig).length;
    if (elOcupadas) elOcupadas.textContent = ocupadasHoy;
    if (elDisponibles) elDisponibles.textContent = totalHabitaciones - ocupadasHoy;
    if (elCheckins) elCheckins.textContent = checkinsHoy;
    if (elCheckouts) elCheckouts.textContent = checkoutsHoy;
    if (elIngresos) elIngresos.textContent = `$${ingresosTotales.toLocaleString()}`;
    if (elPendientes) elPendientes.textContent = `$${pendientesCobro.toLocaleString()}`;

    // Update dashboard cards
    const dCheckins = document.getElementById('dash-checkins-hoy');
    const dCheckouts = document.getElementById('dash-checkouts-hoy');
    const dOcupacion = document.getElementById('dash-ocupacion');
    const dHabOcupadas = document.getElementById('dash-habitaciones-ocupadas');

    if (dCheckins) dCheckins.textContent = checkinsHoy;
    if (dCheckouts) dCheckouts.textContent = checkoutsHoy;
    if (dOcupacion) dOcupacion.textContent = Math.round((ocupadasHoy / totalHabitaciones) * 100) + '%';
    if (dHabOcupadas) dHabOcupadas.textContent = `${ocupadasHoy} de ${totalHabitaciones} ocupadas`;

    // Pendientes
    const checkinsPendientes = reservas.filter(r =>
        r.fechaEntrada === hoy && !r.checkedIn
    ).length;
    const checkoutsPendientes = reservas.filter(r =>
        r.fechaSalida === hoy && !r.checkedOut
    ).length;

    const dCheckinsP = document.getElementById('dash-checkins-pendientes');
    const dCheckoutsP = document.getElementById('dash-checkouts-pendientes');

    if (dCheckinsP) dCheckinsP.textContent = `${checkinsPendientes} pendientes`;
    if (dCheckoutsP) dCheckoutsP.textContent = `${checkoutsPendientes} pendientes`;
}

export function cargarProximos7Dias(reservas) {
    const container = document.getElementById('proximos-dias');
    if (!container) return;
    container.innerHTML = '';

    const hoy = new Date();

    for (let i = 0; i < 7; i++) {
        const fecha = new Date(hoy);
        fecha.setDate(fecha.getDate() + i);
        const fechaStr = fecha.toISOString().split('T')[0];

        const reservasDelDia = reservas.filter(r => {
            return fechaStr >= r.fechaEntrada && fechaStr < r.fechaSalida;
        });

        const checkins = reservas.filter(r => r.fechaEntrada === fechaStr);
        const checkouts = reservas.filter(r => r.fechaSalida === fechaStr);

        const diaDiv = document.createElement('div');
        diaDiv.className = `dashboard-card p-4 ${i === 0 ? 'bg-blue-50' : ''}`;
        diaDiv.style.background = i === 0 ? 'var(--bg-secondary)' : 'var(--bg-primary)';

        diaDiv.innerHTML = `
            <div class="text-center">
                <div class="font-bold text-lg" style="color: var(--text-primary);">
                    ${fecha.getDate()}
                </div>
                <div class="text-sm mb-2" style="color: var(--text-secondary);">
                    ${fecha.toLocaleDateString('es-ES', { weekday: 'short' })}
                </div>
                <div class="text-xs space-y-1">
                    <div class="text-green-600">${checkins.length} entradas</div>
                    <div class="text-red-600">${checkouts.length} salidas</div>
                    <div style="color: var(--text-secondary);">${reservasDelDia.length} ocupadas</div>
                </div>
            </div>
        `;

        container.appendChild(diaDiv);
    }
}

export function cargarCheckinsHoy(reservas) {
    const hoy = new Date().toISOString().split('T')[0];
    const container = document.getElementById('checkins-hoy');
    if (!container) return;

    const checkinsHoy = reservas.filter(r => r.fechaEntrada === hoy);
    container.innerHTML = '';

    if (checkinsHoy.length === 0) {
        container.innerHTML = '<p class="text-gray-500">No hay check-ins programados para hoy</p>';
        return;
    }

    checkinsHoy.forEach(reserva => {
        const hab = habitacionesConfig[reserva.habitacion];
        const checkedIn = reserva.checkedIn;

        const item = document.createElement('div');
        item.className = `flex items-center justify-between p-3 rounded-lg border ${checkedIn ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`;
        item.style.background = checkedIn ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)';

        item.innerHTML = `
            <div class="flex items-center">
                <span class="inline-block w-3 h-3 rounded-full mr-3" style="background: ${hab.color}"></span>
                <div>
                    <div class="font-semibold" style="color: var(--text-primary);">${reserva.nombreHuesped}</div>
                    <div class="text-sm" style="color: var(--text-secondary);">${hab.nombre}</div>
                </div>
            </div>
            <div class="flex items-center">
                ${checkedIn ?
                '<span class="status-badge status-available">Realizado</span>' :
                `<button onclick="realizarCheckInReserva('${reserva.id}')" class="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm transition-all duration-300">
                        Check-in
                    </button>`
            }
            </div>
        `;

        container.appendChild(item);
    });
}

export function cargarCheckoutsHoy(reservas) {
    const hoy = new Date().toISOString().split('T')[0];
    const container = document.getElementById('checkouts-hoy');
    if (!container) return;

    const checkoutsHoy = reservas.filter(r => r.fechaSalida === hoy);
    container.innerHTML = '';

    if (checkoutsHoy.length === 0) {
        container.innerHTML = '<p class="text-gray-500">No hay check-outs programados para hoy</p>';
        return;
    }

    checkoutsHoy.forEach(reserva => {
        const hab = habitacionesConfig[reserva.habitacion];
        const checkedOut = reserva.checkedOut;

        const item = document.createElement('div');
        item.className = `flex items-center justify-between p-3 rounded-lg border ${checkedOut ? 'bg-gray-50 border-gray-200' : 'bg-red-50 border-red-200'}`;
        item.style.background = checkedOut ? 'var(--bg-secondary)' : 'rgba(239, 68, 68, 0.1)';

        item.innerHTML = `
            <div class="flex items-center">
                <span class="inline-block w-3 h-3 rounded-full mr-3" style="background: ${hab.color}"></span>
                <div>
                    <div class="font-semibold" style="color: var(--text-primary);">${reserva.nombreHuesped}</div>
                    <div class="text-sm" style="color: var(--text-secondary);">${hab.nombre}</div>
                </div>
            </div>
            <div class="flex items-center">
                ${checkedOut ?
                '<span class="status-badge status-available">Realizado</span>' :
                `<button onclick="realizarCheckOutReserva('${reserva.id}')" class="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm transition-all duration-300">
                        Check-out
                    </button>`
            }
            </div>
        `;

        container.appendChild(item);
    });
}

export function cargarProximasReservas(reservas) {
    const container = document.getElementById('proximas-reservas');
    if (!container) return;
    const hoy = new Date();

    const proximasReservas = reservas
        .filter(r => new Date(r.fechaEntrada) > hoy)
        .sort((a, b) => new Date(a.fechaEntrada) - new Date(b.fechaEntrada))
        .slice(0, 5);

    container.innerHTML = '';

    if (proximasReservas.length === 0) {
        container.innerHTML = '<p class="text-gray-500">No hay reservas próximas</p>';
        return;
    }

    proximasReservas.forEach(reserva => {
        const hab = habitacionesConfig[reserva.habitacion];
        const fechaEntrada = new Date(reserva.fechaEntrada);
        const diasRestantes = Math.ceil((fechaEntrada - hoy) / (1000 * 60 * 60 * 24));

        const item = document.createElement('div');
        item.className = 'flex items-center justify-between p-3 rounded-lg border cursor-pointer';
        item.style.background = 'var(--bg-secondary)';
        item.style.borderColor = 'var(--border-color)';
        item.onclick = () => window.abrirEditarReserva(reserva);

        item.innerHTML = `
            <div class="flex items-center">
                <span class="inline-block w-3 h-3 rounded-full mr-3" style="background: ${hab.color}"></span>
                <div>
                    <div class="font-semibold" style="color: var(--text-primary);">${reserva.nombreHuesped}</div>
                    <div class="text-sm" style="color: var(--text-secondary);">${hab.nombre} • ${fechaEntrada.toLocaleDateString('es-ES')}</div>
                </div>
            </div>
            <div class="text-right">
                <div class="text-sm font-semibold" style="color: var(--text-primary);">En ${diasRestantes} día${diasRestantes !== 1 ? 's' : ''}</div>
                <div class="text-xs" style="color: var(--text-secondary);">${calcularNoches(reserva.fechaEntrada, reserva.fechaSalida)} noche${calcularNoches(reserva.fechaEntrada, reserva.fechaSalida) !== 1 ? 's' : ''}</div>
            </div>
        `;

        container.appendChild(item);
    });
}

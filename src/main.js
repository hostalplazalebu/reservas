import { renderReservationsList } from './reservations.js';
import { updateHeaderStats, cargarProximos7Dias, cargarCheckinsHoy, cargarCheckoutsHoy, cargarProximasReservas } from './dashboard.js';
import { habitacionesConfig, showToast, calcularNoches } from './utils.js';
import { db } from './supabase.js';
import { generarMensajeWhatsApp, copiarAlPortapapeles } from './notifications.js';
import { generarPDFReserva } from './pdf_generator.js';
import { exportarReservas, importarReservas } from './data_manager.js';
import { generarGraficoOcupacion, generarGraficoIngresos } from './charts.js';
import { migrateLocalStorageToSupabase } from './migration.js';

// Variables globales
window.migrateData = migrateLocalStorageToSupabase;
let reservas = [];
let fechaActual = new Date();
let paginaActiva = 'calendario';
let tema = localStorage.getItem('tema') || 'light';
let userRole = 'viewer'; // Default to lowest role

// Expose globals for HTML inline events
window.showToast = showToast;
window.db = db;
window.toggleTheme = function () {
    tema = tema === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', tema);
    localStorage.setItem('tema', tema);
    const icon = document.getElementById('theme-icon');
    if (icon) icon.className = tema === 'light' ? 'fas fa-moon text-lg' : 'fas fa-sun text-lg';
    showToast(`Tema ${tema === 'light' ? 'claro' : 'oscuro'} activado`, 'info', 2000);
};

window.showPage = function (pageId, elemento = null) {
    paginaActiva = pageId;
    document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
    document.querySelectorAll('.nav-tab').forEach(t => {
        t.classList.remove('bg-blue-500', 'text-white');
        t.style.background = 'var(--bg-secondary)';
        t.style.color = 'var(--text-secondary)';
    });
    const pageElement = document.getElementById(pageId);
    if (pageElement) pageElement.classList.remove('hidden');
    const activeTab = elemento || document.querySelector(`[onclick*="${pageId}"]`);
    if (activeTab) {
        activeTab.classList.add('bg-blue-500', 'text-white');
        activeTab.style.background = '#3b82f6';
        activeTab.style.color = 'white';
    }

    refreshPageContent(pageId);
};

async function refreshPageContent(pageId) {
    if (pageId === 'calendario') generarCalendario();
    if (pageId === 'lista') {
        const container = document.getElementById('listaReservas');
        renderReservationsList(reservas, container);
    }
    if (pageId === 'dashboard') {
        updateHeaderStats(reservas);
        cargarProximos7Dias(reservas);
        cargarCheckinsHoy(reservas);
        cargarCheckoutsHoy(reservas);
        cargarProximasReservas(reservas);
    }
    if (pageId === 'estadisticas') {
        generarGraficoOcupacion(reservas);
        generarGraficoIngresos(reservas);
    }
    if (pageId === 'disponibilidad') {
        mostrarDisponibilidad();
    }
    if (pageId === 'usuarios') {
        cargarUsuarios();
    }
}

async function cargarUsuarios() {
    const listado = document.getElementById('listaUsuarios');
    if (!listado) return;

    try {
        const perfiles = await db.getAllProfiles();
        listado.innerHTML = perfiles.map(p => `
            <tr style="border-bottom: 1px solid var(--border-color);">
                <td class="py-4 px-4" style="color: var(--text-primary); text-align: left;">
                    <div class="font-bold">${p.email}</div>
                    <div class="text-xs opacity-60">${p.id}</div>
                </td>
                <td class="py-4 px-4" style="text-align: left;">
                    <span class="status-badge ${p.role === 'admin' ? 'bg-purple-100 text-purple-700' : (p.role === 'editor' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700')}">
                        ${p.role.toUpperCase()}
                    </span>
                </td>
                <td class="py-4 px-4" style="color: var(--text-secondary); text-align: left;">${new Date(p.created_at).toLocaleDateString()}</td>
                <td class="py-4 px-4 text-right">
                    <div class="flex items-center justify-end space-x-2">
                        <select onchange="updateUserRole('${p.id}', this.value)" class="px-2 py-1 rounded border text-sm" style="background: var(--bg-primary); color: var(--text-primary);">
                            <option value="viewer" ${p.role === 'viewer' ? 'selected' : ''}>Viewer</option>
                            <option value="editor" ${p.role === 'editor' ? 'selected' : ''}>Editor</option>
                            <option value="admin" ${p.role === 'admin' ? 'selected' : ''}>Admin</option>
                        </select>
                        <button onclick="enviarRecuperacion('${p.email}')" class="text-blue-500 hover:text-blue-700 p-1" title="Enviar correo de recuperación">
                            <i class="fas fa-key"></i>
                        </button>
                        <button onclick="eliminarPerfilUsuario('${p.id}', '${p.email}')" class="text-red-500 hover:text-red-700 p-1" title="Eliminar del sistema">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error(error);
        showToast('❌ Error al cargar usuarios', 'error');
    }
}

window.enviarRecuperacion = async function (email) {
    if (confirm(`¿Enviar correo de recuperación de contraseña a ${email}?`)) {
        try {
            await db.sendPasswordReset(email);
            showToast('✅ Correo de recuperación enviado', 'success');
        } catch (error) {
            console.error(error);
            showToast('❌ Error: ' + error.message, 'error');
        }
    }
};

window.eliminarPerfilUsuario = async function (uid, email) {
    if (confirm(`¿Eliminar perfil de ${email}? \n\nNOTA: Esto elimina el perfil en la app, pero el usuario seguirá existiendo en Supabase Auth. Deberá borrarlo manualmente desde el Dashboard de Supabase para prohibir su entrada por completo.`)) {
        try {
            await db.deleteProfile(uid);
            showToast('✅ Perfil eliminado', 'success');
            cargarUsuarios();
        } catch (error) {
            console.error(error);
            showToast('❌ Error al eliminar perfil', 'error');
        }
    }
};

window.updateUserRole = async function (uid, role) {
    try {
        await db.updateProfileRole(uid, role);
        showToast('✅ Rol de usuario actualizado', 'success');
        cargarUsuarios();
    } catch (error) {
        console.error(error);
        showToast('❌ No tienes permisos para cambiar roles', 'error');
    }
};

window.cambiarMes = function (direccion) {
    fechaActual.setMonth(fechaActual.getMonth() + direccion);
    generarCalendario();
};

window.verHoy = function () {
    fechaActual = new Date();
    generarCalendario();
};

window.openModal = function (modalId) {
    console.log('📂 openModal called for:', modalId);
    const modal = document.getElementById(modalId);
    console.log('📂 Modal element:', modal);
    if (modal) {
        modal.classList.add('active');
        console.log('📂 Classes after add:', modal.classList.toString());
        console.log('📂 Display style:', window.getComputedStyle(modal).display);
    } else {
        console.error('📂 Modal not found!');
    }
};

window.closeModal = function (modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
};

function generarCalendario() {
    const container = document.getElementById('calendarioDias');
    const mesActualElement = document.getElementById('mesActual');
    if (!container || !mesActualElement) return;

    container.innerHTML = '';
    const año = fechaActual.getFullYear();
    const mes = fechaActual.getMonth();
    const nombresMeses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    mesActualElement.textContent = `${nombresMeses[mes]} ${año}`;

    const primerDia = new Date(año, mes, 1);
    let diaSemana = primerDia.getDay();
    if (diaSemana === 0) diaSemana = 7;
    diaSemana -= 1;

    for (let i = 0; i < diaSemana; i++) {
        const dia = document.createElement('div');
        dia.className = 'calendar-day empty';
        dia.style.border = 'none'; // Cleaner look for empty days
        dia.style.background = 'transparent';
        container.appendChild(dia);
    }

    const diasEnMes = new Date(año, mes + 1, 0).getDate();
    const hoy = new Date();

    // Determine max items based on screen size (prevent overflow)
    const isMobile = window.innerWidth < 768;
    const maxItems = isMobile ? 2 : 4;

    for (let dia = 1; dia <= diasEnMes; dia++) {
        const diaElement = document.createElement('div');
        diaElement.className = 'calendar-day';
        const fechaStr = `${año}-${(mes + 1).toString().padStart(2, '0')}-${dia.toString().padStart(2, '0')}`;

        if (dia === hoy.getDate() && mes === hoy.getMonth() && año === hoy.getFullYear()) {
            diaElement.classList.add('today');
        }

        diaElement.innerHTML = `<div class="font-medium text-center mb-1 text-sm day-number">${dia}</div>`;

        // Filter reservations active this day
        const reservasDelDia = reservas.filter(r => {
            return fechaStr >= r.fechaEntrada && fechaStr < r.fechaSalida;
        });

        // Render ALL Items
        reservasDelDia.forEach((reserva) => {
            const habConfig = habitacionesConfig[reserva.habitacion] || { nombre: 'Desc.', color: '#999', clase: '' };
            const reservaDiv = document.createElement('div');

            // Shorten name heavily for mobile
            const nombreMostrar = isMobile
                ? reserva.nombreHuesped.substring(0, 4) + '..'
                : reserva.nombreHuesped.split(' ')[0].substring(0, 10);

            let clases = `reserva-item ${habConfig.clase}`;

            reservaDiv.className = clases;
            reservaDiv.title = `${reserva.nombreHuesped} - ${habConfig.nombre}`;
            reservaDiv.innerHTML = `<span>${nombreMostrar}</span>`;

            reservaDiv.onclick = (e) => {
                e.stopPropagation();
                if (userRole !== 'viewer') {
                    window.abrirEditarReserva(reserva);
                } else {
                    showToast('ℹ️ Solo lectura', 'info');
                }
            };
            diaElement.appendChild(reservaDiv);
        });

        container.appendChild(diaElement);
    }
}

// Reservation handling
const formReserva = document.getElementById('formReserva');
if (formReserva) {
    formReserva.addEventListener('submit', async function (e) {
        e.preventDefault();

        const habitacionesSeleccionadas = [];
        document.querySelectorAll('input[name="habitaciones"]:checked').forEach(checkbox => {
            habitacionesSeleccionadas.push(parseInt(checkbox.value));
        });

        if (habitacionesSeleccionadas.length === 0) {
            showToast('⚠️ Debe seleccionar al menos una habitación', 'warning');
            return;
        }

        const anticipoEl = document.getElementById('anticipo');
        const notasEl = document.getElementById('notas');

        const datosComunes = {
            nombreHuesped: document.getElementById('nombreHuesped').value,
            fechaEntrada: document.getElementById('fechaEntrada').value,
            fechaSalida: document.getElementById('fechaSalida').value,
            numPersonas: parseInt(document.getElementById('numPersonas').value),
            precio: parseInt(document.getElementById('precio').value),
            anticipo: anticipoEl ? (parseInt(anticipoEl.value) || 0) : 0,
            notas: notasEl ? notasEl.value : '',
            estadoPago: document.getElementById('estadoPago').value,
            metodoPago: document.getElementById('metodoPago').value
        };

        // Calcular monto total (noches * precio)
        const noches = calcularNoches(datosComunes.fechaEntrada, datosComunes.fechaSalida);
        datosComunes.montoTotal = noches * datosComunes.precio;

        // Conflict validation
        for (const habNum of habitacionesSeleccionadas) {
            const conflicto = reservas.find(r =>
                r.habitacion === habNum &&
                ((datosComunes.fechaEntrada >= r.fechaEntrada && datosComunes.fechaEntrada < r.fechaSalida) ||
                    (datosComunes.fechaSalida > r.fechaEntrada && datosComunes.fechaSalida <= r.fechaSalida) ||
                    (datosComunes.fechaEntrada <= r.fechaEntrada && datosComunes.fechaSalida >= r.fechaSalida))
            );

            if (conflicto) {
                if (!confirm(`⚠️ Conflicto detectado en Habitación ${habNum} con reserva de ${conflicto.nombreHuesped}. ¿Deseas continuar de todas formas?`)) {
                    return;
                }
            }
        }

        try {
            for (const habNum of habitacionesSeleccionadas) {
                await db.createReservation({
                    ...datosComunes,
                    habitacion: habNum
                });
            }

            reservas = await db.getReservations();
            closeModal('nuevaReserva');
            this.reset();
            generarCalendario();
            showToast('✅ Reserva(s) guardada(s) con éxito', 'success');
        } catch (error) {
            console.error(error);
            showToast('❌ Error al guardar la reserva', 'error');
        }
    });
}

// Edit/Delete Logic
let reservaEditando = null;

window.abrirEditarReserva = function (reserva) {
    reservaEditando = reserva;

    // Set basic fields
    const editNombre = document.getElementById('editNombreHuesped');
    const editFechaEntrada = document.getElementById('editFechaEntrada');
    const editFechaSalida = document.getElementById('editFechaSalida');
    const editHabitacion = document.getElementById('editHabitacion');
    const editNumPersonas = document.getElementById('editNumPersonas');
    const editPrecio = document.getElementById('editPrecio');
    const editAnticipo = document.getElementById('editAnticipo');
    const editNotas = document.getElementById('editNotas');
    const editEstadoPago = document.getElementById('editEstadoPago');
    const editMetodoPago = document.getElementById('editMetodoPago');

    if (!editNombre || !editFechaEntrada || !editFechaSalida || !editHabitacion || !editNumPersonas || !editPrecio) {
        console.error('Modal elements not found!');
        return;
    }

    editNombre.value = reserva.nombreHuesped;
    editFechaEntrada.value = reserva.fechaEntrada;
    editFechaSalida.value = reserva.fechaSalida;
    editHabitacion.value = reserva.habitacion;
    editNumPersonas.value = reserva.numPersonas;
    editPrecio.value = reserva.precio;
    if (editAnticipo) editAnticipo.value = reserva.anticipo || 0;
    if (editNotas) editNotas.value = reserva.notas || '';
    if (editEstadoPago) editEstadoPago.value = reserva.estadoPago || 'pendiente';
    if (editMetodoPago) editMetodoPago.value = reserva.metodoPago || 'efectivo';

    openModal('editarReserva');
};

const formEditarReserva = document.getElementById('formEditarReserva');
if (formEditarReserva) {
    formEditarReserva.addEventListener('submit', async function (e) {
        e.preventDefault();
        if (!reservaEditando) return;

        const updatedData = {
            nombreHuesped: document.getElementById('editNombreHuesped').value,
            fechaEntrada: document.getElementById('editFechaEntrada').value,
            fechaSalida: document.getElementById('editFechaSalida').value,
            habitacion: parseInt(document.getElementById('editHabitacion').value),
            numPersonas: parseInt(document.getElementById('editNumPersonas').value),
            precio: parseInt(document.getElementById('editPrecio').value),
            anticipo: parseInt(document.getElementById('editAnticipo').value) || 0,
            notas: document.getElementById('editNotas').value,
            estadoPago: document.getElementById('editEstadoPago').value,
            metodoPago: document.getElementById('editMetodoPago').value
        };

        const noches = calcularNoches(updatedData.fechaEntrada, updatedData.fechaSalida);
        updatedData.montoTotal = noches * updatedData.precio;

        try {
            await db.updateReservation(reservaEditando.id, updatedData);
            reservas = await db.getReservations();
            closeModal('editarReserva');
            generarCalendario();
            showToast('✅ Reserva actualizada', 'success');
            reservaEditando = null;
        } catch (error) {
            console.error(error);
            showToast('❌ Error al actualizar la reserva', 'error');
        }
    });
}

window.eliminarReservaActual = async function () {
    if (!reservaEditando) return;
    if (confirm(`¿Eliminar reserva de ${reservaEditando.nombreHuesped}?`)) {
        try {
            await db.deleteReservation(reservaEditando.id);
            reservas = await db.getReservations();
            closeModal('editarReserva');
            generarCalendario();
            showToast('✅ Reserva eliminada', 'success');
            reservaEditando = null;
        } catch (error) {
            console.error(error);
            showToast('❌ Error al eliminar la reserva', 'error');
        }
    }
};

window.abrirMensajeWhatsApp = function () {
    if (!reservaEditando) return;
    const mensaje = generarMensajeWhatsApp(reservaEditando);
    document.getElementById('mensajeWhatsappTexto').textContent = mensaje;
    openModal('whatsappModal');
};

window.copiarMensajeWhatsApp = async function () {
    const texto = document.getElementById('mensajeWhatsappTexto').textContent;
    try {
        await copiarAlPortapapeles(texto);
        showToast('✅ Mensaje copiado al portapapeles', 'success');
    } catch (err) {
        showToast('❌ Error al copiar mensaje', 'error');
    }
};

window.descargarPDFReserva = function () {
    if (!reservaEditando) return;
    try {
        generarPDFReserva(reservaEditando);
        showToast('✅ PDF generado con éxito', 'success');
    } catch (error) {
        console.error(error);
        showToast('❌ Error al generar PDF', 'error');
    }
};

window.exportarReservas = exportarReservas;
window.importarReservas = importarReservas;

window.realizarCheckInReserva = async function (id) {
    try {
        const reserva = reservas.find(r => r.id === id);
        if (!reserva) return;

        await db.updateReservation(id, { ...reserva, checkedIn: true });
        reservas = await db.getReservations();
        refreshPageContent(paginaActiva);
        showToast('📥 Check-in realizado con éxito', 'success');
    } catch (error) {
        console.error(error);
        showToast('❌ Error al realizar check-in', 'error');
    }
};

window.realizarCheckOutReserva = async function (id) {
    try {
        const reserva = reservas.find(r => r.id === id);
        if (!reserva) return;

        await db.updateReservation(id, { ...reserva, checkedOut: true });
        reservas = await db.getReservations();
        refreshPageContent(paginaActiva);
        showToast('📤 Check-out realizado con éxito', 'success');
    } catch (error) {
        console.error(error);
        showToast('❌ Error al realizar check-out', 'error');
    }
};

window.mostrarDisponibilidad = function () {
    const container = document.getElementById('estadoHabitaciones');
    if (!container) return;
    const hoy = new Date().toISOString().split('T')[0];

    container.innerHTML = '';

    for (let numHab = 1; numHab <= 5; numHab++) {
        const hab = habitacionesConfig[numHab];

        // Buscar reserva activa
        const reservaActual = reservas.find(r => {
            return r.habitacion == numHab && hoy >= r.fechaEntrada && hoy < r.fechaSalida;
        });

        const checkoutHoy = reservas.find(r =>
            r.habitacion == numHab && r.fechaSalida === hoy
        );
        const checkinHoy = reservas.find(r =>
            r.habitacion == numHab && r.fechaEntrada === hoy
        );

        let estadoLabel = '🟢 DISPONIBLE';
        let estadoColor = 'bg-green-500';
        let acciones = '';

        if (reservaActual) {
            estadoLabel = '🔴 OCUPADA';
            estadoColor = 'bg-red-500';
            if (reservaActual.fechaSalida === hoy && !reservaActual.checkedOut) {
                estadoLabel = '🟡 CHECK-OUT PENDIENTE';
                estadoColor = 'bg-yellow-500';
                acciones = `<button onclick="realizarCheckOutReserva('${reservaActual.id}')" class="w-full mt-3 bg-white text-yellow-600 font-bold py-2 rounded-lg">Check-out</button>`;
            }
        } else if (checkinHoy && !checkinHoy.checkedIn) {
            estadoLabel = '🟠 CHECK-IN PENDIENTE';
            estadoColor = 'bg-orange-500';
            acciones = `<button onclick="realizarCheckInReserva('${checkinHoy.id}')" class="w-full mt-3 bg-white text-orange-600 font-bold py-2 rounded-lg">Check-in</button>`;
        }

        const card = document.createElement('div');
        card.className = `p-4 rounded-xl text-white ${estadoColor} shadow-lg transition-transform hover:scale-105`;
        card.style.background = `linear-gradient(135deg, ${hab.color}, ${hab.color}dd)`;

        card.innerHTML = `
            <div class="flex justify-between items-start mb-4">
                <h3 class="text-xl font-bold">${hab.nombre}</h3>
                <span class="text-2xl">${hab.emoji || ''}</span>
            </div>
            <div class="font-bold mb-2">${estadoLabel}</div>
            <div class="text-xs opacity-90">
                ${reservaActual ? `Huésped: ${reservaActual.nombreHuesped}` : 'Sin reservas activas'}
            </div>
            ${acciones}
        `;
        container.appendChild(card);
    }
};

async function inicializarApp() {
    document.documentElement.setAttribute('data-theme', tema);
    const icon = document.getElementById('theme-icon');
    if (icon) icon.className = tema === 'light' ? 'fas fa-moon text-lg' : 'fas fa-sun text-lg';

    try {
        console.log('🚀 Inicializando aplicación...');

        // Fetch User Profile and Role
        let profile = null;
        try {
            profile = await db.getMyProfile();
        } catch (e) {
            console.error("Error al obtener perfil:", e);
            // Non-fatal, fallback to viewer
        }

        userRole = profile ? profile.role : 'viewer';
        console.log('👤 Usuario identificado:', profile?.email, 'Rol:', userRole);

        // Configure UI based on role
        document.querySelectorAll('.nav-tab').forEach(btn => btn.classList.add('hidden'));
        document.getElementById('nav-calendario').classList.remove('hidden');

        if (userRole === 'admin' || userRole === 'editor') {
            document.getElementById('nav-lista').classList.remove('hidden');
            document.querySelectorAll('[onclick="openModal(\'nuevaReserva\')"]').forEach(b => b.classList.remove('hidden'));
        } else {
            document.querySelectorAll('[onclick="openModal(\'nuevaReserva\')"]').forEach(b => b.classList.add('hidden'));
        }

        if (userRole === 'admin') {
            document.getElementById('nav-dashboard').classList.remove('hidden');
            document.getElementById('nav-disponibilidad').classList.remove('hidden');
            document.getElementById('nav-estadisticas').classList.remove('hidden');
            document.getElementById('nav-usuarios').classList.remove('hidden');
        }

        // Migration check
        const localData = JSON.parse(localStorage.getItem('hostalReservas')) || [];
        if (localData.length > 0) {
            await migrateLocalStorageToSupabase();
        }

        // Fetch reservations
        try {
            reservas = await db.getReservations();
            console.log(`✅ ${reservas.length} reservas cargadas.`);
        } catch (e) {
            console.error("Error al cargar reservas de Supabase:", e);
            showToast('⚠️ No se pudieron cargar datos de la nube. Revise el panel de Supabase.', 'error', 5000);
            reservas = []; // Fallback empty
        }

        generarCalendario();
        updateHeaderStats(reservas);

        if (paginaActiva === 'dashboard' && userRole === 'admin') {
            refreshPageContent('dashboard');
        } else if (paginaActiva !== 'calendario') {
            showPage('calendario');
        }
    } catch (error) {
        console.error("Error crítico en inicialización:", error);
        showToast('❌ Error crítico: ' + (error.message || 'Sin conexión'), 'error');
    }
}

function actualizarResumenHabitacionesForm() {
    const checkboxes = document.querySelectorAll('input[name="habitaciones"]:checked');
    const resumenDiv = document.getElementById('resumenHabitacionesForm');
    if (!resumenDiv) return;

    if (checkboxes.length === 0) {
        resumenDiv.textContent = 'Ninguna habitación seleccionada';
    } else {
        const habitaciones = Array.from(checkboxes).map(cb => habitacionesConfig[parseInt(cb.value)].nombre);
        resumenDiv.textContent = `Seleccionadas: ${habitaciones.join(', ')}`;
    }
}


// Authentication Handling
const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        try {
            await db.signIn(email, password);
            showToast('✅ Sesión iniciada', 'success');
        } catch (error) {
            console.error(error);
            showToast('❌ Error: Credenciales inválidas', 'error');
        }
    });
}

// Global Auth Listener
db.onAuthStateChange((event, session) => {
    const loginScreen = document.getElementById('login-screen');
    const appContent = document.getElementById('app-content');

    if (event === 'SIGNED_IN' || session) {
        loginScreen.classList.add('hidden');
        appContent.classList.remove('hidden');
        inicializarApp();
    } else {
        loginScreen.classList.remove('hidden');
        appContent.classList.add('hidden');
        // Reset app state if needed
        reservas = [];
    }
});

// Cache busting logic removed (one-time fix done)

document.addEventListener('DOMContentLoaded', () => {
    // We don't call inicializarApp here anymore, it's handled by the auth listener
    document.querySelectorAll('input[name="habitaciones"]').forEach(cb => {
        cb.addEventListener('change', actualizarResumenHabitacionesForm);
    });

    // Nuevo Usuario Form
    const formNuevoUsuario = document.getElementById('formNuevoUsuario');
    if (formNuevoUsuario) {
        formNuevoUsuario.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('regEmail').value;
            const password = document.getElementById('regPassword').value;

            try {
                showToast('⏳ Creando cuenta...', 'info');
                await db.signUp(email, password);
                showToast('✅ Usuario creado. Se le ha enviado un correo de confirmación (si está habilitado).', 'success', 5000);
                closeModal('nuevoUsuario');
                formNuevoUsuario.reset();
                cargarUsuarios(); // Refresh list
            } catch (error) {
                console.error(error);
                showToast('❌ Error: ' + error.message, 'error');
            }
        });
    }
});

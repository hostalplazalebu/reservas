export let habitacionesConfig = {
    1: { nombre: 'Habitación 1', color: '#ef4444', emoji: '🔴', clase: 'hab-1', precio: 45000 },
    2: { nombre: 'Habitación 2', color: '#3b82f6', emoji: '🔵', clase: 'hab-2', precio: 45000 },
    3: { nombre: 'Habitación 3', color: '#10b981', emoji: '🟢', clase: 'hab-3', precio: 48000 },
    4: { nombre: 'Habitación 4', color: '#f59e0b', emoji: '🟠', clase: 'hab-4', precio: 42000 },
    5: { nombre: 'Habitación 5', color: '#8b5cf6', emoji: '🟣', clase: 'hab-5', precio: 50000 }
};

export function setHabitacionesConfig(config) {
    habitacionesConfig = config;
}

export function showToast(message, type = 'success', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="flex items-center justify-between">
            <span>${message}</span>
            <button onclick="this.parentElement.parentElement.remove()" class="ml-4 opacity-70 hover:opacity-100">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;

    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 100);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, duration);
}

export function calcularNoches(entrada, salida) {
    const fechaEntrada = new Date(entrada);
    const fechaSalida = new Date(salida);
    const diferencia = fechaSalida - fechaEntrada;
    return Math.ceil(diferencia / (1000 * 60 * 60 * 24));
}

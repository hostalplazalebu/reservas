import { habitacionesConfig } from './utils.js';

export function generarMensajeWhatsApp(reserva) {
    const fechaEntrada = new Date(reserva.fechaEntrada + 'T00:00:00');
    const fechaSalida = new Date(reserva.fechaSalida + 'T00:00:00');
    const noches = Math.ceil((fechaSalida - fechaEntrada) / (1000 * 60 * 60 * 24));
    const precioTotal = reserva.precio * noches;

    const hab = habitacionesConfig[reserva.habitacion];

    const opcionesFecha = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const fechaEntradaStr = fechaEntrada.toLocaleDateString('es-CL', opcionesFecha);
    const fechaSalidaStr = fechaSalida.toLocaleDateString('es-CL', opcionesFecha);

    const anticipo = reserva.anticipo || 0;
    const saldoPendiente = precioTotal - anticipo;

    let mensaje = `🏨 *CONFIRMACIÓN DE RESERVA*\n`;
    mensaje += `*HOSTAL PLAZA LEBU*\n\n`;
    mensaje += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
    mensaje += `👤 *DATOS DEL HUÉSPED*\n`;
    mensaje += `Nombre: ${reserva.nombreHuesped}\n`;
    mensaje += `Personas: ${reserva.numPersonas}\n\n`;
    mensaje += `📅 *FECHAS DE ESTADÍA*\n`;
    mensaje += `Check-in: ${fechaEntradaStr}\n`;
    mensaje += `Check-out: ${fechaSalidaStr}\n`;
    mensaje += `Noches: ${noches}\n\n`;
    mensaje += `🏠 *HABITACIÓN ASIGNADA*\n`;
    mensaje += `${hab.emoji} ${hab.nombre}\n\n`;
    mensaje += `💰 *DETALLES DE PAGO*\n`;
    mensaje += `Precio por noche: $${reserva.precio.toLocaleString('es-CL')}\n`;
    mensaje += `Total estadía: $${precioTotal.toLocaleString('es-CL')}\n`;
    mensaje += `Anticipo pagado: $${anticipo.toLocaleString('es-CL')}\n`;
    mensaje += `Saldo pendiente: $${saldoPendiente.toLocaleString('es-CL')}\n\n`;
    mensaje += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
    mensaje += `📍 *INFORMACIÓN IMPORTANTE*\n\n`;
    mensaje += `⏰ *Horarios:*\n`;
    mensaje += `•  Check-in: A partir de las 14:00 hrs\n`;
    mensaje += `•  Check-out: Hasta las 12:00 hrs\n\n`;
    mensaje += `🚗 *Instrucciones de llegada:*\n`;
    mensaje += `Por favor, avísanos 20 minutos antes de tu llegada para poder recibirte adecuadamente.\n\n`;
    mensaje += `📞 *Contacto:*\n`;
    mensaje += `Hostal Plaza Lebu\n`;
    mensaje += `Dirección: Pérez 672, Lebu\n`;
    mensaje += `Teléfono: +56 9 9573 9562\n`;
    mensaje += `Email: hostalplazalebu@gmail.com\n\n`;
    if (reserva.notas && reserva.notas.trim()) {
        mensaje += `📝 *Notas:* ${reserva.notas}\n\n`;
    }
    mensaje += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
    mensaje += `¡Esperamos recibirte pronto! 🌟\n`;
    mensaje += `Equipo Hostal Plaza Lebu`;

    return mensaje;
}

export function copiarAlPortapapeles(texto) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(texto);
    } else {
        const textarea = document.createElement('textarea');
        textarea.value = texto;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            document.body.removeChild(textarea);
            return Promise.resolve();
        } catch (err) {
            document.body.removeChild(textarea);
            return Promise.reject(err);
        }
    }
}

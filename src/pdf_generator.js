import { jsPDF } from 'jspdf';
import { habitacionesConfig } from './utils.js';

export function generarPDFReserva(reserva) {
    const doc = new jsPDF();
    const hab = habitacionesConfig[reserva.habitacion];

    // Configuración de fechas
    const fechaEntrada = new Date(reserva.fechaEntrada + 'T00:00:00');
    const fechaSalida = new Date(reserva.fechaSalida + 'T00:00:00');
    const opcionesFecha = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const fechaEntradaStr = fechaEntrada.toLocaleDateString('es-CL', opcionesFecha);
    const fechaSalidaStr = fechaSalida.toLocaleDateString('es-CL', opcionesFecha);
    const noches = Math.ceil((fechaSalida - fechaEntrada) / (1000 * 60 * 60 * 24));
    const precioTotal = reserva.precio * noches;
    const anticipo = reserva.anticipo || 0;
    const saldoPendiente = precioTotal - anticipo;

    // Header
    doc.setFillColor(59, 130, 246); // Blue 600
    doc.rect(0, 0, 210, 40, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('CONFIRMACIÓN DE RESERVA', 105, 20, { align: 'center' });

    doc.setFontSize(14);
    doc.text('HOSTAL PLAZA LEBU', 105, 30, { align: 'center' });

    // Body
    doc.setTextColor(33, 33, 33);
    let y = 55;

    // Datos del Huésped
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('DATOS DEL HUÉSPED', 20, y);
    doc.line(20, y + 2, 190, y + 2);
    y += 10;

    doc.setFont('helvetica', 'normal');
    doc.text(`Nombre: ${reserva.nombreHuesped}`, 25, y);
    y += 7;
    doc.text(`Personas: ${reserva.numPersonas}`, 25, y);
    y += 15;

    // Fechas
    doc.setFont('helvetica', 'bold');
    doc.text('FECHAS DE ESTADÍA', 20, y);
    doc.line(20, y + 2, 190, y + 2);
    y += 10;

    doc.setFont('helvetica', 'normal');
    doc.text(`Check-in: ${fechaEntradaStr}`, 25, y);
    y += 7;
    doc.text(`Check-out: ${fechaSalidaStr}`, 25, y);
    y += 7;
    doc.text(`Noches: ${noches}`, 25, y);
    y += 15;

    // Habitación
    doc.setFont('helvetica', 'bold');
    doc.text('HABITACIÓN ASIGNADA', 20, y);
    doc.line(20, y + 2, 190, y + 2);
    y += 10;

    doc.setFont('helvetica', 'normal');
    doc.text(`${hab.nombre}`, 25, y);
    y += 15;

    // Detalles de Pago
    doc.setFont('helvetica', 'bold');
    doc.text('DETALLES DE PAGO', 20, y);
    doc.line(20, y + 2, 190, y + 2);
    y += 10;

    doc.setFont('helvetica', 'normal');
    doc.text(`Precio por noche: $${reserva.precio.toLocaleString('es-CL')}`, 25, y);
    y += 7;
    doc.text(`Total estadía: $${precioTotal.toLocaleString('es-CL')}`, 25, y);
    y += 7;
    doc.text(`Anticipo pagado: $${anticipo.toLocaleString('es-CL')}`, 25, y);
    y += 10;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(`Saldo pendiente: $${saldoPendiente.toLocaleString('es-CL')}`, 25, y);
    y += 20;

    // Información Importante
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('INFORMACIÓN IMPORTANTE', 20, y);
    doc.line(20, y + 2, 190, y + 2);
    y += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Check-in: A partir de las 14:00 hrs', 25, y);
    y += 5;
    doc.text('Check-out: Hasta las 12:00 hrs', 25, y);
    y += 5;
    doc.text('Instrucciones: Avísanos 20 minutos antes de llegar.', 25, y);
    y += 15;

    // Footer
    doc.setTextColor(100, 100, 100);
    doc.text('Pérez 672, Lebu | +56 9 9573 9562 | hostalplazalebu@gmail.com', 105, 280, { align: 'center' });

    doc.save(`Reserva_${reserva.nombreHuesped.replace(/ /g, '_')}.pdf`);
}

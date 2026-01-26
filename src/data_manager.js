import { supabase } from './supabase.js';
import { showToast } from './utils.js';
import * as XLSX from 'xlsx';

export async function exportarReservas() {
    try {
        showToast('⏳ Iniciando exportación...', 'info');

        // 1. Fetch raw data from Supabase
        const { data, error } = await supabase
            .from('reservations')
            .select('*')
            .order('created_at', { ascending: true });

        if (error) throw error;

        if (!data || data.length === 0) {
            showToast('⚠️ No hay datos para exportar', 'warning');
            return;
        }

        // 2. Prepare JSON file
        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        // 3. Trigger download
        const fecha = new Date().toISOString().split('T')[0];
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup_reservas_${fecha}.json`;
        document.body.appendChild(a);
        a.click();

        // Cleanup
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showToast('✅ Exportación completada', 'success');

    } catch (error) {
        console.error('Error al exportar:', error);
        showToast('❌ Error al exportar datos', 'error');
    }
}

export function importarReservas() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '*/*'; // Aceptar todo para evitar problemas de SO y extensiones

    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const fileName = file.name;
        showToast(`📂 Procesando: ${fileName}`, 'info');

        try {
            const reader = new FileReader();

            // Simple extension check
            const isJson = fileName.toLowerCase().endsWith('.json');
            const isExcel = fileName.match(/\.(xlsx|xls)$/i);
            const isCsv = fileName.toLowerCase().endsWith('.csv');

            reader.onload = async (event) => {
                try {
                    let parsedData = [];
                    const content = event.target.result;

                    if (isJson) {
                        if (typeof content === 'string' && content.trim().startsWith('PK')) {
                            throw new Error('Archivo incorrecto: Parece un Excel renombrado a .json. Usa el .xlsx original.');
                        }
                        parsedData = JSON.parse(content);
                    }
                    else if (isExcel) {
                        if (typeof XLSX === 'undefined') throw new Error('Cargando librería... Intente de nuevo en 5 seg.');
                        const data = new Uint8Array(content);
                        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
                        parsedData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
                    }
                    else {
                        // Assume CSV (default or fallback)
                        if (typeof XLSX !== 'undefined') {
                            const wb = XLSX.read(content, { type: 'string', raw: true });
                            if (wb.SheetNames.length > 0) {
                                parsedData = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
                            }
                        }

                        // Fallback manual CSV parser
                        if (!parsedData || parsedData.length === 0) {
                            console.warn('Usando parser manual CSV');
                            const lines = content.split(/\r\n|\n/).filter(line => line.trim());
                            if (lines.length < 2) throw new Error('CSV vacío o sin cabeceras');

                            // Detect delimiter
                            const firstLine = lines[0];
                            const commaCount = (firstLine.match(/,/g) || []).length;
                            const semiCount = (firstLine.match(/;/g) || []).length;
                            const delimiter = semiCount > commaCount ? ';' : ',';
                            console.log(`Delimitador detectado: "${delimiter}"`);

                            const headers = firstLine.split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''));

                            parsedData = lines.slice(1).map(line => {
                                // Simple split (robust enough for simple CSVs without internal commas/quotes)
                                // For stricter CSV parsing we'd need a regex loop, but let's try simple first as it covers 90%
                                const values = line.split(delimiter).map(v => v.trim().replace(/^"|"$/g, ''));
                                let obj = {};
                                headers.forEach((h, i) => {
                                    if (values[i] !== undefined) obj[h] = values[i];
                                });
                                return obj;
                            });
                        }
                    }

                    await procesarDatosImportados(parsedData);

                } catch (err) {
                    console.error('Parsing Error:', err);
                    showToast(`❌ Error al leer archivo: ${err.message}`, 'error', 6000);
                }
            };

            if (isExcel) {
                reader.readAsArrayBuffer(file);
            } else {
                reader.readAsText(file, 'UTF-8');
            }

        } catch (err) {
            console.error(err);
            showToast('❌ Error crítico', 'error');
        }
    };
    input.click();
}

async function procesarDatosImportados(rawData) {
    if (!rawData || !Array.isArray(rawData) || rawData.length === 0) {
        throw new Error('No se encontraron datos interpretables.');
    }

    // Helper insensible a mayúsculas
    const getVal = (row, ...keys) => {
        const search = keys.map(k => k.toLowerCase().trim());
        for (let key of Object.keys(row)) {
            if (search.includes(key.toLowerCase().trim())) return row[key];
        }
        return undefined;
    };

    const formatDate = (dateIn) => {
        if (!dateIn) return null;
        // Excel serial date check (number > 20000)
        if (typeof dateIn === 'number' && dateIn > 25000) {
            return new Date(Math.round((dateIn - 25569) * 86400 * 1000)).toISOString().split('T')[0];
        }

        let d = new Date(dateIn);
        if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];

        // Try parsing DD/MM/YYYY manually
        if (typeof dateIn === 'string' && dateIn.includes('/')) {
            const [day, month, year] = dateIn.split('/');
            if (year && month && day) return `${year}-${month}-${day}`;
        }

        return null;
    };

    const mapped = rawData.map(row => {
        // MAPPING USING SPECIFIC KEYS FROM CSV
        const nombre = getVal(row, 'Nombre', 'nombreHuesped', 'Cliente');
        const habitacionRaw = getVal(row, 'Habitación', 'Habitacion', 'room', 'hab');
        const entrada = getVal(row, 'Fecha Entrada', 'fechaEntrada', 'Entrada', 'Checkin');
        const salida = getVal(row, 'Fecha Salida', 'fechaSalida', 'Salida', 'Checkout');
        const personas = getVal(row, 'Personas', 'numPersonas', 'Pax');
        const precioRaw = getVal(row, 'Precio por Noche', 'precio', 'monto', 'tarifa', 'Total');
        const notas = getVal(row, 'Notas', 'notas', 'comentarios');

        // Parsing Habitacion
        let habitacion = 0;
        if (habitacionRaw) {
            const match = String(habitacionRaw).match(/\d+/);
            if (match) habitacion = parseInt(match[0]);
        }

        // Parsing Precio
        let precio = 0;
        if (precioRaw) {
            const clean = String(precioRaw).replace(/[^0-9]/g, '');
            precio = parseInt(clean) || 0;
        }

        return {
            nombre_huesped: nombre || 'Sin Nombre',
            fecha_entrada: formatDate(entrada),
            fecha_salida: formatDate(salida),
            habitacion_id: habitacion,
            num_personas: parseInt(personas || 1),
            precio_noche: precio,
            anticipo: 0,
            notas: notas || ''
            // DELETED: estado_pago, metodo_pago because missing in DB schema
        };
    }).filter(r => r.fecha_entrada && r.fecha_salida);

    if (mapped.length === 0) {
        console.error('Row 1 keys:', Object.keys(rawData[0]));
        alert('Error: No se pudieron leer las columnas.\nSe esperaban: Nombre, Habitación, Fecha Entrada, Fecha Salida\nSe encontraron: ' + Object.keys(rawData[0]).join(', '));
        return;
    }

    // Calcular montos totales si faltan - use snake_case output
    mapped.forEach(r => {
        if (r.precio_noche && r.fecha_entrada && r.fecha_salida) {
            const days = Math.ceil((new Date(r.fecha_salida) - new Date(r.fecha_entrada)) / (86400000));
            // Wait, schema does not have monto_total either? 
            // Checking schema... it implies NO monto_total column in the CREATE TABLE block I saw.
            // But verify: lines 21-35 of schema don't show it.
            // So omit that too.
        }
    });

    showToast(`⏳ Guardando ${mapped.length} reservas...`, 'info');

    // Insert to Supabase
    const { error } = await supabase.from('reservations').insert(mapped);

    if (error) {
        console.error(error);
        showToast('❌ Error al guardar: ' + error.message, 'error');
    } else {
        showToast('✅ Importación exitosa!', 'success');
        setTimeout(() => window.location.reload(), 1500);
    }
}

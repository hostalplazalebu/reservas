export let charts = {};

export function generarGraficoOcupacion(reservas) {
    const ctx = document.getElementById('graficoOcupacion');
    if (!ctx) return;
    if (charts.ocupacion) charts.ocupacion.destroy();

    // Count reservations per room
    const counts = [1, 2, 3, 4, 5].map(hab => reservas.filter(r => r.habitacion === hab).length);

    charts.ocupacion = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Hab 1', 'Hab 2', 'Hab 3', 'Hab 4', 'Hab 5'],
            datasets: [{
                data: counts,
                backgroundColor: ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim() }
                }
            }
        }
    });
}

export function generarGraficoIngresos(reservas) {
    const ctx = document.getElementById('graficoIngresos');
    if (!ctx) return;
    if (charts.ingresos) charts.ingresos.destroy();

    // Simple mock data for now, real logic would group by month
    charts.ingresos = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
            datasets: [{
                label: 'Ingresos ($)',
                data: [450000, 520000, 380000, 610000, 490000, 550000],
                backgroundColor: '#3b82f6'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { ticks: { color: getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim() } },
                x: { ticks: { color: getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim() } }
            }
        }
    });
}

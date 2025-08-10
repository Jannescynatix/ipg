// public/js/admin.js (kompletter Code)
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login';
        return;
    }

    const logoutBtn = document.getElementById('logout-btn');
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('token');
        window.location.href = '/login';
    });

    const fetchDashboardData = async () => {
        try {
            const response = await fetch('/api/dashboard/stats', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.status === 401 || response.status === 403) {
                localStorage.removeItem('token');
                window.location.href = '/login';
                return;
            }

            const data = await response.json();

            document.getElementById('total-visits').textContent = data.totalVisits;
            document.getElementById('unique-ips').textContent = data.uniqueIPs;
            document.getElementById('online-users').textContent = data.onlineUsers;
            document.getElementById('failed-logins').textContent = data.failedLoginCount; // NEU: fehlgeschlagene Logins

            const tableBody = document.querySelector('#visit-table tbody');
            tableBody.innerHTML = '';

            data.visits.forEach(visit => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${visit.ipAddress}</td>
                    <td>${visit.city ? `${visit.city}, ${visit.country}` : 'Unbekannt'}</td>
                    <td>${visit.device}</td>
                    <td>${visit.browser}</td>
                    <td>${new Date(visit.timestamp).toLocaleString()}</td>
                `;
                tableBody.appendChild(row);
            });

            createVisitsChart(data.visitsByDay);
            createOSChart(data.visitsByOS); // NEU: Aufruf zum Erstellen des OS-Diagramms

        } catch (error) {
            console.error('Fehler beim Abrufen der Dashboard-Daten:', error);
        }
    };

    // Funktion zum Erstellen des Balkendiagramms (Besuche pro Tag)
    const createVisitsChart = (visitsData) => {
        const ctx = document.getElementById('visitsChart').getContext('2d');
        const labels = visitsData.map(item => item._id);
        const counts = visitsData.map(item => item.count);

        if (window.visitsChartInstance) {
            window.visitsChartInstance.destroy();
        }

        window.visitsChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Anzahl der Besuche',
                    data: counts,
                    backgroundColor: 'rgba(0, 119, 182, 0.7)',
                    borderColor: 'rgba(0, 119, 182, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Anzahl' }
                    },
                    x: {
                        title: { display: true, text: 'Datum' }
                    }
                }
            }
        });
    };

    // NEU: Funktion zum Erstellen des Kreisdiagramms (Betriebssysteme)
    const createOSChart = (osData) => {
        const ctx = document.getElementById('osChart').getContext('2d');
        const labels = osData.map(item => item._id);
        const counts = osData.map(item => item.count);

        if (window.osChartInstance) {
            window.osChartInstance.destroy();
        }

        const backgroundColors = [
            'rgba(255, 99, 132, 0.7)',
            'rgba(54, 162, 235, 0.7)',
            'rgba(255, 206, 86, 0.7)',
            'rgba(75, 192, 192, 0.7)',
            'rgba(153, 102, 255, 0.7)',
            'rgba(255, 159, 64, 0.7)'
        ];

        window.osChartInstance = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Verwendete Betriebssysteme',
                    data: counts,
                    backgroundColor: backgroundColors,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed !== null) {
                                    label += context.parsed;
                                }
                                return label;
                            }
                        }
                    }
                }
            }
        });
    };

    fetchDashboardData();
    setInterval(fetchDashboardData, 30000);
});
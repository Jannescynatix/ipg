// public/js/admin.js (komplett)

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

        } catch (error) {
            console.error('Fehler beim Abrufen der Dashboard-Daten:', error);
        }
    };

    // Funktion zum Erstellen des Diagramms
    const createVisitsChart = (visitsData) => {
        const ctx = document.getElementById('visitsChart').getContext('2d');
        const labels = visitsData.map(item => item._id);
        const counts = visitsData.map(item => item.count);

        // Zerstöre das alte Diagramm, falls es existiert, um Fehler zu vermeiden
        if (window.myChart) {
            window.myChart.destroy();
        }

        window.myChart = new Chart(ctx, {
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
                        title: {
                            display: true,
                            text: 'Anzahl'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Datum'
                        }
                    }
                }
            }
        });
    };

    fetchDashboardData();
    setInterval(fetchDashboardData, 5000);
});
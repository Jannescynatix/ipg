// public/js/admin.js
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
            tableBody.innerHTML = ''; // Vorherige Einträge löschen

            data.visits.forEach(visit => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${visit.ipAddress}</td>
                    <td>${visit.city}, ${visit.country}</td>
                    <td>${visit.device}</td>
                    <td>${visit.browser}</td>
                    <td>${new Date(visit.timestamp).toLocaleString()}</td>
                `;
                tableBody.appendChild(row);
            });
        } catch (error) {
            console.error('Fehler beim Abrufen der Dashboard-Daten:', error);
        }
    };

    // Daten beim Laden der Seite und alle 30 Sekunden aktualisieren
    fetchDashboardData();
    setInterval(fetchDashboardData, 30000);
});
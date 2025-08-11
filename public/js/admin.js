document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login';
        return;
    }

    const logoutBtn = document.getElementById('logout-btn');
    logoutBtn.addEventListener('click', async () => {
        try {
            await fetch('/api/logout', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
        } catch (error) {
            console.error('Fehler beim Senden des Logout-Signals:', error);
        }
        localStorage.removeItem('token');
        window.location.href = '/login';
    });

    // Globale Variablen zum Speichern aller Daten der Listen
    let allVisits = [];
    let allFailedLogins = [];
    let allSuccessfulLogins = [];
    let allSuccessfulLogouts = [];
    let allGiveawayParticipants = [];

    // --- Render-Funktionen für die Tabellen ---
    const renderTable = (tableId, data, limit = 20) => {
        const tableBody = document.querySelector(`#${tableId} tbody`);
        tableBody.innerHTML = '';

        const dataToShow = limit ? data.slice(0, limit) : data;

        dataToShow.forEach(item => {
            const row = document.createElement('tr');
            if (tableId === 'visit-table') {
                row.innerHTML = `
                    <td>${item.ipAddress}</td>
                    <td>${item.city ? `${item.city}, ${item.country}` : 'Unbekannt'}</td>
                    <td>${item.device}</td>
                    <td>${item.browser}</td>
                    <td>${item.duration ? `${item.duration}s` : 'N/A'}</td>
                    <td>${new Date(item.timestamp).toLocaleString()}</td>
                `;
            } else if (tableId === 'failed-logins-table' || tableId === 'successful-logins-table' || tableId === 'successful-logouts-table') {
                row.innerHTML = `
                    <td>${item.ipAddress}</td>
                    <td>${item.username}</td>
                    <td>${new Date(item.timestamp).toLocaleString()}</td>
                `;
            } else if (tableId === 'giveaway-participants-table') {
                row.innerHTML = `
                    <td>${item.name}</td>
                    <td>${item.email}</td>
                    <td>${item.address}</td>
                    <td>${new Date(item.timestamp).toLocaleString()}</td>
                `;
            }
            tableBody.appendChild(row);
        });

        // Button-Logik: Anzeigen oder Verbergen des Buttons
        const button = document.getElementById(`show-all-${tableId.replace('-table', '')}-btn`);
        if (button) {
            if (data.length > limit) {
                button.style.display = 'block';
                button.textContent = limit ? 'Alle Einträge anzeigen' : 'Weniger anzeigen';
            } else {
                button.style.display = 'none';
            }
        }
    };


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
            document.getElementById('failed-logins').textContent = data.failedLoginCount;
            document.getElementById('avg-duration').textContent = `${data.avgDuration}s`;

            // Speichern der vollständigen Daten und Rendern mit Limit
            allVisits = data.visits;
            renderTable('visit-table', allVisits, 20);

            createVisitsChart(data.visitsByDay);
            createOSChart(data.visitsByOS);
            createBrowserChart(data.visitsByBrowser);

            // Abrufen und Verarbeiten der anderen Tabellen
            fetchFailedLogins();
            fetchSuccessfulLogins();
            fetchSuccessfulLogouts();
            fetchGiveawayParticipants();

        } catch (error) {
            console.error('Fehler beim Abrufen der Dashboard-Daten:', error);
        }
    };

    const fetchFailedLogins = async () => {
        try {
            const response = await fetch('/api/failed-logins', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Fehler beim Abrufen der fehlgeschlagenen Logins.');
            }

            allFailedLogins = await response.json();
            renderTable('failed-logins-table', allFailedLogins, 20);

        } catch (error) {
            console.error('Fehler beim Abrufen der fehlgeschlagenen Logins:', error);
        }
    };

    const fetchSuccessfulLogins = async () => {
        try {
            const response = await fetch('/api/successful-logins', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!response.ok) {
                throw new Error('Fehler beim Abrufen der erfolgreichen Logins.');
            }
            allSuccessfulLogins = await response.json();
            renderTable('successful-logins-table', allSuccessfulLogins, 20);
        } catch (error) {
            console.error('Fehler beim Abrufen der erfolgreichen Logins:', error);
        }
    };

    const fetchSuccessfulLogouts = async () => {
        try {
            const response = await fetch('/api/successful-logouts', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!response.ok) {
                throw new Error('Fehler beim Abrufen der erfolgreichen Logouts.');
            }
            allSuccessfulLogouts = await response.json();
            renderTable('successful-logouts-table', allSuccessfulLogouts, 20);
        } catch (error) {
            console.error('Fehler beim Abrufen der erfolgreichen Logouts:', error);
        }
    };

    const fetchGiveawayParticipants = async () => {
        try {
            const response = await fetch('/api/giveaway-participants', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!response.ok) {
                throw new Error('Fehler beim Abrufen der Gewinnspiel-Teilnehmer.');
            }
            allGiveawayParticipants = await response.json();
            renderTable('giveaway-participants-table', allGiveawayParticipants, 20);
        } catch (error) {
            console.error('Fehler beim Abrufen der Gewinnspiel-Teilnehmer:', error);
        }
    };

    // --- Event-Listener für die "Mehr anzeigen"-Buttons ---
    document.getElementById('show-all-visits-btn').addEventListener('click', () => {
        renderTable('visit-table', allVisits, null);
    });

    document.getElementById('show-all-failed-logins-btn').addEventListener('click', () => {
        renderTable('failed-logins-table', allFailedLogins, null);
    });

    document.getElementById('show-all-successful-logins-btn').addEventListener('click', () => {
        renderTable('successful-logins-table', allSuccessfulLogins, null);
    });

    document.getElementById('show-all-successful-logouts-btn').addEventListener('click', () => {
        renderTable('successful-logouts-table', allSuccessfulLogouts, null);
    });

    document.getElementById('show-all-giveaway-participants-btn').addEventListener('click', () => {
        renderTable('giveaway-participants-table', allGiveawayParticipants, null);
    });

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

    const createBrowserChart = (browserData) => {
        const ctx = document.getElementById('browserChart').getContext('2d');
        const labels = browserData.map(item => item._id);
        const counts = browserData.map(item => item.count);

        if (window.browserChartInstance) {
            window.browserChartInstance.destroy();
        }

        const backgroundColors = [
            'rgba(255, 99, 132, 0.7)',
            'rgba(54, 162, 235, 0.7)',
            'rgba(255, 206, 86, 0.7)',
            'rgba(75, 192, 192, 0.7)',
            'rgba(153, 102, 255, 0.7)',
            'rgba(255, 159, 64, 0.7)'
        ];

        window.browserChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Verwendete Browser',
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
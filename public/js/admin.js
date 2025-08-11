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

    const clearDataBtn = document.getElementById('clear-data-btn');
    clearDataBtn.addEventListener('click', async () => {
        const confirmClear = confirm("Bist du sicher, dass du alle Besuchsdaten, Login-/Logout-Logs und Gewinnspielteilnehmer löschen möchtest? Diese Aktion kann nicht rückgängig gemacht werden!");
        if (confirmClear) {
            try {
                const response = await fetch('/api/dashboard/clear-data', {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                if (response.ok) {
                    alert("Die ausgewählten Daten wurden erfolgreich gelöscht.");
                    window.location.reload();
                } else {
                    const errorData = await response.json();
                    alert(`Fehler beim Löschen der Daten: ${errorData.message}`);
                }
            } catch (error) {
                console.error('Fehler beim Senden der Löschanfrage:', error);
                alert('Ein unerwarteter Fehler ist aufgetreten.');
            }
        }
    });

    // Hilfsfunktion zum Füllen der Tabellen mit limitierter Anzeige
    const populateTable = (tableId, data, columns) => {
        const tableBody = document.querySelector(`#${tableId} tbody`);
        const viewAllBtn = document.getElementById(`view-all-${tableId}`);
        const defaultLimit = 20;

        if (viewAllBtn) {
            viewAllBtn.style.display = data.length > defaultLimit ? 'block' : 'none';
        }

        tableBody.innerHTML = '';
        const displayData = (viewAllBtn && viewAllBtn.dataset.showAll === 'true') ? data : data.slice(0, defaultLimit);

        displayData.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = columns.map(col => `<td>${col(item)}</td>`).join('');
            tableBody.appendChild(row);
        });

        if (viewAllBtn) {
            viewAllBtn.onclick = () => {
                viewAllBtn.dataset.showAll = 'true';
                viewAllBtn.style.display = 'none';
                populateTable(tableId, data, columns);
            };
        }
    };

    // NEUE Funktion: Erstellt die Tabelle für Klick-Statistiken
    const createClickTable = (stats) => {
        const tableBody = document.querySelector('#click-stats-table tbody');
        tableBody.innerHTML = '';
        stats.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `<td>${item._id}</td><td>${item.count}</td>`;
            tableBody.appendChild(row);
        });
    };

    const fetchDashboardData = async () => {
        try {
            const statsResponse = await fetch('/api/dashboard/stats', { headers: { 'Authorization': `Bearer ${token}` } });
            if (statsResponse.status === 401 || statsResponse.status === 403) {
                localStorage.removeItem('token');
                window.location.href = '/login';
                return;
            }
            const data = await statsResponse.json();

            document.getElementById('total-visits').textContent = data.totalVisits;
            document.getElementById('unique-ips').textContent = data.uniqueIPs;
            document.getElementById('online-users').textContent = data.onlineUsers;
            document.getElementById('failed-logins').textContent = data.failedLoginCount;
            document.getElementById('avg-duration').textContent = `${data.avgDuration}s`;

            createVisitsChart(data.visitsByDay);
            createOSChart(data.visitsByOS);
            createBrowserChart(data.visitsByBrowser);

            // Lade und render die Daten für alle Tabellen
            fetchAndRenderAllTables();

        } catch (error) {
            console.error('Fehler beim Abrufen der Dashboard-Daten:', error);
        }
    };

    const fetchAndRenderAllTables = async () => {
        try {
            const visitsResponse = await fetch('/api/visits', { headers: { 'Authorization': `Bearer ${token}` } });
            const visits = await visitsResponse.json();
            populateTable('visit-table', visits, [
                v => v.ipAddress,
                v => v.city ? `${v.city}, ${v.country}` : 'Unbekannt',
                v => v.device,
                v => v.browser,
                v => v.duration ? `${v.duration}s` : 'N/A',
                v => new Date(v.timestamp).toLocaleString()
            ]);

            const failedLoginsResponse = await fetch('/api/failed-logins', { headers: { 'Authorization': `Bearer ${token}` } });
            const failedLogins = await failedLoginsResponse.json();
            populateTable('failed-logins-table', failedLogins, [
                l => l.ipAddress,
                l => l.username,
                l => new Date(l.timestamp).toLocaleString()
            ]);

            const successfulLoginsResponse = await fetch('/api/successful-logins', { headers: { 'Authorization': `Bearer ${token}` } });
            const successfulLogins = await successfulLoginsResponse.json();
            populateTable('successful-logins-table', successfulLogins, [
                l => l.ipAddress,
                l => l.username,
                l => new Date(l.timestamp).toLocaleString()
            ]);

            const successfulLogoutsResponse = await fetch('/api/successful-logouts', { headers: { 'Authorization': `Bearer ${token}` } });
            const successfulLogouts = await successfulLogoutsResponse.json();
            populateTable('successful-logouts-table', successfulLogouts, [
                l => l.ipAddress,
                l => l.username,
                l => new Date(l.timestamp).toLocaleString()
            ]);

            const giveawayParticipantsResponse = await fetch('/api/giveaway-participants', { headers: { 'Authorization': `Bearer ${token}` } });
            const participants = await giveawayParticipantsResponse.json();
            populateTable('giveaway-participants-table', participants, [
                p => p.name,
                p => p.email,
                p => p.address,
                p => new Date(p.timestamp).toLocaleString()
            ]);

            // NEU: Abrufen der Klick-Statistiken und Rendern der Tabelle
            const clicksResponse = await fetch('/api/dashboard/clicks', { headers: { 'Authorization': `Bearer ${token}` } });
            const clickStats = await clicksResponse.json();
            createClickTable(clickStats);

        } catch (error) {
            console.error('Fehler beim Abrufen der Tabellendaten:', error);
        }
    };

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
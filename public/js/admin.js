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
        const confirmClear = confirm("Bist du sicher, dass du alle Besuchsdaten und Gewinnspielteilnehmer löschen möchtest? Diese Aktion kann nicht rückgängig gemacht werden!");
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
            const tableBody = document.querySelector('#visit-table tbody');
            tableBody.innerHTML = '';
            data.visits.forEach(visit => {
                const row = document.createElement('tr');
                row.innerHTML = `
<td>${visit.ipAddress}</td>
<td>${visit.city ? `${visit.city}, ${visit.country}` : 'Unbekannt'}</td>
<td>${visit.device}</td>
<td>${visit.browser}</td>
<td>${visit.duration ? `${visit.duration}s` : 'N/A'}</td>
<td>${new Date(visit.timestamp).toLocaleString()}</td>
`;
                tableBody.appendChild(row);
            });
            createVisitsChart(data.visitsByDay);
            createOSChart(data.visitsByOS);
            createBrowserChart(data.visitsByBrowser);
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
            const failedLogins = await response.json();
            const tableBody = document.querySelector('#failed-logins-table tbody');
            tableBody.innerHTML = '';
            failedLogins.forEach(login => {
                const row = document.createElement('tr');
                row.innerHTML = `
<td>${login.ipAddress}</td>
<td>${login.username}</td>
<td>${new Date(login.timestamp).toLocaleString()}</td>
`;
                tableBody.appendChild(row);
            });
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
            const successfulLogins = await response.json();
            const tableBody = document.querySelector('#successful-logins-table tbody');
            tableBody.innerHTML = '';
            successfulLogins.forEach(login => {
                const row = document.createElement('tr');
                row.innerHTML = `
<td>${login.ipAddress}</td>
<td>${login.username}</td>
<td>${new Date(login.timestamp).toLocaleString()}</td>
`;
                tableBody.appendChild(row);
            });
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
            const successfulLogouts = await response.json();
            const tableBody = document.querySelector('#successful-logouts-table tbody');
            tableBody.innerHTML = '';
            successfulLogouts.forEach(logout => {
                const row = document.createElement('tr');
                row.innerHTML = `
<td>${logout.ipAddress}</td>
<td>${logout.username}</td>
<td>${new Date(logout.timestamp).toLocaleString()}</td>
`;
                tableBody.appendChild(row);
            });
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
            const participants = await response.json();
            const tableBody = document.querySelector('#giveaway-participants-table tbody');
            tableBody.innerHTML = '';
            participants.forEach(participant => {
                const row = document.createElement('tr');
                row.innerHTML = `
<td>${participant.name}</td>
<td>${participant.email}</td>
<td>${participant.address}</td>
<td>${new Date(participant.timestamp).toLocaleString()}</td>
`;
                tableBody.appendChild(row);
            });
        } catch (error) {
            console.error('Fehler beim Abrufen der Gewinnspiel-Teilnehmer:', error);
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
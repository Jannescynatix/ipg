// public/js/main.js
document.addEventListener('DOMContentLoaded', () => {
    const getUserData = async () => {
        try {
            const data = {
                browser: navigator.userAgent,
                os: navigator.platform,
                device: getDeviceType()
            };

            // Sende nur die Browserdaten an unser Backend
            await fetch('/api/visit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
        } catch (error) {
            console.error('Fehler beim Senden der Besucherdaten:', error);
        }
    };

    const getDeviceType = () => {
        const ua = navigator.userAgent;
        if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
            return "Tablet";
        }
        if (/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-L|Opera M(obi|ini)/.test(ua)) {
            return "Mobile";
        }
        return "Desktop";
    };

    getUserData();
});
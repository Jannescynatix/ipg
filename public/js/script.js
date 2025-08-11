// public/js/script.js (neu erstellen)
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('giveaway-form');
    const formMessage = document.getElementById('form-message');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        let isValid = true;

        // Eigene Validierung
        const name = document.getElementById('name');
        const email = document.getElementById('email');
        const address = document.getElementById('address');
        const terms = document.getElementById('terms');

        const nameError = document.getElementById('name-error');
        const emailError = document.getElementById('email-error');
        const addressError = document.getElementById('address-error');
        const termsError = document.getElementById('terms-error');

        nameError.textContent = '';
        emailError.textContent = '';
        addressError.textContent = '';
        termsError.textContent = '';
        formMessage.textContent = '';

        if (name.value.trim() === '') {
            nameError.textContent = 'Bitte geben Sie Ihren Namen ein.';
            isValid = false;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.value)) {
            emailError.textContent = 'Bitte geben Sie eine gültige E-Mail-Adresse ein.';
            isValid = false;
        }

        if (address.value.trim() === '') {
            addressError.textContent = 'Bitte geben Sie Ihre Adresse ein.';
            isValid = false;
        }

        if (!terms.checked) {
            termsError.textContent = 'Bitte stimmen Sie den Nutzungsbedingungen zu.';
            isValid = false;
        }

        if (!isValid) {
            return;
        }

        // Daten an den Server senden
        const formData = {
            name: name.value,
            email: email.value,
            address: address.value
        };

        try {
            const response = await fetch('/api/giveaway-signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const result = await response.text();

            if (response.ok) {
                formMessage.textContent = result;
                formMessage.style.color = 'green';
                form.reset(); // Formular zurücksetzen
            } else {
                formMessage.textContent = result;
                formMessage.style.color = 'red';
            }
        } catch (error) {
            formMessage.textContent = 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.';
            formMessage.style.color = 'red';
        }
    });
});
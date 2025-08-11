// public/js/countdown.js (neu erstellen)
document.addEventListener('DOMContentLoaded', () => {
    const countdownDate = new Date("Aug 30, 2025 14:35:00").getTime();

    const x = setInterval(() => {
        const now = new Date().getTime();
        const distance = countdownDate - now;

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        document.getElementById("days").textContent = days < 10 ? '0' + days : days;
        document.getElementById("hours").textContent = hours < 10 ? '0' + hours : hours;
        document.getElementById("minutes").textContent = minutes < 10 ? '0' + minutes : minutes;
        document.getElementById("seconds").textContent = seconds < 10 ? '0' + seconds : seconds;

        if (distance < 0) {
            clearInterval(x);
            document.querySelector('.countdown-container').innerHTML = "<h2>Das Gewinnspiel ist beendet!</h2>";
        }
    }, 1000);
});
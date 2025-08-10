// server.js (kompletter Code)
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const { default: fetch } = require('node-fetch');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Datenbankverbindung
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('MongoDB verbunden...'))
    .catch(err => console.error('MongoDB Verbindung fehlgeschlagen:', err));

// Schemas
const visitSchema = new mongoose.Schema({
    ipAddress: String,
    country: String,
    city: String,
    browser: String,
    os: String,
    device: String,
    duration: Number, // NEU: Dauer des Besuchs in Sekunden
    timestamp: { type: Date, default: Date.now }
});

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});

const failedLoginSchema = new mongoose.Schema({
    ipAddress: String,
    username: String,
    timestamp: { type: Date, default: Date.now }
});

// NEU: Schema für erfolgreiche Logins
const successfulLoginSchema = new mongoose.Schema({
    ipAddress: String,
    username: String,
    timestamp: { type: Date, default: Date.now }
});

const Visit = mongoose.model('Visit', visitSchema);
const User = mongoose.model('User', userSchema);
const FailedLogin = mongoose.model('FailedLogin', failedLoginSchema);
const SuccessfulLogin = mongoose.model('SuccessfulLogin', successfulLoginSchema); // NEU: Modell für erfolgreiche Logins

// Admin-Benutzer erstellen (Einmalig bei Start)
async function createAdminUser() {
    try {
        const adminExists = await User.findOne({ username: 'admin' });
        if (!adminExists) {
            const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
            const adminUser = new User({ username: 'admin', password: hashedPassword });
            await adminUser.save();
            console.log('Admin-Benutzer erstellt.');
        }
    } catch (err) {
        console.error('Fehler beim Erstellen des Admin-Benutzers:', err);
    }
}
createAdminUser();

// JWT-Middleware zur Authentifizierung
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.redirect('/login');

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.redirect('/login');
        req.user = user;
        next();
    });
};

// ---
// API-Endpunkte
// ---

app.post('/api/visit', async (req, res) => {
    const { browser, os, device, duration } = req.body; // NEU: duration
    const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    let country = 'Unbekannt';
    let city = 'Unbekannt';

    try {
        const geoResponse = await fetch(`https://ip-api.com/json/${ipAddress}`);
        const geoData = await geoResponse.json();
        if (geoData.status === 'success') {
            country = geoData.country;
            city = geoData.city;
        }
    } catch (geoError) {
        console.error('Fehler beim Abrufen der Geolocation-Daten:', geoError);
    }

    const newVisit = new Visit({ ipAddress, browser, os, device, country, city, duration }); // NEU: duration hinzufügen
    try {
        await newVisit.save();
        res.status(200).send('Besucherdaten gespeichert.');
    } catch (error) {
        res.status(500).send('Fehler beim Speichern der Daten.');
    }
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    if (!user || !(await bcrypt.compare(password, user.password))) {
        const newFailedLogin = new FailedLogin({ ipAddress, username });
        await newFailedLogin.save();
        return res.status(400).send('Ungültiger Benutzername oder Passwort.');
    }

    // NEU: Erfolgreichen Login protokollieren
    const newSuccessfulLogin = new SuccessfulLogin({ ipAddress, username });
    await newSuccessfulLogin.save();

    const token = jwt.sign({ username: user.username }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
});

app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
    try {
        const visits = await Visit.find().sort({ timestamp: -1 });
        const totalVisits = await Visit.countDocuments();
        const uniqueIPs = (await Visit.distinct('ipAddress')).length;

        // NEU: Durchschnittliche Besuchsdauer berechnen
        const totalDuration = await Visit.aggregate([
            { $group: { _id: null, total: { $sum: "$duration" } } }
        ]);
        const avgDuration = totalDuration.length > 0 ? (totalDuration[0].total / totalVisits).toFixed(2) : 0;

        const onlineThreshold = new Date(Date.now() - 5 * 60 * 1000);
        const onlineUsers = (await Visit.distinct('ipAddress', { timestamp: { $gte: onlineThreshold } })).length;

        const visitsByDay = await Visit.aggregate([
            { $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
                    count: { $sum: 1 }
                }},
            { $sort: { _id: 1 } }
        ]);

        const visitsByOS = await Visit.aggregate([
            { $group: {
                    _id: "$os",
                    count: { $sum: 1 }
                }},
            { $sort: { count: -1 } }
        ]);

        const visitsByBrowser = await Visit.aggregate([
            { $group: {
                    _id: "$browser",
                    count: { $sum: 1 }
                }},
            { $sort: { count: -1 } }
        ]);

        const failedLoginCount = await FailedLogin.countDocuments();

        res.json({ visits, totalVisits, uniqueIPs, onlineUsers, visitsByDay, visitsByOS, visitsByBrowser, failedLoginCount, avgDuration });
    } catch (error) {
        console.error('Fehler beim Abrufen der Dashboard-Daten:', error);
        res.status(500).send('Fehler beim Abrufen der Daten.');
    }
});

app.get('/api/failed-logins', authenticateToken, async (req, res) => {
    try {
        const failedLogins = await FailedLogin.find().sort({ timestamp: -1 }).limit(10);
        res.json(failedLogins);
    } catch (error) {
        console.error('Fehler beim Abrufen der fehlgeschlagenen Logins:', error);
        res.status(500).send('Fehler beim Abrufen der Daten.');
    }
});

// NEU: Endpunkt für erfolgreiche Logins
app.get('/api/successful-logins', authenticateToken, async (req, res) => {
    try {
        const successfulLogins = await SuccessfulLogin.find().sort({ timestamp: -1 }).limit(10);
        res.json(successfulLogins);
    } catch (error) {
        console.error('Fehler beim Abrufen der erfolgreichen Logins:', error);
        res.status(500).send('Fehler beim Abrufen der Daten.');
    }
});

// ---
// Statische Dateien servieren
// ---
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));

app.listen(PORT, () => console.log(`Server läuft auf Port ${PORT}`));
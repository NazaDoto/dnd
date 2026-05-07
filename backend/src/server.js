require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
// ── CORS ─────────────────────────────────────────────────────
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
}));

// ── Body parsers ─────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Archivos estáticos (fotos de personajes) ─────────────────
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ── Rutas ────────────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/characters', require('./routes/characters'));
app.use('/api/notes', require('./routes/notes'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/dm', require('./routes/dm'));
app.use('/api/dm', require('./routes/dmCampaignEntities'));
app.use('/api/campaigns', require('./routes/campaignsJoin'));

// ── Health check ─────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

// ── 404 ───────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ message: 'Ruta no encontrada' }));

// ── Error handler ─────────────────────────────────────────────
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: err.message || 'Error interno del servidor' });
});

// ── Start ─────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`\nDnD Vault API corriendo en http://localhost:${PORT}\n`);
});
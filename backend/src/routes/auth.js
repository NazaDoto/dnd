const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

// ── POST /api/auth/register ──────────────────────────────────
router.post('/register', async(req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password)
            return res.status(400).json({ message: 'Todos los campos son obligatorios' });

        if (password.length < 6)
            return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres' });

        const [existing] = await db.query(
            'SELECT id FROM users WHERE email = ? OR username = ?', [email, username]
        );
        if (existing.length)
            return res.status(409).json({ message: 'El email o usuario ya está registrado' });

        const hash = await bcrypt.hash(password, 12);
        const [result] = await db.query(
            'INSERT INTO users (username, email, password) VALUES (?, ?, ?)', [username, email, hash]
        );

        const token = jwt.sign({ id: result.insertId, username, email },
            process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        res.status(201).json({ token, user: { id: result.insertId, username, email } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error del servidor' });
    }
});

// ── POST /api/auth/login ─────────────────────────────────────
router.post('/login', async(req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password)
            return res.status(400).json({ message: 'Email y contraseña requeridos' });

        const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (!rows.length)
            return res.status(401).json({ message: 'Credenciales incorrectas' });

        const user = rows[0];
        const valid = await bcrypt.compare(password, user.password);
        if (!valid)
            return res.status(401).json({ message: 'Credenciales incorrectas' });

        const token = jwt.sign({ id: user.id, username: user.username, email: user.email },
            process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        res.json({ token, user: { id: user.id, username: user.username, email: user.email } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error del servidor' });
    }
});

module.exports = router;
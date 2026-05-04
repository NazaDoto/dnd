const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const auth = require('../middleware/auth');

// ── POST /api/auth/register ──────────────────────────────────
router.post('/register', async(req, res) => {
    try {
        const { username, email, password, role: requestedRole } = req.body;

        if (!username || !email || !password)
            return res.status(400).json({ message: 'Todos los campos son obligatorios' });

        if (password.length < 6)
            return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres' });

        const allowed = ['jugador', 'dm'];
        if (requestedRole != null && String(requestedRole).trim() !== '' && !allowed.includes(requestedRole)) {
            return res.status(400).json({ message: 'Rol inválido. Solo se permite jugador o dm.' });
        }
        const role = allowed.includes(requestedRole) ? requestedRole : 'jugador';

        const [existing] = await db.query(
            'SELECT id FROM users WHERE email = ? OR username = ?', [email, username]
        );
        if (existing.length)
            return res.status(409).json({ message: 'El email o usuario ya está registrado' });

        const hash = await bcrypt.hash(password, 12);
        const [result] = await db.query(
            'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)', [username, email, hash, role]
        );

        const token = jwt.sign({ id: result.insertId, username, email, role },
            process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        res.status(201).json({ token, user: { id: result.insertId, username, email, role } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error del servidor' });
    }
});

// ── POST /api/auth/login ─────────────────────────────────────
router.post('/login', async(req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password)
            return res.status(400).json({ message: 'Usuario y contraseña requeridos' });

        const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [username]);

        if (!rows.length)
            return res.status(401).json({ message: 'Credenciales incorrectas' });

        const user = rows[0];

        const valid = await bcrypt.compare(password, user.password);

        if (!valid)
            return res.status(401).json({ message: 'Credenciales incorrectas' });

        const token = jwt.sign(
            { id: user.id, username: user.username, email: user.email, role: user.role || 'jugador' },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role || 'jugador'
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error del servidor' });
    }
});

router.get('/me', auth, async(req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT id, username, email, role, created_at FROM users WHERE id = ?',
            [req.user.id]
        );
        if (!rows.length) return res.status(404).json({ message: 'Usuario no encontrado' });
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error del servidor' });
    }
});

module.exports = router;
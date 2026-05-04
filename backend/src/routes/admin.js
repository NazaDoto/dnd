const router = require('express').Router();
const db = require('../config/db');
const auth = require('../middleware/auth');
const { requireRoles } = require('../middleware/auth');

router.use(auth, requireRoles('administrador'));

router.get('/users', async(req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT id, username, email, role, created_at
       FROM users
       ORDER BY created_at DESC`
        );
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error al obtener usuarios' });
    }
});

router.put('/users/:id/role', async(req, res) => {
    try {
        const userId = Number(req.params.id);
        const { role } = req.body;
        const validRoles = ['administrador', 'jugador', 'dm'];

        if (!validRoles.includes(role)) return res.status(400).json({ message: 'Rol inválido' });

        const [existing] = await db.query('SELECT id FROM users WHERE id = ?', [userId]);
        if (!existing.length) return res.status(404).json({ message: 'Usuario no encontrado' });

        await db.query('UPDATE users SET role = ? WHERE id = ?', [role, userId]);
        res.json({ message: 'Rol actualizado' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error al actualizar rol' });
    }
});

router.get('/dm-links', async(req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT l.id, l.dm_user_id, l.player_user_id, l.created_at,
              dm.username AS dm_username,
              p.username AS player_username
       FROM dm_player_links l
       JOIN users dm ON dm.id = l.dm_user_id
       JOIN users p ON p.id = l.player_user_id
       ORDER BY l.created_at DESC`
        );
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error al obtener vínculos' });
    }
});

router.post('/dm-links', async(req, res) => {
    try {
        const { dm_user_id, player_user_id } = req.body;
        if (!dm_user_id || !player_user_id) return res.status(400).json({ message: 'dm_user_id y player_user_id son obligatorios' });
        if (Number(dm_user_id) === Number(player_user_id)) return res.status(400).json({ message: 'No puedes vincular un usuario consigo mismo' });

        const [rows] = await db.query(
            'SELECT id, role FROM users WHERE id IN (?, ?)',
            [dm_user_id, player_user_id]
        );
        if (rows.length !== 2) return res.status(404).json({ message: 'DM o jugador no encontrado' });

        const dmUser = rows.find(r => Number(r.id) === Number(dm_user_id));
        const playerUser = rows.find(r => Number(r.id) === Number(player_user_id));

        if (!dmUser || dmUser.role !== 'dm') return res.status(400).json({ message: 'El usuario DM debe tener rol dm' });
        if (!playerUser || playerUser.role !== 'jugador') return res.status(400).json({ message: 'El usuario jugador debe tener rol jugador' });

        await db.query(
            'INSERT INTO dm_player_links (dm_user_id, player_user_id) VALUES (?, ?)',
            [dm_user_id, player_user_id]
        );
        res.status(201).json({ message: 'Jugador vinculado al DM' });
    } catch (err) {
        if (err && err.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'Ese vínculo ya existe' });
        console.error(err);
        res.status(500).json({ message: 'Error al vincular jugador' });
    }
});

router.delete('/dm-links/:id', async(req, res) => {
    try {
        const [result] = await db.query('DELETE FROM dm_player_links WHERE id = ?', [req.params.id]);
        if (!result.affectedRows) return res.status(404).json({ message: 'Vínculo no encontrado' });
        res.json({ message: 'Vínculo eliminado' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error al eliminar vínculo' });
    }
});

module.exports = router;

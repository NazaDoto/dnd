const router = require('express').Router();
const db = require('../config/db');
const auth = require('../middleware/auth');
const { requireRoles } = require('../middleware/auth');

router.use(auth, requireRoles('dm', 'administrador'));

router.get('/campaigns', async(req, res) => {
    try {
        const dmId = req.user.role === 'administrador' && req.query.dm_user_id ? Number(req.query.dm_user_id) : req.user.id;
        const [rows] = await db.query(
            `SELECT id, dm_user_id, name, setting_name, summary, status, start_date, next_session_date, created_at, updated_at
       FROM campaigns
       WHERE dm_user_id = ?
       ORDER BY updated_at DESC`,
            [dmId]
        );
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error al obtener campañas' });
    }
});

router.post('/campaigns', async(req, res) => {
    try {
        const { name, setting_name, summary, status, start_date, next_session_date } = req.body;
        if (!name) return res.status(400).json({ message: 'El nombre de campaña es obligatorio' });

        const [result] = await db.query(
            `INSERT INTO campaigns (dm_user_id, name, setting_name, summary, status, start_date, next_session_date)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                req.user.id,
                name,
                setting_name || null,
                summary || null,
                status || 'activa',
                start_date || null,
                next_session_date || null
            ]
        );
        res.status(201).json({ id: result.insertId, message: 'Campaña creada' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error al crear campaña' });
    }
});

router.put('/campaigns/:id', async(req, res) => {
    try {
        const { name, setting_name, summary, status, start_date, next_session_date } = req.body;
        const [result] = await db.query(
            `UPDATE campaigns
       SET name = ?, setting_name = ?, summary = ?, status = ?, start_date = ?, next_session_date = ?
       WHERE id = ? AND dm_user_id = ?`,
            [name, setting_name || null, summary || null, status || 'activa', start_date || null, next_session_date || null, req.params.id, req.user.id]
        );
        if (!result.affectedRows) return res.status(404).json({ message: 'Campaña no encontrada' });
        res.json({ message: 'Campaña actualizada' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error al actualizar campaña' });
    }
});

router.delete('/campaigns/:id', async(req, res) => {
    try {
        const [result] = await db.query('DELETE FROM campaigns WHERE id = ? AND dm_user_id = ?', [req.params.id, req.user.id]);
        if (!result.affectedRows) return res.status(404).json({ message: 'Campaña no encontrada' });
        res.json({ message: 'Campaña eliminada' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error al eliminar campaña' });
    }
});

router.get('/players', async(req, res) => {
    try {
        const dmId = req.user.role === 'administrador' && req.query.dm_user_id ? Number(req.query.dm_user_id) : req.user.id;
        const [rows] = await db.query(
            `SELECT u.id, u.username, u.email, l.created_at AS linked_at
       FROM dm_player_links l
       JOIN users u ON u.id = l.player_user_id
       WHERE l.dm_user_id = ?
       ORDER BY u.username`,
            [dmId]
        );
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error al obtener jugadores vinculados' });
    }
});

router.get('/characters', async(req, res) => {
    try {
        const dmId = req.user.role === 'administrador' && req.query.dm_user_id ? Number(req.query.dm_user_id) : req.user.id;
        const [rows] = await db.query(
            `SELECT c.*,
              u.username AS player_username,
              u.email AS player_email
       FROM dm_player_links l
       JOIN users u ON u.id = l.player_user_id
       JOIN characters c ON c.user_id = u.id
       WHERE l.dm_user_id = ?
       ORDER BY u.username ASC, c.updated_at DESC`,
            [dmId]
        );
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error al obtener personajes vinculados' });
    }
});

module.exports = router;

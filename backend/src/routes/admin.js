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

router.get('/campaigns', async(req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT c.id, c.name, c.invite_code, c.status, c.dm_user_id, u.username AS dm_username
       FROM campaigns c
       JOIN users u ON u.id = c.dm_user_id
       ORDER BY c.updated_at DESC`
        );
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error al obtener campañas' });
    }
});

router.get('/characters', async(req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT c.id, c.name, c.level, c.class, c.race, c.user_id, u.username AS owner_username
       FROM characters c
       JOIN users u ON u.id = c.user_id
       ORDER BY c.updated_at DESC
       LIMIT 500`
        );
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error al obtener personajes' });
    }
});

router.post('/campaign-characters', async(req, res) => {
    try {
        const { campaign_id, character_id } = req.body;
        if (!campaign_id || !character_id) return res.status(400).json({ message: 'campaign_id y character_id son obligatorios' });

        const [camp] = await db.query('SELECT id FROM campaigns WHERE id = ?', [campaign_id]);
        if (!camp.length) return res.status(404).json({ message: 'Campaña no encontrada' });

        const [ch] = await db.query('SELECT id FROM characters WHERE id = ?', [character_id]);
        if (!ch.length) return res.status(404).json({ message: 'Personaje no encontrado' });

        await db.query(
            `INSERT INTO campaign_characters (campaign_id, character_id, status, responded_at)
       VALUES (?, ?, 'active', NOW())
       ON DUPLICATE KEY UPDATE status = 'active', responded_at = NOW()`,
            [campaign_id, character_id]
        );
        res.status(201).json({ message: 'Personaje asignado a la campaña' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error al asignar personaje' });
    }
});

router.get('/campaign-characters', async(req, res) => {
    try {
        const campId = req.query.campaign_id;
        let sql = `SELECT cc.id, cc.campaign_id, cc.character_id, cc.status, cc.created_at,
        c.name AS character_name, camp.name AS campaign_name, u.username AS owner_username
       FROM campaign_characters cc
       JOIN characters c ON c.id = cc.character_id
       JOIN campaigns camp ON camp.id = cc.campaign_id
       JOIN users u ON u.id = c.user_id`;
        const params = [];
        if (campId) {
            sql += ' WHERE cc.campaign_id = ?';
            params.push(campId);
        }
        sql += ' ORDER BY cc.created_at DESC LIMIT 300';
        const [rows] = await db.query(sql, params);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error al listar vínculos campaña-personaje' });
    }
});

router.delete('/campaign-characters/:linkId', async(req, res) => {
    try {
        const [result] = await db.query('DELETE FROM campaign_characters WHERE id = ?', [req.params.linkId]);
        if (!result.affectedRows) return res.status(404).json({ message: 'Vínculo no encontrado' });
        res.json({ message: 'Vínculo eliminado' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error al eliminar vínculo' });
    }
});

module.exports = router;

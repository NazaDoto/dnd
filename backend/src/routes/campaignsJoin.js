const router = require('express').Router();
const db = require('../config/db');
const auth = require('../middleware/auth');
const { requireRoles } = require('../middleware/auth');

router.use(auth, requireRoles('jugador'));

router.get('/preview/:code', async(req, res) => {
    try {
        const code = String(req.params.code || '').trim();
        if (!code) return res.status(400).json({ message: 'Código requerido' });

        const [rows] = await db.query(
            `SELECT c.id, c.name, c.setting_name, c.status, u.username AS dm_username
       FROM campaigns c
       JOIN users u ON u.id = c.dm_user_id
       WHERE c.invite_code = ? AND c.status = 'activa'`,
            [code]
        );
        if (!rows.length) return res.status(404).json({ message: 'Código no válido o campaña inactiva' });
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error del servidor' });
    }
});

router.post('/join', async(req, res) => {
    try {
        const { invite_code, character_id } = req.body;
        if (!invite_code || !character_id) return res.status(400).json({ message: 'Código y personaje son obligatorios' });

        const [camps] = await db.query(
            'SELECT id FROM campaigns WHERE invite_code = ? AND status = ?',
            [String(invite_code).trim(), 'activa']
        );
        if (!camps.length) return res.status(404).json({ message: 'Código no válido' });
        const campaignId = camps[0].id;

        const [chars] = await db.query('SELECT id, user_id FROM characters WHERE id = ?', [character_id]);
        if (!chars.length) return res.status(404).json({ message: 'Personaje no encontrado' });
        if (chars[0].user_id !== req.user.id) return res.status(403).json({ message: 'Ese personaje no es tuyo' });

        const [existing] = await db.query(
            'SELECT id, status FROM campaign_characters WHERE campaign_id = ? AND character_id = ?',
            [campaignId, character_id]
        );

        if (existing.length) {
            const st = existing[0].status;
            if (st === 'active') return res.status(409).json({ message: 'Ya estás en esa campaña con este personaje' });
            if (st === 'pending') return res.status(409).json({ message: 'Ya enviaste una solicitud pendiente' });
            if (st === 'rejected') {
                await db.query(
                    `UPDATE campaign_characters SET status = 'pending', responded_at = NULL WHERE id = ?`,
                    [existing[0].id]
                );
                return res.status(200).json({ message: 'Solicitud reenviada', link_id: existing[0].id });
            }
        }

        const [ins] = await db.query(
            'INSERT INTO campaign_characters (campaign_id, character_id, status) VALUES (?, ?, ?)',
            [campaignId, character_id, 'pending']
        );
        res.status(201).json({ id: ins.insertId, message: 'Solicitud enviada al DM' });
    } catch (err) {
        if (err && err.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'Ya existe un vínculo para este personaje' });
        console.error(err);
        res.status(500).json({ message: 'Error al solicitar ingreso' });
    }
});

router.get('/my-requests', async(req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT cc.id AS link_id, cc.status, cc.created_at,
              c.id AS campaign_id, c.name AS campaign_name, c.invite_code,
              ch.name AS character_name, ch.id AS character_id
       FROM campaign_characters cc
       JOIN campaigns c ON c.id = cc.campaign_id
       JOIN characters ch ON ch.id = cc.character_id
       WHERE ch.user_id = ?
       ORDER BY cc.created_at DESC`,
            [req.user.id]
        );
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error al listar solicitudes' });
    }
});

module.exports = router;

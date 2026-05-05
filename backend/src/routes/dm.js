const router = require('express').Router();
const db = require('../config/db');
const auth = require('../middleware/auth');
const { requireRoles } = require('../middleware/auth');
const crypto = require('crypto');

router.use(auth, requireRoles('dm'));

const JSON_CAMPAIGN = ['npcs_json'];

function parseCampaignRow(row) {
    if (!row) return row;
    JSON_CAMPAIGN.forEach((col) => {
        if (typeof row[col] === 'string') {
            try {
                row[col] = JSON.parse(row[col]);
            } catch {
                row[col] = [];
            }
        }
        if (row[col] === null || row[col] === undefined) row[col] = [];
        if (col === 'npcs_json' && !Array.isArray(row[col])) row[col] = [];
    });
    return row;
}

async function uniqueInviteCode() {
    for (let i = 0; i < 12; i++) {
        const code = crypto.randomBytes(5).toString('hex').toUpperCase();
        const [r] = await db.query('SELECT id FROM campaigns WHERE invite_code = ?', [code]);
        if (!r.length) return code;
    }
    throw new Error('No se pudo generar código de invitación');
}

async function assertOwnCampaign(req, campaignId) {
    const [rows] = await db.query(
        'SELECT * FROM campaigns WHERE id = ? AND dm_user_id = ?',
        [campaignId, req.user.id]
    );
    return rows.length ? parseCampaignRow(rows[0]) : null;
}

router.get('/campaigns', async(req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT c.*,
        (SELECT COUNT(*) FROM campaign_characters cc WHERE cc.campaign_id = c.id AND cc.status = 'active') AS active_pc_count,
        (SELECT COUNT(*) FROM campaign_characters cc WHERE cc.campaign_id = c.id AND cc.status = 'pending') AS pending_count
       FROM campaigns c
       WHERE c.dm_user_id = ?
       ORDER BY c.updated_at DESC`,
            [req.user.id]
        );
        res.json(rows.map(parseCampaignRow));
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error al obtener campañas' });
    }
});

router.post('/campaigns', async(req, res) => {
    try {
        const { name, setting_name, summary, status, start_date, next_session_date } = req.body;
        if (!name || !String(name).trim()) return res.status(400).json({ message: 'El nombre de campaña es obligatorio' });

        const invite_code = await uniqueInviteCode();
        const [result] = await db.query(
            `INSERT INTO campaigns (
        dm_user_id, name, invite_code, setting_name, summary, status, start_date, next_session_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                req.user.id,
                name.trim(),
                invite_code,
                setting_name || null,
                summary || null,
                status || 'activa',
                start_date || null,
                next_session_date || null
            ]
        );
        res.status(201).json({ id: result.insertId, invite_code, message: 'Campaña creada' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error al crear campaña' });
    }
});

router.get('/campaigns/:id', async(req, res) => {
    try {
        const camp = await assertOwnCampaign(req, req.params.id);
        if (!camp) return res.status(404).json({ message: 'Campaña no encontrada' });
        res.json(camp);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error al obtener campaña' });
    }
});

router.put('/campaigns/:id', async(req, res) => {
    try {
        const camp = await assertOwnCampaign(req, req.params.id);
        if (!camp) return res.status(404).json({ message: 'Campaña no encontrada' });

        const b = req.body;

        let npcsJsonStr;
        if (b.npcs_json !== undefined) {
            if (Array.isArray(b.npcs_json)) npcsJsonStr = JSON.stringify(b.npcs_json);
            else if (typeof b.npcs_json === 'string') npcsJsonStr = b.npcs_json;
            else npcsJsonStr = JSON.stringify([]);
        } else {
            npcsJsonStr = JSON.stringify(Array.isArray(camp.npcs_json) ? camp.npcs_json : []);
        }

        const [result] = await db.query(
            `UPDATE campaigns SET
        name = ?, setting_name = ?, summary = ?, status = ?, start_date = ?, next_session_date = ?,
        campaign_hook = ?, themes_truths = ?, fronts_antagonists = ?, npcs_json = ?,
        locations_maps = ?, session_prep = ?, last_session_recap = ?, active_quests = ?,
        treasure_log = ?, house_rules = ?, dm_private_notes = ?, resources_links = ?
      WHERE id = ? AND dm_user_id = ?`,
            [
                b.name != null ? String(b.name).trim() : camp.name,
                b.setting_name !== undefined ? b.setting_name : camp.setting_name,
                b.summary !== undefined ? b.summary : camp.summary,
                b.status || camp.status,
                b.start_date !== undefined ? b.start_date : camp.start_date,
                b.next_session_date !== undefined ? b.next_session_date : camp.next_session_date,
                b.campaign_hook !== undefined ? b.campaign_hook : camp.campaign_hook,
                b.themes_truths !== undefined ? b.themes_truths : camp.themes_truths,
                b.fronts_antagonists !== undefined ? b.fronts_antagonists : camp.fronts_antagonists,
                npcsJsonStr,
                b.locations_maps !== undefined ? b.locations_maps : camp.locations_maps,
                b.session_prep !== undefined ? b.session_prep : camp.session_prep,
                b.last_session_recap !== undefined ? b.last_session_recap : camp.last_session_recap,
                b.active_quests !== undefined ? b.active_quests : camp.active_quests,
                b.treasure_log !== undefined ? b.treasure_log : camp.treasure_log,
                b.house_rules !== undefined ? b.house_rules : camp.house_rules,
                b.dm_private_notes !== undefined ? b.dm_private_notes : camp.dm_private_notes,
                b.resources_links !== undefined ? b.resources_links : camp.resources_links,
                req.params.id,
                req.user.id
            ]
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

router.post('/campaigns/:id/invite-rotate', async(req, res) => {
    try {
        const camp = await assertOwnCampaign(req, req.params.id);
        if (!camp) return res.status(404).json({ message: 'Campaña no encontrada' });
        const invite_code = await uniqueInviteCode();
        await db.query('UPDATE campaigns SET invite_code = ? WHERE id = ? AND dm_user_id = ?', [invite_code, req.params.id, req.user.id]);
        res.json({ invite_code, message: 'Nuevo código generado' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error al rotar código' });
    }
});

router.get('/campaigns/:id/roster', async(req, res) => {
    try {
        const camp = await assertOwnCampaign(req, req.params.id);
        if (!camp) return res.status(404).json({ message: 'Campaña no encontrada' });

        const [active] = await db.query(
            `SELECT cc.id AS link_id, cc.status, cc.created_at, c.*, u.username AS player_username
       FROM campaign_characters cc
       JOIN characters c ON c.id = cc.character_id
       JOIN users u ON u.id = c.user_id
       WHERE cc.campaign_id = ? AND cc.status = 'active'
       ORDER BY c.name`,
            [req.params.id]
        );

        const [pending] = await db.query(
            `SELECT cc.id AS link_id, cc.status, cc.created_at, c.id AS character_id, c.name AS character_name,
              u.id AS player_user_id, u.username AS player_username
       FROM campaign_characters cc
       JOIN characters c ON c.id = cc.character_id
       JOIN users u ON u.id = c.user_id
       WHERE cc.campaign_id = ? AND cc.status = 'pending'
       ORDER BY cc.created_at DESC`,
            [req.params.id]
        );

        res.json({ active, pending });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error al obtener el roster' });
    }
});

router.patch('/campaigns/:id/roster/:linkId', async(req, res) => {
    try {
        const camp = await assertOwnCampaign(req, req.params.id);
        if (!camp) return res.status(404).json({ message: 'Campaña no encontrada' });

        const { action } = req.body;
        if (!['accept', 'reject'].includes(action)) return res.status(400).json({ message: 'Acción inválida' });

        const status = action === 'accept' ? 'active' : 'rejected';
        const [result] = await db.query(
            `UPDATE campaign_characters SET status = ?, responded_at = NOW()
       WHERE id = ? AND campaign_id = ? AND status = 'pending'`,
            [status, req.params.linkId, req.params.id]
        );
        if (!result.affectedRows) return res.status(404).json({ message: 'Solicitud no encontrada' });
        res.json({ message: status === 'active' ? 'Personaje aceptado en la campaña' : 'Solicitud rechazada' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error al actualizar solicitud' });
    }
});

router.delete('/campaigns/:id/roster/:linkId', async(req, res) => {
    try {
        const camp = await assertOwnCampaign(req, req.params.id);
        if (!camp) return res.status(404).json({ message: 'Campaña no encontrada' });

        const [result] = await db.query(
            'DELETE FROM campaign_characters WHERE id = ? AND campaign_id = ?',
            [req.params.linkId, req.params.id]
        );
        if (!result.affectedRows) return res.status(404).json({ message: 'Vínculo no encontrado' });
        res.json({ message: 'Personaje quitado de la campaña' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error al quitar personaje' });
    }
});

const CHAR_JSON_COLS = [
    'saving_throws_prof', 'skills_prof', 'skills_expertise',
    'equipment', 'attacks_spellcasting', 'features_traits',
    'spells', 'languages', 'other_proficiencies', 'tags'
];
const CHAR_JSON_DEFAULTS = {
    saving_throws_prof: '[]',
    skills_prof: '[]',
    skills_expertise: '[]',
    equipment: '[]',
    attacks_spellcasting: '[]',
    features_traits: '[]',
    spells: '{}',
    languages: '[]',
    other_proficiencies: '[]',
    tags: '[]'
};

function parseCharacterRowJson(row) {
    if (!row) return row;
    CHAR_JSON_COLS.forEach((col) => {
        if (typeof row[col] === 'string') {
            try {
                row[col] = JSON.parse(row[col]);
            } catch {
                row[col] = JSON.parse(CHAR_JSON_DEFAULTS[col] || '[]');
            }
        }
        if (row[col] === null || row[col] === undefined) {
            row[col] = JSON.parse(CHAR_JSON_DEFAULTS[col] || '[]');
        }
    });
    return row;
}

router.get('/campaigns/:campaignId/characters/:characterId', async(req, res) => {
    try {
        const camp = await assertOwnCampaign(req, req.params.campaignId);
        if (!camp) return res.status(404).json({ message: 'Campaña no encontrada' });

        const [rows] = await db.query(
            `SELECT c.* FROM characters c
       INNER JOIN campaign_characters cc ON cc.character_id = c.id AND cc.campaign_id = ? AND cc.status = 'active'
       WHERE c.id = ?`,
            [req.params.campaignId, req.params.characterId]
        );
        if (!rows.length) return res.status(404).json({ message: 'Personaje no encontrado en esta campaña' });

        res.json(parseCharacterRowJson(rows[0]));
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error al obtener personaje' });
    }
});

router.patch('/campaigns/:campaignId/characters/:characterId/hp', async(req, res) => {
    try {
        const camp = await assertOwnCampaign(req, req.params.campaignId);
        if (!camp) return res.status(404).json({ message: 'Campaña no encontrada' });

        const delta = Number(req.body?.delta);
        if (!Number.isInteger(delta) || delta === 0) {
            return res.status(400).json({ message: 'Delta inválido' });
        }

        const [rows] = await db.query(
            `SELECT c.id, c.hit_points_current, c.hit_points_max
       FROM characters c
       INNER JOIN campaign_characters cc
         ON cc.character_id = c.id
        AND cc.campaign_id = ?
        AND cc.status = 'active'
       WHERE c.id = ?`,
            [req.params.campaignId, req.params.characterId]
        );
        if (!rows.length) return res.status(404).json({ message: 'Personaje no encontrado en esta campaña' });

        const ch = rows[0];
        const maxHp = Math.max(1, Number(ch.hit_points_max) || 1);
        const currentHp = Number(ch.hit_points_current) || 0;
        const nextHp = Math.max(0, Math.min(maxHp, currentHp + delta));

        await db.query(
            'UPDATE characters SET hit_points_current = ? WHERE id = ?',
            [nextHp, req.params.characterId]
        );

        res.json({ message: 'PV actualizados', hit_points_current: nextHp, hit_points_max: maxHp });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error al actualizar PV' });
    }
});

module.exports = router;

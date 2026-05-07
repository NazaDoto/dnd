/**
 * Rutas de ilustraciones de sesión generadas por IA.
 *
 * POST   /campaigns/:cid/sessions/:sid/illustrate    -> generar nueva
 * GET    /campaigns/:cid/sessions/:sid/illustrations -> listar
 * DELETE /illustrations/:id                          -> borrar
 *
 * Todas requieren rol DM y validan que la campaña pertenezca al usuario.
 */
const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const db = require('../config/db');
const auth = require('../middleware/auth');
const { requireRoles } = require('../middleware/auth');
const { generateSessionIllustration } = require('../services/imageGen');

router.use(auth, requireRoles('dm'));

async function assertOwnCampaign(userId, campaignId) {
    const [rows] = await db.query(
        'SELECT id FROM campaigns WHERE id = ? AND dm_user_id = ? LIMIT 1',
        [campaignId, userId]
    );
    return rows.length > 0;
}

async function loadSession(campaignId, sessionId) {
    const [rows] = await db.query(
        'SELECT * FROM campaign_sessions WHERE id = ? AND campaign_id = ? LIMIT 1',
        [sessionId, campaignId]
    );
    return rows[0] || null;
}

async function loadActiveCharacters(campaignId, characterIdsFilter = null) {
    const [rows] = await db.query(
        `SELECT c.id, c.name, c.race, c.class, c.subclass, c.level, c.photo_url
         FROM characters c
         INNER JOIN campaign_characters cc ON cc.character_id = c.id
         WHERE cc.campaign_id = ? AND cc.status = 'active'
         ORDER BY c.name`,
        [campaignId]
    );
    if (Array.isArray(characterIdsFilter) && characterIdsFilter.length) {
        const set = new Set(characterIdsFilter.map(Number));
        return rows.filter((r) => set.has(Number(r.id)));
    }
    return rows;
}

/* POST /api/dm/campaigns/:cid/sessions/:sid/illustrate */
router.post('/campaigns/:cid/sessions/:sid/illustrate', async(req, res) => {
    const { cid, sid } = req.params;
    try {
        const ok = await assertOwnCampaign(req.user.id, cid);
        if (!ok) return res.status(404).json({ message: 'Campaña no encontrada' });

        const session = await loadSession(cid, sid);
        if (!session) return res.status(404).json({ message: 'Sesión no encontrada' });

        const { intensity = 'medium', extra_hints: extraHints = '', character_ids: characterIds = null } = req.body || {};
        const allowedIntensities = ['soft', 'medium', 'hard'];
        const intensityValue = allowedIntensities.includes(intensity) ? intensity : 'medium';

        const characters = await loadActiveCharacters(cid, characterIds);
        if (!characters.length) {
            return res.status(400).json({ message: 'La campaña no tiene personajes activos para usar como referencia' });
        }

        const result = await generateSessionIllustration({
            session,
            characters,
            intensity: intensityValue,
            extraHints: typeof extraHints === 'string' ? extraHints.slice(0, 1000) : '',
        });

        const [insert] = await db.query(
            `INSERT INTO session_illustrations
                (session_id, campaign_id, image_url, prompt, model, references_used, intensity)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                sid,
                cid,
                result.image_url,
                result.prompt,
                result.model,
                JSON.stringify(result.references_used || []),
                result.intensity,
            ]
        );

        res.status(201).json({
            id: insert.insertId,
            session_id: Number(sid),
            campaign_id: Number(cid),
            ...result,
            created_at: new Date(),
        });
    } catch (err) {
        console.error('[illustrate]', err);
        if (err.code === 'NO_API_KEY') {
            return res.status(503).json({
                message: 'El servidor no tiene configurada GEMINI_API_KEY',
            });
        }
        if (err.blocked) {
            return res.status(422).json({
                message: `La IA bloqueó la generación (${err.reason}). Probá bajar la intensidad o suavizar el recap.`,
                reason: err.reason,
            });
        }
        return res.status(502).json({
            message: err.message || 'Error generando la ilustración',
        });
    }
});

/* GET /api/dm/campaigns/:cid/sessions/:sid/illustrations */
router.get('/campaigns/:cid/sessions/:sid/illustrations', async(req, res) => {
    try {
        const ok = await assertOwnCampaign(req.user.id, req.params.cid);
        if (!ok) return res.status(404).json({ message: 'Campaña no encontrada' });

        const [rows] = await db.query(
            `SELECT id, session_id, campaign_id, image_url, prompt, model, references_used,
                    intensity, created_at
             FROM session_illustrations
             WHERE session_id = ? AND campaign_id = ?
             ORDER BY created_at DESC`,
            [req.params.sid, req.params.cid]
        );
        res.json(rows.map((r) => ({
            ...r,
            references_used: typeof r.references_used === 'string'
                ? safeParse(r.references_used)
                : (r.references_used || []),
        })));
    } catch (err) {
        console.error('[illustrations:list]', err);
        res.status(500).json({ message: 'Error al listar ilustraciones' });
    }
});

/* DELETE /api/dm/illustrations/:id */
router.delete('/illustrations/:id', async(req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT si.id, si.image_url
             FROM session_illustrations si
             INNER JOIN campaigns c ON c.id = si.campaign_id
             WHERE si.id = ? AND c.dm_user_id = ?`,
            [req.params.id, req.user.id]
        );
        if (!rows.length) return res.status(404).json({ message: 'Ilustración no encontrada' });

        await db.query('DELETE FROM session_illustrations WHERE id = ?', [req.params.id]);

        const url = rows[0].image_url || '';
        if (url.startsWith('/uploads/illustrations/')) {
            const abs = path.join(__dirname, '../../', url.replace(/^\//, ''));
            try { if (fs.existsSync(abs)) fs.unlinkSync(abs); } catch (e) { /* ignore */ }
        }

        res.json({ message: 'Eliminada' });
    } catch (err) {
        console.error('[illustrations:delete]', err);
        res.status(500).json({ message: 'Error al eliminar ilustración' });
    }
});

function safeParse(s) { try { return JSON.parse(s); } catch { return []; } }

module.exports = router;

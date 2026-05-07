/**
 * Rutas CRUD genéricas para entidades hijas de una campaña.
 *
 * Cada entidad (sessions, quests, npcs, locations, factions, items) comparte
 * el mismo patrón:
 *   GET    /:campaignId/<entity>
 *   POST   /:campaignId/<entity>
 *   PUT    /:campaignId/<entity>/:entityId
 *   DELETE /:campaignId/<entity>/:entityId
 *
 * Todas validan que la campaña pertenezca al DM autenticado.
 */
const router = require('express').Router({ mergeParams: true });
const db = require('../config/db');
const auth = require('../middleware/auth');
const { requireRoles } = require('../middleware/auth');

router.use(auth, requireRoles('dm'));

/* ────────────────────────────────────────────────────────────
 *  Configuración por entidad
 * ──────────────────────────────────────────────────────────── */
const ENTITIES = {
    sessions: {
        table: 'campaign_sessions',
        path: 'sessions',
        // Campos editables. type: 'string' | 'int' | 'date' | 'bool' | 'json' | 'enum'
        fields: {
            session_number: { type: 'int' },
            session_date: { type: 'date' },
            title: { type: 'string', max: 200 },
            summary: { type: 'string' },
            recap: { type: 'string' },
            dm_notes: { type: 'string' },
            attendance: { type: 'json' },
            xp_awarded: { type: 'int', min: 0 },
            loot_summary: { type: 'string' },
            mvp_notes: { type: 'string' },
            next_hooks: { type: 'string' },
        },
        defaultOrder: 'COALESCE(session_date, created_at) DESC, COALESCE(session_number, 0) DESC',
        required: [],
    },
    quests: {
        table: 'campaign_quests',
        path: 'quests',
        fields: {
            title: { type: 'string', max: 200 },
            status: { type: 'enum', values: ['activa', 'completada', 'fallida', 'pausada', 'rumor'] },
            type: { type: 'enum', values: ['principal', 'secundaria', 'personal', 'rumor'] },
            giver: { type: 'string', max: 160 },
            location: { type: 'string', max: 200 },
            reward: { type: 'string' },
            description: { type: 'string' },
            deadline: { type: 'string', max: 80 },
            dm_notes: { type: 'string' },
            sort_order: { type: 'int', min: 0 },
        },
        defaultOrder: `FIELD(status, 'activa','rumor','pausada','completada','fallida'), sort_order, updated_at DESC`,
        required: ['title'],
    },
    npcs: {
        table: 'campaign_npcs',
        path: 'npcs',
        fields: {
            name: { type: 'string', max: 160 },
            role: { type: 'string', max: 160 },
            race: { type: 'string', max: 80 },
            faction: { type: 'string', max: 160 },
            location: { type: 'string', max: 200 },
            disposition: { type: 'enum', values: ['aliado', 'amistoso', 'neutral', 'desconfiado', 'hostil', 'desconocido'] },
            status: { type: 'enum', values: ['vivo', 'desaparecido', 'muerto', 'retirado', 'desconocido'] },
            voice_quirk: { type: 'string' },
            description: { type: 'string' },
            secret: { type: 'string' },
            dm_notes: { type: 'string' },
            portrait_url: { type: 'string', max: 500 },
            sort_order: { type: 'int', min: 0 },
        },
        defaultOrder: `FIELD(status, 'vivo','desaparecido','retirado','muerto','desconocido'), sort_order, name`,
        required: ['name'],
    },
    locations: {
        table: 'campaign_locations',
        path: 'locations',
        fields: {
            name: { type: 'string', max: 200 },
            type: { type: 'enum', values: ['region', 'ciudad', 'pueblo', 'aldea', 'mazmorra', 'templo', 'fortaleza', 'taberna', 'tienda', 'ruina', 'plano', 'otro'] },
            parent_id: { type: 'int', nullable: true },
            description: { type: 'string' },
            map_url: { type: 'string', max: 500 },
            discovered: { type: 'bool' },
            dm_notes: { type: 'string' },
            sort_order: { type: 'int', min: 0 },
        },
        defaultOrder: 'sort_order, name',
        required: ['name'],
    },
    factions: {
        table: 'campaign_factions',
        path: 'factions',
        fields: {
            name: { type: 'string', max: 200 },
            type: { type: 'string', max: 80 },
            alignment: { type: 'string', max: 40 },
            leader: { type: 'string', max: 160 },
            goals: { type: 'string' },
            resources: { type: 'string' },
            allies: { type: 'string' },
            enemies: { type: 'string' },
            party_reputation: { type: 'int', min: -100, max: 100 },
            description: { type: 'string' },
            dm_notes: { type: 'string' },
            sort_order: { type: 'int', min: 0 },
        },
        defaultOrder: 'sort_order, name',
        required: ['name'],
    },
    items: {
        table: 'campaign_items',
        path: 'items',
        fields: {
            name: { type: 'string', max: 200 },
            rarity: { type: 'enum', values: ['comun', 'no_comun', 'raro', 'muy_raro', 'legendario', 'artefacto', 'sin_clasificar'] },
            type: { type: 'string', max: 80 },
            attunement: { type: 'bool' },
            attuned_to: { type: 'string', max: 160 },
            current_owner: { type: 'string', max: 200 },
            source: { type: 'string', max: 200 },
            awarded_at: { type: 'date' },
            value_gp: { type: 'int', min: 0, nullable: true },
            quantity: { type: 'int', min: 0 },
            description: { type: 'string' },
            dm_notes: { type: 'string' },
            sort_order: { type: 'int', min: 0 },
        },
        defaultOrder: `FIELD(rarity, 'artefacto','legendario','muy_raro','raro','no_comun','comun','sin_clasificar'), name`,
        required: ['name'],
    },
};

/* ────────────────────────────────────────────────────────────
 *  Helpers
 * ──────────────────────────────────────────────────────────── */
function normalizeValue(field, value) {
    if (value === undefined) return undefined;

    if (value === null || value === '') {
        if (field.type === 'bool') return 0;
        if (field.type === 'int') return field.nullable === false ? 0 : null;
        return null;
    }

    switch (field.type) {
        case 'int': {
            const n = parseInt(value, 10);
            if (Number.isNaN(n)) return null;
            if (field.min != null && n < field.min) return field.min;
            if (field.max != null && n > field.max) return field.max;
            return n;
        }
        case 'bool':
            return value === true || value === 'true' || value === 1 || value === '1' ? 1 : 0;
        case 'date': {
            const s = String(value).trim();
            return s.match(/^\d{4}-\d{2}-\d{2}/) ? s.slice(0, 10) : null;
        }
        case 'enum':
            return field.values.includes(value) ? value : field.values[0];
        case 'json':
            if (typeof value === 'string') {
                try {
                    JSON.parse(value);
                    return value;
                } catch {
                    return JSON.stringify([]);
                }
            }
            return JSON.stringify(value);
        case 'string':
        default: {
            const s = String(value);
            return field.max && s.length > field.max ? s.slice(0, field.max) : s;
        }
    }
}

function parseRow(row, fields) {
    if (!row) return row;
    Object.entries(fields).forEach(([key, def]) => {
        if (def.type === 'json' && typeof row[key] === 'string') {
            try { row[key] = JSON.parse(row[key]); } catch { row[key] = null; }
        }
        if (def.type === 'bool' && row[key] != null) {
            row[key] = !!row[key];
        }
    });
    return row;
}

async function assertOwnCampaign(req, campaignId) {
    const [rows] = await db.query(
        'SELECT id FROM campaigns WHERE id = ? AND dm_user_id = ? LIMIT 1',
        [campaignId, req.user.id]
    );
    return rows.length > 0;
}

function buildSetClause(payload, entity, ignoreUndefined = true) {
    const cols = [];
    const values = [];
    Object.entries(entity.fields).forEach(([key, def]) => {
        const raw = payload[key];
        if (ignoreUndefined && raw === undefined) return;
        const v = normalizeValue(def, raw);
        if (v === undefined) return;
        cols.push(`${key} = ?`);
        values.push(v);
    });
    return { sql: cols.join(', '), values };
}

function buildInsertClause(payload, entity) {
    const cols = ['campaign_id'];
    const values = [];
    const placeholders = ['?'];
    Object.entries(entity.fields).forEach(([key, def]) => {
        const raw = payload[key];
        if (raw === undefined) return;
        const v = normalizeValue(def, raw);
        if (v === undefined) return;
        cols.push(key);
        values.push(v);
        placeholders.push('?');
    });
    return { cols, values, placeholders };
}

/* ────────────────────────────────────────────────────────────
 *  Registrar rutas para cada entidad
 * ──────────────────────────────────────────────────────────── */
Object.values(ENTITIES).forEach((entity) => {
    const base = `/campaigns/:campaignId/${entity.path}`;

    // LIST
    router.get(base, async (req, res) => {
        try {
            const ok = await assertOwnCampaign(req, req.params.campaignId);
            if (!ok) return res.status(404).json({ message: 'Campaña no encontrada' });

            const [rows] = await db.query(
                `SELECT * FROM ${entity.table} WHERE campaign_id = ? ORDER BY ${entity.defaultOrder}`,
                [req.params.campaignId]
            );
            res.json(rows.map((r) => parseRow(r, entity.fields)));
        } catch (err) {
            console.error(`[${entity.table}][list]`, err);
            res.status(500).json({ message: `Error al obtener ${entity.path}` });
        }
    });

    // CREATE
    router.post(base, async (req, res) => {
        try {
            const ok = await assertOwnCampaign(req, req.params.campaignId);
            if (!ok) return res.status(404).json({ message: 'Campaña no encontrada' });

            const payload = req.body && typeof req.body === 'object' ? req.body : {};
            for (const r of entity.required) {
                if (!payload[r] || !String(payload[r]).trim()) {
                    return res.status(400).json({ message: `Campo obligatorio: ${r}` });
                }
            }

            const { cols, values, placeholders } = buildInsertClause(payload, entity);
            const [result] = await db.query(
                `INSERT INTO ${entity.table} (${cols.join(', ')}) VALUES (${placeholders.join(', ')})`,
                [req.params.campaignId, ...values]
            );

            const [rows] = await db.query(
                `SELECT * FROM ${entity.table} WHERE id = ? LIMIT 1`,
                [result.insertId]
            );
            res.status(201).json(parseRow(rows[0], entity.fields));
        } catch (err) {
            console.error(`[${entity.table}][create]`, err);
            res.status(500).json({ message: `Error al crear ${entity.path}`, detail: err.message });
        }
    });

    // UPDATE
    router.put(`${base}/:entityId`, async (req, res) => {
        try {
            const ok = await assertOwnCampaign(req, req.params.campaignId);
            if (!ok) return res.status(404).json({ message: 'Campaña no encontrada' });

            const [exists] = await db.query(
                `SELECT id FROM ${entity.table} WHERE id = ? AND campaign_id = ? LIMIT 1`,
                [req.params.entityId, req.params.campaignId]
            );
            if (!exists.length) return res.status(404).json({ message: 'Registro no encontrado' });

            const payload = req.body && typeof req.body === 'object' ? req.body : {};
            const { sql, values } = buildSetClause(payload, entity);
            if (!sql) return res.status(400).json({ message: 'Nada para actualizar' });

            await db.query(
                `UPDATE ${entity.table} SET ${sql} WHERE id = ? AND campaign_id = ?`,
                [...values, req.params.entityId, req.params.campaignId]
            );

            const [rows] = await db.query(
                `SELECT * FROM ${entity.table} WHERE id = ? LIMIT 1`,
                [req.params.entityId]
            );
            res.json(parseRow(rows[0], entity.fields));
        } catch (err) {
            console.error(`[${entity.table}][update]`, err);
            res.status(500).json({ message: `Error al actualizar ${entity.path}`, detail: err.message });
        }
    });

    // DELETE
    router.delete(`${base}/:entityId`, async (req, res) => {
        try {
            const ok = await assertOwnCampaign(req, req.params.campaignId);
            if (!ok) return res.status(404).json({ message: 'Campaña no encontrada' });

            const [result] = await db.query(
                `DELETE FROM ${entity.table} WHERE id = ? AND campaign_id = ?`,
                [req.params.entityId, req.params.campaignId]
            );
            if (!result.affectedRows) return res.status(404).json({ message: 'Registro no encontrado' });
            res.json({ message: 'Eliminado' });
        } catch (err) {
            console.error(`[${entity.table}][delete]`, err);
            res.status(500).json({ message: `Error al eliminar ${entity.path}` });
        }
    });
});

module.exports = router;
module.exports.ENTITIES = ENTITIES;

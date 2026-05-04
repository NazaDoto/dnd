const router = require('express').Router();
const db = require('../config/db');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ── Multer config ────────────────────────────────────────────
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, '../../uploads');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `char_${req.user.id}_${Date.now()}${ext}`);
    }
});
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = /jpeg|jpg|png|gif|webp/;
        if (allowed.test(path.extname(file.originalname).toLowerCase())) cb(null, true);
        else cb(new Error('Solo se permiten imágenes'));
    }
});

// Columnas JSON que necesitan parse/stringify
const JSON_COLS = [
    'saving_throws_prof', 'skills_prof', 'skills_expertise',
    'equipment', 'attacks_spellcasting', 'features_traits',
    'spells', 'languages', 'other_proficiencies', 'tags'
];

function parseJsonCols(row) {
    if (!row) return row;
    JSON_COLS.forEach(col => {
        if (typeof row[col] === 'string') {
            try { row[col] = JSON.parse(row[col]); } catch { row[col] = null; }
        }
    });
    return row;
}

// ── GET /api/characters ──────────────────────────────────────
router.get('/', auth, async(req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT id, name, class, subclass, level, race, alignment,
              hit_points_current, hit_points_max, armor_class, photo_url,
              experience_points, background, created_at
       FROM characters WHERE user_id = ? ORDER BY updated_at DESC`, [req.user.id]
        );
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error al obtener personajes' });
    }
});

// ── GET /api/characters/:id (resumen stats) ──────────────────
router.get('/:id/summary', auth, async(req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT id, name, class, subclass, level, race, alignment, background,
              photo_url, experience_points,
              strength, dexterity, constitution, intelligence, wisdom, charisma,
              armor_class, initiative, speed,
              hit_points_current, hit_points_max, hit_points_temp,
              proficiency_bonus, passive_perception, inspiration,
              saving_throws_prof, skills_prof
       FROM characters WHERE id = ? AND user_id = ?`, [req.params.id, req.user.id]
        );
        if (!rows.length) return res.status(404).json({ message: 'Personaje no encontrado' });
        res.json(parseJsonCols(rows[0]));
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error' });
    }
});

// ── GET /api/characters/:id (ficha completa) ─────────────────
router.get('/:id', auth, async(req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT * FROM characters WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]
        );
        if (!rows.length) return res.status(404).json({ message: 'Personaje no encontrado' });
        res.json(parseJsonCols(rows[0]));
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error' });
    }
});

// ── POST /api/characters ─────────────────────────────────────
router.post('/', auth, upload.single('photo'), async(req, res) => {
    try {
        const data = req.body;
        const photo_url = req.file ?
            `/uploads/${req.file.filename}` :
            null;

        // Stringify JSON fields que vienen como string desde FormData
        JSON_COLS.forEach(col => {
            if (data[col] && typeof data[col] === 'string') {
                try { JSON.parse(data[col]); } catch { data[col] = JSON.stringify([]); }
            }
        });

        const [result] = await db.query(
            `INSERT INTO characters (
        user_id, photo_url, name, class, subclass, level, background, race, subrace,
        alignment, experience_points,
        strength, dexterity, constitution, intelligence, wisdom, charisma,
        armor_class, initiative, speed, hit_points_max, hit_points_current, hit_points_temp, hit_dice,
        saving_throws_prof, skills_prof, skills_expertise,
        inspiration, proficiency_bonus, passive_perception,
        personality_traits, ideals, bonds, flaws, backstory,
        age, height, weight, eyes, skin, hair, appearance_notes,
        equipment, copper_pieces, silver_pieces, electrum_pieces, gold_pieces, platinum_pieces,
        attacks_spellcasting, features_traits,
        spellcasting_ability, spell_save_dc, spell_attack_bonus, spells_notes,
        languages, other_proficiencies, allies_organizations, faction, treasure
      ) VALUES (
        ?,?,?,?,?,?,?,?,?,?,?,
        ?,?,?,?,?,?,
        ?,?,?,?,?,?,?,
        ?,?,?,
        ?,?,?,
        ?,?,?,?,?,
        ?,?,?,?,?,?,?,
        ?,?,?,?,?,?,
        ?,?,
        ?,?,?,?,
        ?,?,?,?,?
      )`, [
                req.user.id, photo_url,
                data.name, data.class, data.subclass || null, parseInt(data.level) || 1,
                data.background || null, data.race, data.subrace || null,
                data.alignment || null, parseInt(data.experience_points) || 0,
                parseInt(data.strength) || 10, parseInt(data.dexterity) || 10,
                parseInt(data.constitution) || 10, parseInt(data.intelligence) || 10,
                parseInt(data.wisdom) || 10, parseInt(data.charisma) || 10,
                parseInt(data.armor_class) || 10, parseInt(data.initiative) || 0,
                parseInt(data.speed) || 30,
                parseInt(data.hit_points_max) || 8, parseInt(data.hit_points_current) || 8,
                parseInt(data.hit_points_temp) || 0, data.hit_dice || '1d8',
                data.saving_throws_prof || '[]', data.skills_prof || '[]', data.skills_expertise || '[]',
                data.inspiration === 'true' || data.inspiration === true ? 1 : 0,
                parseInt(data.proficiency_bonus) || 2, parseInt(data.passive_perception) || 10,
                data.personality_traits || null, data.ideals || null, data.bonds || null,
                data.flaws || null, data.backstory || null,
                data.age || null, data.height || null, data.weight || null,
                data.eyes || null, data.skin || null, data.hair || null, data.appearance_notes || null,
                data.equipment || '[]',
                parseInt(data.copper_pieces) || 0, parseInt(data.silver_pieces) || 0,
                parseInt(data.electrum_pieces) || 0, parseInt(data.gold_pieces) || 0,
                parseInt(data.platinum_pieces) || 0,
                data.attacks_spellcasting || '[]', data.features_traits || '[]',
                data.spellcasting_ability || null, data.spell_save_dc || null,
                data.spell_attack_bonus || null, data.spells_notes || '{}',
                data.languages || '[]', data.other_proficiencies || '[]',
                data.allies_organizations || null, data.faction || null, data.treasure || null
            ]
        );

        res.status(201).json({ id: result.insertId, message: 'Personaje creado' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error al crear personaje', detail: err.message });
    }
});

// ── PUT /api/characters/:id ──────────────────────────────────
router.put('/:id', auth, upload.single('photo'), async(req, res) => {
    try {
        const [exists] = await db.query(
            'SELECT id, photo_url FROM characters WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]
        );
        if (!exists.length) return res.status(404).json({ message: 'Personaje no encontrado' });

        const data = req.body;
        let photo_url = exists[0].photo_url;

        if (req.file) {
            // Borrar foto anterior si existe
            if (photo_url) {
                const old = path.join(__dirname, '../../', photo_url);
                if (fs.existsSync(old)) fs.unlinkSync(old);
            }
            photo_url = `/uploads/${req.file.filename}`;
        }

        await db.query(
            `UPDATE characters SET
        photo_url=?, name=?, class=?, subclass=?, level=?, background=?, race=?, subrace=?,
        alignment=?, experience_points=?,
        strength=?, dexterity=?, constitution=?, intelligence=?, wisdom=?, charisma=?,
        armor_class=?, initiative=?, speed=?, hit_points_max=?, hit_points_current=?,
        hit_points_temp=?, hit_dice=?,
        saving_throws_prof=?, skills_prof=?, skills_expertise=?,
        inspiration=?, proficiency_bonus=?, passive_perception=?,
        personality_traits=?, ideals=?, bonds=?, flaws=?, backstory=?,
        age=?, height=?, weight=?, eyes=?, skin=?, hair=?, appearance_notes=?,
        equipment=?, copper_pieces=?, silver_pieces=?, electrum_pieces=?,
        gold_pieces=?, platinum_pieces=?,
        attacks_spellcasting=?, features_traits=?,
        spellcasting_ability=?, spell_save_dc=?, spell_attack_bonus=?, spells_notes=?,
        languages=?, other_proficiencies=?, allies_organizations=?, faction=?, treasure=?
      WHERE id=? AND user_id=?`, [
                photo_url,
                data.name, data.class, data.subclass || null, parseInt(data.level) || 1,
                data.background || null, data.race, data.subrace || null,
                data.alignment || null, parseInt(data.experience_points) || 0,
                parseInt(data.strength) || 10, parseInt(data.dexterity) || 10,
                parseInt(data.constitution) || 10, parseInt(data.intelligence) || 10,
                parseInt(data.wisdom) || 10, parseInt(data.charisma) || 10,
                parseInt(data.armor_class) || 10, parseInt(data.initiative) || 0,
                parseInt(data.speed) || 30,
                parseInt(data.hit_points_max) || 8, parseInt(data.hit_points_current) || 8,
                parseInt(data.hit_points_temp) || 0, data.hit_dice || '1d8',
                data.saving_throws_prof || '[]', data.skills_prof || '[]', data.skills_expertise || '[]',
                data.inspiration === 'true' || data.inspiration === true ? 1 : 0,
                parseInt(data.proficiency_bonus) || 2, parseInt(data.passive_perception) || 10,
                data.personality_traits || null, data.ideals || null, data.bonds || null,
                data.flaws || null, data.backstory || null,
                data.age || null, data.height || null, data.weight || null,
                data.eyes || null, data.skin || null, data.hair || null, data.appearance_notes || null,
                data.equipment || '[]',
                parseInt(data.copper_pieces) || 0, parseInt(data.silver_pieces) || 0,
                parseInt(data.electrum_pieces) || 0, parseInt(data.gold_pieces) || 0,
                parseInt(data.platinum_pieces) || 0,
                data.attacks_spellcasting || '[]', data.features_traits || '[]',
                data.spellcasting_ability || null, data.spell_save_dc || null,
                data.spell_attack_bonus || null, data.spells_notes || '{}',
                data.languages || '[]', data.other_proficiencies || '[]',
                data.allies_organizations || null, data.faction || null, data.treasure || null,
                req.params.id, req.user.id
            ]
        );

        res.json({ message: 'Personaje actualizado' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error al actualizar', detail: err.message });
    }
});

// ── DELETE /api/characters/:id ───────────────────────────────
router.delete('/:id', auth, async(req, res) => {
    try {
        const [exists] = await db.query(
            'SELECT photo_url FROM characters WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]
        );
        if (!exists.length) return res.status(404).json({ message: 'Personaje no encontrado' });

        if (exists[0].photo_url) {
            const filePath = path.join(__dirname, '../../', exists[0].photo_url);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }

        await db.query('DELETE FROM characters WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
        res.json({ message: 'Personaje eliminado' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error al eliminar' });
    }
});

module.exports = router;
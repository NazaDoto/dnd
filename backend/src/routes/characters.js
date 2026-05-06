const router = require('express').Router();
const db = require('../config/db');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');
const fsp = require('fs/promises');
const { spawn } = require('child_process');

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
const JSON_COLS = [
    'saving_throws_prof', 'skills_prof', 'skills_expertise',
    'equipment', 'attacks_spellcasting', 'features_traits',
    'spells', 'languages', 'other_proficiencies', 'tags'
];

const JSON_DEFAULTS = {
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

function sanitizeJsonCols(data) {
    JSON_COLS.forEach(col => {
        if (!data[col]) {
            data[col] = JSON_DEFAULTS[col] || '[]';
            return;
        }

        if (typeof data[col] === 'string') {
            try {
                JSON.parse(data[col]);
            } catch {
                data[col] = JSON_DEFAULTS[col] || '[]';
            }
        }
    });

    return data;
}

function parseJsonCols(row) {
    if (!row) return row;

    JSON_COLS.forEach(col => {
        if (typeof row[col] === 'string') {
            try {
                row[col] = JSON.parse(row[col]);
            } catch {
                row[col] = JSON.parse(JSON_DEFAULTS[col] || '[]');
            }
        }

        if (row[col] === null || row[col] === undefined) {
            row[col] = JSON.parse(JSON_DEFAULTS[col] || '[]');
        }
    });

    return row;
}

const PATCHABLE_FIELDS = new Set([
    'name', 'class', 'subclass', 'level', 'background', 'race', 'subrace', 'alignment', 'experience_points',
    'strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma',
    'armor_class', 'initiative', 'speed', 'hit_points_max', 'hit_points_current', 'hit_points_temp', 'hit_dice',
    'saving_throws_prof', 'skills_prof', 'skills_expertise',
    'inspiration', 'proficiency_bonus', 'passive_perception',
    'personality_traits', 'ideals', 'bonds', 'flaws', 'backstory',
    'age', 'height', 'weight', 'eyes', 'skin', 'hair', 'appearance_notes',
    'equipment', 'copper_pieces', 'silver_pieces', 'electrum_pieces', 'gold_pieces', 'platinum_pieces',
    'attacks_spellcasting', 'features_traits',
    'spellcasting_ability', 'spell_save_dc', 'spell_attack_bonus', 'spells',
    'languages', 'other_proficiencies', 'allies_organizations', 'faction', 'treasure'
]);

function normalizePatchField(field, value) {
    if (JSON_COLS.includes(field)) {
        if (typeof value === 'string') {
            try {
                JSON.parse(value);
                return value;
            } catch {
                return JSON_DEFAULTS[field] || '[]';
            }
        }
        return JSON.stringify(value ?? JSON.parse(JSON_DEFAULTS[field] || '[]'));
    }

    if (field === 'inspiration') {
        return value === true || value === 'true' || value === 1 ? 1 : 0;
    }

    const intFields = new Set([
        'level', 'experience_points', 'strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma',
        'armor_class', 'initiative', 'speed', 'hit_points_max', 'hit_points_current', 'hit_points_temp',
        'proficiency_bonus', 'passive_perception', 'copper_pieces', 'silver_pieces', 'electrum_pieces', 'gold_pieces',
        'platinum_pieces', 'spell_save_dc', 'spell_attack_bonus'
    ]);
    if (intFields.has(field)) {
        if (value === null || value === undefined || value === '') return null;
        const n = parseInt(value, 10);
        return Number.isNaN(n) ? null : n;
    }

    if (value === undefined) return null;
    return value;
}

function runPythonGenerator({ scriptPath, jsonPath, templatePath, outputPath }) {
    const customPython = process.env.PYTHON_BIN ? [[process.env.PYTHON_BIN, [scriptPath, '--json', jsonPath, '--template', templatePath, '--output', outputPath]]] : [];
    const candidates = [
        ...customPython,
        ['/usr/bin/python3', [scriptPath, '--json', jsonPath, '--template', templatePath, '--output', outputPath]],
        ['/usr/local/bin/python3', [scriptPath, '--json', jsonPath, '--template', templatePath, '--output', outputPath]],
        ['python', [scriptPath, '--json', jsonPath, '--template', templatePath, '--output', outputPath]],
        ['python3', [scriptPath, '--json', jsonPath, '--template', templatePath, '--output', outputPath]],
        ['py', ['-3', scriptPath, '--json', jsonPath, '--template', templatePath, '--output', outputPath]],
    ];

    return new Promise((resolve, reject) => {
        const tryAt = (idx) => {
            if (idx >= candidates.length) {
                reject(new Error('No se pudo ejecutar Python. Instala Python y pypdf en el servidor.'));
                return;
            }
            const [cmd, args] = candidates[idx];
            const child = spawn(cmd, args, { windowsHide: true });
            let stderr = '';
            let stdout = '';

            child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
            child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
            child.on('error', (err) => {
                console.error(`[styled-pdf][python] spawn failed: ${cmd}`, err?.message || err);
                tryAt(idx + 1);
            });
            child.on('close', (code) => {
                if (code === 0) resolve({ cmd, args, stdout, stderr });
                else if (idx < candidates.length - 1 && !(stderr || '').trim()) {
                    console.error(`[styled-pdf][python] command failed without stderr: ${cmd} exit=${code}`);
                    tryAt(idx + 1);
                }
                else reject(new Error(stderr || `Generador Python finalizó con código ${code}`));
            });
        };

        tryAt(0);
    });
}

function resolveTemplateCandidates() {
    const envPath = process.env.PDF_TEMPLATE_PATH;
    const candidates = [
        envPath,
        path.join(__dirname, '../../templates/editable_es.pdf'),
        path.join(__dirname, '../../../frontend/public/editable_es.pdf'),
        path.join(process.cwd(), 'templates/editable_es.pdf'),
        path.join(process.cwd(), 'frontend/public/editable_es.pdf')
    ].filter(Boolean);
    return candidates;
}

async function getTemplatePath(tempDir) {
    const candidates = resolveTemplateCandidates();
    const found = candidates.find((p) => fs.existsSync(p));
    if (found) return found;

    const remoteUrl = process.env.PDF_TEMPLATE_URL;
    if (remoteUrl) {
        const outPath = path.join(tempDir, 'editable_es.pdf');
        const resp = await fetch(remoteUrl);
        if (!resp.ok) throw new Error(`No se pudo descargar plantilla remota (${resp.status})`);
        const arr = await resp.arrayBuffer();
        await fsp.writeFile(outPath, Buffer.from(arr));
        return outPath;
    }

    throw new Error(`Plantilla editable_es.pdf no encontrada. Probadas rutas: ${candidates.join(' | ')}`);
}

// ── GET /api/characters ──────────────────────────────────────
router.get('/', auth, async (req, res) => {
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
router.get('/:id/summary', auth, async (req, res) => {
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
router.get('/:id', auth, async (req, res) => {
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
router.post('/', auth, upload.single('photo'), async (req, res) => {
    try {
        const data = req.body;
        const photo_url = req.file ?
            `/uploads/${req.file.filename}` :
            null;

        sanitizeJsonCols(data);

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
        spellcasting_ability, spell_save_dc, spell_attack_bonus, spells,
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
            data.spell_attack_bonus || null, data.spells || '{}',
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
router.put('/:id', auth, upload.single('photo'), async (req, res) => {
    try {

        const [exists] = await db.query(
            'SELECT id, photo_url FROM characters WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]
        );
        if (!exists.length) return res.status(404).json({ message: 'Personaje no encontrado' });

        const data = req.body;
        let photo_url = exists[0].photo_url;
        sanitizeJsonCols(data);
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
        spellcasting_ability=?, spell_save_dc=?, spell_attack_bonus=?, spells=?,
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
            data.spell_attack_bonus || null, data.spells || '{}',
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

// ── PATCH /api/characters/:id/fields ─────────────────────────
router.patch('/:id/fields', auth, async (req, res) => {
    try {
        const payload = req.body && typeof req.body === 'object' ? req.body : {};
        const entries = Object.entries(payload).filter(([k]) => PATCHABLE_FIELDS.has(k));

        if (!entries.length) {
            return res.status(400).json({ message: 'No hay campos válidos para actualizar' });
        }

        const [exists] = await db.query(
            'SELECT id FROM characters WHERE id = ? AND user_id = ?',
            [req.params.id, req.user.id]
        );
        if (!exists.length) return res.status(404).json({ message: 'Personaje no encontrado' });

        const setSql = entries.map(([k]) => `${k} = ?`).join(', ');
        const values = entries.map(([k, v]) => normalizePatchField(k, v));

        await db.query(
            `UPDATE characters SET ${setSql} WHERE id = ? AND user_id = ?`,
            [...values, req.params.id, req.user.id]
        );

        const [rows] = await db.query(
            'SELECT * FROM characters WHERE id = ? AND user_id = ?',
            [req.params.id, req.user.id]
        );
        res.json({ message: 'Campos actualizados', character: parseJsonCols(rows[0]) });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Error al actualizar campos', detail: err.message });
    }
});

// ── POST /api/characters/pdf/styled ───────────────────────────
router.post('/pdf/styled', auth, async (req, res) => {
    let tempDir = null;
    try {
        const payload = req.body && typeof req.body === 'object' ? req.body : {};
        const rawCharacter = payload.character && typeof payload.character === 'object' ? payload.character : payload;
        if (!rawCharacter || typeof rawCharacter !== 'object') {
            return res.status(400).json({ message: 'Faltan datos del personaje para generar el PDF' });
        }

        const character = {
            ...rawCharacter,
            player_username: rawCharacter.player_username || req.user?.username || '',
            __base_url: `${req.protocol}://${req.get('host')}`,
        };
        console.log('[styled-pdf][image] incoming photo_url:', character.photo_url || null);
        if (character.photo_url && typeof character.photo_url === 'string' && character.photo_url.startsWith('/uploads/')) {
            const relativePhotoPath = character.photo_url.replace(/^\/+/, '');
            const localPhotoPath = path.join(__dirname, '../../', relativePhotoPath);
            console.log('[styled-pdf][image] local candidate:', localPhotoPath);
            console.log('[styled-pdf][image] local exists:', fs.existsSync(localPhotoPath));
            if (fs.existsSync(localPhotoPath)) {
                character.__photo_abs_path = localPhotoPath;
                console.log('[styled-pdf][image] using __photo_abs_path');
            }
        }

        const scriptPath = path.join(__dirname, '../../scripts/fill_character_sheet.py');
        tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'dnd-pdf-'));
        const templatePath = await getTemplatePath(tempDir);
        const jsonPath = path.join(tempDir, 'character.json');
        const outputPath = path.join(tempDir, 'styled.pdf');

        await fsp.writeFile(jsonPath, JSON.stringify(character), 'utf8');
        const pythonResult = await runPythonGenerator({ scriptPath, jsonPath, templatePath, outputPath });
        if (pythonResult?.stdout?.trim()) {
            console.log('[styled-pdf][python][stdout]\n' + pythonResult.stdout.trim());
        }
        if (pythonResult?.stderr?.trim()) {
            console.log('[styled-pdf][python][stderr]\n' + pythonResult.stderr.trim());
        }

        const pdfBytes = await fsp.readFile(outputPath);
        const safeName = String(character.name || 'personaje')
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-_]/g, '');
        const filename = `${safeName || 'personaje'}-estilizado.pdf`;

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        return res.send(pdfBytes);
    } catch (err) {
        console.error('[characters][styled-pdf] error', err);
        return res.status(500).json({ message: 'No se pudo generar el PDF estilizado', detail: err.message });
    } finally {
        if (tempDir) {
            try {
                await fsp.rm(tempDir, { recursive: true, force: true });
            } catch { }
        }
    }
});

// ── DELETE /api/characters/:id ───────────────────────────────
router.delete('/:id', auth, async (req, res) => {
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
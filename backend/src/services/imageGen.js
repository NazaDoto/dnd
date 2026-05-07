/**
 * Servicio de generación de imágenes para ilustrar sesiones de D&D.
 *
 * Proveedor: Google Gemini 2.5 Flash Image (multi-image input).
 *
 * Lee la API key desde process.env.GEMINI_API_KEY (NUNCA hardcoded).
 *
 * Diseñado para ser extensible: si más adelante se quiere soportar
 * fal.ai, Replicate, OpenAI, etc., basta con agregar un provider
 * con la misma interfaz pública (`generateIllustration`).
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const GEMINI_MODEL = 'gemini-2.5-flash-image';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const ILLUSTRATIONS_DIR = path.join(__dirname, '../../uploads/illustrations');

const RACE_HINTS = {
    elf: 'pointed ears, slender build',
    'half-elf': 'subtly pointed ears, mixed human-elven features',
    drow: 'dark grey skin, pointed ears, white hair',
    dwarf: 'short stocky build, prominent beard, broad shoulders',
    halfling: 'small stature, curly hair, barefoot',
    gnome: 'very small, mischievous expression',
    tiefling: 'crimson or deep-red skin, curved horns, prehensile tail, pointed teeth',
    dragonborn: 'reptilian draconic head, scales covering body, no visible hair',
    'half-orc': 'green-grey skin, prominent lower tusks, muscular build',
    orc: 'green-grey skin, prominent tusks, muscular',
    halforc: 'green-grey skin, prominent lower tusks, muscular build',
    aasimar: 'glowing eyes, faint celestial radiance',
    goliath: 'tall stone-grey skin, tribal markings',
    human: 'human',
};

const CLASS_HINTS = {
    barbarian: 'wild warrior, fur and leather armor, large axe or greataxe',
    bard: 'colorful traveler clothes, lute or musical instrument',
    cleric: 'holy symbol, robes or chain armor, mace or warhammer',
    druid: 'natural leather and wood, staff with greenery, primal aura',
    fighter: 'plate or chain armor, sword or axe, soldierly stance',
    monk: 'simple robes, unarmed combat stance, athletic',
    paladin: 'shining plate armor, longsword or warhammer, holy symbol',
    ranger: 'green and brown leather, longbow, hooded cloak',
    rogue: 'dark leather, hood, daggers, sneaky stance',
    sorcerer: 'arcane robes, wild magical aura, glowing eyes',
    warlock: 'dark robes, eldritch symbols, otherworldly patron mark',
    wizard: 'long robes, pointed hat optional, wooden staff with crystal, spellbook',
    artificer: 'tinkerer robes with mechanical tools, goggles',
    paladín: 'shining plate armor, longsword or warhammer, holy symbol',
    pícara: 'dark leather, hood, daggers, sneaky stance',
    pícaro: 'dark leather, hood, daggers, sneaky stance',
    mago: 'long robes, pointed hat optional, wooden staff with crystal, spellbook',
    maga: 'long robes, pointed hat optional, wooden staff with crystal, spellbook',
    guerrero: 'plate or chain armor, sword or axe, soldierly stance',
    guerrera: 'plate or chain armor, sword or axe, soldierly stance',
    clérigo: 'holy symbol, robes or chain armor, mace or warhammer',
    bárbaro: 'wild warrior, fur and leather armor, large axe or greataxe',
    bárbara: 'wild warrior, fur and leather armor, large axe or greataxe',
    druida: 'natural leather and wood, staff with greenery, primal aura',
    bardo: 'colorful traveler clothes, lute or musical instrument',
    barda: 'colorful traveler clothes, lute or musical instrument',
    monje: 'simple robes, unarmed combat stance, athletic',
    monja: 'simple robes, unarmed combat stance, athletic',
    explorador: 'green and brown leather, longbow, hooded cloak',
    exploradora: 'green and brown leather, longbow, hooded cloak',
    hechicero: 'arcane robes, wild magical aura, glowing eyes',
    hechicera: 'arcane robes, wild magical aura, glowing eyes',
    brujo: 'dark robes, eldritch symbols, otherworldly patron mark',
    bruja: 'dark robes, eldritch symbols, otherworldly patron mark',
};

function ensureDir(dir) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

/* ────────────────────────────────────────────────────────────
 *  Cargar imágenes locales (uploads) como base64 para Gemini
 * ──────────────────────────────────────────────────────────── */
function readLocalImageAsBase64(imageUrl) {
    if (!imageUrl) return null;
    if (!imageUrl.startsWith('/uploads/')) return null;
    const abs = path.join(__dirname, '../../', imageUrl.replace(/^\//, ''));
    if (!fs.existsSync(abs)) return null;
    const buf = fs.readFileSync(abs);
    const ext = (path.extname(abs) || '.jpg').toLowerCase().replace('.', '');
    const mimeMap = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' };
    const mime = mimeMap[ext] || 'image/jpeg';
    return { base64: buf.toString('base64'), mime };
}

/* ────────────────────────────────────────────────────────────
 *  Construir prompt en inglés a partir de los datos
 * ──────────────────────────────────────────────────────────── */
function describeCharacter(c) {
    const race = (c.race || '').toLowerCase().trim();
    const cls = (c.class || '').toLowerCase().trim();
    const raceHint = RACE_HINTS[race] || c.race || 'humanoid';
    const classHint = CLASS_HINTS[cls] || c.class || '';
    const lvl = c.level ? `level ${c.level}` : '';
    const namePart = c.name ? `${c.name}` : 'the character';
    return [
        `${namePart}: ${raceHint}${classHint ? ', ' + classHint : ''}${lvl ? ', ' + lvl : ''}`
    ].filter(Boolean).join(', ');
}

const STYLE_BLOCKS = {
    soft: 'No blood. Cinematic painterly style, dramatic lighting, fantasy concept art, detailed textures. Style inspired by Wayne Reynolds and Tyler Jacobson D&D illustration.',
    medium: 'Visible wounds and stylized blood splatter, fantasy illustration not photorealistic. Painterly style, dramatic rim lighting, embers, smoke. Style: Wayne Reynolds D&D illustration.',
    hard: 'Gritty dark fantasy, visible wounds and blood, fallen enemies, smoke and embers. Frazetta-inspired heavy chiaroscuro lighting, dramatic painterly composition. Style: Frank Frazetta meets Wayne Reynolds.',
};

function buildPrompt({ session, characters, intensity = 'medium', extraHints = '' }) {
    const charDescriptions = characters.map(describeCharacter).filter(Boolean);
    const charBlock = charDescriptions.length
        ? `Featured characters in the scene:\n- ${charDescriptions.join('\n- ')}`
        : '';

    const sessionTitle = session.title ? `"${session.title}"` : '';
    const summaryRaw = [session.summary, session.recap, session.mvp_notes, session.loot_summary]
        .filter((t) => t && String(t).trim())
        .join('\n\n')
        .trim();

    const sceneBlock = summaryRaw
        ? `Scene description (translate the spirit, not literally):\n${summaryRaw}`
        : 'Generic D&D adventuring scene.';

    return `Create a single illustrated D&D fantasy scene${sessionTitle ? ' titled ' + sessionTitle : ''}.

${charBlock}

${sceneBlock}

${extraHints ? extraHints + '\n' : ''}
${STYLE_BLOCKS[intensity] || STYLE_BLOCKS.medium}

Composition: dynamic, cinematic, 16:9 landscape orientation. Keep the visual identity (face, race traits, hair color, clothing colors) of each character consistent with the reference portraits provided. Show the action of the scene happening, do not show portraits.`;
}

/* ────────────────────────────────────────────────────────────
 *  Llamada a Gemini 2.5 Flash Image
 * ──────────────────────────────────────────────────────────── */
async function callGemini({ prompt, referenceImages, apiKey }) {
    const parts = [{ text: prompt }];

    for (const ref of referenceImages) {
        if (!ref) continue;
        parts.push({ inline_data: { mime_type: ref.mime, data: ref.base64 } });
    }

    const body = {
        contents: [{ parts }],
        generationConfig: {
            responseModalities: ['IMAGE'],
        },
    };

    const res = await fetch(`${GEMINI_ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        let errPayload = '';
        try { errPayload = await res.text(); } catch { /* ignore */ }
        const err = new Error(`Gemini ${res.status}: ${errPayload || res.statusText}`);
        err.status = res.status;
        err.payload = errPayload;
        throw err;
    }

    const data = await res.json();
    const candidates = data?.candidates || [];
    for (const cand of candidates) {
        const partList = cand?.content?.parts || [];
        for (const p of partList) {
            const inline = p.inline_data || p.inlineData;
            if (inline?.data) {
                return {
                    base64: inline.data,
                    mime: inline.mime_type || inline.mimeType || 'image/png',
                    finishReason: cand.finishReason || null,
                    raw: data,
                };
            }
        }
    }

    const blocked = data?.promptFeedback?.blockReason || candidates?.[0]?.finishReason || null;
    const err = new Error(blocked
        ? `Gemini bloqueó la generación: ${blocked}`
        : 'Gemini no devolvió imagen');
    err.blocked = !!blocked;
    err.reason = blocked;
    throw err;
}

/* ────────────────────────────────────────────────────────────
 *  API pública del servicio
 * ──────────────────────────────────────────────────────────── */
async function generateSessionIllustration({ session, characters, intensity = 'medium', extraHints = '' }) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        const err = new Error('Falta GEMINI_API_KEY en variables de entorno');
        err.code = 'NO_API_KEY';
        throw err;
    }

    const prompt = buildPrompt({ session, characters, intensity, extraHints });

    const referenceImages = (characters || [])
        .map((c) => readLocalImageAsBase64(c.photo_url))
        .filter(Boolean)
        .slice(0, 3);

    const result = await callGemini({ prompt, referenceImages, apiKey });

    ensureDir(ILLUSTRATIONS_DIR);
    const ext = (result.mime.split('/')[1] || 'png').replace('jpeg', 'jpg');
    const filename = `sess${session.id || 'na'}-${Date.now()}-${crypto.randomBytes(3).toString('hex')}.${ext}`;
    const absPath = path.join(ILLUSTRATIONS_DIR, filename);
    fs.writeFileSync(absPath, Buffer.from(result.base64, 'base64'));

    return {
        image_url: `/uploads/illustrations/${filename}`,
        prompt,
        model: GEMINI_MODEL,
        references_used: characters.map((c) => ({
            id: c.id,
            name: c.name,
            photo_url: c.photo_url,
            included_as_reference: !!readLocalImageAsBase64(c.photo_url),
        })),
        intensity,
    };
}

module.exports = {
    generateSessionIllustration,
    buildPrompt,
    GEMINI_MODEL,
};

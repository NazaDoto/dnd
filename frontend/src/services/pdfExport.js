import jsPDF from 'jspdf'
import { PDFDocument } from 'pdf-lib'
import { CLASSES, ATTRIBUTES, getModifier, formatModifier } from './dndData.js'

function pdfTheme() {
    return {
        marginX: 14,
        topY: 14,
        bottomY: 282,
        pageWidth: 210,
        contentWidth: 182,
        dark: [31, 27, 20],
        sectionDark: [42, 36, 27],
        gold: [245, 198, 102],
        muted: [95, 85, 70],
        text: [35, 35, 35],
        softBg: [245, 242, 235],
    }
}

function sanitize(value, fallback = '-') {
    if (value === null || value === undefined || value === '') return fallback
    return String(value).replace(/[—–]/g, '-').replace(/[•]/g, '-')
}

function setFont(doc, style = 'normal', size = 9, color = [35, 35, 35]) {
    doc.setFont('helvetica', style)
    doc.setFontSize(size)
    doc.setTextColor(...color)
}

function ensureSpace(doc, y, needed = 10) {
    const t = pdfTheme()
    if (y + needed > t.bottomY) {
        doc.addPage()
        return t.topY
    }
    return y
}

function addSection(doc, title, y) {
    const t = pdfTheme()
    y = ensureSpace(doc, y, 16)
    doc.setFillColor(...t.sectionDark)
    doc.rect(t.marginX, y, t.contentWidth, 8, 'F')
    setFont(doc, 'bold', 10, t.gold)
    doc.text(sanitize(title).toUpperCase(), t.marginX + 4, y + 5.5)
    return y + 13
}

function addParagraph(doc, text, x, y, width = 182, options = {}) {
    const t = pdfTheme()
    const clean = sanitize(text, '')
    if (!clean.trim()) return y
    const lineHeight = options.lineHeight || 4.8
    setFont(doc, options.style || 'normal', options.fontSize || 9, options.color || t.text)
    const lines = doc.splitTextToSize(clean, width)
    lines.forEach((line) => {
        y = ensureSpace(doc, y, lineHeight + 2)
        doc.text(line, x, y)
        y += lineHeight
    })
    return y + (options.gapAfter ?? 2)
}

function addTwoCols(doc, pairs, y) {
    const t = pdfTheme()
    const leftX = t.marginX + 2
    const rightX = t.marginX + 94
    const colW = 84
    for (let i = 0; i < pairs.length; i += 2) {
        const left = pairs[i]
        const right = pairs[i + 1]
        const baseY = y
        const draw = (pair, x) => {
            if (!pair) return baseY
            let yy = addParagraph(doc, `${pair[0]}:`, x, baseY, colW, { style: 'bold', color: t.muted, gapAfter: 1, fontSize: 8.5 })
            yy = addParagraph(doc, pair[1], x, yy, colW, { gapAfter: 1.5, fontSize: 8.7 })
            return yy
        }
        y = Math.max(draw(left, leftX), draw(right, rightX))
    }
    return y
}

function addFooter(doc, label) {
    const pages = doc.internal.getNumberOfPages()
    for (let i = 1; i <= pages; i++) {
        doc.setPage(i)
        setFont(doc, 'normal', 8, [130, 120, 105])
        doc.text(`${sanitize(label)} · Página ${i} de ${pages}`, 105, 290, { align: 'center' })
    }
}

function classLabel(cls) {
    const found = CLASSES.find((c) => c.value === cls)
    return found ? found.label : sanitize(cls)
}

function safeArray(value) {
    if (Array.isArray(value)) return value
    if (typeof value === 'string' && value.trim()) {
        try {
            const parsed = JSON.parse(value)
            return Array.isArray(parsed) ? parsed : []
        } catch {
            return []
        }
    }
    return []
}

export function exportCharacterPdfPlain(character) {
    const t = pdfTheme()
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    let y = 0

    doc.setFillColor(...t.dark)
    doc.rect(0, 0, t.pageWidth, 36, 'F')
    setFont(doc, 'bold', 22, t.gold)
    doc.text(sanitize(character.name || 'Personaje'), t.marginX, 16)
    setFont(doc, 'normal', 10, [230, 220, 200])
    doc.text(`${sanitize(character.race)} · ${classLabel(character.class)} · Nivel ${character.level || 1}`, t.marginX, 24)
    y = 46

    y = addSection(doc, 'Datos principales', y)
    y = addTwoCols(doc, [
        ['Nombre', character.name],
        ['Raza', character.race],
        ['Clase', classLabel(character.class)],
        ['Nivel', character.level],
        ['Trasfondo', character.background],
        ['Alineamiento', character.alignment],
        ['XP', character.experience_points || 0]
    ], y)

    y = addSection(doc, 'Combate', y + 2)
    y = addTwoCols(doc, [
        ['PV', `${character.hit_points_current || 0}/${character.hit_points_max || 0}`],
        ['CA', character.armor_class || '-'],
        ['Iniciativa', formatModifier(character.initiative || 0)],
        ['Velocidad', `${character.speed || 0} ft`],
        ['B. competencia', formatModifier(character.proficiency_bonus || 2)],
        ['Percepción pasiva', character.passive_perception || 10]
    ], y)

    y = addSection(doc, 'Atributos', y + 2)
    ATTRIBUTES.forEach((attr) => {
        y = addParagraph(doc, `${attr.label}: ${character[attr.key] || 10} (${formatModifier(getModifier(character[attr.key] || 10))})`, t.marginX + 2, y, 178, { gapAfter: 1 })
    })

    y = addSection(doc, 'Trasfondo', y + 2)
    y = addParagraph(doc, character.backstory || 'Sin historia registrada.', t.marginX + 2, y, 178, { gapAfter: 2 })

    y = addSection(doc, 'Equipo y rasgos', y + 2)
    y = addParagraph(doc, `Equipo: ${safeArray(character.equipment).map((i) => (typeof i === 'string' ? i : i.name || 'Objeto')).join(', ') || 'Sin equipo'}`, t.marginX + 2, y, 178)
    y = addParagraph(doc, `Rasgos: ${safeArray(character.features_traits).map((f) => (typeof f === 'string' ? f : f.name || 'Rasgo')).join(', ') || 'Sin rasgos'}`, t.marginX + 2, y, 178)

    addFooter(doc, character.name || 'Personaje')
    const filename = `${String(character.name || 'personaje').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, '')}.pdf`
    doc.save(filename)
}

function parseMaybeJson(value, fallback) {
    if (value === null || value === undefined || value === '') return fallback
    if (typeof value === 'string') {
        try {
            return JSON.parse(value)
        } catch {
            return fallback
        }
    }
    return value
}

function normalizeAttacks(character) {
    const attacks = parseMaybeJson(character.attacks_spellcasting, [])
    return Array.isArray(attacks) ? attacks : []
}

function normalizeSpells(character) {
    const base = {
        cantrips: [],
        level1: { slots: 0, slots_used: 0, spells: [] },
        level2: { slots: 0, slots_used: 0, spells: [] },
        level3: { slots: 0, slots_used: 0, spells: [] },
        level4: { slots: 0, slots_used: 0, spells: [] },
        level5: { slots: 0, slots_used: 0, spells: [] },
        level6: { slots: 0, slots_used: 0, spells: [] },
        level7: { slots: 0, slots_used: 0, spells: [] },
        level8: { slots: 0, slots_used: 0, spells: [] },
        level9: { slots: 0, slots_used: 0, spells: [] },
    }
    const parsed = parseMaybeJson(character.spells, base)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return base
    const out = { ...base, ...parsed }
    for (let i = 1; i <= 9; i++) {
        const k = `level${i}`
        out[k] = {
            slots: Number(parsed?.[k]?.slots || 0),
            slots_used: Number(parsed?.[k]?.slots_used || 0),
            spells: Array.isArray(parsed?.[k]?.spells) ? parsed[k].spells : []
        }
    }
    out.cantrips = Array.isArray(parsed.cantrips) ? parsed.cantrips : []
    return out
}

function drawWrapped(doc, text, x, y, size, width, color = [35, 35, 35], lineHeight = 4.2) {
    const safe = sanitize(text, '')
    if (!safe) return y
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(size)
    doc.setTextColor(...color)
    const lines = doc.splitTextToSize(safe, width)
    lines.forEach((line) => {
        doc.text(line, x, y)
        y += lineHeight
    })
    return y + 1.5
}

export async function exportCharacterPdfStyled(character) {
    const templateUrl = '/pdf/5E_CharacterSheet_Fillable.pdf'
    const res = await fetch(templateUrl)
    if (!res.ok) throw new Error('Plantilla PDF no encontrada')
    const bytes = await res.arrayBuffer()
    const pdfDoc = await PDFDocument.load(bytes)
    const form = pdfDoc.getForm()

    const fields = form.getFields()
    const norm = (v) => String(v || '').toLowerCase().replace(/[^a-z0-9]/g, '')
    const fieldNames = fields.map((f) => f.getName())
    const fieldNorm = fieldNames.map((n) => ({ raw: n, norm: norm(n) }))
    const used = new Set()

    const findByHints = (hints = []) => {
        const normalizedHints = hints.map(norm).filter(Boolean)
        let best = null
        for (const f of fieldNorm) {
            const score = normalizedHints.reduce((acc, h) => acc + (f.norm.includes(h) ? 1 : 0), 0)
            if (!score) continue
            const penalty = used.has(f.raw) ? 0.25 : 0
            const finalScore = score - penalty
            if (!best || finalScore > best.score) best = { name: f.raw, score: finalScore }
        }
        return best?.name || null
    }

    const setText = (hints, value) => {
        const name = Array.isArray(hints) ? findByHints(hints) : findByHints([hints])
        if (!name) return false
        const val = sanitize(value, '')
        try {
            form.getTextField(name).setText(val)
            used.add(name)
            return true
        } catch {
            return false
        }
    }

    const skills = safeArray(character.skills_prof)
    const expertise = safeArray(character.skills_expertise)
    const saves = safeArray(character.saving_throws_prof)
    const attacks = normalizeAttacks(character)
    const spells = normalizeSpells(character)

    setText(['character', 'name'], character.name)
    setText(['class', 'level'], `${classLabel(character.class)} ${character.level || 1}`)
    setText(['background'], character.background)
    setText(['race'], character.race)
    setText(['experience', 'xp'], String(character.experience_points || 0))
    setText(['alignment'], character.alignment)
    setText(['player', 'name'], character.player_username || '')

    setText(['strength', 'score'], String(character.strength || 10))
    setText(['dexterity', 'score'], String(character.dexterity || 10))
    setText(['constitution', 'score'], String(character.constitution || 10))
    setText(['intelligence', 'score'], String(character.intelligence || 10))
    setText(['wisdom', 'score'], String(character.wisdom || 10))
    setText(['charisma', 'score'], String(character.charisma || 10))

    setText(['armor', 'class'], String(character.armor_class || 10))
    setText(['INITIATIVE'], formatModifier(character.initiative || 0))
    setText(['SPEED'], String(character.speed || 0))
    setText(['hit', 'point', 'maximum'], String(character.hit_points_max || 0))
    setText(['current', 'hit', 'points'], String(character.hit_points_current || 0))
    setText(['temporary', 'hit', 'points'], String(character.hit_points_temp || 0))
    setText(['proficiency', 'bonus'], formatModifier(character.proficiency_bonus || 2))
    setText(['INSPIRATION'], character.inspiration ? 'X' : '')
    setText(['passive', 'perception'], String(character.passive_perception || 10))

    setText(['CP'], String(character.copper_pieces || 0))
    setText(['SP'], String(character.silver_pieces || 0))
    setText(['EP'], String(character.electrum_pieces || 0))
    setText(['GP'], String(character.gold_pieces || 0))
    setText(['PP'], String(character.platinum_pieces || 0))

    const skillMap = [
        ['acrobatics', 'Acrobatics (Dex)'], ['animal_handling', 'Animal Handling (Wis)'], ['arcana', 'Arcana (Int)'],
        ['athletics', 'Athletics (Str)'], ['deception', 'Deception (Cha)'], ['history', 'History (Int)'],
        ['insight', 'Insight (Wis)'], ['intimidation', 'Intimidation (Cha)'], ['investigation', 'Investigation (Int)'],
        ['medicine', 'Medicine (Wis)'], ['nature', 'Nature (Int)'], ['perception', 'Perception (Wis)'],
        ['performance', 'Performance (Cha)'], ['persuasion', 'Persuasion (Cha)'], ['religion', 'Religion (Int)'],
        ['sleight_of_hand', 'Sleight of Hand (Dex)'], ['stealth', 'Stealth (Dex)'], ['survival', 'Survival (Wis)'],
    ]
    for (const [k, n] of skillMap) setText([n], expertise.includes(k) ? 'E' : skills.includes(k) ? 'P' : '')
    const saveMap = [['strength', 'STRENGTH'], ['dexterity', 'DEXTERITY'], ['constitution', 'CONSTITUTION'], ['intelligence', 'INTELLIGENCE'], ['wisdom', 'WISDOM'], ['charisma', 'CHARISMA']]
    for (const [k, n] of saveMap) setText([n], saves.includes(k) ? 'P' : '')

    setText(['equipment'], safeArray(character.equipment).map((i) => typeof i === 'string' ? i : i?.name || '').filter(Boolean).join(', '))
    setText(['other', 'proficiencies', 'languages'], [...safeArray(character.other_proficiencies), ...safeArray(character.languages)].join(', '))
    setText(['features', 'traits'], safeArray(character.features_traits).map((f) => typeof f === 'string' ? f : f?.name || '').join(', '))
    setText(['attacks', 'spellcasting'], attacks.map((a) => `${a.name || ''} ${a.bonus || ''} ${a.damage || ''} ${a.type || ''}`.trim()).join('\n'))

    setText(['personality', 'traits'], character.personality_traits)
    setText(['IDEALS'], character.ideals)
    setText(['BONDS'], character.bonds)
    setText(['FLAWS'], character.flaws)
    setText(['character', 'backstory'], character.backstory)
    setText(['character', 'appearance'], character.appearance_notes)
    setText(['allies', 'organizations'], character.allies_organizations)
    setText(['TREASURE'], character.treasure)
    setText(['AGE'], character.age)
    setText(['HEIGHT'], character.height)
    setText(['WEIGHT'], character.weight)
    setText(['EYES'], character.eyes)
    setText(['SKIN'], character.skin)
    setText(['HAIR'], character.hair)

    setText(['spellcasting', 'class'], classLabel(character.class))
    setText(['spellcasting', 'ability'], character.spellcasting_ability)
    setText(['spell', 'save', 'dc'], String(character.spell_save_dc || ''))
    setText(['spell', 'attack', 'bonus'], String(character.spell_attack_bonus || ''))
    setText(['CANTRIPS'], spells.cantrips.join(', '))
    for (let i = 1; i <= 9; i++) {
        const lvl = spells[`level${i}`]
        setText([`LEVEL ${i} SLOTS TOTAL`], String(lvl.slots || 0))
        setText([`LEVEL ${i} SLOTS EXPENDED`], String(lvl.slots_used || 0))
        setText([`LEVEL ${i} SPELLS KNOWN`], (lvl.spells || []).join(', '))
    }

    const out = await pdfDoc.save()
    const blob = new Blob([out], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const filename = `${String(character.name || 'personaje').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, '')}-estilizado.pdf`
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
}

export async function exportCharacterPdf(character, opts = {}) {
    const format = opts.format || 'plain'
    if (format === 'styled') {
        return exportCharacterPdfStyled(character)
    }
    return exportCharacterPdfPlain(character)
}

export function exportCampaignPdf(campaign, linkedCharacters = []) {
    const t = pdfTheme()
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    let y = 18

    doc.setFillColor(...t.dark)
    doc.rect(0, 0, t.pageWidth, 30, 'F')
    setFont(doc, 'bold', 18, t.gold)
    doc.text(`Campaña: ${sanitize(campaign.name)}`, t.marginX, 16)

    y = addSection(doc, 'Resumen', 38)
    y = addTwoCols(doc, [
        ['Estado', campaign.status || 'activa'],
        ['Mundo', campaign.setting_name || '-'],
        ['Código invitación', campaign.invite_code || '-'],
        ['Inicio', campaign.start_date || '-'],
        ['Próxima sesión', campaign.next_session_date || '-']
    ], y)
    y = addParagraph(doc, campaign.summary || 'Sin resumen', t.marginX + 2, y, 178, { gapAfter: 2 })
    if (campaign.campaign_hook) {
        y = addParagraph(doc, `Gancho: ${campaign.campaign_hook}`, t.marginX + 2, y, 178, { gapAfter: 2 })
    }

    const longBlocks = [
        ['Verdades y temas', campaign.themes_truths],
        ['Frentes y antagonistas', campaign.fronts_antagonists],
        ['Misiones activas', campaign.active_quests],
        ['Ubicaciones y mapas', campaign.locations_maps],
        ['Reglas de mesa', campaign.house_rules],
        ['Preparación de sesión', campaign.session_prep],
        ['Última sesión (recap)', campaign.last_session_recap],
        ['Tesoro / botín (notas)', campaign.treasure_log],
        ['Notas privadas DM', campaign.dm_private_notes],
        ['Enlaces y recursos', campaign.resources_links]
    ]
    longBlocks.forEach(([title, text]) => {
        if (!text || !String(text).trim()) return
        y = addSection(doc, title, y + 2)
        y = addParagraph(doc, text, t.marginX + 2, y, 178, { gapAfter: 2 })
    })

    const npcs = Array.isArray(campaign.npcs_json) ? campaign.npcs_json : []
    if (npcs.length) {
        y = addSection(doc, 'NPCs', y + 2)
        npcs.forEach((npc) => {
            const line = [npc.name, npc.role].filter(Boolean).join(' — ') || 'NPC'
            y = addParagraph(doc, `${line}: ${npc.notes || ''}`, t.marginX + 2, y, 178, { gapAfter: 1.5 })
        })
    }

    y = addSection(doc, 'Personajes en campaña', y + 2)
    if (!linkedCharacters.length) {
        addParagraph(doc, 'No hay personajes vinculados.', t.marginX + 2, y, 178)
    } else {
        linkedCharacters.forEach((c) => {
            y = ensureSpace(doc, y, 14)
            doc.setFillColor(...t.softBg)
            doc.roundedRect(t.marginX + 1, y - 3.5, 180, 11, 2, 2, 'F')
            y = addParagraph(doc, `${sanitize(c.name)} · ${sanitize(c.player_username, 'Jugador')} · ${classLabel(c.class)} Nv.${c.level || 1} · CA ${c.armor_class || '-'} · PV ${c.hit_points_current || 0}/${c.hit_points_max || 0}`, t.marginX + 3, y, 176, { gapAfter: 1.4 })
        })
    }

    addFooter(doc, campaign.name || 'Campaña')
    const filename = `${String(campaign.name || 'campania').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, '')}-campania.pdf`
    doc.save(filename)
}

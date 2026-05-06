import jsPDF from 'jspdf'
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

function pickPdfFormat() {
    const response = window.prompt(
        'Elegí formato de PDF:\n1 = Común (texto simple)\n2 = Estilizado (hoja D&D)\n\nEscribí 1 o 2',
        '1'
    )
    if (response === null) return null
    return String(response).trim() === '2' ? 'styled' : 'plain'
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
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const t = pdfTheme()
    const attacks = normalizeAttacks(character)
    const spells = normalizeSpells(character)

    doc.setFillColor(24, 20, 16)
    doc.rect(0, 0, 210, 297, 'F')
    doc.setFillColor(248, 244, 235)
    doc.roundedRect(8, 8, 194, 281, 3, 3, 'F')

    setFont(doc, 'bold', 20, [60, 44, 20])
    doc.text(sanitize(character.name || 'Personaje'), 14, 20)
    setFont(doc, 'normal', 10, [95, 85, 70])
    doc.text(`${sanitize(character.race)} · ${classLabel(character.class)} · Nivel ${character.level || 1}`, 14, 27)
    doc.text(`XP ${character.experience_points || 0} · ${sanitize(character.alignment, '')}`, 14, 33)

    let y = 42
    y = addSection(doc, 'Atributos y combate', y)
    y = addTwoCols(doc, [
        ['FUE', `${character.strength || 10} (${formatModifier(getModifier(character.strength || 10))})`],
        ['DES', `${character.dexterity || 10} (${formatModifier(getModifier(character.dexterity || 10))})`],
        ['CON', `${character.constitution || 10} (${formatModifier(getModifier(character.constitution || 10))})`],
        ['INT', `${character.intelligence || 10} (${formatModifier(getModifier(character.intelligence || 10))})`],
        ['SAB', `${character.wisdom || 10} (${formatModifier(getModifier(character.wisdom || 10))})`],
        ['CAR', `${character.charisma || 10} (${formatModifier(getModifier(character.charisma || 10))})`],
        ['PV', `${character.hit_points_current || 0}/${character.hit_points_max || 0}`],
        ['CA', `${character.armor_class || 10}`],
        ['Iniciativa', formatModifier(character.initiative || 0)],
        ['Velocidad', `${character.speed || 0} ft`],
        ['PB', formatModifier(character.proficiency_bonus || 2)],
        ['Percep. pasiva', `${character.passive_perception || 10}`],
    ], y)

    y = addSection(doc, 'Ataques y conjuros', y + 1)
    y = addParagraph(doc, `Ataques: ${attacks.map((a) => `${a.name || '-'} (${a.bonus || ''}, ${a.damage || ''} ${a.type || ''})`).join(' · ') || 'Sin ataques'}`, 16, y, 176, { fontSize: 8.4 })
    y = addParagraph(doc, `Conjuros (trucos): ${spells.cantrips.join(', ') || '-'}`, 16, y, 176, { fontSize: 8.4 })
    y = addParagraph(doc, `Habilidad de lanzamiento: ${sanitize(character.spellcasting_ability, '-')} · CD ${character.spell_save_dc || '-'} · Ataque ${character.spell_attack_bonus || '-'}`, 16, y, 176, { fontSize: 8.4 })

    y = addSection(doc, 'Trasfondo y descripcion', y + 1)
    y = addParagraph(doc, `Rasgos: ${sanitize(character.personality_traits, '-')}`, 16, y, 176, { fontSize: 8.2 })
    y = addParagraph(doc, `Ideales: ${sanitize(character.ideals, '-')}`, 16, y, 176, { fontSize: 8.2 })
    y = addParagraph(doc, `Vinculos: ${sanitize(character.bonds, '-')}`, 16, y, 176, { fontSize: 8.2 })
    y = addParagraph(doc, `Defectos: ${sanitize(character.flaws, '-')}`, 16, y, 176, { fontSize: 8.2 })
    y = addParagraph(doc, `Historia: ${sanitize(character.backstory, '-')}`, 16, y, 176, { fontSize: 8.2 })
    y = addParagraph(doc, `Apariencia: ${sanitize(character.appearance_notes, '-')}`, 16, y, 176, { fontSize: 8.2 })

    y = addSection(doc, 'Equipo, rasgos y recursos', y + 1)
    y = addParagraph(doc, `Equipo: ${safeArray(character.equipment).map((i) => (typeof i === 'string' ? i : i?.name || '')).join(', ') || '-'}`, 16, y, 176, { fontSize: 8.2 })
    y = addParagraph(doc, `Rasgos y capacidades: ${safeArray(character.features_traits).map((f) => (typeof f === 'string' ? f : f?.name || '')).join(', ') || '-'}`, 16, y, 176, { fontSize: 8.2 })
    y = addParagraph(doc, `Idiomas: ${safeArray(character.languages).join(', ') || '-'}`, 16, y, 176, { fontSize: 8.2 })
    y = addParagraph(doc, `Otras competencias: ${safeArray(character.other_proficiencies).join(', ') || '-'}`, 16, y, 176, { fontSize: 8.2 })
    y = addParagraph(doc, `Monedas: CP ${character.copper_pieces || 0} · SP ${character.silver_pieces || 0} · EP ${character.electrum_pieces || 0} · GP ${character.gold_pieces || 0} · PP ${character.platinum_pieces || 0}`, 16, y, 176, { fontSize: 8.2 })
    y = addParagraph(doc, `Tesoro: ${sanitize(character.treasure, '-')}`, 16, y, 176, { fontSize: 8.2 })
    y = addParagraph(doc, `Alianzas: ${sanitize(character.allies_organizations, '-')} · Faccion: ${sanitize(character.faction, '-')}`, 16, y, 176, { fontSize: 8.2 })

    addFooter(doc, `${character.name || 'Personaje'} · Estilizado`)
    const filename = `${String(character.name || 'personaje').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, '')}-estilizado.pdf`
    doc.save(filename)
}

export async function exportCharacterPdf(character, opts = {}) {
    const format = opts.format || 'plain'
    if (format === 'styled') {
        return exportCharacterPdfStyled(character)
    }
    return exportCharacterPdfPlain(character)
}

export async function exportCharacterPdfWithOption(character) {
    const format = pickPdfFormat()
    if (!format) return
    return exportCharacterPdf(character, { format })
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

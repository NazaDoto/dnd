import jsPDF from 'jspdf'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
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
    const templateUrl = '/pdf/dnd_blankcharactersheet_es.pdf'
    const res = await fetch(templateUrl)
    if (!res.ok) throw new Error('Plantilla PDF no encontrada')
    const bytes = await res.arrayBuffer()
    const pdfDoc = await PDFDocument.load(bytes)
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    const pages = pdfDoc.getPages()
    const page1 = pages[0]
    const page2 = pages[1]
    const page3 = pages[2]
    const black = rgb(0.08, 0.08, 0.08)
    const BASE_W = 612
    const BASE_H = 792
    const p1 = page1.getSize()
    const scaleX = p1.width / BASE_W
    const scaleY = p1.height / BASE_H
    const tx = (x) => x * scaleX
    const ty = (y) => y * scaleY
    const ts = (s) => s * ((scaleX + scaleY) / 2)

    const toPdfSafe = (value) => {
        const raw = sanitize(value, '')
        return raw
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^ -~]/g, '')
    }
    const draw = (page, text, x, y, size = 9, isBold = false) => {
        const val = toPdfSafe(text)
        if (!val) return
        page.drawText(val, { x: tx(x), y: ty(y), size: ts(size), font: isBold ? bold : font, color: black })
    }
    const wrap = (page, text, x, y, width, size = 8.2, line = 9.2) => {
        const val = toPdfSafe(text)
        if (!val) return y
        const words = val.split(/\s+/)
        let current = ''
        let yy = y
        const fontSize = ts(size)
        const wrapWidth = width * scaleX
        const lineStep = line * scaleY
        for (const w of words) {
            const test = current ? `${current} ${w}` : w
            if (font.widthOfTextAtSize(test, fontSize) > wrapWidth) {
                draw(page, current, x, yy, size)
                yy -= lineStep
                current = w
            } else {
                current = test
            }
        }
        if (current) draw(page, current, x, yy, size)
        return yy - lineStep
    }

    const skills = safeArray(character.skills_prof)
    const expertise = safeArray(character.skills_expertise)
    const saves = safeArray(character.saving_throws_prof)
    const attacks = normalizeAttacks(character)
    const spells = normalizeSpells(character)

    // Pagina 1
    draw(page1, character.name, 38, 742, 11, true)
    draw(page1, `${classLabel(character.class)} ${character.level || 1}`, 38, 775, 9)
    draw(page1, character.background, 165, 775, 9)
    draw(page1, character.race, 327, 775, 9)
    draw(page1, character.alignment, 489, 775, 9)
    draw(page1, String(character.experience_points || 0), 548, 775, 9)

    const scorePos = { strength: [70, 638], dexterity: [70, 570], constitution: [70, 502], intelligence: [70, 434], wisdom: [70, 365], charisma: [70, 297] }
    ATTRIBUTES.forEach((attr) => {
        const [x, y] = scorePos[attr.key]
        const score = Number(character[attr.key] || 10)
        draw(page1, String(score), x, y, 14, true)
        draw(page1, formatModifier(getModifier(score)), x - 2, y - 26, 10)
    })
    draw(page1, String(character.armor_class || 10), 245, 602, 13, true)
    draw(page1, formatModifier(character.initiative || 0), 307, 602, 11, true)
    draw(page1, String(character.speed || 0), 370, 602, 11, true)
    draw(page1, String(character.hit_points_max || 0), 482, 664, 11)
    draw(page1, String(character.hit_points_current || 0), 482, 602, 12, true)
    draw(page1, String(character.hit_points_temp || 0), 482, 560, 10)
    draw(page1, formatModifier(character.proficiency_bonus || 2), 244, 512, 11, true)
    draw(page1, character.inspiration ? 'X' : '', 244, 456, 11, true)
    draw(page1, String(character.passive_perception || 10), 243, 242, 11, true)

    draw(page1, String(character.copper_pieces || 0), 82, 125, 9)
    draw(page1, String(character.silver_pieces || 0), 82, 110, 9)
    draw(page1, String(character.electrum_pieces || 0), 82, 95, 9)
    draw(page1, String(character.gold_pieces || 0), 82, 80, 9)
    draw(page1, String(character.platinum_pieces || 0), 82, 65, 9)

    const equipment = safeArray(character.equipment).map((i) => (typeof i === 'string' ? i : i?.name || '')).filter(Boolean).join(', ')
    wrap(page1, equipment, 138, 154, 155, 8.2, 8.6)
    const profsAndLangs = [...safeArray(character.other_proficiencies), ...safeArray(character.languages)].join(', ')
    wrap(page1, profsAndLangs, 303, 154, 240, 8.2, 8.6)
    wrap(page1, safeArray(character.features_traits).map((f) => (typeof f === 'string' ? f : f?.name || '')).join(', '), 326, 238, 230, 8.1, 8.4)
    let ay = 352
    attacks.slice(0, 3).forEach((a) => {
        draw(page1, a.name || '', 326, ay, 8)
        draw(page1, a.bonus || '', 448, ay, 8)
        draw(page1, `${a.damage || ''} ${a.type || ''}`.trim(), 490, ay, 8)
        ay -= 20
    })

    // Marcas de salvaciones/habilidades
    const saveY = { strength: 470, dexterity: 452, constitution: 434, intelligence: 416, wisdom: 398, charisma: 380 }
    Object.keys(saveY).forEach((k) => draw(page1, saves.includes(k) ? 'X' : '', 203, saveY[k], 8, true))
    const skillY = {
        acrobatics: 344, animal_handling: 326, arcana: 308, athletics: 290, deception: 272, history: 254,
        insight: 236, intimidation: 218, investigation: 200, medicine: 182, nature: 164, perception: 146,
        performance: 128, persuasion: 110, religion: 92, sleight_of_hand: 74, stealth: 56, survival: 38
    }
    Object.keys(skillY).forEach((k) => {
        const mark = expertise.includes(k) ? 'E' : skills.includes(k) ? 'P' : ''
        draw(page1, mark, 203, skillY[k], 7.5)
    })

    // Pagina 2
    draw(page2, character.name, 38, 774, 10, true)
    draw(page2, character.age, 66, 735, 9)
    draw(page2, character.height, 160, 735, 9)
    draw(page2, character.weight, 248, 735, 9)
    draw(page2, character.eyes, 350, 774, 9)
    draw(page2, character.skin, 350, 735, 9)
    draw(page2, character.hair, 510, 735, 9)
    wrap(page2, character.personality_traits, 38, 505, 250, 8.2, 8.8)
    wrap(page2, character.ideals, 38, 420, 250, 8.2, 8.8)
    wrap(page2, character.bonds, 38, 336, 250, 8.2, 8.8)
    wrap(page2, character.flaws, 38, 252, 250, 8.2, 8.8)
    wrap(page2, character.backstory, 305, 640, 255, 8.1, 8.5)
    wrap(page2, character.appearance_notes, 305, 410, 255, 8.1, 8.5)
    wrap(page2, safeArray(character.features_traits).map((f) => (typeof f === 'string' ? f : f?.name || '')).join(', '), 305, 185, 255, 8.1, 8.5)
    wrap(page2, character.allies_organizations, 38, 160, 250, 8.2, 8.8)
    wrap(page2, character.treasure, 38, 70, 250, 8.2, 8.8)

    // Pagina 3
    draw(page3, classLabel(character.class), 39, 775, 9)
    draw(page3, character.spellcasting_ability, 70, 710, 9)
    draw(page3, String(character.spell_save_dc || ''), 144, 710, 9)
    draw(page3, String(character.spell_attack_bonus || ''), 214, 710, 9)
    wrap(page3, spells.cantrips.join(', '), 36, 638, 160, 8, 8.5)
    let sy = 618
    for (let i = 1; i <= 9; i++) {
        const lvl = spells[`level${i}`]
        draw(page3, String(lvl.slots || 0), 230, sy + 3, 8)
        draw(page3, String(lvl.slots_used || 0), 252, sy + 3, 8)
        wrap(page3, (lvl.spells || []).join(', '), 280, sy + 3, 280, 8, 8.4)
        sy -= 58
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

import jsPDF from 'jspdf'
import { CLASSES, ATTRIBUTES, SKILLS, getModifier, formatModifier } from './dndData.js'
import { charactersAPI } from './api.js'

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

/* ──────────────────────────────────────────────────────────
 *  Helpers visuales para la versión "común"
 * ────────────────────────────────────────────────────────── */

function fillRect(doc, x, y, w, h, color) {
    doc.setFillColor(...color)
    doc.rect(x, y, w, h, 'F')
}

function strokeRect(doc, x, y, w, h, color, lineWidth = 0.3) {
    doc.setDrawColor(...color)
    doc.setLineWidth(lineWidth)
    doc.rect(x, y, w, h, 'S')
}

function roundedFilledBox(doc, x, y, w, h, fill, stroke, radius = 1.6) {
    doc.setFillColor(...fill)
    if (stroke) doc.setDrawColor(...stroke)
    else doc.setDrawColor(...fill)
    doc.setLineWidth(0.3)
    doc.roundedRect(x, y, w, h, radius, radius, stroke ? 'FD' : 'F')
}

function centeredText(doc, text, x, y, w, opts = {}) {
    setFont(doc, opts.style || 'normal', opts.fontSize || 9, opts.color || [35, 35, 35])
    doc.text(sanitize(text, ''), x + w / 2, y, { align: 'center' })
}

/** Caja de atributo: nombre arriba, modificador grande al medio, valor abajo. */
function drawAttributeBox(doc, attr, value, x, y, w, h) {
    const t = pdfTheme()
    const mod = getModifier(value || 10)
    roundedFilledBox(doc, x, y, w, h, [255, 255, 255], [180, 165, 130], 2)
    fillRect(doc, x, y, w, 5.4, t.dark)
    centeredText(doc, attr.short, x, y + 3.8, w, { style: 'bold', fontSize: 8, color: t.gold })
    centeredText(doc, formatModifier(mod), x, y + h - 7, w, { style: 'bold', fontSize: 14, color: t.dark })
    fillRect(doc, x + 4, y + h - 4.5, w - 8, 4, t.softBg)
    centeredText(doc, String(value || 10), x, y + h - 1.5, w, { style: 'bold', fontSize: 8.5, color: [60, 50, 40] })
}

/** Caja de stat de combate: etiqueta arriba (sutil), valor central grande. */
function drawStatBox(doc, label, value, x, y, w, h) {
    const t = pdfTheme()
    roundedFilledBox(doc, x, y, w, h, t.softBg, [200, 185, 150], 1.8)
    centeredText(doc, label, x, y + 3.6, w, { style: 'bold', fontSize: 7, color: t.muted })
    const fontSize = String(value).length > 7 ? 11 : 13
    centeredText(doc, value, x, y + h - 3.5, w, { style: 'bold', fontSize, color: t.dark })
}

/** Marca tipo checkbox: cuadrado relleno o vacío. */
function drawCheck(doc, x, y, checked, double = false) {
    const t = pdfTheme()
    doc.setLineWidth(0.3)
    doc.setDrawColor(120, 100, 70)
    if (checked) {
        doc.setFillColor(...t.gold)
        doc.rect(x, y - 2.3, 2.6, 2.6, 'FD')
        if (double) {
            doc.setFillColor(...t.dark)
            doc.rect(x + 0.55, y - 1.75, 1.5, 1.5, 'F')
        }
    } else {
        doc.setFillColor(255, 255, 255)
        doc.rect(x, y - 2.3, 2.6, 2.6, 'FD')
    }
}

/** Tabla simple con encabezado y filas. */
function drawTable(doc, headers, rows, x, y, totalWidth, options = {}) {
    const t = pdfTheme()
    if (!rows || !rows.length) return y
    const colWidths = options.colWidths || headers.map(() => totalWidth / headers.length)
    const headerH = 6
    const rowMinH = options.rowMinH || 5.5
    const fontSize = options.fontSize || 8.4
    const padding = 1.6

    // header
    y = ensureSpace(doc, y, headerH + rowMinH + 2)
    fillRect(doc, x, y, totalWidth, headerH, t.dark)
    setFont(doc, 'bold', 8, t.gold)
    let cx = x
    headers.forEach((h, i) => {
        doc.text(sanitize(h).toUpperCase(), cx + padding, y + 4)
        cx += colWidths[i]
    })
    y += headerH

    // rows
    rows.forEach((row, rIdx) => {
        const cellTexts = row.map((val, i) => {
            const text = sanitize(val, '-')
            return doc.splitTextToSize(text, colWidths[i] - padding * 2)
        })
        const rowH = Math.max(rowMinH, cellTexts.reduce((max, lines) => Math.max(max, lines.length * 4.2 + 2.5), 0))
        y = ensureSpace(doc, y, rowH)

        if (rIdx % 2 === 1) fillRect(doc, x, y, totalWidth, rowH, t.softBg)
        strokeRect(doc, x, y, totalWidth, rowH, [220, 210, 185], 0.2)

        setFont(doc, 'normal', fontSize, t.text)
        cx = x
        cellTexts.forEach((lines, i) => {
            let ly = y + 4
            lines.forEach((line) => {
                doc.text(line, cx + padding, ly)
                ly += 4.2
            })
            cx += colWidths[i]
        })
        y += rowH
    })
    return y + 1
}

/** Lista de chips (pillas) tipo etiquetas. */
function drawChips(doc, items, x, y, totalWidth) {
    const t = pdfTheme()
    if (!items || !items.length) return y
    setFont(doc, 'normal', 8, t.dark)
    const padding = 2.5
    const gap = 2
    let cx = x
    let cy = y
    const lineH = 5.4
    items.forEach((label) => {
        const text = sanitize(label, '')
        if (!text) return
        const w = doc.getTextWidth(text) + padding * 2
        if (cx + w > x + totalWidth) {
            cx = x
            cy += lineH + 1.2
        }
        cy = ensureSpace(doc, cy, lineH + 1)
        roundedFilledBox(doc, cx, cy, w, lineH, t.softBg, [205, 190, 155], 1.5)
        setFont(doc, 'bold', 7.6, [80, 65, 40])
        doc.text(text, cx + padding, cy + 3.6)
        cx += w + gap
    })
    return cy + lineH + 2
}

/** Tarjeta individual con título y descripción. */
function drawFeatureCard(doc, title, body, x, y, totalWidth) {
    const t = pdfTheme()
    if (!title && !body) return y
    const safeTitle = sanitize(title || 'Rasgo', 'Rasgo')
    const safeBody = sanitize(body || '', '')

    setFont(doc, 'normal', 8.5, t.text)
    const innerW = totalWidth - 6
    const titleH = 5.6
    const bodyLines = safeBody ? doc.splitTextToSize(safeBody, innerW) : []
    const bodyH = bodyLines.length ? bodyLines.length * 4.4 + 2 : 0
    const totalH = titleH + bodyH + 2
    y = ensureSpace(doc, y, totalH + 1)

    roundedFilledBox(doc, x, y, totalWidth, totalH, [255, 254, 250], [220, 205, 170], 1.5)
    fillRect(doc, x, y, 1.8, totalH, t.gold)

    setFont(doc, 'bold', 9, t.dark)
    doc.text(safeTitle, x + 4, y + 4)

    if (bodyLines.length) {
        setFont(doc, 'normal', 8.2, [55, 50, 45])
        let by = y + titleH + 3
        bodyLines.forEach((line) => {
            doc.text(line, x + 4, by)
            by += 4.4
        })
    }
    return y + totalH + 1.5
}

/** Caja con título tipo "tarjeta de personalidad". */
function drawTraitBox(doc, label, body, x, y, w, h) {
    const t = pdfTheme()
    roundedFilledBox(doc, x, y, w, h, [255, 254, 248], [210, 195, 160], 1.5)
    fillRect(doc, x, y, w, 4.6, t.dark)
    setFont(doc, 'bold', 7.2, t.gold)
    doc.text(sanitize(label, '').toUpperCase(), x + 2.5, y + 3.2)
    const inner = w - 5
    const lines = doc.splitTextToSize(sanitize(body, '') || '—', inner)
    setFont(doc, 'normal', 7.8, t.text)
    let ly = y + 8.5
    const limit = y + h - 2
    for (const line of lines) {
        if (ly > limit) break
        doc.text(line, x + 2.5, ly)
        ly += 4
    }
}

/* ──────────────────────────────────────────────────────────
 *  Lectura de datos auxiliares del personaje
 * ────────────────────────────────────────────────────────── */

function arrayFromMaybeJson(value) {
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

function getProficiencyBonus(character) {
    const lvl = Math.max(1, Math.min(20, parseInt(character.level, 10) || 1))
    return 2 + Math.floor((lvl - 1) / 4)
}

function buildSkillRows(character) {
    const profs = new Set(arrayFromMaybeJson(character.skills_prof))
    const expert = new Set(arrayFromMaybeJson(character.skills_expertise))
    const profBonus = parseInt(character.proficiency_bonus, 10) || getProficiencyBonus(character)
    return SKILLS.map((s) => {
        const attrVal = parseInt(character[s.attr], 10) || 10
        const baseMod = getModifier(attrVal)
        const isProf = profs.has(s.key)
        const isExpert = expert.has(s.key)
        let total = baseMod
        if (isExpert) total += profBonus * 2
        else if (isProf) total += profBonus
        const attrShort = (ATTRIBUTES.find((a) => a.key === s.attr) || {}).short || ''
        return { skill: s, prof: isProf, expert: isExpert, mod: total, attrShort }
    })
}

function buildSaveRows(character) {
    const profs = new Set(arrayFromMaybeJson(character.saving_throws_prof))
    const profBonus = parseInt(character.proficiency_bonus, 10) || getProficiencyBonus(character)
    return ATTRIBUTES.map((a) => {
        const baseMod = getModifier(parseInt(character[a.key], 10) || 10)
        const isProf = profs.has(a.key)
        return { attr: a, prof: isProf, mod: isProf ? baseMod + profBonus : baseMod }
    })
}

/* ──────────────────────────────────────────────────────────
 *  Versión "común" — diseño visual completo
 * ────────────────────────────────────────────────────────── */

export function exportCharacterPdfPlain(character) {
    const t = pdfTheme()
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    let y = 0

    /* — Header — */
    doc.setFillColor(...t.dark)
    doc.rect(0, 0, t.pageWidth, 38, 'F')
    fillRect(doc, 0, 38, t.pageWidth, 1.4, t.gold)

    setFont(doc, 'bold', 22, t.gold)
    doc.text(sanitize(character.name || 'Personaje'), t.marginX, 16)

    const subRace = character.subrace ? ` (${character.subrace})` : ''
    const subClass = character.subclass ? ` · ${character.subclass}` : ''
    setFont(doc, 'normal', 10, [230, 220, 200])
    doc.text(
        `${sanitize(character.race)}${subRace} · ${classLabel(character.class)}${subClass} · Nivel ${character.level || 1}`,
        t.marginX,
        24
    )
    setFont(doc, 'normal', 8.6, [200, 190, 170])
    const headerLine = [
        character.alignment ? `Alineamiento: ${character.alignment}` : null,
        character.background ? `Trasfondo: ${character.background}` : null,
        `Nivel: ${character.level || 1}`,
    ].filter(Boolean).join('  ·  ')
    doc.text(sanitize(headerLine), t.marginX, 31)

    y = 46

    /* — Atributos — 6 cajas en grid */
    y = addSection(doc, 'Atributos', y)
    const attrW = (t.contentWidth - 5 * 2) / 6
    const attrH = 22
    ATTRIBUTES.forEach((attr, i) => {
        const x = t.marginX + i * (attrW + 2)
        drawAttributeBox(doc, attr, character[attr.key], x, y, attrW, attrH)
    })
    y += attrH + 4

    /* — Stats de combate — 6 cajas */
    y = addSection(doc, 'Combate', y)
    const profBonus = parseInt(character.proficiency_bonus, 10) || getProficiencyBonus(character)
    const combatStats = [
        ['PV', `${character.hit_points_current || 0}/${character.hit_points_max || 0}`],
        ['CA', String(character.armor_class || 10)],
        ['Iniciativa', formatModifier(character.initiative || getModifier(parseInt(character.dexterity, 10) || 10))],
        ['Velocidad', `${character.speed || 30} ft`],
        ['Bonus comp.', formatModifier(profBonus)],
        ['Percep. pas.', String(character.passive_perception || 10)],
    ]
    const cbW = (t.contentWidth - 5 * 2) / 6
    const cbH = 14
    combatStats.forEach((s, i) => {
        const x = t.marginX + i * (cbW + 2)
        drawStatBox(doc, s[0], s[1], x, y, cbW, cbH)
    })
    y += cbH + 4

    if (character.hit_dice || character.death_saves_success || character.death_saves_failure) {
        y = ensureSpace(doc, y, 8)
        setFont(doc, 'normal', 8.5, t.text)
        const extras = [
            character.hit_dice ? `Dados de golpe: ${character.hit_dice}` : null,
            (character.death_saves_success || character.death_saves_failure)
                ? `Tiradas de muerte — éxitos: ${character.death_saves_success || 0}/3 · fallos: ${character.death_saves_failure || 0}/3`
                : null,
        ].filter(Boolean).join('   ·   ')
        if (extras) {
            doc.text(sanitize(extras), t.marginX + 2, y + 3)
            y += 7
        }
    }

    /* — Salvaciones — 2 columnas con check */
    y = addSection(doc, 'Salvaciones', y)
    const saveRows = buildSaveRows(character)
    const saveColW = t.contentWidth / 2 - 1
    const saveRowH = 5.8
    const saveRowsCount = Math.ceil(saveRows.length / 2)
    y = ensureSpace(doc, y, saveRowsCount * saveRowH + 2)
    for (let r = 0; r < saveRowsCount; r++) {
        const ry = y + r * saveRowH
        if (r % 2 === 1) fillRect(doc, t.marginX, ry, t.contentWidth, saveRowH, t.softBg)
        for (let c = 0; c < 2; c++) {
            const idx = r * 2 + c
            if (idx >= saveRows.length) break
            const s = saveRows[idx]
            const x = t.marginX + c * (saveColW + 2)
            drawCheck(doc, x + 2, ry + 4, s.prof)
            setFont(doc, s.prof ? 'bold' : 'normal', 8.6, t.text)
            doc.text(sanitize(s.attr.label), x + 7, ry + 4)
            setFont(doc, 'bold', 9, s.prof ? t.dark : t.muted)
            doc.text(formatModifier(s.mod), x + saveColW - 3, ry + 4, { align: 'right' })
        }
    }
    y += saveRowsCount * saveRowH + 3

    /* — Habilidades — tabla en 2 columnas */
    y = addSection(doc, 'Habilidades', y)
    const skillRows = buildSkillRows(character)
    const skColW = t.contentWidth / 2 - 1
    const skRowH = 5.4
    const skRowsCount = Math.ceil(skillRows.length / 2)
    y = ensureSpace(doc, y, skRowsCount * skRowH + 2)
    for (let r = 0; r < skRowsCount; r++) {
        const ry = y + r * skRowH
        if (r % 2 === 1) fillRect(doc, t.marginX, ry, t.contentWidth, skRowH, t.softBg)
        for (let c = 0; c < 2; c++) {
            const idx = r * 2 + c
            if (idx >= skillRows.length) break
            const s = skillRows[idx]
            const x = t.marginX + c * (skColW + 2)
            drawCheck(doc, x + 2, ry + 4, s.prof || s.expert, s.expert)
            setFont(doc, s.prof || s.expert ? 'bold' : 'normal', 8.4, t.text)
            doc.text(sanitize(s.skill.label), x + 7, ry + 4)
            setFont(doc, 'normal', 7.4, t.muted)
            doc.text(`(${s.attrShort})`, x + skColW - 14, ry + 4, { align: 'right' })
            setFont(doc, 'bold', 9, t.dark)
            doc.text(formatModifier(s.mod), x + skColW - 3, ry + 4, { align: 'right' })
        }
    }
    y += skRowsCount * skRowH + 3

    /* — Conjuros: stats globales (solo si tiene) — */
    if (character.spellcasting_ability || character.spell_save_dc || character.spell_attack_bonus) {
        y = addSection(doc, 'Conjuros — datos generales', y)
        const spellGlobal = [
            ['Atributo conjuro', character.spellcasting_ability || '-'],
            ['CD salvación', character.spell_save_dc || '-'],
            ['Bonus ataque', character.spell_attack_bonus ? formatModifier(parseInt(character.spell_attack_bonus, 10) || 0) : '-'],
        ]
        const sgW = (t.contentWidth - 4) / 3
        spellGlobal.forEach((s, i) => {
            const x = t.marginX + i * (sgW + 2)
            drawStatBox(doc, s[0], String(s[1]), x, y, sgW, 12)
        })
        y += 14
    }

    /* — Ataques y conjuros (tabla) — */
    const attacks = normalizeAttacks(character)
    if (attacks.length) {
        y = addSection(doc, 'Ataques y conjuros', y)
        const headers = ['Nombre', 'Bonus', 'Daño', 'Tipo', 'Notas']
        const cw = [55, 18, 32, 25, 52]
        const rows = attacks.map((a) => [
            a.name || '-',
            a.bonus ? formatModifier(parseInt(a.bonus, 10) || 0) : (a.bonus || '-'),
            a.damage || '-',
            a.type || '-',
            a.notes || '-',
        ])
        y = drawTable(doc, headers, rows, t.marginX, y, t.contentWidth, { colWidths: cw })
        y += 1
    }

    /* — Conjuros (cantrips + por nivel con slots) — */
    const spells = normalizeSpells(character)
    const hasCantrips = spells.cantrips && spells.cantrips.length
    const leveledKeys = Array.from({ length: 9 }, (_, i) => `level${i + 1}`).filter((k) => {
        const lv = spells[k] || {}
        return (lv.spells && lv.spells.length) || lv.slots > 0
    })
    if (hasCantrips || leveledKeys.length) {
        y = addSection(doc, 'Conjuros conocidos', y)
        if (hasCantrips) {
            y = ensureSpace(doc, y, 6)
            setFont(doc, 'bold', 8.6, t.dark)
            doc.text('Trucos (Cantrips)', t.marginX + 2, y + 3)
            y += 6
            const names = spells.cantrips
                .map((s) => (typeof s === 'string' ? s : (s.name || '')))
                .filter(Boolean)
            y = drawChips(doc, names, t.marginX + 2, y, t.contentWidth - 4)
        }
        leveledKeys.forEach((k) => {
            const lv = spells[k]
            const num = parseInt(k.replace('level', ''), 10)
            y = ensureSpace(doc, y, 8)
            setFont(doc, 'bold', 8.6, t.dark)
            doc.text(`Nivel ${num}`, t.marginX + 2, y + 3)
            setFont(doc, 'normal', 8.2, t.muted)
            const slotsTxt = lv.slots ? `Slots: ${lv.slots_used || 0}/${lv.slots}` : 'Sin slots'
            doc.text(slotsTxt, t.marginX + t.contentWidth - 2, y + 3, { align: 'right' })
            y += 6
            const names = (lv.spells || [])
                .map((s) => {
                    if (typeof s === 'string') return s
                    return s.prepared ? `* ${s.name || ''}` : (s.name || '')
                })
                .filter((s) => s && s.trim())
            if (names.length) {
                y = drawChips(doc, names, t.marginX + 2, y, t.contentWidth - 4)
            } else {
                setFont(doc, 'italic', 8, t.muted)
                doc.text('(Sin conjuros registrados)', t.marginX + 4, y + 1)
                y += 5
            }
        })
    }

    /* — Equipo (tabla) — */
    const equipment = safeArray(character.equipment)
    if (equipment.length) {
        y = addSection(doc, 'Equipo', y)
        const headers = ['Objeto', 'Cant.', 'Notas']
        const cw = [78, 18, 86]
        const rows = equipment.map((it) => {
            if (typeof it === 'string') return [it, '1', '-']
            return [it.name || 'Objeto', String(it.quantity ?? 1), it.notes || '-']
        })
        y = drawTable(doc, headers, rows, t.marginX, y, t.contentWidth, { colWidths: cw })
        y += 1
    }

    /* — Idiomas y otras competencias — chips */
    const languages = safeArray(character.languages).map((x) => (typeof x === 'string' ? x : (x?.name || '')))
    const otherProf = safeArray(character.other_proficiencies).map((x) => (typeof x === 'string' ? x : (x?.name || '')))
    if (languages.length || otherProf.length) {
        y = addSection(doc, 'Idiomas y competencias', y)
        if (languages.length) {
            y = ensureSpace(doc, y, 6)
            setFont(doc, 'bold', 8.5, t.dark)
            doc.text('Idiomas', t.marginX + 2, y + 3)
            y += 5.5
            y = drawChips(doc, languages, t.marginX + 2, y, t.contentWidth - 4)
        }
        if (otherProf.length) {
            y = ensureSpace(doc, y, 6)
            setFont(doc, 'bold', 8.5, t.dark)
            doc.text('Otras competencias', t.marginX + 2, y + 3)
            y += 5.5
            y = drawChips(doc, otherProf, t.marginX + 2, y, t.contentWidth - 4)
        }
    }

    /* — Rasgos & dotes — tarjetas individuales */
    const features = safeArray(character.features_traits)
    if (features.length) {
        y = addSection(doc, 'Rasgos y dotes', y)
        features.forEach((f) => {
            const title = typeof f === 'string' ? f : (f?.name || 'Rasgo')
            const body = typeof f === 'string' ? '' : (f?.description || '')
            y = drawFeatureCard(doc, title, body, t.marginX, y, t.contentWidth)
        })
    }

    /* — Personalidad — 4 cajas en grid 2x2 */
    const persFields = [
        ['Rasgos', character.personality_traits],
        ['Ideales', character.ideals],
        ['Vínculos', character.bonds],
        ['Defectos', character.flaws],
    ]
    const hasPers = persFields.some(([, v]) => v && String(v).trim())
    if (hasPers) {
        y = addSection(doc, 'Personalidad', y)
        const persW = (t.contentWidth - 3) / 2
        const persH = 24
        y = ensureSpace(doc, y, persH * 2 + 4)
        persFields.forEach(([label, val], i) => {
            const col = i % 2
            const row = Math.floor(i / 2)
            const x = t.marginX + col * (persW + 3)
            const yy = y + row * (persH + 3)
            drawTraitBox(doc, label, val, x, yy, persW, persH)
        })
        y += persH * 2 + 5
    }

    /* — Trasfondo, apariencia, alianzas — */
    if (character.backstory && String(character.backstory).trim()) {
        y = addSection(doc, 'Historia', y)
        y = addParagraph(doc, character.backstory, t.marginX + 2, y + 1, t.contentWidth - 4, { gapAfter: 2 })
    }
    if (character.appearance_notes && String(character.appearance_notes).trim()) {
        y = addSection(doc, 'Apariencia', y)
        y = addParagraph(doc, character.appearance_notes, t.marginX + 2, y + 1, t.contentWidth - 4, { gapAfter: 2 })
    }
    if (character.allies_organizations && String(character.allies_organizations).trim()) {
        y = addSection(doc, 'Alianzas y organizaciones', y)
        y = addParagraph(doc, character.allies_organizations, t.marginX + 2, y + 1, t.contentWidth - 4, { gapAfter: 2 })
    }

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
    const { data, headers } = await charactersAPI.downloadStyledPdf(character)
    const blob = data instanceof Blob ? data : new Blob([data], { type: 'application/pdf' })
    const contentDisposition = headers?.['content-disposition'] || ''
    const fromHeader = contentDisposition.match(/filename="?([^"]+)"?/)
    const fallback = `${String(character.name || 'personaje').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, '')}-estilizado.pdf`
    const filename = fromHeader?.[1] || fallback
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
}

export async function exportCharacterPdf(character, opts = {}) {
    const format = opts.format || 'plain'
    console.log('[pdf-export] format', format, { id: character?.id, name: character?.name })
    if (format === 'styled') {
        try {
            return await exportCharacterPdfStyled(character)
        } catch (err) {
            console.error('[pdf-export] styled generation failed', err)
            throw err
        }
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

import jsPDF from 'jspdf'
import { PDFCheckBox, PDFDocument, PDFTextField, StandardFonts } from 'pdf-lib'
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
    const debug = (...args) => console.log('[pdf-styled]', ...args)
    debug('start', { id: character?.id, name: character?.name })
    const templateUrl = '/editable_es.pdf'
    debug('loading template', templateUrl)
    const targetRes = await fetch(templateUrl)
    if (!targetRes.ok) throw new Error(`No se pudo cargar plantilla destino (${targetRes.status})`)
    const pdfDoc = await PDFDocument.load(await targetRes.arrayBuffer())
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const form = pdfDoc.getForm()
    const pages = pdfDoc.getPages()
    const norm = (v) => String(v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '')
    const toPdfSafe = (value) => sanitize(value, '').replace(/\s+/g, ' ').trim()
    const num = (value, fallback = 0) => {
        const parsed = Number(value)
        return Number.isFinite(parsed) ? parsed : fallback
    }

    const fields = form.getFields().map((field) => {
        const widgets = field.acroField.getWidgets()
        let pageIndex = 0
        if (widgets?.length) {
            const widgetPage = widgets[0].P()
            const idx = pages.findIndex((p) => p.ref === widgetPage)
            pageIndex = idx >= 0 ? idx : 0
        }
        return {
            field,
            name: field.getName(),
            norm: norm(field.getName()),
            pageIndex,
            type: field.constructor?.name || 'Unknown',
        }
    })
    debug('template fields count', fields.length)
    debug('template field names', fields.map((f) => ({ page: f.pageIndex + 1, type: f.type, name: f.name })))
    const missingAssignments = []

    const findBestField = (hints = [], opts = {}) => {
        const hs = hints.map(norm).filter(Boolean)
        const expectedType = opts.type || null
        const expectedPage = Number.isInteger(opts.page) ? opts.page : null
        let best = null

        for (const entry of fields) {
            if (expectedType && entry.type !== expectedType) continue
            if (expectedPage !== null && entry.pageIndex !== expectedPage) continue
            let score = 0
            for (const h of hs) {
                if (entry.norm === h) score += 8
                if (entry.norm.startsWith(h)) score += 5
                if (entry.norm.includes(h)) score += 2
            }
            if (!score) continue
            if (!best || score > best.score) best = { entry, score }
        }

        return best?.entry || null
    }

    const setText = (hints, value, opts = {}) => {
        const text = toPdfSafe(value)
        if (!text) return false
        const target = findBestField(Array.isArray(hints) ? hints : [hints], { ...opts, type: 'PDFTextField' })
        if (!target) return false
        try {
            const textField = target.field
            if (textField instanceof PDFTextField) {
                textField.setText(text)
                return true
            }
        } catch (err) {
            console.error('[pdf-styled] setText failed', target?.name, err)
        }
        return false
    }

    const setCheck = (hints, checked, opts = {}) => {
        const target = findBestField(Array.isArray(hints) ? hints : [hints], { ...opts, type: 'PDFCheckBox' })
        if (!target) return false
        try {
            const checkBox = target.field
            if (checkBox instanceof PDFCheckBox) {
                if (checked) checkBox.check()
                else checkBox.uncheck()
                return true
            }
        } catch (err) {
            console.error('[pdf-styled] setCheck failed', target?.name, err)
        }
        return false
    }

    const fillAny = (hintGroups, value, opts = {}) => {
        for (const hints of hintGroups) {
            if (setText(hints, value, opts)) return true
        }
        if (toPdfSafe(value)) {
            missingAssignments.push({ kind: 'text', page: opts.page ?? null, hints: hintGroups, value: toPdfSafe(value) })
        }
        return false
    }

    const skills = safeArray(character.skills_prof)
    const expertise = safeArray(character.skills_expertise)
    const saves = safeArray(character.saving_throws_prof)
    const attacks = normalizeAttacks(character)
    const spells = normalizeSpells(character)
    const username = character.player_username || character.username || character.user_username || ''
    const proficiencyBonus = num(character.proficiency_bonus, 2)

    const skillAttrMap = {
        acrobatics: 'dexterity',
        animal_handling: 'wisdom',
        arcana: 'intelligence',
        athletics: 'strength',
        deception: 'charisma',
        history: 'intelligence',
        insight: 'wisdom',
        intimidation: 'charisma',
        investigation: 'intelligence',
        medicine: 'wisdom',
        nature: 'intelligence',
        perception: 'wisdom',
        performance: 'charisma',
        persuasion: 'charisma',
        religion: 'intelligence',
        sleight_of_hand: 'dexterity',
        stealth: 'dexterity',
        survival: 'wisdom',
    }

    const skillBonus = (key) => {
        const ability = skillAttrMap[key]
        const base = getModifier(num(character[ability], 10))
        const prof = expertise.includes(key) ? proficiencyBonus * 2 : skills.includes(key) ? proficiencyBonus : 0
        return formatModifier(base + prof)
    }
    const saveBonus = (abilityKey) => {
        const base = getModifier(num(character[abilityKey], 10))
        const prof = saves.includes(abilityKey) ? proficiencyBonus : 0
        return formatModifier(base + prof)
    }

    // PÁGINA 1: encabezado y combate
    fillAny([['charactername'], ['nombrepersonaje'], ['personaje']], character.name, { page: 0 })
    fillAny([['playername'], ['nombredeljugador'], ['jugador']], username, { page: 0 })
    fillAny([['classlevel'], ['claseynivel']], `${classLabel(character.class)} ${character.level || 1}`, { page: 0 })
    fillAny([['background'], ['trasfondo']], character.background, { page: 0 })
    fillAny([['race'], ['raza']], character.race, { page: 0 })
    fillAny([['alignment'], ['alineamiento']], character.alignment, { page: 0 })
    fillAny([['xp'], ['experiencepoints'], ['puntosdeexperiencia']], String(character.experience_points || 0), { page: 0 })

    fillAny([['strength'], ['fuerza']], String(num(character.strength, 10)), { page: 0 })
    fillAny([['dexterity'], ['destreza']], String(num(character.dexterity, 10)), { page: 0 })
    fillAny([['constitution'], ['constitucion']], String(num(character.constitution, 10)), { page: 0 })
    fillAny([['intelligence'], ['inteligencia']], String(num(character.intelligence, 10)), { page: 0 })
    fillAny([['wisdom'], ['sabiduria']], String(num(character.wisdom, 10)), { page: 0 })
    fillAny([['charisma'], ['carisma']], String(num(character.charisma, 10)), { page: 0 })

    fillAny([['strengthmod'], ['modfuerza']], formatModifier(getModifier(num(character.strength, 10))), { page: 0 })
    fillAny([['dexteritymod'], ['moddestreza']], formatModifier(getModifier(num(character.dexterity, 10))), { page: 0 })
    fillAny([['constitutionmod'], ['modconstitucion']], formatModifier(getModifier(num(character.constitution, 10))), { page: 0 })
    fillAny([['intelligencemod'], ['modinteligencia']], formatModifier(getModifier(num(character.intelligence, 10))), { page: 0 })
    fillAny([['wisdommod'], ['modsabiduria']], formatModifier(getModifier(num(character.wisdom, 10))), { page: 0 })
    fillAny([['charismamod'], ['modcarisma']], formatModifier(getModifier(num(character.charisma, 10))), { page: 0 })

    fillAny([['ac'], ['armourclass'], ['clasedearmadura']], String(num(character.armor_class, 10)), { page: 0 })
    fillAny([['initiative'], ['iniciativa']], formatModifier(num(character.initiative, 0)), { page: 0 })
    fillAny([['speed'], ['velocidad']], String(num(character.speed, 0)), { page: 0 })
    fillAny([['hitpointmaximum'], ['puntosdegolpemaximos']], String(num(character.hit_points_max, 0)), { page: 0 })
    fillAny([['currenthitpoints'], ['puntosdegolpeactuales']], String(num(character.hit_points_current, 0)), { page: 0 })
    fillAny([['temporaryhitpoints'], ['puntosdegolpetemporales']], String(num(character.hit_points_temp, 0)), { page: 0 })
    fillAny([['hitdice'], ['dadosdegolpe']], String(character.hit_dice || ''), { page: 0 })
    fillAny([['profbonus'], ['bonificadorporcompetencia']], formatModifier(proficiencyBonus), { page: 0 })
    fillAny([['passivewisdom'], ['percepcionpasiva'], ['sabiduriapercepcionpasiva']], String(num(character.passive_perception, 10)), { page: 0 })

    if (!setCheck(['inspiration'], !!character.inspiration, { page: 0 })) {
        setCheck(['inspiracion'], !!character.inspiration, { page: 0 })
    }

    fillAny([['cp'], ['pc']], String(num(character.copper_pieces, 0)), { page: 0 })
    fillAny([['sp'], ['pe']], String(num(character.silver_pieces, 0)), { page: 0 })
    fillAny([['ep'], ['ppt']], String(num(character.electrum_pieces, 0)), { page: 0 })
    fillAny([['gp'], ['po']], String(num(character.gold_pieces, 0)), { page: 0 })
    fillAny([['pp']], String(num(character.platinum_pieces, 0)), { page: 0 })

    fillAny([['equipment'], ['equipo']], safeArray(character.equipment).map((i) => typeof i === 'string' ? i : i?.name || '').filter(Boolean).join(', '), { page: 0 })
    fillAny([['otherproficienciesandlanguages'], ['otrascompetenciaseidiomas']], [...safeArray(character.other_proficiencies), ...safeArray(character.languages)].join(', '), { page: 0 })
    fillAny([['featurestraits'], ['rasgosyatributos']], safeArray(character.features_traits).map((f) => typeof f === 'string' ? f : f?.name || '').join(', '), { page: 0 })
    fillAny([['attacksandspellcasting'], ['ataquesylanzamientodeconjuros']], attacks.map((a) => `${a.name || ''} ${a.bonus || ''} ${a.damage || ''} ${a.type || ''}`.trim()).filter(Boolean).join('\n'), { page: 0 })

    const skillLabels = {
        acrobatics: [['acrobatics'], ['acrobacias']],
        animal_handling: [['animalhandling'], ['conanimales']],
        arcana: [['arcana']],
        athletics: [['athletics'], ['atletismo']],
        deception: [['deception'], ['engano']],
        history: [['history'], ['historia']],
        insight: [['insight'], ['perspicacia']],
        intimidation: [['intimidation'], ['intimidacion']],
        investigation: [['investigation'], ['investigacion']],
        medicine: [['medicine'], ['medicina']],
        nature: [['nature'], ['naturaleza']],
        perception: [['perception'], ['percepcion']],
        performance: [['performance'], ['interpretacion']],
        persuasion: [['persuasion'], ['persuasion']],
        religion: [['religion'], ['religion']],
        sleight_of_hand: [['sleightofhand'], ['juegodemanos']],
        stealth: [['stealth'], ['sigilo']],
        survival: [['survival'], ['supervivencia']]
    }
    Object.entries(skillLabels).forEach(([k, hintGroups]) => {
        fillAny(hintGroups, skillBonus(k), { page: 0 })
        if (!setCheck([`${k}prof`], skills.includes(k), { page: 0 })) {
            missingAssignments.push({ kind: 'check', page: 0, hints: [`${k}prof`], value: skills.includes(k) })
        }
        if (!setCheck([`${k}expertise`], expertise.includes(k), { page: 0 })) {
            missingAssignments.push({ kind: 'check', page: 0, hints: [`${k}expertise`], value: expertise.includes(k) })
        }
    })

    const saveLabels = {
        strength: [['strengthsave'], ['fuerzasalvacion']],
        dexterity: [['dexteritysave'], ['destrezasalvacion']],
        constitution: [['constitutionsave'], ['constitucionsalvacion']],
        intelligence: [['intelligencesave'], ['inteligenciasalvacion']],
        wisdom: [['wisdomsave'], ['sabiduriasalvacion']],
        charisma: [['charismasave'], ['carismasalvacion']]
    }
    Object.entries(saveLabels).forEach(([k, hintGroups]) => {
        fillAny(hintGroups, saveBonus(k), { page: 0 })
        if (!setCheck([`${k}saveprof`], saves.includes(k), { page: 0 })) {
            missingAssignments.push({ kind: 'check', page: 0, hints: [`${k}saveprof`], value: saves.includes(k) })
        }
    })

    // PÁGINA 2: personalidad y detalles físicos
    fillAny([['charactername'], ['nombrepersonaje']], character.name, { page: 1 })
    fillAny([['age'], ['edad']], character.age, { page: 1 })
    fillAny([['height'], ['altura']], character.height, { page: 1 })
    fillAny([['weight'], ['peso']], character.weight, { page: 1 })
    fillAny([['eyes'], ['ojos']], character.eyes, { page: 1 })
    fillAny([['skin'], ['piel']], character.skin, { page: 1 })
    fillAny([['hair'], ['pelo']], character.hair, { page: 1 })
    fillAny([['personalitytraits'], ['rasgosdepersonalidad']], character.personality_traits, { page: 1 })
    fillAny([['ideals'], ['ideales']], character.ideals, { page: 1 })
    fillAny([['bonds'], ['vinculos']], character.bonds, { page: 1 })
    fillAny([['flaws'], ['defectos']], character.flaws, { page: 1 })
    fillAny([['characterbackstory'], ['historiadelpersonaje']], character.backstory, { page: 1 })
    fillAny([['characterappearance'], ['aspectodelpersonaje']], character.appearance_notes, { page: 1 })
    fillAny([['alliesorganizations'], ['aliadosyorganizaciones']], character.allies_organizations, { page: 1 })
    fillAny([['additionalfeaturesandtraits'], ['rasgosyatributosadicionales']], safeArray(character.features_traits).map((f) => typeof f === 'string' ? f : f?.name || '').join(', '), { page: 1 })
    fillAny([['treasure'], ['tesoro']], character.treasure, { page: 1 })

    // PÁGINA 3: conjuros
    fillAny([['spellcastingclass'], ['claselanzadoradeconjuros']], classLabel(character.class), { page: 2 })
    fillAny([['spellcastingability'], ['aptitudmagica']], character.spellcasting_ability, { page: 2 })
    fillAny([['spelldc'], ['cdtiradadesalvaciondeconjuros']], String(character.spell_save_dc || ''), { page: 2 })
    fillAny([['spellattackbonus'], ['bonificadordeataquedeconjuros']], String(character.spell_attack_bonus || ''), { page: 2 })
    fillAny([['cantrips'], ['trucos']], spells.cantrips.join(', '), { page: 2 })
    for (let i = 1; i <= 9; i++) {
        const lvl = spells[`level${i}`]
        fillAny([[`level${i}slots`], [`nivel${i}espaciostotales`]], String(lvl.slots || 0), { page: 2 })
        fillAny([[`level${i}slotsexpended`], [`nivel${i}espaciosgastados`]], String(lvl.slots_used || 0), { page: 2 })
        fillAny([[`level${i}spells`], [`nivel${i}conjurosconocidos`]], (lvl.spells || []).join(', '), { page: 2 })
    }

    form.updateFieldAppearances(font)
    if (missingAssignments.length) {
        debug('unmatched assignments', missingAssignments)
    }

    debug('saving output')
    const out = await pdfDoc.save()
    debug('output bytes', out?.byteLength || 0)
    const blob = new Blob([out], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const filename = `${String(character.name || 'personaje').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, '')}-estilizado.pdf`
    a.href = url
    a.download = filename
    a.click()
    debug('download triggered')
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

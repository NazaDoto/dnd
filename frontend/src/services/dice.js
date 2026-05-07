/**
 * Motor de tiradas D&D 5e.
 *
 * Soporta expresiones con sintaxis:
 *   NdM            -> tira N dados de M caras (ej: 2d6, d20)
 *   +K / -K        -> modificador estático
 *   adv / vent     -> ventaja en d20 (tira 2 y toma el más alto)
 *   dis / desv     -> desventaja en d20 (tira 2 y toma el más bajo)
 *   kh / kl        -> keep highest / lowest (ej: 4d6kh3 = tira 4d6 y queda con los 3 mejores)
 *
 * Ejemplos:
 *   "1d20+5"
 *   "2d6+3"
 *   "1d20+7 adv"
 *   "4d6kh3"
 */

const TOKEN_RE = /(?:^|\s)(adv|ventaja|dis|desv|desventaja)(?=\s|$)/gi
const DICE_TERM_RE = /([+-]?)\s*(\d*)d(\d+)(?:\s*(kh|kl)\s*(\d+))?/gi
const FLAT_TERM_RE = /([+-])\s*(\d+)(?!\s*d)/gi

export function rollDie(sides) {
    if (!Number.isInteger(sides) || sides < 2) return 0
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
        const buf = new Uint32Array(1)
        crypto.getRandomValues(buf)
        return (buf[0] % sides) + 1
    }
    return Math.floor(Math.random() * sides) + 1
}

export function rollDiceN(count, sides) {
    const rolls = []
    for (let i = 0; i < count; i++) rolls.push(rollDie(sides))
    return rolls
}

function parseAdvDis(input) {
    let advantage = false
    let disadvantage = false
    const cleaned = input.replace(TOKEN_RE, (_, kw) => {
        const k = kw.toLowerCase()
        if (k === 'adv' || k === 'ventaja') advantage = true
        else disadvantage = true
        return ' '
    })
    return { advantage, disadvantage, cleaned }
}

/**
 * Parsea una expresión y devuelve un resultado estructurado.
 * Estructura:
 *   { expression, total, breakdown: [ {kind, ...} ], advantage, disadvantage, critical, fumble }
 */
export function rollExpression(rawInput) {
    const input = String(rawInput || '').trim()
    if (!input) {
        return { expression: '', total: 0, breakdown: [], advantage: false, disadvantage: false }
    }

    const { advantage, disadvantage, cleaned } = parseAdvDis(input)

    const breakdown = []
    let total = 0
    let critical = false
    let fumble = false
    let used = ''

    let m
    DICE_TERM_RE.lastIndex = 0
    while ((m = DICE_TERM_RE.exec(cleaned)) !== null) {
        const sign = m[1] === '-' ? -1 : 1
        const count = m[2] ? parseInt(m[2], 10) : 1
        const sides = parseInt(m[3], 10)
        const keepKind = m[4]
        const keepN = m[5] ? parseInt(m[5], 10) : null
        used += m[0]

        if (!Number.isFinite(count) || count < 1 || count > 100) continue
        if (!Number.isFinite(sides) || sides < 2 || sides > 1000) continue

        const isD20Single = sides === 20 && count === 1 && !keepKind
        let rolls
        let kept
        let droppedIdxs = []
        let advUsed = false
        let disUsed = false

        if (isD20Single && (advantage || disadvantage)) {
            rolls = rollDiceN(2, 20)
            const sortedDesc = [...rolls.keys()].sort((a, b) => rolls[b] - rolls[a])
            const keepIdx = advantage ? sortedDesc[0] : sortedDesc[1]
            kept = [rolls[keepIdx]]
            droppedIdxs = [keepIdx === 0 ? 1 : 0]
            advUsed = advantage
            disUsed = disadvantage && !advantage
        } else if (keepKind) {
            rolls = rollDiceN(count, sides)
            const indexed = rolls.map((v, i) => ({ v, i }))
            indexed.sort((a, b) => keepKind.toLowerCase() === 'kh' ? b.v - a.v : a.v - b.v)
            const keep = indexed.slice(0, Math.min(keepN || count, count))
            const drop = indexed.slice(Math.min(keepN || count, count))
            kept = keep.map((x) => x.v)
            droppedIdxs = drop.map((x) => x.i)
        } else {
            rolls = rollDiceN(count, sides)
            kept = [...rolls]
        }

        const sum = kept.reduce((a, b) => a + b, 0) * sign

        if (sides === 20 && count === 1) {
            if (kept[0] === 20) critical = true
            if (kept[0] === 1) fumble = true
        }

        total += sum
        breakdown.push({
            kind: 'dice',
            sign,
            count,
            sides,
            rolls,
            kept,
            droppedIdxs,
            advantage: advUsed,
            disadvantage: disUsed,
            sum,
        })
    }

    let withoutDice = cleaned.replace(DICE_TERM_RE, ' ')
    let fm
    FLAT_TERM_RE.lastIndex = 0
    while ((fm = FLAT_TERM_RE.exec(withoutDice)) !== null) {
        const sign = fm[1] === '-' ? -1 : 1
        const value = parseInt(fm[2], 10) * sign
        if (Number.isFinite(value)) {
            total += value
            breakdown.push({ kind: 'flat', value })
        }
    }

    return {
        expression: input,
        total,
        breakdown,
        advantage,
        disadvantage,
        critical,
        fumble,
        valid: breakdown.some((b) => b.kind === 'dice') || breakdown.some((b) => b.kind === 'flat'),
    }
}

export function describeBreakdown(breakdown) {
    return breakdown.map((b) => {
        if (b.kind === 'flat') {
            return (b.value >= 0 ? '+' : '') + b.value
        }
        const dropSet = new Set(b.droppedIdxs || [])
        const parts = b.rolls.map((r, i) => dropSet.has(i) ? `~~${r}~~` : `${r}`).join(', ')
        const sign = b.sign < 0 ? '-' : ''
        const tag = b.advantage ? ' (vent)' : b.disadvantage ? ' (desv)' : ''
        return `${sign}${b.count}d${b.sides}[${parts}]${tag}`
    }).join(' ')
}

export const QUICK_DICE = [
    { label: 'd4', expr: '1d4' },
    { label: 'd6', expr: '1d6' },
    { label: 'd8', expr: '1d8' },
    { label: 'd10', expr: '1d10' },
    { label: 'd12', expr: '1d12' },
    { label: 'd20', expr: '1d20' },
    { label: 'd100', expr: '1d100' },
]

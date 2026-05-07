import { reactive, watch } from 'vue'
import { rollDie } from '../services/dice.js'

const STORAGE_KEY = 'dnd_initiative_v1'

function emptyEncounter() {
    return {
        active: false,
        round: 1,
        turnIndex: 0,
        combatants: [],
    }
}

function readAll() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) return {}
        const parsed = JSON.parse(raw)
        return typeof parsed === 'object' && parsed ? parsed : {}
    } catch {
        return {}
    }
}

const all = reactive(readAll())

watch(
    all,
    (val) => {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(val)) } catch {}
    },
    { deep: true }
)

function key(campaignId) {
    return String(campaignId || 'global')
}

function ensure(campaignId) {
    const k = key(campaignId)
    if (!all[k]) all[k] = emptyEncounter()
    return all[k]
}

function reset(campaignId) {
    const k = key(campaignId)
    all[k] = emptyEncounter()
}

function newId() {
    return `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
}

function sortByInitiative(list) {
    list.sort((a, b) => {
        const ai = Number(a.initiative ?? -Infinity)
        const bi = Number(b.initiative ?? -Infinity)
        if (bi !== ai) return bi - ai
        const adx = Number(a.dexterity ?? 10)
        const bdx = Number(b.dexterity ?? 10)
        return bdx - adx
    })
}

function addCombatant(campaignId, partial = {}) {
    const enc = ensure(campaignId)
    const c = {
        id: newId(),
        kind: partial.kind || 'monster',
        name: partial.name || 'Sin nombre',
        initiative: partial.initiative ?? null,
        dexterity: partial.dexterity ?? 10,
        ac: partial.ac ?? null,
        hp_current: partial.hp_current ?? null,
        hp_max: partial.hp_max ?? null,
        conditions: Array.isArray(partial.conditions) ? [...partial.conditions] : [],
        notes: partial.notes || '',
        characterId: partial.characterId || null,
    }
    enc.combatants.push(c)
    return c
}

function addPlayerCharacter(campaignId, character) {
    if (!character) return null
    return addCombatant(campaignId, {
        kind: 'pc',
        name: character.name,
        dexterity: character.dexterity,
        ac: character.armor_class,
        hp_current: character.hit_points_current,
        hp_max: character.hit_points_max,
        characterId: character.id,
    })
}

function removeCombatant(campaignId, combatantId) {
    const enc = ensure(campaignId)
    const idx = enc.combatants.findIndex((c) => c.id === combatantId)
    if (idx === -1) return
    enc.combatants.splice(idx, 1)
    if (enc.turnIndex >= enc.combatants.length) {
        enc.turnIndex = Math.max(0, enc.combatants.length - 1)
    }
}

function rollInitiative(campaignId, combatantId) {
    const enc = ensure(campaignId)
    const c = enc.combatants.find((x) => x.id === combatantId)
    if (!c) return
    const dexMod = Math.floor(((Number(c.dexterity) || 10) - 10) / 2)
    c.initiative = rollDie(20) + dexMod
}

function rollAllInitiative(campaignId) {
    const enc = ensure(campaignId)
    enc.combatants.forEach((c) => {
        if (c.initiative == null) {
            const dexMod = Math.floor(((Number(c.dexterity) || 10) - 10) / 2)
            c.initiative = rollDie(20) + dexMod
        }
    })
}

function startCombat(campaignId) {
    const enc = ensure(campaignId)
    if (!enc.combatants.length) return
    sortByInitiative(enc.combatants)
    enc.active = true
    enc.round = 1
    enc.turnIndex = 0
}

function endCombat(campaignId) {
    const enc = ensure(campaignId)
    enc.active = false
    enc.round = 1
    enc.turnIndex = 0
}

function nextTurn(campaignId) {
    const enc = ensure(campaignId)
    if (!enc.combatants.length) return
    enc.turnIndex += 1
    if (enc.turnIndex >= enc.combatants.length) {
        enc.turnIndex = 0
        enc.round += 1
    }
}

function previousTurn(campaignId) {
    const enc = ensure(campaignId)
    if (!enc.combatants.length) return
    enc.turnIndex -= 1
    if (enc.turnIndex < 0) {
        enc.turnIndex = enc.combatants.length - 1
        enc.round = Math.max(1, enc.round - 1)
    }
}

function adjustHp(campaignId, combatantId, delta) {
    const enc = ensure(campaignId)
    const c = enc.combatants.find((x) => x.id === combatantId)
    if (!c) return
    if (c.hp_max == null && delta < 0) c.hp_max = Math.abs(delta)
    const max = Number(c.hp_max ?? 0) || 0
    const cur = Number(c.hp_current ?? max) || 0
    const next = max > 0 ? Math.max(0, Math.min(max, cur + delta)) : Math.max(0, cur + delta)
    c.hp_current = next
}

function setHp(campaignId, combatantId, current, max) {
    const enc = ensure(campaignId)
    const c = enc.combatants.find((x) => x.id === combatantId)
    if (!c) return
    if (max != null) c.hp_max = Number(max) || 0
    if (current != null) c.hp_current = Number(current) || 0
}

function toggleCondition(campaignId, combatantId, conditionId) {
    const enc = ensure(campaignId)
    const c = enc.combatants.find((x) => x.id === combatantId)
    if (!c) return
    const idx = c.conditions.indexOf(conditionId)
    if (idx === -1) c.conditions.push(conditionId)
    else c.conditions.splice(idx, 1)
}

export function useInitiative(campaignId) {
    const enc = ensure(campaignId)
    return {
        encounter: enc,
        addCombatant: (p) => addCombatant(campaignId, p),
        addPlayerCharacter: (ch) => addPlayerCharacter(campaignId, ch),
        removeCombatant: (id) => removeCombatant(campaignId, id),
        rollInitiative: (id) => rollInitiative(campaignId, id),
        rollAllInitiative: () => rollAllInitiative(campaignId),
        startCombat: () => startCombat(campaignId),
        endCombat: () => endCombat(campaignId),
        nextTurn: () => nextTurn(campaignId),
        previousTurn: () => previousTurn(campaignId),
        adjustHp: (id, delta) => adjustHp(campaignId, id, delta),
        setHp: (id, c, m) => setHp(campaignId, id, c, m),
        toggleCondition: (id, cond) => toggleCondition(campaignId, id, cond),
        reset: () => reset(campaignId),
    }
}

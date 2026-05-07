import { reactive, watch } from 'vue'
import { rollExpression } from '../services/dice.js'

const STORAGE_KEY = 'dnd_dice_history_v1'
const MAX_HISTORY = 30

function readHistory() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) return []
        const parsed = JSON.parse(raw)
        return Array.isArray(parsed) ? parsed.slice(0, MAX_HISTORY) : []
    } catch {
        return []
    }
}

const state = reactive({
    open: false,
    history: readHistory(),
    lastRoll: null,
})

watch(
    () => state.history,
    (val) => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(val.slice(0, MAX_HISTORY)))
        } catch {}
    },
    { deep: true }
)

function open() { state.open = true }
function close() { state.open = false }
function toggle() { state.open = !state.open }

function roll(expression, label) {
    const result = rollExpression(expression)
    if (!result.valid) return null
    const entry = {
        id: Date.now() + Math.random(),
        at: Date.now(),
        label: label || null,
        ...result,
    }
    state.history.unshift(entry)
    if (state.history.length > MAX_HISTORY) state.history.length = MAX_HISTORY
    state.lastRoll = entry
    return entry
}

function clearHistory() {
    state.history.splice(0, state.history.length)
}

export function useDice() {
    return {
        state,
        open,
        close,
        toggle,
        roll,
        clearHistory,
    }
}

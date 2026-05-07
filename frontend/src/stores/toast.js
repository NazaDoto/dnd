import { reactive } from 'vue'

const MAX_TOASTS = 4
const DEFAULT_TIMEOUT = 3200

const state = reactive({
    toasts: [],
})

let counter = 0

function dismiss(id) {
    const idx = state.toasts.findIndex((t) => t.id === id)
    if (idx !== -1) state.toasts.splice(idx, 1)
}

function showToast(msg, type = 'info', timeout = DEFAULT_TIMEOUT) {
    if (!msg) return
    const id = ++counter
    state.toasts.push({ id, msg: String(msg), type })
    if (state.toasts.length > MAX_TOASTS) {
        state.toasts.splice(0, state.toasts.length - MAX_TOASTS)
    }
    if (timeout > 0) {
        setTimeout(() => dismiss(id), timeout)
    }
    return id
}

export function useToast() {
    return {
        state,
        showToast,
        dismiss,
    }
}

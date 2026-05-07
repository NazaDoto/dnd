import { ref } from 'vue'

const cache = new Map()

function getEntry(query) {
    if (cache.has(query)) return cache.get(query)
    const mql = window.matchMedia(query)
    const value = ref(mql.matches)
    const handler = (e) => {
        value.value = e.matches
    }
    if (typeof mql.addEventListener === 'function') {
        mql.addEventListener('change', handler)
    } else if (typeof mql.addListener === 'function') {
        mql.addListener(handler)
    }
    const entry = { value, mql, handler }
    cache.set(query, entry)
    return entry
}

export function useMediaQuery(query) {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
        return ref(false)
    }
    return getEntry(query).value
}

export function matches(query) {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
        return false
    }
    return window.matchMedia(query).matches
}

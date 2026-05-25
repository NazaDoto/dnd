/**
 * Consulta SRD 5e vía Open5e (wotc-srd). Cache en memoria.
 */
const SRD_DOC = 'wotc-srd'
const API = 'https://api.open5e.com/v1'
const cache = new Map()

function cacheKey(type, query) {
  return `${type}:${query}`
}

async function fetchJson(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`SRD ${res.status}`)
  return res.json()
}

function pickSpell(s) {
  if (!s) return null
  return {
    type: 'spell',
    name: s.name,
    slug: s.slug,
    level: s.level || (s.level_int === 0 ? 'Truco' : s.level),
    school: s.school,
    range: s.range,
    duration: s.duration,
    casting_time: s.casting_time,
    components: s.components,
    concentration: s.concentration === 'yes' || s.requires_concentration,
    ritual: s.can_be_cast_as_ritual || s.ritual === 'yes',
    desc: (s.desc || '').trim(),
    higher_level: (s.higher_level || '').trim()
  }
}

function pickWeapon(w) {
  if (!w) return null
  return {
    type: 'weapon',
    name: w.name,
    slug: w.slug,
    category: w.category,
    damage_dice: w.damage_dice,
    damage_type: w.damage_type,
    cost: w.cost,
    weight: w.weight,
    properties: Array.isArray(w.properties) ? w.properties : []
  }
}

function spellSummary(s) {
  const parts = [s.level, s.range].filter(Boolean)
  return parts.join(' · ')
}

function weaponSummary(w) {
  const dmg = [w.damage_dice, w.damage_type].filter(Boolean).join(' ')
  return [dmg, ...(w.properties || [])].filter(Boolean).join(' · ') || w.category
}

export async function lookupSpell(name) {
  const q = String(name || '').trim()
  if (!q) return null
  const key = cacheKey('spell', q.toLowerCase())
  if (cache.has(key)) return cache.get(key)

  try {
    const data = await fetchJson(
      `${API}/spells/?document__slug=${SRD_DOC}&search=${encodeURIComponent(q)}`
    )
    const hit =
      data.results?.find(
        (r) => r.name?.toLowerCase() === q.toLowerCase()
      ) || data.results?.[0]
    const picked = pickSpell(hit)
    if (picked) {
      picked.summary = spellSummary(picked)
      cache.set(key, picked)
      return picked
    }
  } catch {
    /* ignore */
  }
  cache.set(key, null)
  return null
}

export async function lookupWeapon(name) {
  const q = String(name || '').trim()
  if (!q) return null
  const key = cacheKey('weapon', q.toLowerCase())
  if (cache.has(key)) return cache.get(key)

  try {
    const data = await fetchJson(
      `${API}/weapons/?document__slug=${SRD_DOC}&search=${encodeURIComponent(q)}`
    )
    const hit =
      data.results?.find(
        (r) => r.name?.toLowerCase() === q.toLowerCase()
      ) || data.results?.[0]
    const picked = pickWeapon(hit)
    if (picked) {
      picked.summary = weaponSummary(picked)
      cache.set(key, picked)
      return picked
    }
  } catch {
    /* ignore */
  }
  cache.set(key, null)
  return null
}

/** Intenta conjuro y luego arma (ataques genéricos). */
export async function lookupEntry(name) {
  const spell = await lookupSpell(name)
  if (spell) return spell
  return lookupWeapon(name)
}

export function formatDamageType(type) {
  const map = {
    slashing: 'cortante',
    piercing: 'perforante',
    bludgeoning: 'contundente',
    fire: 'fuego',
    cold: 'frío',
    lightning: 'relámpago',
    thunder: 'trueno',
    acid: 'ácido',
    poison: 'veneno',
    psychic: 'psíquico',
    radiant: 'radiante',
    necrotic: 'necrótico',
    force: 'fuerza'
  }
  return map[type] || type
}

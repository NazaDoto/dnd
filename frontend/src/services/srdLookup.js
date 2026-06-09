/**
 * Consulta SRD 5e vía Open5e (wotc-srd). Cache en memoria.
 */
const SRD_DOC = 'wotc-srd'
const API = 'https://api.open5e.com/v1'
const cache = new Map()

const SPELL_ALIASES = {
  'animar objetos': 'Animate Objects',
  'arma espiritual': 'Spiritual Weapon',
  'armadura de agathys': 'Armor of Agathys',
  'armadura de mago': 'Mage Armor',
  'aura de pureza': 'Aura of Purity',
  'aura sagrada': 'Holy Aura',
  'auxilio': 'Aid',
  'bendecir': 'Bless',
  'bola de fuego': 'Fireball',
  'burla dañina': 'Vicious Mockery',
  'cambiar de forma': 'Shapechange',
  'carcaj veloz': 'Swift Quiver',
  'conjurar animales': 'Conjure Animals',
  'contrahechizo': 'Counterspell',
  'curar heridas': 'Cure Wounds',
  'curar heridas en masa': 'Mass Cure Wounds',
  'danza irresistible': 'Irresistible Dance',
  'descarga de fuego': 'Fire Bolt',
  'descarga sobrenatural': 'Eldritch Blast',
  'deseo': 'Wish',
  'destierro': 'Banishment',
  'desintegrar': 'Disintegrate',
  'detectar magia': 'Detect Magic',
  'disipar magia': 'Dispel Magic',
  'dormir': 'Sleep',
  'encontrar corcel': 'Find Steed',
  'encontrar familiar': 'Find Familiar',
  'enmarañar': 'Entangle',
  'escudo': 'Shield',
  'escudo de la fe': 'Shield of Faith',
  'espada de mordenkainen': "Mordenkainen's Sword",
  'fuego feérico': 'Faerie Fire',
  'formas animales': 'Animal Shapes',
  'garrote': 'Shillelagh',
  'golpe desterrador': 'Banishing Smite',
  'guardián de la fe': 'Guardian of Faith',
  'guardianes espirituales': 'Spirit Guardians',
  'guía': 'Guidance',
  'hablar con los animales': 'Speak with Animals',
  'hambre de hadar': 'Hunger of Hadar',
  'identificar': 'Identify',
  'ilusión menor': 'Minor Illusion',
  'imagen múltiple': 'Mirror Image',
  'inmovilizar monstruo': 'Hold Monster',
  'inmovilizar persona': 'Hold Person',
  'invisibilidad': 'Invisibility',
  'invisibilidad mayor': 'Greater Invisibility',
  'laberinto': 'Maze',
  'llama sagrada': 'Sacred Flame',
  'llamar al relámpago': 'Call Lightning',
  'libertad de movimiento': 'Freedom of Movement',
  'luz': 'Light',
  'mano de mago': 'Mage Hand',
  'marca del cazador': "Hunter's Mark",
  'mejorar característica': 'Enhance Ability',
  'muro de espinas': 'Wall of Thorns',
  'muro de fuerza': 'Wall of Force',
  'ojo arcano': 'Arcane Eye',
  'onda atronadora': 'Thunderwave',
  'oscuridad': 'Darkness',
  'palabra de poder: sanar': 'Power Word Heal',
  'palabra sanadora': 'Healing Word',
  'pasar sin rastro': 'Pass Without Trace',
  'paso brumoso': 'Misty Step',
  'patrón hipnótico': 'Hypnotic Pattern',
  'polimorfar': 'Polymorph',
  'prestidigitación': 'Prestidigitation',
  'producir llama': 'Produce Flame',
  'proyectil mágico': 'Magic Missile',
  'rayo de escarcha': 'Ray of Frost',
  'rayo de luna': 'Moonbeam',
  'reencarnar': 'Reincarnate',
  'reparar': 'Mending',
  'reprensión infernal': 'Hellish Rebuke',
  'resurrección': 'Resurrection',
  'resurrección verdadera': 'True Resurrection',
  'restablecimiento mayor': 'Greater Restoration',
  'restablecimiento menor': 'Lesser Restoration',
  'revivir': 'Revivify',
  'sanar': 'Heal',
  'silencio': 'Silence',
  'sugestión': 'Suggestion',
  'susurros disonantes': 'Dissonant Whispers',
  'taumaturgia': 'Thaumaturgy',
  'telequinesis': 'Telekinesis',
  'teleportar': 'Teleport',
  'tormenta de fuego': 'Fire Storm'
}

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

  const apiQuery = SPELL_ALIASES[q.toLocaleLowerCase()] || q

  try {
    const urls = [
      `${API}/spells/?document__slug=${SRD_DOC}&search=${encodeURIComponent(apiQuery)}`,
      `${API}/spells/?search=${encodeURIComponent(apiQuery)}`
    ]

    for (const url of urls) {
      const data = await fetchJson(url)
      const hit =
        data.results?.find(
          (r) => r.name?.toLowerCase() === apiQuery.toLowerCase()
        ) || data.results?.[0]
      const picked = pickSpell(hit)
      if (picked) {
        picked.summary = spellSummary(picked)
        cache.set(key, picked)
        return picked
      }
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

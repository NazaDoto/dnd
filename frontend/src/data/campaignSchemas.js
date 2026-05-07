/**
 * Schemas declarativos para las entidades de campaña.
 * Cada uno define la lista (qué se ve por fila) y el form (qué se edita).
 *
 * Tipos de campo soportados por CampaignEntityList:
 *   text, textarea, number, date, checkbox, select, url
 *
 * Cada entidad puede declarar:
 *   listMain:    string | (item) => string   → título principal en la tarjeta
 *   listSubs:    array<string | fn>          → líneas secundarias
 *   listBadges:  array<{ key, map: { value: 'gold'|'green'|'red'|'blue'|'purple' } }>
 *   filters:     array<{ key, label, options }>  filtros rápidos en la tarjeta
 *   sortOptions: array<{ key, label, fn }>
 */

const DISPOSITION_OPTIONS = [
    { value: 'aliado', label: 'Aliado' },
    { value: 'amistoso', label: 'Amistoso' },
    { value: 'neutral', label: 'Neutral' },
    { value: 'desconfiado', label: 'Desconfiado' },
    { value: 'hostil', label: 'Hostil' },
    { value: 'desconocido', label: 'Desconocido' },
]

const STATUS_NPC_OPTIONS = [
    { value: 'vivo', label: 'Vivo' },
    { value: 'desaparecido', label: 'Desaparecido' },
    { value: 'muerto', label: 'Muerto' },
    { value: 'retirado', label: 'Retirado' },
    { value: 'desconocido', label: 'Desconocido' },
]

const QUEST_STATUS_OPTIONS = [
    { value: 'activa', label: 'Activa' },
    { value: 'rumor', label: 'Rumor' },
    { value: 'pausada', label: 'Pausada' },
    { value: 'completada', label: 'Completada' },
    { value: 'fallida', label: 'Fallida' },
]

const QUEST_TYPE_OPTIONS = [
    { value: 'principal', label: 'Principal' },
    { value: 'secundaria', label: 'Secundaria' },
    { value: 'personal', label: 'Personal' },
    { value: 'rumor', label: 'Rumor' },
]

const LOCATION_TYPE_OPTIONS = [
    { value: 'region', label: 'Región' },
    { value: 'ciudad', label: 'Ciudad' },
    { value: 'pueblo', label: 'Pueblo' },
    { value: 'aldea', label: 'Aldea' },
    { value: 'mazmorra', label: 'Mazmorra' },
    { value: 'templo', label: 'Templo' },
    { value: 'fortaleza', label: 'Fortaleza' },
    { value: 'taberna', label: 'Taberna' },
    { value: 'tienda', label: 'Tienda' },
    { value: 'ruina', label: 'Ruina' },
    { value: 'plano', label: 'Plano' },
    { value: 'otro', label: 'Otro' },
]

const RARITY_OPTIONS = [
    { value: 'comun', label: 'Común' },
    { value: 'no_comun', label: 'Poco común' },
    { value: 'raro', label: 'Raro' },
    { value: 'muy_raro', label: 'Muy raro' },
    { value: 'legendario', label: 'Legendario' },
    { value: 'artefacto', label: 'Artefacto' },
    { value: 'sin_clasificar', label: 'Sin clasificar' },
]

export const SESSION_SCHEMA = {
    key: 'sessions',
    title: 'Sesiones',
    icon: '📜',
    hint: 'Bitácora cronológica del juego. Cada sesión jugada queda registrada.',
    addLabel: 'Nueva sesión',
    listMain: (s) => {
        const num = s.session_number ? `#${s.session_number} · ` : ''
        return `${num}${s.title || (s.session_date ? `Sesión del ${s.session_date}` : 'Sesión sin título')}`
    },
    listSubs: [
        (s) => s.session_date ? `🗓 ${s.session_date}` : '',
        (s) => s.xp_awarded ? `XP otorgada: ${s.xp_awarded}` : '',
        (s) => s.summary || s.recap || '',
    ],
    sort: (a, b) => (b.session_date || '').localeCompare(a.session_date || '') || (b.session_number || 0) - (a.session_number || 0),
    fields: [
        { key: 'session_number', label: 'Número', type: 'number', min: 1, col: 'half' },
        { key: 'session_date', label: 'Fecha', type: 'date', col: 'half' },
        { key: 'title', label: 'Título', type: 'text', required: true, placeholder: 'Ej. La caída del puente', col: 'full' },
        { key: 'summary', label: 'Resumen breve (1 línea)', type: 'text', placeholder: 'En una frase', col: 'full' },
        { key: 'recap', label: 'Recap completo', type: 'textarea', rows: 6, placeholder: 'Qué pasó, decisiones, consecuencias...' },
        { key: 'xp_awarded', label: 'XP otorgada', type: 'number', min: 0, default: 0, col: 'third' },
        { key: 'mvp_notes', label: 'MVP / momento destacado', type: 'text', col: 'twothirds' },
        { key: 'loot_summary', label: 'Botín conseguido', type: 'textarea', rows: 2 },
        { key: 'next_hooks', label: 'Hooks para próxima sesión', type: 'textarea', rows: 3 },
        { key: 'dm_notes', label: 'Notas privadas DM', type: 'textarea', rows: 4, dmOnly: true },
    ],
}

export const QUEST_SCHEMA = {
    key: 'quests',
    title: 'Misiones',
    icon: '🗡',
    hint: 'Misiones, secundarias, rumores. Cambialas de estado a medida que avanza la trama.',
    addLabel: 'Nueva misión',
    listMain: (q) => q.title,
    listSubs: [
        (q) => q.giver ? `Ofrece: ${q.giver}` : '',
        (q) => q.location ? `Lugar: ${q.location}` : '',
        (q) => q.deadline ? `⏳ ${q.deadline}` : '',
        (q) => q.description || '',
    ],
    listBadges: [
        {
            key: 'status',
            map: {
                activa: { color: 'gold', label: 'Activa' },
                rumor: { color: 'purple', label: 'Rumor' },
                pausada: { color: 'blue', label: 'Pausada' },
                completada: { color: 'green', label: 'Completada' },
                fallida: { color: 'red', label: 'Fallida' },
            },
        },
        {
            key: 'type',
            map: {
                principal: { color: 'gold', label: 'Principal' },
                secundaria: { color: 'blue', label: 'Secundaria' },
                personal: { color: 'purple', label: 'Personal' },
                rumor: { color: 'gray', label: 'Rumor' },
            },
        },
    ],
    filters: [
        {
            key: 'status',
            label: 'Estado',
            options: [{ value: '', label: 'Todos' }, ...QUEST_STATUS_OPTIONS],
        },
        {
            key: 'type',
            label: 'Tipo',
            options: [{ value: '', label: 'Todos' }, ...QUEST_TYPE_OPTIONS],
        },
    ],
    fields: [
        { key: 'title', label: 'Título', type: 'text', required: true, placeholder: 'Ej. Recuperar el cáliz', col: 'full' },
        { key: 'status', label: 'Estado', type: 'select', options: QUEST_STATUS_OPTIONS, default: 'activa', col: 'half' },
        { key: 'type', label: 'Tipo', type: 'select', options: QUEST_TYPE_OPTIONS, default: 'secundaria', col: 'half' },
        { key: 'giver', label: 'Ofrecida por', type: 'text', col: 'half' },
        { key: 'location', label: 'Lugar', type: 'text', col: 'half' },
        { key: 'deadline', label: 'Plazo / vencimiento', type: 'text', placeholder: '3 días, antes de la luna llena...', col: 'half' },
        { key: 'reward', label: 'Recompensa', type: 'text', col: 'half' },
        { key: 'description', label: 'Descripción', type: 'textarea', rows: 4 },
        { key: 'dm_notes', label: 'Notas privadas DM', type: 'textarea', rows: 3, dmOnly: true },
    ],
}

export const NPC_SCHEMA = {
    key: 'npcs',
    title: 'NPCs',
    icon: '👤',
    hint: 'Personajes del mundo. Filtrá por disposición o estado.',
    addLabel: 'Nuevo NPC',
    listMain: (n) => n.name,
    listSubs: [
        (n) => [n.role, n.race].filter(Boolean).join(' · '),
        (n) => [n.faction && `🏛 ${n.faction}`, n.location && `📍 ${n.location}`].filter(Boolean).join(' · '),
        (n) => n.voice_quirk || n.description || '',
    ],
    listBadges: [
        {
            key: 'disposition',
            map: {
                aliado: { color: 'green', label: 'Aliado' },
                amistoso: { color: 'green', label: 'Amistoso' },
                neutral: { color: 'gold', label: 'Neutral' },
                desconfiado: { color: 'gold', label: 'Desconfiado' },
                hostil: { color: 'red', label: 'Hostil' },
                desconocido: { color: 'purple', label: '?' },
            },
        },
        {
            key: 'status',
            map: {
                vivo: { color: 'green', label: 'Vivo' },
                desaparecido: { color: 'gold', label: 'Desaparecido' },
                muerto: { color: 'red', label: 'Muerto' },
                retirado: { color: 'purple', label: 'Retirado' },
                desconocido: { color: 'gold', label: '?' },
            },
        },
    ],
    filters: [
        {
            key: 'disposition',
            label: 'Disposición',
            options: [{ value: '', label: 'Todas' }, ...DISPOSITION_OPTIONS],
        },
        {
            key: 'status',
            label: 'Estado',
            options: [{ value: '', label: 'Todos' }, ...STATUS_NPC_OPTIONS],
        },
    ],
    fields: [
        { key: 'name', label: 'Nombre', type: 'text', required: true, col: 'full' },
        { key: 'role', label: 'Rol / función', type: 'text', placeholder: 'Tabernero, villano, mentor...', col: 'half' },
        { key: 'race', label: 'Raza', type: 'text', col: 'half' },
        { key: 'faction', label: 'Facción', type: 'text', col: 'half' },
        { key: 'location', label: 'Ubicación', type: 'text', col: 'half' },
        { key: 'disposition', label: 'Disposición', type: 'select', options: DISPOSITION_OPTIONS, default: 'neutral', col: 'half' },
        { key: 'status', label: 'Estado', type: 'select', options: STATUS_NPC_OPTIONS, default: 'vivo', col: 'half' },
        { key: 'voice_quirk', label: 'Voz / tic / acento', type: 'textarea', rows: 2 },
        { key: 'description', label: 'Descripción / apariencia', type: 'textarea', rows: 3 },
        { key: 'portrait_url', label: 'URL retrato', type: 'url' },
        { key: 'secret', label: 'Secretos (DM)', type: 'textarea', rows: 4, dmOnly: true },
        { key: 'dm_notes', label: 'Notas privadas DM', type: 'textarea', rows: 3, dmOnly: true },
    ],
}

export const LOCATION_SCHEMA = {
    key: 'locations',
    title: 'Lugares',
    icon: '🗺',
    hint: 'Mapa mental del mundo. Soporta jerarquía (lugar dentro de otro).',
    addLabel: 'Nuevo lugar',
    listMain: (l) => l.name,
    listSubs: [
        (l) => `Tipo: ${LOCATION_TYPE_OPTIONS.find((o) => o.value === l.type)?.label || l.type}`,
        (l) => l.description || '',
    ],
    listBadges: [
        {
            key: 'discovered',
            map: {
                true: { color: 'green', label: 'Descubierto' },
                false: { color: 'purple', label: 'Oculto' },
            },
        },
    ],
    filters: [
        {
            key: 'type',
            label: 'Tipo',
            options: [{ value: '', label: 'Todos' }, ...LOCATION_TYPE_OPTIONS],
        },
    ],
    fields: [
        { key: 'name', label: 'Nombre', type: 'text', required: true, col: 'full' },
        { key: 'type', label: 'Tipo', type: 'select', options: LOCATION_TYPE_OPTIONS, default: 'otro', col: 'half' },
        { key: 'parent_id', label: 'Pertenece a', type: 'select', dynamicOptions: 'locationsAsParents', col: 'half' },
        { key: 'description', label: 'Descripción', type: 'textarea', rows: 4 },
        { key: 'map_url', label: 'URL mapa / imagen', type: 'url' },
        { key: 'discovered', label: 'Descubierto por el grupo', type: 'checkbox', default: true },
        { key: 'dm_notes', label: 'Notas privadas DM', type: 'textarea', rows: 3, dmOnly: true },
    ],
}

export const FACTION_SCHEMA = {
    key: 'factions',
    title: 'Facciones',
    icon: '🏛',
    hint: 'Organizaciones, gremios, cultos, gobiernos. Reputación va de -100 a +100.',
    addLabel: 'Nueva facción',
    listMain: (f) => f.name,
    listSubs: [
        (f) => [f.type, f.alignment].filter(Boolean).join(' · '),
        (f) => f.leader ? `Líder: ${f.leader}` : '',
        (f) => f.goals || '',
    ],
    listBadges: [
        {
            key: 'party_reputation',
            label: 'Reputación',
            valueFn: (v) => (v != null ? `${v > 0 ? '+' : ''}${v}` : ''),
            colorFn: (v) => {
                const n = Number(v)
                if (n > 30) return 'green'
                if (n > 0) return 'gold'
                if (n === 0) return 'gray'
                if (n > -30) return 'purple'
                return 'red'
            },
        },
    ],
    fields: [
        { key: 'name', label: 'Nombre', type: 'text', required: true, col: 'full' },
        { key: 'type', label: 'Tipo', type: 'text', placeholder: 'Gremio, culto, gobierno...', col: 'half' },
        { key: 'alignment', label: 'Alineamiento', type: 'text', col: 'half' },
        { key: 'leader', label: 'Líder', type: 'text', col: 'half' },
        { key: 'party_reputation', label: 'Reputación grupo (-100 a 100)', type: 'number', min: -100, max: 100, default: 0, col: 'half' },
        { key: 'goals', label: 'Objetivos', type: 'textarea', rows: 3 },
        { key: 'resources', label: 'Recursos', type: 'textarea', rows: 2 },
        { key: 'allies', label: 'Aliados', type: 'textarea', rows: 2, col: 'half' },
        { key: 'enemies', label: 'Enemigos', type: 'textarea', rows: 2, col: 'half' },
        { key: 'description', label: 'Descripción', type: 'textarea', rows: 3 },
        { key: 'dm_notes', label: 'Notas privadas DM', type: 'textarea', rows: 3, dmOnly: true },
    ],
}

export const ITEM_SCHEMA = {
    key: 'items',
    title: 'Botín / Items',
    icon: '💎',
    hint: 'Objetos mágicos y mundanos otorgados al grupo o NPCs.',
    addLabel: 'Nuevo item',
    listMain: (i) => `${i.name}${i.quantity > 1 ? ` ×${i.quantity}` : ''}`,
    listSubs: [
        (i) => [i.type, i.attunement && '🔗 sintonizar', i.attuned_to && `→ ${i.attuned_to}`].filter(Boolean).join(' · '),
        (i) => i.current_owner ? `Lo tiene: ${i.current_owner}` : '',
        (i) => [i.value_gp != null ? `${i.value_gp} po` : '', i.source ? `Fuente: ${i.source}` : '', i.awarded_at ? `Obtenido: ${i.awarded_at}` : ''].filter(Boolean).join(' · '),
        (i) => i.description || '',
    ],
    listBadges: [
        {
            key: 'rarity',
            map: {
                comun: { color: 'gray', label: 'Común' },
                no_comun: { color: 'green', label: 'Poco común' },
                raro: { color: 'blue', label: 'Raro' },
                muy_raro: { color: 'purple', label: 'Muy raro' },
                legendario: { color: 'gold', label: 'Legendario' },
                artefacto: { color: 'red', label: 'Artefacto' },
                sin_clasificar: { color: 'gray', label: '?' },
            },
        },
    ],
    filters: [
        {
            key: 'rarity',
            label: 'Rareza',
            options: [{ value: '', label: 'Todas' }, ...RARITY_OPTIONS],
        },
    ],
    fields: [
        { key: 'name', label: 'Nombre', type: 'text', required: true, col: 'full' },
        { key: 'rarity', label: 'Rareza', type: 'select', options: RARITY_OPTIONS, default: 'sin_clasificar', col: 'half' },
        { key: 'type', label: 'Tipo', type: 'text', placeholder: 'Arma, varita, poción, anillo...', col: 'half' },
        { key: 'attunement', label: 'Requiere sintonización', type: 'checkbox', default: false, col: 'half' },
        { key: 'attuned_to', label: 'Sintonizado con', type: 'text', col: 'half' },
        { key: 'current_owner', label: 'Lo tiene actualmente', type: 'text', col: 'half' },
        { key: 'quantity', label: 'Cantidad', type: 'number', min: 1, default: 1, col: 'half' },
        { key: 'value_gp', label: 'Valor (po)', type: 'number', min: 0, col: 'half' },
        { key: 'awarded_at', label: 'Fecha obtención', type: 'date', col: 'half' },
        { key: 'source', label: 'Fuente / origen', type: 'text', placeholder: 'Cripta del rey, regalo del rey...', col: 'full' },
        { key: 'description', label: 'Descripción / efectos', type: 'textarea', rows: 4 },
        { key: 'dm_notes', label: 'Notas privadas DM', type: 'textarea', rows: 3, dmOnly: true },
    ],
}

export const CAMPAIGN_ENTITY_SCHEMAS = {
    sessions: SESSION_SCHEMA,
    quests: QUEST_SCHEMA,
    npcs: NPC_SCHEMA,
    locations: LOCATION_SCHEMA,
    factions: FACTION_SCHEMA,
    items: ITEM_SCHEMA,
}

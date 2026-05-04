// ============================================================
//  D&D 5e Data — Contenido SRD
// ============================================================

export const RACES = [
    { value: 'dragonborn', label: 'Dragonborn', subraces: ['Ancestría de Ácido', 'Ancestría de Relámpago', 'Ancestría de Fuego', 'Ancestría de Frío', 'Ancestría de Veneno', 'Ancestría de Psíquico', 'Ancestría de Aliento de Vapor', 'Ancestría de Trueno', 'Ancestría de Fuerza', 'Ancestría de Necrótico'] },
    { value: 'dwarf', label: 'Enano', subraces: ['Enano de las Colinas', 'Enano de la Montaña'] },
    { value: 'elf', label: 'Elfo', subraces: ['Alto Elfo', 'Elfo del Bosque', 'Drow'] },
    { value: 'gnome', label: 'Gnomo', subraces: ['Gnomo de la Roca', 'Gnomo del Bosque', 'Gnomo Profundo'] },
    { value: 'half-elf', label: 'Semielfo', subraces: [] },
    { value: 'half-orc', label: 'Semiorco', subraces: [] },
    { value: 'halfling', label: 'Mediano', subraces: ['Pie Ligero', 'Fornido'] },
    { value: 'human', label: 'Humano', subraces: ['Humano Estándar', 'Humano con Dote'] },
    { value: 'tiefling', label: 'Tiefling', subraces: ['Linaje de Asmodeo', 'Linaje de Mephistopheles', 'Linaje de Zariel'] },
    { value: 'aasimar', label: 'Aasimar', subraces: ['Aasimar Protector', 'Aasimar Expiador', 'Aasimar Caído'] },
    { value: 'firbolg', label: 'Firbolg', subraces: [] },
    { value: 'goliath', label: 'Góliath', subraces: [] },
    { value: 'kenku', label: 'Kenku', subraces: [] },
    { value: 'lizardfolk', label: 'Hombre Lagarto', subraces: [] },
    { value: 'tabaxi', label: 'Tabaxi', subraces: [] },
    { value: 'triton', label: 'Tritón', subraces: [] },
    { value: 'yuan-ti', label: 'Yuan-ti Pureblood', subraces: [] },
    { value: 'tortle', label: 'Tortle', subraces: [] },
    { value: 'changeling', label: 'Cambiante', subraces: [] },
    { value: 'kalashtar', label: 'Kalashtar', subraces: [] },
    { value: 'shifter', label: 'Cambiante (Shifter)', subraces: ['Bestial', 'Guardián', 'Longstride', 'Maíz Salvaje'] },
    { value: 'warforged', label: 'Warforged', subraces: [] },
    { value: 'custom', label: 'Personalizado', subraces: [] },
]

export const CLASSES = [{
        value: 'barbarian',
        label: 'Bárbaro',
        hitDie: 'd12',
        subclasses: ['Senda del Berserker', 'Senda del Guerrero Totem', 'Senda de la Magia Salvaje', 'Senda del Heraldo de la Tormenta', 'Senda del Ancestro Fantasmal', 'Senda de la Bestia']
    },
    {
        value: 'bard',
        label: 'Bardo',
        hitDie: 'd8',
        subclasses: ['Colegio del Valor', 'Colegio del Conocimiento', 'Colegio de la Creación', 'Colegio de la Elocuencia', 'Colegio de las Espadas', 'Colegio de los Susurros']
    },
    {
        value: 'cleric',
        label: 'Clérigo',
        hitDie: 'd8',
        subclasses: ['Dominio Arcano', 'Dominio de la Forja', 'Dominio de la Muerte', 'Dominio de la Naturaleza', 'Dominio de la Tormenta', 'Dominio de la Vida', 'Dominio de la Guerra', 'Dominio del Conocimiento', 'Dominio del Engaño', 'Dominio del Orden', 'Dominio de la Paz', 'Dominio de la Tumba', 'Dominio de la Luz', 'Dominio de la Twilight']
    },
    {
        value: 'druid',
        label: 'Druida',
        hitDie: 'd8',
        subclasses: ['Círculo de la Tierra', 'Círculo de la Luna', 'Círculo de las Esporas', 'Círculo de las Estrellas', 'Círculo de los Sueños', 'Círculo del Pastor']
    },
    {
        value: 'fighter',
        label: 'Guerrero',
        hitDie: 'd10',
        subclasses: ['Campeón', 'Caballero de Batalla', 'Maestro de Combate', 'Eldritch Knight', 'Arcano Arquero', 'Caballero Místico', 'Psi Warrior', 'Samurai', 'Heraldo de Rune', 'Banneret']
    },
    {
        value: 'monk',
        label: 'Monje',
        hitDie: 'd8',
        subclasses: ['Camino de la Mano Abierta', 'Camino de la Sombra', 'Camino de los Cuatro Elementos', 'Camino de la Misericordia', 'Camino del Arquero de la Borracha', 'Camino de la Mente Despertada', 'Camino del Maestro del Sol']
    },
    {
        value: 'paladin',
        label: 'Paladín',
        hitDie: 'd10',
        subclasses: ['Juramento de Devoción', 'Juramento de los Antiguos', 'Juramento de la Venganza', 'Juramento de la Corona', 'Juramento de Gloria', 'Juramento de la Redención', 'Juramento de la Conquista', 'Antipaladín', 'Juramento Watchers']
    },
    {
        value: 'ranger',
        label: 'Explorador',
        hitDie: 'd10',
        subclasses: ['Cazador', 'Amo de las Bestias', 'Explorador del Horizonte', 'Acechador Enjambre', 'Acechador de la Oscuridad', 'Guardián del Fey']
    },
    {
        value: 'rogue',
        label: 'Pícaro',
        hitDie: 'd8',
        subclasses: ['Ladrón', 'Asesino', 'Embaucador Arcano', 'Jinete Inescrupuloso', 'Phanthom', 'Soulknife', 'Scout', 'Swashbuckler', 'Mastermind']
    },
    {
        value: 'sorcerer',
        label: 'Hechicero',
        hitDie: 'd6',
        subclasses: ['Origen Draconiano', 'Magia Salvaje', 'Alma de Aberración', 'Alma Reloj', 'Alma de Sombras', 'Alma de Tormenta', 'Alma de la Línea de Sangre Divina', 'Magia del Aboleth']
    },
    {
        value: 'warlock',
        label: 'Brujo',
        hitDie: 'd8',
        subclasses: ['El Archihada', 'El Gran Antiguo', 'El Inmortal', 'El Celestial', 'El Genio', 'El Filo Hexblade', 'El Paria']
    },
    {
        value: 'wizard',
        label: 'Mago',
        hitDie: 'd6',
        subclasses: ['Escuela de Abjuración', 'Escuela de Conjuración', 'Escuela de Adivinación', 'Escuela de Encantamiento', 'Escuela de Evocación', 'Escuela de Ilusión', 'Escuela de Nigromancia', 'Escuela de Transmutación', 'Cronurgy Magic', 'Graviturgy Magic', 'Bladesinging', 'Orden de los Escribas']
    },
    {
        value: 'artificer',
        label: 'Artificer',
        hitDie: 'd8',
        subclasses: ['Alquimista', 'Armorer', 'Artillerist', 'Battle Smith']
    },
]

export const BACKGROUNDS = [
    'Acólito', 'Artesano de Gremio', 'Bandido', 'Cazador', 'Charlatán', 'Entertainador',
    'Eremita', 'Forastero', 'Héroe del Pueblo', 'Marinero', 'Mercenario', 'Nobleza',
    'Proscrito', 'Sabio', 'Sirviente de Corte', 'Soldado', 'Criminal',
    'Explorador del Mar Profundo', 'Far Traveler', 'Knight of the Order',
    'Personalizado'
]

export const ALIGNMENTS = [
    'Legal Bueno', 'Neutral Bueno', 'Caótico Bueno',
    'Legal Neutro', 'Neutro Verdadero', 'Caótico Neutro',
    'Legal Malvado', 'Neutral Malvado', 'Caótico Malvado',
]

export const SKILLS = [
    { key: 'acrobatics', label: 'Acrobacias', attr: 'dexterity' },
    { key: 'animal_handling', label: 'Trato con Animales', attr: 'wisdom' },
    { key: 'arcana', label: 'Arcanos', attr: 'intelligence' },
    { key: 'athletics', label: 'Atletismo', attr: 'strength' },
    { key: 'deception', label: 'Engaño', attr: 'charisma' },
    { key: 'history', label: 'Historia', attr: 'intelligence' },
    { key: 'insight', label: 'Perspicacia', attr: 'wisdom' },
    { key: 'intimidation', label: 'Intimidación', attr: 'charisma' },
    { key: 'investigation', label: 'Investigación', attr: 'intelligence' },
    { key: 'medicine', label: 'Medicina', attr: 'wisdom' },
    { key: 'nature', label: 'Naturaleza', attr: 'intelligence' },
    { key: 'perception', label: 'Percepción', attr: 'wisdom' },
    { key: 'performance', label: 'Actuación', attr: 'charisma' },
    { key: 'persuasion', label: 'Persuasión', attr: 'charisma' },
    { key: 'religion', label: 'Religión', attr: 'intelligence' },
    { key: 'sleight_of_hand', label: 'Juego de Manos', attr: 'dexterity' },
    { key: 'stealth', label: 'Sigilo', attr: 'dexterity' },
    { key: 'survival', label: 'Supervivencia', attr: 'wisdom' },
]

export const ATTRIBUTES = [
    { key: 'strength', label: 'Fuerza', short: 'FUE' },
    { key: 'dexterity', label: 'Destreza', short: 'DES' },
    { key: 'constitution', label: 'Constitución', short: 'CON' },
    { key: 'intelligence', label: 'Inteligencia', short: 'INT' },
    { key: 'wisdom', label: 'Sabiduría', short: 'SAB' },
    { key: 'charisma', label: 'Carisma', short: 'CAR' },
]

export const LANGUAGES = [
    'Común', 'Enano', 'Élfico', 'Gnómico', 'Mediando', 'Orchuano', 'Dracónico',
    'Gigante', 'Gnoll', 'Goblin', 'Infernal', 'Abismal', 'Primordial',
    'Silvano', 'Infracomún', 'Céltico', 'Thieve\'s Cant', 'Personalizado'
]

export const SPELLCASTING_ABILITIES = [
    { value: 'intelligence', label: 'Inteligencia (Magos, Artificer)' },
    { value: 'wisdom', label: 'Sabiduría (Clérigos, Druidas, Exploradores)' },
    { value: 'charisma', label: 'Carisma (Bardos, Hechiceros, Brujos, Paladines)' },
]

export const SPELL_SCHOOLS = [
    'Abjuración', 'Conjuración', 'Adivinación', 'Encantamiento',
    'Evocación', 'Ilusión', 'Nigromancia', 'Transmutación'
]

// Bono de proficiencia por nivel
export const PROF_BONUS_BY_LEVEL = {
    1: 2,
    2: 2,
    3: 2,
    4: 2,
    5: 3,
    6: 3,
    7: 3,
    8: 3,
    9: 4,
    10: 4,
    11: 4,
    12: 4,
    13: 5,
    14: 5,
    15: 5,
    16: 5,
    17: 6,
    18: 6,
    19: 6,
    20: 6
}

// XP necesaria por nivel
export const XP_BY_LEVEL = [
    0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000,
    85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000
]

export function getModifier(score) {
    return Math.floor((score - 10) / 2)
}

export function formatModifier(mod) {
    return mod >= 0 ? `+${mod}` : `${mod}`
}
/**
 * Condiciones estándar de D&D 5e (SRD).
 * Cada condición tiene una clave estable (id), label en español, color de badge y descripción corta.
 */
export const CONDITIONS = [
    {
        id: 'blinded',
        label: 'Cegado',
        color: 'gray',
        desc: 'No ve. Las tiradas de ataque contra él tienen ventaja; las suyas, desventaja.',
    },
    {
        id: 'charmed',
        label: 'Encantado',
        color: 'purple',
        desc: 'No puede atacar al hechicero ni elegirlo como objetivo de habilidades dañinas.',
    },
    {
        id: 'deafened',
        label: 'Ensordecido',
        color: 'gray',
        desc: 'No oye y falla cualquier prueba que requiera oír.',
    },
    {
        id: 'frightened',
        label: 'Asustado',
        color: 'red',
        desc: 'Desventaja en ataques y pruebas mientras la fuente esté a la vista. No puede acercarse a ella.',
    },
    {
        id: 'grappled',
        label: 'Aferrado',
        color: 'orange',
        desc: 'Velocidad 0. Termina si el atacante queda incapacitado.',
    },
    {
        id: 'incapacitated',
        label: 'Incapacitado',
        color: 'red',
        desc: 'No puede realizar acciones ni reacciones.',
    },
    {
        id: 'invisible',
        label: 'Invisible',
        color: 'blue',
        desc: 'Imposible de ver. Ataques contra él con desventaja; suyos con ventaja.',
    },
    {
        id: 'paralyzed',
        label: 'Paralizado',
        color: 'red',
        desc: 'Incapacitado, no se mueve, falla salvaciones de Fuerza/Destreza. Crítico si lo golpean en 5 ft.',
    },
    {
        id: 'petrified',
        label: 'Petrificado',
        color: 'gray',
        desc: 'Transformado en piedra. Resistencia a todo el daño. Inmune a veneno y enfermedad.',
    },
    {
        id: 'poisoned',
        label: 'Envenenado',
        color: 'green',
        desc: 'Desventaja en tiradas de ataque y pruebas de característica.',
    },
    {
        id: 'prone',
        label: 'Derribado',
        color: 'orange',
        desc: 'Solo puede arrastrarse. Desventaja en ataques. Ataques contra él con ventaja en 5 ft.',
    },
    {
        id: 'restrained',
        label: 'Apresado',
        color: 'orange',
        desc: 'Velocidad 0. Desventaja en ataques y salvaciones de Destreza.',
    },
    {
        id: 'stunned',
        label: 'Aturdido',
        color: 'red',
        desc: 'Incapacitado. Falla salvaciones de Fuerza y Destreza.',
    },
    {
        id: 'unconscious',
        label: 'Inconsciente',
        color: 'red',
        desc: 'Incapacitado, derribado, falla Fuerza/Destreza. Crítico si lo golpean en 5 ft.',
    },
    {
        id: 'exhaustion',
        label: 'Exhausto',
        color: 'orange',
        desc: 'Niveles 1-6. Penalización progresiva según nivel.',
    },
    {
        id: 'concentration',
        label: 'Concentrado',
        color: 'blue',
        desc: 'Mantiene un conjuro. Salvación CON al recibir daño (CD = max(10, daño/2)).',
    },
    {
        id: 'bless',
        label: 'Bendecido',
        color: 'gold',
        desc: '+1d4 a tiradas de ataque y salvaciones (efecto positivo).',
    },
    {
        id: 'rage',
        label: 'Furia',
        color: 'red',
        desc: 'Resistencia a contundente/cortante/perforante. Bonus al daño cuerpo a cuerpo.',
    },
    {
        id: 'inspired',
        label: 'Inspirado',
        color: 'gold',
        desc: 'Tiene un dado de inspiración bárdica para sumar a una tirada.',
    },
]

export const CONDITIONS_BY_ID = Object.fromEntries(CONDITIONS.map((c) => [c.id, c]))

export function conditionLabel(id) {
    return CONDITIONS_BY_ID[id]?.label || id
}

const FULL_CASTER_SLOTS = [
    [],
    [2], [3], [4, 2], [4, 3], [4, 3, 2], [4, 3, 3], [4, 3, 3, 1],
    [4, 3, 3, 2], [4, 3, 3, 3, 1], [4, 3, 3, 3, 2], [4, 3, 3, 3, 2, 1],
    [4, 3, 3, 3, 2, 1], [4, 3, 3, 3, 2, 1, 1], [4, 3, 3, 3, 2, 1, 1],
    [4, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 2, 1, 1, 1],
    [4, 3, 3, 3, 2, 1, 1, 1, 1], [4, 3, 3, 3, 3, 1, 1, 1, 1],
    [4, 3, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 3, 2, 2, 1, 1]
];

const HALF_CASTER_SLOTS = [
    [], [], [2], [3], [3], [4, 2], [4, 2], [4, 3], [4, 3], [4, 3, 2],
    [4, 3, 2], [4, 3, 3], [4, 3, 3], [4, 3, 3, 1], [4, 3, 3, 1],
    [4, 3, 3, 2], [4, 3, 3, 2], [4, 3, 3, 3, 1], [4, 3, 3, 3, 1],
    [4, 3, 3, 3, 2], [4, 3, 3, 3, 2]
];

const ARTIFICER_SLOTS = [
    [], [2], [2], [3], [3], [4, 2], [4, 2], [4, 3], [4, 3], [4, 3, 2],
    [4, 3, 2], [4, 3, 3], [4, 3, 3], [4, 3, 3, 1], [4, 3, 3, 1],
    [4, 3, 3, 2], [4, 3, 3, 2], [4, 3, 3, 3, 1], [4, 3, 3, 3, 1],
    [4, 3, 3, 3, 2], [4, 3, 3, 3, 2]
];

const WARLOCK_SLOTS = [
    [], [1], [2], [0, 2], [0, 2], [0, 0, 2], [0, 0, 2], [0, 0, 0, 2],
    [0, 0, 0, 2], [0, 0, 0, 0, 2], [0, 0, 0, 0, 2], [0, 0, 0, 0, 3],
    [0, 0, 0, 0, 3], [0, 0, 0, 0, 3], [0, 0, 0, 0, 3], [0, 0, 0, 0, 3],
    [0, 0, 0, 0, 3], [0, 0, 0, 0, 4], [0, 0, 0, 0, 4], [0, 0, 0, 0, 4],
    [0, 0, 0, 0, 4]
];

const CLASS_DEFAULTS = {
    barbarian: {
        features: {
            1: ['Defensa sin armadura', 'Furia'],
            2: ['Ataque temerario', 'Sentido del peligro'],
            3: ['Senda primigenia'], 5: ['Ataque extra', 'Movimiento rápido'],
            7: ['Instinto salvaje'], 9: ['Crítico brutal'], 11: ['Furia implacable'],
            15: ['Furia persistente'], 18: ['Poder indomable'], 20: ['Campeón primigenio']
        }
    },
    bard: {
        ability: 'charisma', slots: FULL_CASTER_SLOTS,
        cantrips: ['Burla dañina', 'Luz'],
        spells: {
            1: ['Palabra sanadora', 'Susurros disonantes', 'Fuego feérico', 'Onda atronadora'],
            2: ['Invisibilidad', 'Sugestión'], 3: ['Disipar magia', 'Patrón hipnótico'],
            4: ['Invisibilidad mayor'], 5: ['Curar heridas en masa'], 6: ['Danza irresistible'],
            7: ['Espada de Mordenkainen'], 8: ['Dominar monstruo'], 9: ['Palabra de poder: sanar']
        },
        features: {
            1: ['Inspiración bárdica', 'Lanzamiento de conjuros'],
            2: ['Aprendiz de todo', 'Canción de descanso'], 3: ['Colegio bárdico', 'Pericia'],
            5: ['Fuente de inspiración'], 6: ['Contraencanto'], 10: ['Secretos mágicos'],
            20: ['Inspiración superior']
        }
    },
    cleric: {
        ability: 'wisdom', slots: FULL_CASTER_SLOTS,
        cantrips: ['Guía', 'Llama sagrada', 'Taumaturgia'],
        spells: {
            1: ['Bendecir', 'Curar heridas', 'Palabra sanadora', 'Escudo de la fe'],
            2: ['Arma espiritual', 'Restablecimiento menor'], 3: ['Guardianes espirituales', 'Revivir'],
            4: ['Guardián de la fe'], 5: ['Restablecimiento mayor'], 6: ['Sanar'],
            7: ['Resurrección'], 8: ['Aura sagrada'], 9: ['Resurrección verdadera']
        },
        features: {
            1: ['Lanzamiento de conjuros', 'Dominio divino'],
            2: ['Canalizar divinidad', 'Expulsar muertos vivientes'], 5: ['Destruir muertos vivientes'],
            10: ['Intervención divina'], 20: ['Intervención divina mejorada']
        }
    },
    druid: {
        ability: 'wisdom', slots: FULL_CASTER_SLOTS,
        cantrips: ['Garrote', 'Producir llama'],
        spells: {
            1: ['Enmarañar', 'Palabra sanadora', 'Hablar con los animales'],
            2: ['Rayo de luna', 'Pasar sin rastro'], 3: ['Llamar al relámpago', 'Disipar magia'],
            4: ['Polimorfar'], 5: ['Reencarnar'], 6: ['Muro de espinas'],
            7: ['Tormenta de fuego'], 8: ['Formas animales'], 9: ['Cambiar de forma']
        },
        features: {
            1: ['Druídico', 'Lanzamiento de conjuros'], 2: ['Forma salvaje', 'Círculo druídico'],
            18: ['Cuerpo eterno', 'Conjuros de bestia'], 20: ['Archidruida']
        }
    },
    fighter: {
        features: {
            1: ['Estilo de combate', 'Segundo aliento'], 2: ['Oleada de acción'],
            3: ['Arquetipo marcial'], 5: ['Ataque extra'], 9: ['Indomable'],
            11: ['Ataque extra (2)'], 20: ['Ataque extra (3)']
        }
    },
    monk: {
        features: {
            1: ['Defensa sin armadura', 'Artes marciales'], 2: ['Ki', 'Movimiento sin armadura'],
            3: ['Tradición monástica', 'Desviar proyectiles'], 4: ['Caída lenta'],
            5: ['Ataque extra', 'Golpe aturdidor'], 6: ['Golpes potenciados por ki'],
            7: ['Evasión', 'Quietud de la mente'], 10: ['Pureza del cuerpo'],
            13: ['Lengua del sol y la luna'], 14: ['Alma de diamante'], 15: ['Cuerpo eterno'],
            18: ['Cuerpo vacío'], 20: ['Yo perfecto']
        }
    },
    paladin: {
        ability: 'charisma', slots: HALF_CASTER_SLOTS,
        spells: {
            1: ['Bendecir', 'Curar heridas', 'Escudo de la fe'], 2: ['Auxilio', 'Encontrar corcel'],
            3: ['Revivir'], 4: ['Aura de pureza'], 5: ['Golpe desterrador']
        },
        features: {
            1: ['Sentido divino', 'Imposición de manos'], 2: ['Estilo de combate', 'Lanzamiento de conjuros', 'Castigo divino'],
            3: ['Salud divina', 'Juramento sagrado'], 5: ['Ataque extra'], 6: ['Aura de protección'],
            10: ['Aura de valor'], 11: ['Castigo divino mejorado'], 14: ['Toque purificador']
        }
    },
    ranger: {
        ability: 'wisdom', slots: HALF_CASTER_SLOTS,
        spells: {
            1: ['Marca del cazador', 'Curar heridas', 'Hablar con los animales'], 2: ['Pasar sin rastro', 'Silencio'],
            3: ['Conjurar animales'], 4: ['Libertad de movimiento'], 5: ['Carcaj veloz']
        },
        features: {
            1: ['Enemigo predilecto', 'Explorador nato'], 2: ['Estilo de combate', 'Lanzamiento de conjuros'],
            3: ['Arquetipo de explorador', 'Conciencia primigenia'], 5: ['Ataque extra'],
            8: ['Paso de la tierra'], 10: ['Ocultarse a plena vista'], 14: ['Desvanecerse'],
            18: ['Sentidos salvajes'], 20: ['Azote de enemigos']
        }
    },
    rogue: {
        features: {
            1: ['Pericia', 'Ataque furtivo', 'Jerga de ladrones'], 2: ['Acción astuta'],
            3: ['Arquetipo de pícaro'], 5: ['Esquiva asombrosa'], 7: ['Evasión'],
            11: ['Talento fiable'], 14: ['Sentido ciego'], 15: ['Mente escurridiza'],
            18: ['Elusivo'], 20: ['Golpe de suerte']
        }
    },
    sorcerer: {
        ability: 'charisma', slots: FULL_CASTER_SLOTS,
        cantrips: ['Descarga de fuego', 'Mano de mago', 'Prestidigitación', 'Rayo de escarcha'],
        spells: {
            1: ['Escudo', 'Proyectil mágico'], 2: ['Imagen múltiple', 'Paso brumoso'],
            3: ['Bola de fuego', 'Contrahechizo'], 4: ['Polimorfar'], 5: ['Telequinesis'],
            6: ['Desintegrar'], 7: ['Teleportar'], 8: ['Dominar monstruo'], 9: ['Deseo']
        },
        features: {
            1: ['Lanzamiento de conjuros', 'Origen de hechicería'], 2: ['Fuente de magia'],
            3: ['Metamagia'], 20: ['Restauración de hechicero']
        }
    },
    warlock: {
        ability: 'charisma', slots: WARLOCK_SLOTS,
        cantrips: ['Descarga sobrenatural', 'Ilusión menor'],
        spells: {
            1: ['Armadura de Agathys', 'Reprensión infernal'], 2: ['Oscuridad', 'Inmovilizar persona'],
            3: ['Contrahechizo', 'Hambre de Hadar'], 4: ['Destierro'], 5: ['Inmovilizar monstruo']
        },
        features: {
            1: ['Patrón sobrenatural', 'Magia de pacto'], 2: ['Invocaciones sobrenaturales'],
            3: ['Don del pacto'], 11: ['Arcanum místico (nivel 6)'], 13: ['Arcanum místico (nivel 7)'],
            15: ['Arcanum místico (nivel 8)'], 17: ['Arcanum místico (nivel 9)'], 20: ['Maestro sobrenatural']
        }
    },
    wizard: {
        ability: 'intelligence', slots: FULL_CASTER_SLOTS,
        cantrips: ['Descarga de fuego', 'Mano de mago', 'Prestidigitación'],
        spells: {
            1: ['Armadura de mago', 'Escudo', 'Proyectil mágico', 'Detectar magia', 'Dormir', 'Encontrar familiar'],
            2: ['Paso brumoso', 'Invisibilidad'], 3: ['Bola de fuego', 'Contrahechizo'],
            4: ['Polimorfar'], 5: ['Muro de fuerza'], 6: ['Desintegrar'],
            7: ['Teleportar'], 8: ['Laberinto'], 9: ['Deseo']
        },
        features: {
            1: ['Lanzamiento de conjuros', 'Recuperación arcana'], 2: ['Tradición arcana'],
            18: ['Maestría de conjuros'], 20: ['Conjuros de signatura']
        }
    },
    artificer: {
        ability: 'intelligence', slots: ARTIFICER_SLOTS,
        cantrips: ['Reparar', 'Guía'],
        spells: {
            1: ['Curar heridas', 'Identificar', 'Fuego feérico'], 2: ['Auxilio', 'Mejorar característica'],
            3: ['Disipar magia', 'Revivir'], 4: ['Ojo arcano'], 5: ['Animar objetos']
        },
        features: {
            1: ['Retoques mágicos', 'Lanzamiento de conjuros'], 2: ['Infundir objeto'],
            3: ['Especialista artificiero', 'La herramienta adecuada para el trabajo'],
            6: ['Pericia con herramientas'], 7: ['Destello de genialidad'], 10: ['Adepto de objetos mágicos'],
            11: ['Objeto almacenador de conjuros'], 14: ['Sabio de objetos mágicos'], 18: ['Maestro de objetos mágicos'],
            20: ['Alma del artificiero']
        }
    }
};

function parse(value, fallback) {
    if (value && typeof value === 'object') return value;
    if (typeof value === 'string' && value.trim()) {
        try { return JSON.parse(value); } catch { /* use fallback */ }
    }
    return fallback;
}

function uniqueStrings(current, defaults) {
    const result = Array.isArray(current) ? [...current] : [];
    const seen = new Set(result.map(value => String(value).trim().toLocaleLowerCase()));
    for (const value of defaults || []) {
        const key = String(value).trim().toLocaleLowerCase();
        if (key && !seen.has(key)) {
            result.push(value);
            seen.add(key);
        }
    }
    return result;
}

function emptySpells() {
    const spells = { cantrips: [] };
    for (let i = 1; i <= 9; i++) spells[`level${i}`] = { slots: 0, slots_used: 0, spells: [] };
    return spells;
}

function mergeSpells(current, defaults, level) {
    const result = emptySpells();
    const parsed = parse(current, {});
    result.cantrips = uniqueStrings(parsed.cantrips, defaults.cantrips);

    const slots = defaults.slots?.[level] || [];
    const highestAccessibleLevel = slots.reduce((highest, count, index) => count > 0 ? index + 1 : highest, 0);
    for (let i = 1; i <= 9; i++) {
        const key = `level${i}`;
        const existing = parsed[key] && typeof parsed[key] === 'object' ? parsed[key] : {};
        result[key] = {
            slots: Math.max(Number(existing.slots || 0), Number(slots[i - 1] || 0)),
            slots_used: Number(existing.slots_used || 0),
            spells: uniqueStrings(existing.spells, i <= highestAccessibleLevel ? defaults.spells?.[i] : [])
        };
        result[key].slots_used = Math.min(result[key].slots_used, result[key].slots);
    }
    return result;
}

function mergeFeatures(current, defaults, level) {
    const result = Array.isArray(parse(current, [])) ? [...parse(current, [])] : [];
    const seen = new Set(result.map(feature => String(typeof feature === 'string' ? feature : feature?.name || '').trim().toLocaleLowerCase()));
    for (const [requiredLevel, names] of Object.entries(defaults.features || {})) {
        if (Number(requiredLevel) > level) continue;
        for (const name of names) {
            const key = name.toLocaleLowerCase();
            if (!seen.has(key)) {
                result.push({ name, description: `Rasgo de clase obtenido a nivel ${requiredLevel}.` });
                seen.add(key);
            }
        }
    }
    return result;
}

function applyClassDefaults(character) {
    const classKey = String(character?.class || '').trim().toLowerCase();
    const defaults = CLASS_DEFAULTS[classKey];
    if (!defaults) return { ...character };

    const level = Math.max(1, Math.min(20, Number(character.level || 1)));
    const result = {
        ...character,
        features_traits: mergeFeatures(character.features_traits, defaults, level)
    };

    if (defaults.ability) {
        result.spellcasting_ability = character.spellcasting_ability || defaults.ability;
        result.spells = mergeSpells(character.spells, defaults, level);
        const abilityScore = Number(character[result.spellcasting_ability] || 10);
        const abilityModifier = Math.floor((abilityScore - 10) / 2);
        const proficiencyBonus = Number(character.proficiency_bonus || (2 + Math.floor((level - 1) / 4)));
        if (character.spell_save_dc === null || character.spell_save_dc === undefined || character.spell_save_dc === '') {
            result.spell_save_dc = 8 + proficiencyBonus + abilityModifier;
        }
        if (character.spell_attack_bonus === null || character.spell_attack_bonus === undefined || character.spell_attack_bonus === '') {
            result.spell_attack_bonus = proficiencyBonus + abilityModifier;
        }
    }

    return result;
}

module.exports = { applyClassDefaults };

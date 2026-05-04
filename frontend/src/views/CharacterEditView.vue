<template>
  <div class="form-view" v-if="loaded">
    <div class="form-header">
      <button class="btn btn-ghost btn-icon" @click="$router.back()">‹</button>
      <h2 class="form-title">Editar personaje</h2>
      <button class="btn btn-primary" :disabled="saving" @click="submitForm">
        {{ saving ? 'Guardando...' : 'Guardar' }}
      </button>
    </div>

    <form class="char-form" @submit.prevent="submitForm">
      <div class="card">
        <p class="section-title">Datos principales</p>

        <div class="photo-picker">
          <div class="photo-preview">
            <img
              v-if="photoPreview"
              :src="photoPreview"
              :alt="form.name"
              class="preview-img"
            />
            <div v-else class="preview-placeholder">
              {{ form.name ? form.name[0] : '?' }}
            </div>
          </div>

          <label class="btn btn-secondary file-btn">
            Cambiar imagen
            <input type="file" accept="image/*" @change="onPhotoChange" />
          </label>
        </div>

        <label class="field">
          <span>Nombre</span>
          <input v-model.trim="form.name" class="input" required />
        </label>

        <div class="grid-2">
          <label class="field">
            <span>Raza</span>
            <input v-model.trim="form.race" class="input" />
          </label>

          <label class="field">
            <span>Subraza</span>
            <input v-model.trim="form.subrace" class="input" />
          </label>
        </div>

        <div class="grid-2">
          <label class="field">
            <span>Clase</span>
            <select v-model="form.class" class="input" required>
              <option disabled value="">Elegir clase</option>
              <option
                v-for="cls in CLASSES"
                :key="cls.value"
                :value="cls.value"
              >
                {{ cls.label }}
              </option>
            </select>
          </label>

          <label class="field">
            <span>Nivel</span>
            <input
              v-model.number="form.level"
              class="input"
              type="number"
              min="1"
              max="20"
            />
          </label>
        </div>

        <div class="grid-2">
          <label class="field">
            <span>Trasfondo</span>
            <input v-model.trim="form.background" class="input" />
          </label>

          <label class="field">
            <span>Alineamiento</span>
            <select v-model="form.alignment" class="input">
              <option value="">Sin especificar</option>
              <option v-for="a in alignments" :key="a" :value="a">
                {{ a }}
              </option>
            </select>
          </label>
        </div>

        <label class="field">
          <span>XP</span>
          <input
            v-model.number="form.experience_points"
            class="input"
            type="number"
            min="0"
          />
        </label>
      </div>

      <div class="card">
        <p class="section-title">Combate</p>

        <div class="grid-3">
          <label class="field">
            <span>PV actuales</span>
            <input
              v-model.number="form.hit_points_current"
              class="input"
              type="number"
              min="0"
            />
          </label>

          <label class="field">
            <span>PV máximos</span>
            <input
              v-model.number="form.hit_points_max"
              class="input"
              type="number"
              min="1"
            />
          </label>

          <label class="field">
            <span>PV temporales</span>
            <input
              v-model.number="form.hit_points_temp"
              class="input"
              type="number"
              min="0"
            />
          </label>
        </div>

        <div class="grid-4">
          <label class="field">
            <span>CA</span>
            <input
              v-model.number="form.armor_class"
              class="input"
              type="number"
              min="0"
            />
          </label>

          <label class="field">
            <span>Iniciativa</span>
            <input
              v-model.number="form.initiative"
              class="input"
              type="number"
            />
          </label>

          <label class="field">
            <span>Velocidad</span>
            <input
              v-model.number="form.speed"
              class="input"
              type="number"
              min="0"
            />
          </label>

          <label class="field">
            <span>B. competencia</span>
            <input
              v-model.number="form.proficiency_bonus"
              class="input"
              type="number"
              min="2"
            />
          </label>
        </div>

        <label class="check-row">
          <input v-model="form.inspiration" type="checkbox" />
          <span>Inspiración</span>
        </label>
      </div>

      <div class="card">
        <p class="section-title">Atributos</p>

        <div class="stats-grid">
          <label
            v-for="attr in ATTRIBUTES"
            :key="attr.key"
            class="stat-field"
          >
            <span>{{ attr.short || attr.label }}</span>
            <input
              v-model.number="form[attr.key]"
              class="input"
              type="number"
              min="1"
              max="30"
            />
          </label>
        </div>
      </div>

      <div class="card">
        <p class="section-title">Salvaciones</p>

        <div class="chips-grid">
          <label
            v-for="attr in ATTRIBUTES"
            :key="attr.key"
            :class="[
              'chip-check',
              { active: form.saving_throws_prof.includes(attr.key) },
            ]"
          >
            <input
              v-model="form.saving_throws_prof"
              :value="attr.key"
              type="checkbox"
            />
            <span>{{ attr.label }}</span>
          </label>
        </div>
      </div>

      <div class="card">
        <p class="section-title">Habilidades</p>

        <div class="skill-edit-list">
          <div v-for="sk in SKILLS" :key="sk.key" class="skill-edit-row">
            <span class="skill-name">
              {{ sk.label }}
              <span class="skill-attr">({{ attrShort(sk.attr) }})</span>
            </span>

            <label
              :class="[
                'mini-check',
                'prof-check',
                { active: form.skills_prof.includes(sk.key) },
              ]"
            >
              <input v-model="form.skills_prof" :value="sk.key" type="checkbox" />
              Prof.
            </label>

            <label
              :class="[
                'mini-check',
                'expert-check',
                { active: form.skills_expertise.includes(sk.key) },
              ]"
            >
              <input
                v-model="form.skills_expertise"
                :value="sk.key"
                type="checkbox"
              />
              Experto
            </label>
          </div>
        </div>
      </div>

      <div class="card">
        <p class="section-title">Ataques</p>

        <div
          v-for="(atk, i) in form.attacks_spellcasting"
          :key="i"
          class="array-box"
        >
          <div class="grid-4">
            <label class="field">
              <span>Nombre</span>
              <input v-model.trim="atk.name" class="input" />
            </label>

            <label class="field">
              <span>Bonus</span>
              <input v-model.trim="atk.bonus" class="input" placeholder="+5" />
            </label>

            <label class="field">
              <span>Daño</span>
              <input
                v-model.trim="atk.damage"
                class="input"
                placeholder="1d8+3"
              />
            </label>

            <label class="field">
              <span>Tipo</span>
              <input
                v-model.trim="atk.type"
                class="input"
                placeholder="Cortante"
              />
            </label>
          </div>

          <button
            type="button"
            class="btn btn-ghost small-btn"
            @click="removeAttack(i)"
          >
            Quitar ataque
          </button>
        </div>

        <button type="button" class="btn btn-secondary" @click="addAttack">
          + Agregar ataque
        </button>
      </div>

      <div class="card">
        <p class="section-title">Magia</p>

        <div class="grid-3">
          <label class="field">
            <span>Característica</span>
            <select v-model="form.spellcasting_ability" class="input">
              <option value="">No lanzador</option>
              <option
                v-for="a in SPELLCASTING_ABILITIES"
                :key="a.value"
                :value="a.value"
              >
                {{ a.label }}
              </option>
            </select>
          </label>

          <label class="field">
            <span>CD salvación</span>
            <input
              v-model.number="form.spell_save_dc"
              class="input"
              type="number"
              min="0"
            />
          </label>

          <label class="field">
            <span>Ataque conjuro</span>
            <input
              v-model.number="form.spell_attack_bonus"
              class="input"
              type="number"
            />
          </label>
        </div>

        <div class="spell-editor">
          <div class="spell-level-box">
            <div class="spell-level-head">
              <p class="spell-level-title">Trucos</p>
              <button
                type="button"
                class="btn btn-secondary small-btn"
                @click="addSpell('cantrips')"
              >
                + Agregar
              </button>
            </div>

            <div
              v-for="(spell, i) in form.spells.cantrips"
              :key="'cantrip-' + i"
              class="spell-row"
            >
              <input
                v-model.trim="form.spells.cantrips[i]"
                class="input"
                placeholder="Nombre del truco"
              />
              <button
                type="button"
                class="btn btn-ghost btn-icon"
                @click="removeSpell('cantrips', i)"
              >
                ×
              </button>
            </div>

            <p v-if="!form.spells.cantrips.length" class="empty-text">
              Sin trucos cargados.
            </p>
          </div>

          <div
            v-for="level in spellLevels"
            :key="level.key"
            class="spell-level-box"
          >
            <div class="spell-level-head">
              <p class="spell-level-title">{{ level.label }}</p>

              <button
                type="button"
                class="btn btn-secondary small-btn"
                @click="addSpell(level.key)"
              >
                + Agregar
              </button>
            </div>

            <div class="grid-2 spell-slots">
              <label class="field">
                <span>Slots totales</span>
                <input
                  v-model.number="form.spells[level.key].slots"
                  class="input"
                  type="number"
                  min="0"
                />
              </label>

              <label class="field">
                <span>Slots usados</span>
                <input
                  v-model.number="form.spells[level.key].slots_used"
                  class="input"
                  type="number"
                  min="0"
                />
              </label>
            </div>

            <div
              v-for="(spell, i) in form.spells[level.key].spells"
              :key="level.key + '-' + i"
              class="spell-row"
            >
              <input
                v-model.trim="form.spells[level.key].spells[i]"
                class="input"
                placeholder="Nombre del conjuro"
              />
              <button
                type="button"
                class="btn btn-ghost btn-icon"
                @click="removeSpell(level.key, i)"
              >
                ×
              </button>
            </div>

            <p v-if="!form.spells[level.key].spells.length" class="empty-text">
              Sin conjuros de {{ level.label.toLowerCase() }}.
            </p>
          </div>
        </div>
      </div>

      <div class="card">
        <p class="section-title">Equipo</p>

        <div class="grid-5">
          <label v-for="coin in coins" :key="coin.key" class="field">
            <span>{{ coin.label }}</span>
            <input
              v-model.number="form[coin.key]"
              class="input"
              type="number"
              min="0"
            />
          </label>
        </div>

        <label class="field">
          <span>Equipo</span>
          <textarea
            v-model.trim="equipmentText"
            class="input textarea"
            placeholder="Un objeto por línea"
          ></textarea>
        </label>

        <label class="field">
          <span>Tesoros & otros</span>
          <textarea v-model.trim="form.treasure" class="input textarea"></textarea>
        </label>
      </div>

      <div class="card">
        <p class="section-title">Rasgos, idiomas y competencias</p>

        <label class="field">
          <span>Rasgos & capacidades</span>
          <textarea
            v-model.trim="featuresText"
            class="input textarea"
            placeholder="Un rasgo por línea"
          ></textarea>
        </label>

        <label class="field">
          <span>Idiomas</span>
          <input
            v-model.trim="languageInput"
            class="input"
            placeholder="Escribí y apretá coma o Enter"
            @keydown="onLanguageKeydown"
          />
        </label>

        <div class="tag-row">
          <span v-for="l in form.languages" :key="l" class="tag">
            {{ l }}
            <button type="button" @click="removeTag('languages', l)">×</button>
          </span>
        </div>

        <label class="field">
          <span>Otras competencias</span>
          <input
            v-model.trim="profInput"
            class="input"
            placeholder="Escribí y apretá coma o Enter"
            @keydown="onProfKeydown"
          />
        </label>

        <div class="tag-row">
          <span v-for="p in form.other_proficiencies" :key="p" class="tag">
            {{ p }}
            <button type="button" @click="removeTag('other_proficiencies', p)">
              ×
            </button>
          </span>
        </div>
      </div>

      <div class="card">
        <p class="section-title">Trasfondo</p>

        <div class="grid-2">
          <label class="field">
            <span>Rasgos de personalidad</span>
            <textarea
              v-model.trim="form.personality_traits"
              class="input textarea"
            ></textarea>
          </label>

          <label class="field">
            <span>Ideales</span>
            <textarea v-model.trim="form.ideals" class="input textarea"></textarea>
          </label>

          <label class="field">
            <span>Vínculos</span>
            <textarea v-model.trim="form.bonds" class="input textarea"></textarea>
          </label>

          <label class="field">
            <span>Defectos</span>
            <textarea v-model.trim="form.flaws" class="input textarea"></textarea>
          </label>
        </div>

        <label class="field">
          <span>Historia</span>
          <textarea v-model.trim="form.backstory" class="input textarea big"></textarea>
        </label>
      </div>

      <div class="card">
        <p class="section-title">Apariencia</p>

        <div class="grid-3">
          <label class="field">
            <span>Edad</span>
            <input v-model.trim="form.age" class="input" />
          </label>

          <label class="field">
            <span>Altura</span>
            <input v-model.trim="form.height" class="input" />
          </label>

          <label class="field">
            <span>Peso</span>
            <input v-model.trim="form.weight" class="input" />
          </label>

          <label class="field">
            <span>Ojos</span>
            <input v-model.trim="form.eyes" class="input" />
          </label>

          <label class="field">
            <span>Piel</span>
            <input v-model.trim="form.skin" class="input" />
          </label>

          <label class="field">
            <span>Cabello</span>
            <input v-model.trim="form.hair" class="input" />
          </label>
        </div>

        <label class="field">
          <span>Notas de apariencia</span>
          <textarea
            v-model.trim="form.appearance_notes"
            class="input textarea"
          ></textarea>
        </label>
      </div>

      <div class="card">
        <p class="section-title">Alianzas</p>

        <label class="field">
          <span>Facción</span>
          <input v-model.trim="form.faction" class="input" />
        </label>

        <label class="field">
          <span>Aliados & organizaciones</span>
          <textarea
            v-model.trim="form.allies_organizations"
            class="input textarea"
          ></textarea>
        </label>
      </div>

      <button class="btn btn-primary submit-btn" type="submit" :disabled="saving">
        {{ saving ? 'Guardando...' : 'Guardar cambios' }}
      </button>
    </form>
  </div>

  <div v-else class="loading-screen">
    <div class="spinner"></div>
    <span>Cargando personaje...</span>
  </div>
</template>

<script>
import { charactersAPI } from '../services/api.js'
import {
  CLASSES,
  ATTRIBUTES,
  SKILLS,
  SPELLCASTING_ABILITIES
} from '../services/dndData.js'

function safeArray(value) {
  if (Array.isArray(value)) return value

  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  return []
}

export default {
  name: 'CharacterEditView',
  inject: ['showToast'],
  data() {
    return {
      loaded: false,
      saving: false,
      photoFile: null,
      photoPreview: '',
      equipmentText: '',
      featuresText: '',
      languageInput: '',
      profInput: '',
      CLASSES,
      ATTRIBUTES,
      SKILLS,
      SPELLCASTING_ABILITIES,
      spellLevels: [
        { key: 'level1', label: 'Nivel 1' },
        { key: 'level2', label: 'Nivel 2' },
        { key: 'level3', label: 'Nivel 3' },
        { key: 'level4', label: 'Nivel 4' },
        { key: 'level5', label: 'Nivel 5' },
        { key: 'level6', label: 'Nivel 6' },
        { key: 'level7', label: 'Nivel 7' },
        { key: 'level8', label: 'Nivel 8' },
        { key: 'level9', label: 'Nivel 9' }
      ],
      alignments: [
        'Legal bueno',
        'Neutral bueno',
        'Caótico bueno',
        'Legal neutral',
        'Neutral',
        'Caótico neutral',
        'Legal malvado',
        'Neutral malvado',
        'Caótico malvado'
      ],
      coins: [
        { key: 'copper_pieces', label: 'PC' },
        { key: 'silver_pieces', label: 'PP' },
        { key: 'electrum_pieces', label: 'PE' },
        { key: 'gold_pieces', label: 'PO' },
        { key: 'platinum_pieces', label: 'PPl' }
      ],
      form: {}
    }
  },
  computed: {
    id() {
      return this.$route.params.id
    }
  },
  async mounted() {
    try {
      const { data } = await charactersAPI.getFull(this.id)
      this.loadCharacter(data)
      this.loaded = true
    } catch {
      this.showToast('Error al cargar personaje', 'error')
      this.$router.back()
    }
  },
  methods: {
    emptySpells() {
      return {
        cantrips: [],
        level1: { slots: 0, slots_used: 0, spells: [] },
        level2: { slots: 0, slots_used: 0, spells: [] },
        level3: { slots: 0, slots_used: 0, spells: [] },
        level4: { slots: 0, slots_used: 0, spells: [] },
        level5: { slots: 0, slots_used: 0, spells: [] },
        level6: { slots: 0, slots_used: 0, spells: [] },
        level7: { slots: 0, slots_used: 0, spells: [] },
        level8: { slots: 0, slots_used: 0, spells: [] },
        level9: { slots: 0, slots_used: 0, spells: [] }
      }
    },

    normalizeSpells(value) {
      const base = this.emptySpells()

      if (!value) return base

      let parsed = value

      if (typeof value === 'string') {
        try {
          parsed = JSON.parse(value)
        } catch {
          return base
        }
      }

      if (!parsed || typeof parsed !== 'object') return base

      base.cantrips = Array.isArray(parsed.cantrips) ? parsed.cantrips : []

      for (let i = 1; i <= 9; i++) {
        const key = `level${i}`
        const level = parsed[key]

        if (level && typeof level === 'object') {
          base[key] = {
            slots: Number(level.slots || 0),
            slots_used: Number(level.slots_used || 0),
            spells: Array.isArray(level.spells) ? level.spells : []
          }
        }
      }

      return base
    },

    cleanSpellsBeforeSave() {
      const spells = this.normalizeSpells(this.form.spells)

      spells.cantrips = spells.cantrips
        .map(spell => String(spell).trim())
        .filter(Boolean)

      for (let i = 1; i <= 9; i++) {
        const key = `level${i}`

        spells[key].slots = Number(spells[key].slots || 0)
        spells[key].slots_used = Math.min(
          Number(spells[key].slots_used || 0),
          Number(spells[key].slots || 0)
        )

        spells[key].spells = spells[key].spells
          .map(spell => String(spell).trim())
          .filter(Boolean)
      }

      return spells
    },

    addSpell(levelKey) {
      if (levelKey === 'cantrips') {
        this.form.spells.cantrips.push('')
        return
      }

      this.form.spells[levelKey].spells.push('')
    },

    removeSpell(levelKey, index) {
      if (levelKey === 'cantrips') {
        this.form.spells.cantrips.splice(index, 1)
        return
      }

      this.form.spells[levelKey].spells.splice(index, 1)
    },

    loadCharacter(data) {
      this.form = {
        name: data.name || '',
        race: data.race || '',
        subrace: data.subrace || '',
        class: data.class || '',
        level: data.level || 1,
        background: data.background || '',
        alignment: data.alignment || '',
        experience_points: data.experience_points || 0,

        hit_points_current: data.hit_points_current || 0,
        hit_points_max: data.hit_points_max || 1,
        hit_points_temp: data.hit_points_temp || 0,
        armor_class: data.armor_class || 10,
        initiative: data.initiative || 0,
        speed: data.speed || 30,
        proficiency_bonus: data.proficiency_bonus || 2,
        inspiration: Boolean(data.inspiration),

        strength: data.strength || 10,
        dexterity: data.dexterity || 10,
        constitution: data.constitution || 10,
        intelligence: data.intelligence || 10,
        wisdom: data.wisdom || 10,
        charisma: data.charisma || 10,

        saving_throws_prof: safeArray(data.saving_throws_prof),
        skills_prof: safeArray(data.skills_prof),
        skills_expertise: safeArray(data.skills_expertise),

        attacks_spellcasting: safeArray(data.attacks_spellcasting),
        spellcasting_ability: data.spellcasting_ability || '',
        spell_save_dc: data.spell_save_dc || '',
        spell_attack_bonus: data.spell_attack_bonus || '',
        spells: this.normalizeSpells(data.spells),

        copper_pieces: data.copper_pieces || 0,
        silver_pieces: data.silver_pieces || 0,
        electrum_pieces: data.electrum_pieces || 0,
        gold_pieces: data.gold_pieces || 0,
        platinum_pieces: data.platinum_pieces || 0,
        equipment: safeArray(data.equipment),
        treasure: data.treasure || '',

        features_traits: safeArray(data.features_traits),
        languages: safeArray(data.languages),
        other_proficiencies: safeArray(data.other_proficiencies),

        personality_traits: data.personality_traits || '',
        ideals: data.ideals || '',
        bonds: data.bonds || '',
        flaws: data.flaws || '',
        backstory: data.backstory || '',

        age: data.age || '',
        height: data.height || '',
        weight: data.weight || '',
        eyes: data.eyes || '',
        skin: data.skin || '',
        hair: data.hair || '',
        appearance_notes: data.appearance_notes || '',

        faction: data.faction || '',
        allies_organizations: data.allies_organizations || ''
      }

      this.photoPreview = data.photo_url || ''

      this.equipmentText = this.form.equipment
        .map(item => {
          if (typeof item === 'string') return item
          return item.name || ''
        })
        .filter(Boolean)
        .join('\n')

      this.featuresText = this.form.features_traits
        .map(item => {
          if (typeof item === 'string') return item
          return item.name || ''
        })
        .filter(Boolean)
        .join('\n')
    },

    attrShort(attr) {
      const found = ATTRIBUTES.find(a => a.key === attr)
      if (found && found.short) return found.short
      return String(attr).toUpperCase().slice(0, 3)
    },

    onPhotoChange(event) {
      const file = event.target.files[0]
      if (!file) return

      this.photoFile = file
      this.photoPreview = URL.createObjectURL(file)
    },

    addAttack() {
      this.form.attacks_spellcasting.push({
        name: '',
        bonus: '',
        damage: '',
        type: ''
      })
    },

    removeAttack(index) {
      this.form.attacks_spellcasting.splice(index, 1)
    },

    onLanguageKeydown(event) {
      if (event.key === ',' || event.key === 'Enter') {
        event.preventDefault()
        this.addTag('languages', this.languageInput)
        this.languageInput = ''
      }
    },

    onProfKeydown(event) {
      if (event.key === ',' || event.key === 'Enter') {
        event.preventDefault()
        this.addTag('other_proficiencies', this.profInput)
        this.profInput = ''
      }
    },

    addTag(field, value) {
      const clean = String(value || '').replace(',', '').trim()
      if (!clean) return

      if (!this.form[field].includes(clean)) {
        this.form[field].push(clean)
      }
    },

    removeTag(field, value) {
      this.form[field] = this.form[field].filter(v => v !== value)
    },

    buildPayload() {
      this.addTag('languages', this.languageInput)
      this.addTag('other_proficiencies', this.profInput)

      this.form.equipment = this.equipmentText
        .split('\n')
        .map(v => v.trim())
        .filter(Boolean)

      this.form.features_traits = this.featuresText
        .split('\n')
        .map(v => v.trim())
        .filter(Boolean)
        .map(v => ({ name: v, description: '' }))

      this.form.spells = this.cleanSpellsBeforeSave()

      const fd = new FormData()

      Object.keys(this.form).forEach(key => {
        const value = this.form[key]

        if (value === null || value === undefined) return

        if (Array.isArray(value) || typeof value === 'object') {
          fd.append(key, JSON.stringify(value))
        } else {
          fd.append(key, value)
        }
      })

      if (this.photoFile) {
        fd.append('photo', this.photoFile)
      }

      return fd
    },

    async submitForm() {
      if (!this.form.name.trim()) {
        this.showToast('El nombre es obligatorio', 'error')
        return
      }

      if (!this.form.class) {
        this.showToast('La clase es obligatoria', 'error')
        return
      }

      this.saving = true

      try {
        const fd = this.buildPayload()
        await charactersAPI.update(this.id, fd)

        this.showToast('Personaje actualizado', 'success')
        this.$router.push(`/character/${this.id}`)
      } catch {
        this.showToast('Error al guardar cambios', 'error')
      } finally {
        this.saving = false
      }
    }
  }
}
</script>

<style scoped>
.form-view {
  padding-bottom: 2rem;
}

.form-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.form-title {
  flex: 1;
  text-align: center;
  font-family: var(--font-title);
  font-size: 1.1rem;
  color: var(--text-primary);
}

.char-form {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.72rem;
  font-family: var(--font-title);
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.input {
  width: 100%;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  padding: 0.55rem 0.65rem;
  font-family: inherit;
  font-size: 0.9rem;
  outline: none;
  text-transform: none;
  letter-spacing: normal;
}

.input:focus {
  border-color: var(--gold-dark);
  box-shadow: 0 0 0 1px rgba(217, 119, 6, 0.25);
}

.textarea {
  min-height: 5rem;
  resize: vertical;
}

.textarea.big {
  min-height: 9rem;
}

.grid-2,
.grid-3,
.grid-4,
.grid-5 {
  display: grid;
  gap: 0.55rem;
}

.grid-2 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.grid-3 {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.grid-4 {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.grid-5 {
  grid-template-columns: repeat(5, minmax(0, 1fr));
}

.photo-picker {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.photo-preview {
  width: 4.5rem;
  height: 4.5rem;
  flex-shrink: 0;
}

.preview-img,
.preview-placeholder {
  width: 4.5rem;
  height: 4.5rem;
  border-radius: 50%;
  border: 2px solid var(--gold-dark);
}

.preview-img {
  object-fit: cover;
}

.preview-placeholder {
  background: var(--bg-surface);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-title);
  font-size: 1.6rem;
  color: var(--gold);
  text-transform: uppercase;
}

.file-btn input {
  display: none;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 0.45rem;
}

.stat-field {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  font-family: var(--font-title);
  font-size: 0.65rem;
  color: var(--text-muted);
  text-transform: uppercase;
}

.stat-field .input {
  text-align: center;
  padding: 0.45rem 0.25rem;
}

.chips-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.chip-check,
.check-row {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  color: var(--text-secondary);
  font-size: 0.85rem;
  cursor: pointer;
}

.chip-check {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 0.35rem 0.6rem;
}

.chip-check input {
  display: none;
}

.chip-check.active {
  color: var(--bg-deep);
  border-color: var(--gold);
  background: linear-gradient(135deg, var(--gold-dark), var(--gold));
  box-shadow: var(--shadow-gold);
}

.mini-check {
  position: relative;
  border: 1px solid var(--border);
  background: var(--bg-surface);
  border-radius: 999px;
  padding: 0.28rem 0.55rem;
  font-family: var(--font-title);
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
  cursor: pointer;
  transition:
    background 0.2s,
    border-color 0.2s,
    color 0.2s,
    box-shadow 0.2s;
}

.mini-check input {
  display: none;
}

.mini-check.active {
  color: var(--bg-deep);
  border-color: var(--gold);
  background: linear-gradient(135deg, var(--gold-dark), var(--gold));
  box-shadow: var(--shadow-gold);
}

.expert-check.active {
  border-color: var(--gold-light);
  background: linear-gradient(135deg, var(--gold), var(--gold-light));
}

.skill-edit-list {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.skill-edit-row {
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0;
  border-bottom: 1px solid var(--bg-deep);
}

.skill-name {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.skill-attr {
  color: var(--text-dim);
  font-size: 0.72rem;
}

.array-box {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 0.55rem;
  margin-bottom: 0.5rem;
}

.small-btn {
  margin-top: 0.45rem;
  font-size: 0.75rem;
  padding: 0.35rem 0.55rem;
}

.spell-editor {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  margin-top: 0.75rem;
}

.spell-level-box {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 0.65rem;
}

.spell-level-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.spell-level-title {
  font-family: var(--font-title);
  font-size: 0.8rem;
  color: var(--gold-light);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.spell-slots {
  margin-bottom: 0.5rem;
}

.spell-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.4rem;
  align-items: center;
  margin-bottom: 0.4rem;
}

.spell-row:last-child {
  margin-bottom: 0;
}

.empty-text {
  font-size: 0.78rem;
  color: var(--text-muted);
  font-style: italic;
  margin-top: 0.3rem;
}

.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin: 0.4rem 0 0.6rem;
}

.tag {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  background: rgba(124, 58, 237, 0.1);
  border: 1px solid var(--purple);
  border-radius: 999px;
  color: #a78bfa;
  padding: 0.2rem 0.55rem;
  font-size: 0.78rem;
}

.tag button {
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
}

.submit-btn {
  width: 100%;
  justify-content: center;
  margin-top: 0.25rem;
}

@media (max-width: 720px) {
  .grid-2,
  .grid-3,
  .grid-4,
  .grid-5 {
    grid-template-columns: 1fr;
  }

  .stats-grid {
    grid-template-columns: repeat(3, 1fr);
  }

  .skill-edit-row {
    grid-template-columns: 1fr;
    align-items: flex-start;
  }

  .spell-row {
    grid-template-columns: 1fr auto;
  }
}
</style>
<template>
  <div class="char-card" @click="$emit('click')">
    <div class="char-avatar">
      <img
        v-if="character.photo_url"
        :src="character.photo_url"
        :alt="character.name"
        class="avatar-img"
      />
      <div v-else class="avatar-placeholder">{{ character.name[0] }}</div>

      <div class="hp-badge" :class="hpClass">
        {{ character.hit_points_current }}/{{ character.hit_points_max }}
      </div>
    </div>

    <div class="char-info">
      <h3 class="char-name">{{ character.name }}</h3>
      <p class="char-subtitle">
        <span class="badge badge-gold">Nv.{{ character.level }}</span>
        {{ character.race }} · {{ classLabel }}
      </p>
      <p class="char-bg" v-if="character.background">
        {{ character.background }}
      </p>
    </div>

    <div class="char-actions">
      <button
        class="pdf-btn"
        type="button"
        title="Descargar PDF"
        :disabled="downloadingPdf"
        @click.stop="downloadPdf"
      >
        {{ downloadingPdf ? '...' : 'PDF' }}
      </button>

      <span class="action-arrow">›</span>
    </div>
  </div>
</template>

<script>
import jsPDF from 'jspdf'
import { CLASSES, ATTRIBUTES, SKILLS, getModifier, formatModifier } from '../services/dndData.js'
import { charactersAPI } from '../services/api.js'

export default {
  name: 'CharacterCard',
  emits: ['click'],
  props: {
    character: { type: Object, required: true }
  },
  data() {
    return {
      downloadingPdf: false
    }
  },
  computed: {
    classLabel() {
      const cls = CLASSES.find(c => c.value === this.character.class)
      return cls ? cls.label : this.character.class
    },
    hpClass() {
      const max = this.character.hit_points_max || 1
      const pct = this.character.hit_points_current / max

      if (pct > 0.5) return 'hp-ok'
      if (pct > 0.25) return 'hp-warn'
      return 'hp-danger'
    }
  },
  methods: {
    safeArray(value) {
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
    },

    getCharacterId() {
      return this.character.id || this.character.character_id || this.character.characterId
    },

    getClassLabel(value) {
      const cls = CLASSES.find(c => c.value === value)
      return cls ? cls.label : value || '—'
    },

    getAttrLabel(key) {
      const attr = ATTRIBUTES.find(a => a.key === key)
      return attr ? attr.label : key
    },

    getSkillLabel(key) {
      const sk = SKILLS.find(s => s.key === key)
      return sk ? sk.label : key
    },

    getSkillBonus(character, sk) {
      const skillsProf = this.safeArray(character.skills_prof)
      const skillsExpertise = this.safeArray(character.skills_expertise)

      const mod = getModifier(character?.[sk.attr] || 10)
      const pb = character?.proficiency_bonus || 2

      let bonus = mod
      if (skillsExpertise.includes(sk.key)) bonus += pb * 2
      else if (skillsProf.includes(sk.key)) bonus += pb

      return formatModifier(bonus)
    },

    addSection(doc, title, y) {
      if (y > 260) {
        doc.addPage()
        y = 18
      }

      doc.setFillColor(42, 36, 27)
      doc.rect(14, y, 182, 8, 'F')

      doc.setTextColor(245, 198, 102)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.text(title.toUpperCase(), 18, y + 5.5)

      doc.setTextColor(35, 35, 35)

      return y + 14
    },

    addTextBlock(doc, text, x, y, maxWidth = 178, lineHeight = 5) {
      if (!text) return y

      const lines = doc.splitTextToSize(String(text), maxWidth)

      lines.forEach(line => {
        if (y > 280) {
          doc.addPage()
          y = 18
        }

        doc.text(line, x, y)
        y += lineHeight
      })

      return y
    },

    addKeyValue(doc, label, value, x, y, width = 85) {
      if (y > 280) {
        doc.addPage()
        y = 18
      }

      doc.setFont('helvetica', 'bold')
      doc.setTextColor(80, 70, 55)
      doc.text(label + ': ', x, y)

      doc.setFont('helvetica', 'normal')
      doc.setTextColor(35, 35, 35)

      const labelWidth = doc.getTextWidth(label + ': ')
      const text = value === null || value === undefined || value === '' ? '—' : String(value)
      const lines = doc.splitTextToSize(text, width - labelWidth)

      doc.text(lines, x + labelWidth, y)

      return y + Math.max(6, lines.length * 5)
    },

    async downloadPdf() {
      const id = this.getCharacterId()

      if (!id) {
        alert('No se encontró el ID del personaje.')
        return
      }

      this.downloadingPdf = true

      try {
        const { data } = await charactersAPI.getFull(id)
        const c = data

        const doc = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4'
        })

        const pageWidth = doc.internal.pageSize.getWidth()

        const attacks = this.safeArray(c.attacks_spellcasting)
        const equipment = this.safeArray(c.equipment)
        const features = this.safeArray(c.features_traits)
        const languages = this.safeArray(c.languages)
        const otherProfs = this.safeArray(c.other_proficiencies)
        const savingThrows = this.safeArray(c.saving_throws_prof)
        const skillsProf = this.safeArray(c.skills_prof)
        const skillsExpertise = this.safeArray(c.skills_expertise)

        let y = 18

        doc.setFillColor(31, 27, 20)
        doc.rect(0, 0, pageWidth, 34, 'F')

        doc.setTextColor(245, 198, 102)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(22)
        doc.text(c.name || 'Personaje', 14, 16)

        doc.setFontSize(10)
        doc.setTextColor(230, 220, 200)
        doc.text(
          `${c.race || '—'}${c.subrace ? ` (${c.subrace})` : ''} · ${this.getClassLabel(c.class)} · Nivel ${c.level || 1}`,
          14,
          24
        )

        if (c.background || c.alignment) {
          doc.text(`${c.background || '—'} · ${c.alignment || '—'}`, 14, 30)
        }

        y = 44

        y = this.addSection(doc, 'Datos principales', y)
        doc.setFontSize(9)

        y = this.addKeyValue(doc, 'Nombre', c.name, 16, y)
        y = this.addKeyValue(doc, 'Raza', `${c.race || '—'}${c.subrace ? ` (${c.subrace})` : ''}`, 16, y)
        y = this.addKeyValue(doc, 'Clase', this.getClassLabel(c.class), 16, y)
        y = this.addKeyValue(doc, 'Nivel', c.level, 16, y)
        y = this.addKeyValue(doc, 'Trasfondo', c.background, 16, y)
        y = this.addKeyValue(doc, 'Alineamiento', c.alignment, 16, y)
        y = this.addKeyValue(doc, 'XP', c.experience_points || 0, 16, y)

        y += 3
        y = this.addSection(doc, 'Combate', y)

        const combat = [
          ['PV', `${c.hit_points_current || 0}/${c.hit_points_max || 0}`],
          ['PV temp.', c.hit_points_temp || 0],
          ['CA', c.armor_class || '—'],
          ['Iniciativa', formatModifier(c.initiative || 0)],
          ['Velocidad', `${c.speed || 0} ft`],
          ['B. competencia', formatModifier(c.proficiency_bonus || 2)]
        ]

        let x = 16
        combat.forEach((item, index) => {
          if (index > 0 && index % 3 === 0) {
            x = 16
            y += 16
          }

          doc.setFillColor(245, 242, 235)
          doc.roundedRect(x, y, 55, 11, 2, 2, 'F')

          doc.setFont('helvetica', 'bold')
          doc.setTextColor(80, 70, 55)
          doc.setFontSize(7)
          doc.text(item[0].toUpperCase(), x + 3, y + 4)

          doc.setFontSize(11)
          doc.setTextColor(35, 35, 35)
          doc.text(String(item[1]), x + 3, y + 9)

          x += 60
        })

        y += 20
        y = this.addSection(doc, 'Atributos', y)

        x = 16
        ATTRIBUTES.forEach(attr => {
          const value = c[attr.key] || 10
          const mod = formatModifier(getModifier(value))

          doc.setFillColor(245, 242, 235)
          doc.roundedRect(x, y, 26, 18, 2, 2, 'F')

          doc.setFont('helvetica', 'bold')
          doc.setTextColor(80, 70, 55)
          doc.setFontSize(7)
          doc.text((attr.short || attr.label).toUpperCase(), x + 13, y + 5, { align: 'center' })

          doc.setFontSize(13)
          doc.setTextColor(35, 35, 35)
          doc.text(String(value), x + 13, y + 11, { align: 'center' })

          doc.setFontSize(8)
          doc.setTextColor(120, 105, 80)
          doc.text(mod, x + 13, y + 16, { align: 'center' })

          x += 30
        })

        y += 28
        y = this.addSection(doc, 'Salvaciones y habilidades', y)

        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(80, 70, 55)
        doc.text('Salvaciones competentes: ', 16, y)

        doc.setFont('helvetica', 'normal')
        doc.setTextColor(35, 35, 35)

        const savesText = savingThrows.length
          ? savingThrows.map(this.getAttrLabel).join(', ')
          : 'Ninguna'

        y = this.addTextBlock(doc, savesText, 16, y + 6, 178)

        y += 3

        doc.setFont('helvetica', 'bold')
doc.setTextColor(80, 70, 55)
doc.text('Habilidades: ', 16, y)

y += 6

doc.setFont('helvetica', 'italic')
doc.setTextColor(120, 105, 80)
doc.text('[P] Competente   [E] Experto   [ ] Sin competencia', 18, y)
y += 7

doc.setFont('helvetica', 'normal')
doc.setTextColor(35, 35, 35)

        SKILLS.forEach(sk => {
          if (y > 276) {
            doc.addPage()
            y = 18
          }

          const isProf = skillsProf.includes(sk.key)
const isExpert = skillsExpertise.includes(sk.key)
const mark = isExpert ? '[E]' : isProf ? '[P]' : '[ ]'

doc.text(
  `${mark} ${sk.label} (${this.getAttrLabel(sk.attr)}) ${this.getSkillBonus(c, sk)}`,
  18,
  y
)

          y += 5
        })

        y += 3
        y = this.addSection(doc, 'Ataques', y)

        doc.setFontSize(9)
        if (attacks.length) {
          attacks.forEach(atk => {
            const line = `${atk.name || 'Ataque'} · ${atk.bonus || '+0'} · ${atk.damage || '—'} ${atk.type || ''}`
            y = this.addTextBlock(doc, line, 16, y, 178)
            y += 2
          })
        } else {
          y = this.addTextBlock(doc, 'Sin ataques registrados.', 16, y, 178)
        }

        y += 3
        y = this.addSection(doc, 'Magia', y)

        y = this.addKeyValue(doc, 'Característica', this.getAttrLabel(c.spellcasting_ability), 16, y)
        y = this.addKeyValue(doc, 'CD salvación', c.spell_save_dc, 16, y)
        y = this.addKeyValue(doc, 'Ataque conjuro', c.spell_attack_bonus ? `+${c.spell_attack_bonus}` : '—', 16, y)

        if (c.spells_notes) {
          y += 2
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(80, 70, 55)
          doc.text('Conjuros / notas: ', 16, y)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(35, 35, 35)
          y = this.addTextBlock(doc, c.spells_notes, 16, y + 6, 178)
        }

        y += 3
        y = this.addSection(doc, 'Equipo', y)

        y = this.addKeyValue(doc, 'PC', c.copper_pieces || 0, 16, y)
        y = this.addKeyValue(doc, 'PP', c.silver_pieces || 0, 16, y)
        y = this.addKeyValue(doc, 'PE', c.electrum_pieces || 0, 16, y)
        y = this.addKeyValue(doc, 'PO', c.gold_pieces || 0, 16, y)
        y = this.addKeyValue(doc, 'PPl', c.platinum_pieces || 0, 16, y)

        y += 2
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(80, 70, 55)
        doc.text('Equipo: ', 16, y)

        doc.setFont('helvetica', 'normal')
        doc.setTextColor(35, 35, 35)

        const equipmentText = equipment.length
          ? equipment
              .map(item => {
                if (typeof item === 'string') return item
                return `${item.name || 'Objeto'}${item.qty ? ` x${item.qty}` : ''}`
              })
              .join('\n')
          : 'Sin equipo registrado.'

        y = this.addTextBlock(doc, equipmentText, 16, y + 6, 178)

        if (c.treasure) {
          y += 2
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(80, 70, 55)
          doc.text('Tesoros: ', 16, y)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(35, 35, 35)
          y = this.addTextBlock(doc, c.treasure, 16, y + 6, 178)
        }

        y += 3
        y = this.addSection(doc, 'Rasgos, idiomas y competencias', y)

        if (features.length) {
          features.forEach(feat => {
            const name = typeof feat === 'string' ? feat : feat.name
            const desc = typeof feat === 'string' ? '' : feat.description

            doc.setFont('helvetica', 'bold')
            doc.setTextColor(80, 70, 55)
            y = this.addTextBlock(doc, name || 'Rasgo', 16, y, 178)

            if (desc) {
              doc.setFont('helvetica', 'normal')
              doc.setTextColor(35, 35, 35)
              y = this.addTextBlock(doc, desc, 18, y, 174)
            }

            y += 2
          })
        } else {
          y = this.addTextBlock(doc, 'Sin rasgos registrados.', 16, y, 178)
        }

        y += 2
        y = this.addKeyValue(doc, 'Idiomas', languages.length ? languages.join(', ') : '—', 16, y)
        y = this.addKeyValue(doc, 'Competencias', otherProfs.length ? otherProfs.join(', ') : '—', 16, y)

        y += 3
        y = this.addSection(doc, 'Trasfondo', y)

        y = this.addKeyValue(doc, 'Rasgos personalidad', c.personality_traits, 16, y, 178)
        y = this.addKeyValue(doc, 'Ideales', c.ideals, 16, y, 178)
        y = this.addKeyValue(doc, 'Vínculos', c.bonds, 16, y, 178)
        y = this.addKeyValue(doc, 'Defectos', c.flaws, 16, y, 178)

        if (c.backstory) {
          y += 2
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(80, 70, 55)
          doc.text('Historia: ', 16, y)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(35, 35, 35)
          y = this.addTextBlock(doc, c.backstory, 16, y + 6, 178)
        }

        y += 3
        y = this.addSection(doc, 'Apariencia', y)

        y = this.addKeyValue(doc, 'Edad', c.age, 16, y)
        y = this.addKeyValue(doc, 'Altura', c.height, 16, y)
        y = this.addKeyValue(doc, 'Peso', c.weight, 16, y)
        y = this.addKeyValue(doc, 'Ojos', c.eyes, 16, y)
        y = this.addKeyValue(doc, 'Piel', c.skin, 16, y)
        y = this.addKeyValue(doc, 'Cabello', c.hair, 16, y)

        if (c.appearance_notes) {
          y += 2
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(80, 70, 55)
          doc.text('Notas de apariencia: ', 16, y)
          doc.setFont('helvetica', 'normal')
          doc.setTextColor(35, 35, 35)
          y = this.addTextBlock(doc, c.appearance_notes, 16, y + 6, 178)
        }

        y += 3
        y = this.addSection(doc, 'Alianzas', y)

        y = this.addKeyValue(doc, 'Facción', c.faction, 16, y, 178)
        y = this.addKeyValue(doc, 'Aliados', c.allies_organizations, 16, y, 178)

        const pageCount = doc.internal.getNumberOfPages()

        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i)
          doc.setFontSize(8)
          doc.setTextColor(130, 120, 105)
          doc.text(
            `${c.name || 'Personaje'} · Página ${i} de ${pageCount}`,
            pageWidth / 2,
            290,
            { align: 'center' }
          )
        }

        const filename = `${String(c.name || 'personaje')
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-_]/g, '')}.pdf`

        doc.save(filename)
      } catch (error) {
        console.error(error)
        alert('No se pudo generar el PDF del personaje.')
      } finally {
        this.downloadingPdf = false
      }
    }
  }
}
</script>

<style scoped>
.char-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 0.75rem;
  cursor: pointer;
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
  position: relative;
  overflow: hidden;
}

.char-card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: linear-gradient(to bottom, var(--gold-dark), var(--gold));
  opacity: 0;
  transition: opacity 0.2s;
}

.char-card:hover {
  border-color: var(--gold-dark);
  box-shadow: var(--shadow-gold);
}

.char-card:hover::before {
  opacity: 1;
}

.char-card:active {
  transform: scale(0.99);
}

.char-avatar {
  position: relative;
  flex-shrink: 0;
}

.avatar-img {
  width: 3.5rem;
  height: 3.5rem;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--border);
}

.avatar-placeholder {
  width: 3.5rem;
  height: 3.5rem;
  border-radius: 50%;
  background: var(--bg-surface);
  border: 2px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-title);
  font-size: 1.4rem;
  color: var(--gold);
  text-transform: uppercase;
}

.hp-badge {
  position: absolute;
  bottom: -4px;
  right: -4px;
  font-size: 0.6rem;
  font-family: var(--font-title);
  font-weight: 700;
  padding: 0.1rem 0.3rem;
  border-radius: 999px;
  border: 1px solid;
  white-space: nowrap;
}

.hp-ok {
  background: rgba(22, 163, 74, 0.2);
  color: #4ade80;
  border-color: var(--green);
}

.hp-warn {
  background: rgba(202, 138, 4, 0.2);
  color: #fbbf24;
  border-color: #ca8a04;
}

.hp-danger {
  background: rgba(185, 28, 28, 0.2);
  color: #f87171;
  border-color: var(--red);
}

.char-info {
  flex: 1;
  min-width: 0;
}

.char-name {
  font-family: var(--font-title);
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.char-subtitle {
  font-size: 0.82rem;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 0.3rem;
  flex-wrap: wrap;
  margin-top: 0.2rem;
}

.char-bg {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-top: 0.1rem;
  font-style: italic;
}

.char-actions {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 0.45rem;
}

.pdf-btn {
  border: 1px solid var(--gold-dark);
  background: rgba(217, 119, 6, 0.12);
  color: var(--gold-light);
  border-radius: 999px;
  padding: 0.35rem 0.55rem;
  font-family: var(--font-title);
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  cursor: pointer;
  transition:
    background 0.2s,
    border-color 0.2s,
    color 0.2s,
    transform 0.2s;
}

.pdf-btn:hover {
  background: linear-gradient(135deg, var(--gold-dark), var(--gold));
  border-color: var(--gold);
  color: var(--bg-deep);
  transform: translateY(-1px);
}

.pdf-btn:disabled {
  opacity: 0.6;
  cursor: wait;
  transform: none;
}

.action-arrow {
  font-size: 1.5rem;
  color: var(--text-dim);
  line-height: 1;
}
</style>
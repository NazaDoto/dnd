<template>
  <div class="full-view" v-if="character">
    <div class="full-header">
      <button type="button" class="btn btn-ghost btn-icon" @click="$router.back()">‹</button>
      <h2 class="full-title">Ficha completa</h2>
      <div class="full-header-actions">
        <template v-if="isDmCampaignReader">
          <RouterLink
            :to="`/dm/campaign/${campaignId}`"
            class="btn btn-ghost"
            style="font-size: 0.78rem; padding: 0.4rem 0.7rem"
          >
            Campaña
          </RouterLink>
          <button
            type="button"
            class="btn btn-secondary"
            style="font-size: 0.78rem; padding: 0.4rem 0.7rem"
            @click="downloadDmPdf"
          >
            PDF
          </button>
        </template>
      </div>
    </div>

    <div class="full-layout">
      <aside class="full-sidebar">
        <div class="sidebar-title card">
          <p class="sidebar-name">{{ character.name }}</p>
          <p class="sidebar-meta">
            {{ character.race }}
            <span v-if="character.subrace"> ({{ character.subrace }})</span>
            · {{ character.class }} Nv.{{ character.level }}
          </p>
        </div>
        <div class="tabs">
          <button v-for="tab in tabs" :key="tab.id" :class="['tab-btn', { active: activeTab === tab.id }]"
            @click="activeTab = tab.id">
            {{ tab.label }}
          </button>
        </div>
      </aside>
      <section class="full-content">
      <div class="quick-states-wrap card">
        <div class="quick-state-grid">
          <button type="button" class="state-pill" @click="startFieldEdit('state_hp', character.hit_points_current)">
            <span class="state-head"><span class="state-key">PV</span><span class="state-edit">✎</span></span>
            <span class="state-val">{{ character.hit_points_current }}/{{ character.hit_points_max }}</span>
          </button>
          <button type="button" class="state-pill" @click="startFieldEdit('state_ac', character.armor_class)">
            <span class="state-head"><span class="state-key">CA</span><span class="state-edit">✎</span></span>
            <span class="state-val">{{ character.armor_class ?? '-' }}</span>
          </button>
          <button type="button" class="state-pill" @click="startFieldEdit('state_ini', character.initiative)">
            <span class="state-head"><span class="state-key">Iniciativa</span><span class="state-edit">✎</span></span>
            <span class="state-val">{{ fmtMod(character.initiative) }}</span>
          </button>
          <button type="button" class="state-pill" @click="startFieldEdit('state_speed', character.speed)">
            <span class="state-head"><span class="state-key">Velocidad</span><span class="state-edit">✎</span></span>
            <span class="state-val">{{ character.speed }}ft</span>
          </button>
          <button type="button" class="state-pill" @click="startFieldEdit('state_prof', character.proficiency_bonus)">
            <span class="state-head"><span class="state-key">Prof</span><span class="state-edit">✎</span></span>
            <span class="state-val">{{ fmtMod(character.proficiency_bonus) }}</span>
          </button>
          <button type="button" class="state-pill" @click="startFieldEdit('state_insp', character.inspiration ? 'Si' : 'No')">
            <span class="state-head"><span class="state-key">Insp</span><span class="state-edit">✎</span></span>
            <span class="state-val">{{ character.inspiration ? 'Si' : 'No' }}</span>
          </button>
          <button type="button" class="state-pill" @click="startFieldEdit('state_passive', character.passive_perception)">
            <span class="state-head"><span class="state-key">P. Pasiva</span><span class="state-edit">✎</span></span>
            <span class="state-val">{{ character.passive_perception ?? '-' }}</span>
          </button>
          <button type="button" class="state-pill" @click="startFieldEdit('state_xp', character.experience_points)">
            <span class="state-head"><span class="state-key">XP</span><span class="state-edit">✎</span></span>
            <span class="state-val">{{ character.experience_points || 0 }}</span>
          </button>
        </div>
        <div v-if="fieldEditKey && fieldEditKey.startsWith('state_')" class="inline-state-editor">
          <input v-model="fieldDraft" @keydown.enter.prevent="saveFieldEdit" />
          <button type="button" class="icon-action save" @click="saveFieldEdit" title="Guardar">✓</button>
          <button type="button" class="icon-action cancel" @click="cancelFieldEdit" title="Cancelar">✕</button>
        </div>
      </div>

    <!-- ── PESTAÑA: Habilidades ── -->
    <div v-if="activeTab === 'skills'" class="tab-content">
      <div class="card mb-4">
        <div class="section-title-row">
          <p class="section-title">Salvaciones</p>
          <div class="mini-edit-actions">
            <button v-if="!isEditing('skills_saves')" type="button" class="icon-action edit" @click="startFieldEdit('skills_saves', (character.saving_throws_prof || []).join(', '))">✎</button>
            <template v-else>
              <button type="button" class="icon-action save" @click="saveFieldEdit">✓</button>
              <button type="button" class="icon-action cancel" @click="cancelFieldEdit">✕</button>
            </template>
          </div>
        </div>
        <div class="skill-list">
          <label v-for="attr in ATTRIBUTES" :key="attr.key" class="skill-row skill-row-editable">
            <template v-if="!isEditing('skills_saves')">
              <span :class="['prof-dot', hasSavingThrow(attr.key) ? 'filled' : '']"></span>
              <span class="skill-name">{{ attr.label }}</span>
              <span class="skill-bonus">{{ getSavingThrowBonus(attr.key) }}</span>
            </template>
            <template v-else>
              <input
                type="checkbox"
                :checked="Array.isArray(fieldDraft) && fieldDraft.includes(attr.key)"
                @change="toggleDraftRootArrayValue(attr.key)"
              />
              <span class="skill-name">{{ attr.label }}</span>
              <span class="skill-bonus">{{ getSavingThrowBonus(attr.key) }}</span>
            </template>
          </label>
        </div>
      </div>
      <div class="card">
        <div class="section-title-row">
          <p class="section-title">Habilidades</p>
          <div class="mini-edit-actions">
            <button v-if="!isEditing('skills_skills')" type="button" class="icon-action edit" @click="startFieldEdit('skills_skills', `${(character.skills_prof || []).join(', ')}\n---\n${(character.skills_expertise || []).join(', ')}`)">✎</button>
            <template v-else>
              <button type="button" class="icon-action save" @click="saveFieldEdit">✓</button>
              <button type="button" class="icon-action cancel" @click="cancelFieldEdit">✕</button>
            </template>
          </div>
        </div>
        <div class="skill-list">
          <label v-for="sk in SKILLS" :key="sk.key" class="skill-row skill-row-editable">
            <template v-if="!isEditing('skills_skills')">
              <span :class="[
                'prof-dot',
                hasExpertise(sk.key)
                  ? 'expertise'
                  : hasSkill(sk.key)
                    ? 'filled'
                    : '',
              ]"></span>
              <span class="skill-name">{{ sk.label }}
                <span class="skill-attr">({{ attrShort(sk.attr) }})</span></span>
              <span class="skill-bonus">{{ getSkillBonus(sk) }}</span>
            </template>
            <template v-else>
              <div class="skills-check-wrap">
                <input
                  type="checkbox"
                  :checked="fieldDraft?.prof?.includes(sk.key)"
                  @change="toggleDraftArrayValue('prof', sk.key)"
                  title="Proficiencia"
                />
                <input
                  type="checkbox"
                  :checked="fieldDraft?.expertise?.includes(sk.key)"
                  @change="toggleDraftArrayValue('expertise', sk.key)"
                  title="Experticia"
                />
              </div>
              <span class="skill-name">{{ sk.label }} <span class="skill-attr">({{ attrShort(sk.attr) }})</span></span>
              <span class="skill-bonus">{{ getSkillBonus(sk) }}</span>
            </template>
          </label>
        </div>
        <p v-if="isEditing('skills_skills')" class="form-label mt-2">Izquierda = proficiencia, derecha = experticia.</p>
      </div>
    </div>

    <!-- ── PESTAÑA: Combate ── -->
    <div v-if="activeTab === 'combat'" class="tab-content">
      <div class="card mb-4">
        <div class="section-title-row">
          <p class="section-title">Ataques</p>
          <div class="mini-edit-actions">
            <button v-if="!isEditing('combat_attacks')" type="button" class="icon-action edit" @click="startFieldEdit('combat_attacks')">✎</button>
            <template v-else>
              <button type="button" class="icon-action save" @click="saveFieldEdit">✓</button>
              <button type="button" class="icon-action cancel" @click="cancelFieldEdit">✕</button>
            </template>
          </div>
        </div>
        <div v-if="isEditing('combat_attacks')" class="inline-editor">
          <div v-for="(atk, i) in fieldDraft" :key="'edit-atk-'+i" class="attack-edit-row">
            <input v-model="atk.name" placeholder="Nombre del ataque" />
            <input v-model="atk.bonus" placeholder="+5" />
            <input v-model="atk.damage" placeholder="1d8+3" />
            <input v-model="atk.type" placeholder="Cortante/Fuego..." />
            <button type="button" class="icon-action cancel" @click="removeDraftAttack(i)">✕</button>
          </div>
          <button type="button" class="btn-secondary" @click="addDraftAttack">+ Agregar ataque</button>
        </div>
        <div v-if="!isEditing('combat_attacks') && attacks.length" class="attacks-list">
          <div v-for="(atk, i) in attacks" :key="i" class="attack-row">
            <span class="atk-name">{{ atk.name || "Ataque " + (i + 1) }}</span>
            <span class="atk-bonus badge badge-gold">{{
              atk.bonus || "+0"
            }}</span>
            <span class="atk-dmg">{{ atk.damage || "—" }}</span>
            <span class="atk-type text-muted" style="font-size: 0.72rem">{{
              atk.type || ""
            }}</span>
          </div>
        </div>
        <p v-else-if="!isEditing('combat_attacks')" class="text-muted" style="font-size: 0.85rem">
          Sin ataques registrados
        </p>
      </div>
      <div class="card mb-4">
        <div class="section-title-row">
          <p class="section-title">Lanzamiento de Conjuros</p>
          <div class="mini-edit-actions">
            <button v-if="!isEditing('combat_spellcasting')" type="button" class="icon-action edit" @click="startFieldEdit('combat_spellcasting')">✎</button>
            <template v-else>
              <button type="button" class="icon-action save" @click="saveFieldEdit">✓</button>
              <button type="button" class="icon-action cancel" @click="cancelFieldEdit">✕</button>
            </template>
          </div>
        </div>
        <div v-if="isEditing('combat_spellcasting')" class="inline-editor">
          <select v-model="fieldDraft.spellcasting_ability">
            <option value="">Sin habilidad</option>
            <option v-for="ab in SPELLCASTING_ABILITIES" :key="'ab-' + ab.value" :value="ab.value">
              {{ ab.label }}
            </option>
          </select>
          <div class="two-col">
            <input v-model.number="fieldDraft.spell_save_dc" type="number" min="0" placeholder="CD de salvación" />
            <input v-model.number="fieldDraft.spell_attack_bonus" type="number" placeholder="Bonus de ataque" />
          </div>
        </div>
        <div v-if="!isEditing('combat_spellcasting') && character.spellcasting_ability" class="spell-meta">
          <div class="spell-meta-box">
            <span class="smb-val">{{ character.spell_save_dc || "—" }}</span>
            <span class="smb-lbl">CD Salvación</span>
          </div>
          <div class="spell-meta-box">
            <span class="smb-val">{{
              character.spell_attack_bonus
                ? "+" + character.spell_attack_bonus
                : "—"
            }}</span>
            <span class="smb-lbl">Ataque Conjuro</span>
          </div>
          <div class="spell-meta-box">
            <span class="smb-val">{{ abilityLabel }}</span>
            <span class="smb-lbl">Característica</span>
          </div>
        </div>
        <p v-else-if="!isEditing('combat_spellcasting')" class="text-muted" style="font-size: 0.85rem">
          Personaje no lanzador
        </p>
      </div>
      <div class="card" v-if="visibleSpellBlocks.length">
        <div class="section-title-row">
          <p class="section-title">Conjuros</p>
          <div class="mini-edit-actions">
            <button v-if="!isEditing('combat_spells')" type="button" class="icon-action edit" @click="startFieldEdit('combat_spells')">✎</button>
            <template v-else>
              <button type="button" class="icon-action save" @click="saveFieldEdit">✓</button>
              <button type="button" class="icon-action cancel" @click="cancelFieldEdit">✕</button>
            </template>
          </div>
        </div>
        <div v-if="isEditing('combat_spells')" class="inline-editor spells-editor">
          <div class="spell-level-block">
            <p class="spell-level-name">Trucos</p>
            <div v-for="(sp, i) in fieldDraft.cantrips" :key="'cantrip-'+i" class="spell-edit-row">
              <input v-model="fieldDraft.cantrips[i]" placeholder="Nombre del truco" />
              <button type="button" class="icon-action cancel" @click="removeDraftSpell('cantrips', i)">✕</button>
            </div>
            <button type="button" class="btn-secondary" @click="addDraftSpell('cantrips')">+ Agregar truco</button>
          </div>
          <div v-for="lvl in [1,2,3,4,5,6,7,8,9]" :key="'edit-lvl-'+lvl" class="spell-level-block">
            <p class="spell-level-name">Nivel {{ lvl }}</p>
            <div class="two-col mb-1">
              <input v-model.number="fieldDraft['level'+lvl].slotsTotal" type="number" min="0" placeholder="Slots totales" />
              <input v-model.number="fieldDraft['level'+lvl].slotsUsed" type="number" min="0" placeholder="Slots usados" />
            </div>
            <div v-for="(sp, i) in fieldDraft['level'+lvl].spells" :key="'lvl-'+lvl+'-sp-'+i" class="spell-edit-row">
              <input v-model="fieldDraft['level'+lvl].spells[i]" :placeholder="'Conjuro nivel ' + lvl" />
              <button type="button" class="icon-action cancel" @click="removeDraftSpell('level'+lvl, i)">✕</button>
            </div>
            <button type="button" class="btn-secondary" @click="addDraftSpell('level'+lvl)">+ Agregar conjuro</button>
          </div>
        </div>

        <div v-if="!isEditing('combat_spells')" v-for="block in visibleSpellBlocks" :key="block.key" class="spell-level-block">
          <div class="spell-level-header">
            <span class="spell-level-name">{{ block.label }}</span>

            <span v-if="block.showSlots" class="slots-indicator">
              <span v-for="n in block.slots" :key="n" :class="[
                'slot-pip',
                n <= block.slotsUsed ? 'used' : '',
              ]"></span>
            </span>
          </div>

          <div class="spell-tags">
            <span v-for="sp in block.spells" :key="sp" class="spell-tag">
              {{ sp }}
            </span>
          </div>
        </div>
      </div>
      </div>

      <!-- ── PESTAÑA: Equipo ── -->
      <div v-if="activeTab === 'equipment'" class="tab-content">
        <div class="card mb-4">
          <div class="section-title-row">
            <p class="section-title">Monedas</p>
            <div class="mini-edit-actions">
              <button v-if="!isEditing('equipment_coins')" type="button" class="icon-action edit" @click="startFieldEdit('equipment_coins')">✎</button>
              <template v-else>
                <button type="button" class="icon-action save" @click="saveFieldEdit">✓</button>
                <button type="button" class="icon-action cancel" @click="cancelFieldEdit">✕</button>
              </template>
            </div>
          </div>
          <div v-if="isEditing('equipment_coins')" class="inline-editor">
            <div class="coins-edit-grid">
              <div v-for="coin in coins" :key="'coin-edit-' + coin.key" class="coin-edit-row">
                <label>{{ coin.label }}</label>
                <input v-model.number="fieldDraft[coin.key]" type="number" min="0" />
              </div>
            </div>
          </div>
          <div class="coins-grid">
            <div v-for="coin in coins" :key="coin.key" class="coin-box" :style="{ borderColor: coin.color }">
              <span class="coin-icon">{{ coin.icon }}</span>
              <span class="coin-val">{{ character[coin.key] || 0 }}</span>
              <span class="coin-lbl">{{ coin.label }}</span>
            </div>
          </div>
        </div>
        <div class="card mb-4">
          <div class="section-title-row">
            <p class="section-title">Equipo</p>
            <div class="mini-edit-actions">
              <button v-if="!isEditing('equipment_items')" type="button" class="icon-action edit" @click="startFieldEdit('equipment_items', (equipment || []).map(i => (typeof i === 'string' ? i : i?.name || '')).join('\n'))">✎</button>
              <template v-else>
                <button type="button" class="icon-action save" @click="saveFieldEdit">✓</button>
                <button type="button" class="icon-action cancel" @click="cancelFieldEdit">✕</button>
              </template>
            </div>
          </div>
          <div v-if="isEditing('equipment_items')" class="inline-editor">
            <textarea v-model="fieldDraft" rows="4"></textarea>
          </div>
          <div v-if="!isEditing('equipment_items') && equipment.length">
            <div v-for="(item, i) in equipment" :key="i" class="equip-row">
              <span class="equip-name">{{ item.name || item }}</span>
              <span v-if="item.qty" class="equip-qty">x{{ item.qty }}</span>
            </div>
          </div>
          <p v-else-if="!isEditing('equipment_items')" class="text-muted" style="font-size: 0.85rem">
            Mochila vacía
          </p>
        </div>
        <div class="card" v-if="character.treasure">
          <div class="section-title-row">
            <p class="section-title">Tesoros & Otros</p>
            <div class="mini-edit-actions">
              <button v-if="!isEditing('equipment_treasure')" type="button" class="icon-action edit" @click="startFieldEdit('equipment_treasure', character.treasure || '')">✎</button>
              <template v-else>
                <button type="button" class="icon-action save" @click="saveFieldEdit">✓</button>
                <button type="button" class="icon-action cancel" @click="cancelFieldEdit">✕</button>
              </template>
            </div>
          </div>
          <div v-if="isEditing('equipment_treasure')" class="inline-editor">
            <textarea v-model="fieldDraft" rows="4"></textarea>
          </div>
          <p v-if="!isEditing('equipment_treasure')" style="
            font-size: 0.9rem;
            color: var(--text-secondary);
            white-space: pre-line;
          ">
            {{ character.treasure }}
          </p>
        </div>
      </div>

      <!-- ── PESTAÑA: Trasfondo ── -->
      <div v-if="activeTab === 'backstory'" class="tab-content">
        <div class="card mb-4" v-if="
          character.personality_traits ||
          character.ideals ||
          character.bonds ||
          character.flaws
        ">
          <p class="section-title">Personalidad</p>
          <div class="trait-grid">
            <div v-if="character.personality_traits" class="trait-box">
              <div class="trait-head"><p class="trait-lbl">Rasgos</p><button type="button" class="icon-action edit" @click="startFieldEdit('backstory_traits', character.personality_traits || '')">✎</button></div>
              <div v-if="isEditing('backstory_traits')" class="inline-editor"><textarea v-model="fieldDraft" rows="3"></textarea><div class="mini-edit-actions"><button type="button" class="icon-action save" @click="saveFieldEdit">✓</button><button type="button" class="icon-action cancel" @click="cancelFieldEdit">✕</button></div></div>
              <p v-if="!isEditing('backstory_traits')" class="trait-val">{{ character.personality_traits }}</p>
            </div>
            <div v-if="character.ideals" class="trait-box">
              <div class="trait-head"><p class="trait-lbl">Ideales</p><button type="button" class="icon-action edit" @click="startFieldEdit('backstory_ideals', character.ideals || '')">✎</button></div>
              <div v-if="isEditing('backstory_ideals')" class="inline-editor"><textarea v-model="fieldDraft" rows="3"></textarea><div class="mini-edit-actions"><button type="button" class="icon-action save" @click="saveFieldEdit">✓</button><button type="button" class="icon-action cancel" @click="cancelFieldEdit">✕</button></div></div>
              <p v-if="!isEditing('backstory_ideals')" class="trait-val">{{ character.ideals }}</p>
            </div>
            <div v-if="character.bonds" class="trait-box">
              <div class="trait-head"><p class="trait-lbl">Vínculos</p><button type="button" class="icon-action edit" @click="startFieldEdit('backstory_bonds', character.bonds || '')">✎</button></div>
              <div v-if="isEditing('backstory_bonds')" class="inline-editor"><textarea v-model="fieldDraft" rows="3"></textarea><div class="mini-edit-actions"><button type="button" class="icon-action save" @click="saveFieldEdit">✓</button><button type="button" class="icon-action cancel" @click="cancelFieldEdit">✕</button></div></div>
              <p v-if="!isEditing('backstory_bonds')" class="trait-val">{{ character.bonds }}</p>
            </div>
            <div v-if="character.flaws" class="trait-box">
              <div class="trait-head"><p class="trait-lbl">Defectos</p><button type="button" class="icon-action edit" @click="startFieldEdit('backstory_flaws', character.flaws || '')">✎</button></div>
              <div v-if="isEditing('backstory_flaws')" class="inline-editor"><textarea v-model="fieldDraft" rows="3"></textarea><div class="mini-edit-actions"><button type="button" class="icon-action save" @click="saveFieldEdit">✓</button><button type="button" class="icon-action cancel" @click="cancelFieldEdit">✕</button></div></div>
              <p v-if="!isEditing('backstory_flaws')" class="trait-val">{{ character.flaws }}</p>
            </div>
          </div>
        </div>
        <div class="card mb-4" v-if="character.backstory">
          <div class="section-title-row"><p class="section-title">Historia</p><div class="mini-edit-actions"><button v-if="!isEditing('backstory_history')" type="button" class="icon-action edit" @click="startFieldEdit('backstory_history', character.backstory || '')">✎</button><template v-else><button type="button" class="icon-action save" @click="saveFieldEdit">✓</button><button type="button" class="icon-action cancel" @click="cancelFieldEdit">✕</button></template></div></div>
          <div v-if="isEditing('backstory_history')" class="inline-editor"><textarea v-model="fieldDraft" rows="5"></textarea></div>
          <p v-if="!isEditing('backstory_history')" style="
            font-size: 0.9rem;
            line-height: 1.7;
            color: var(--text-secondary);
            white-space: pre-line;
          ">
            {{ character.backstory }}
          </p>
        </div>
        <div class="card mb-4">
          <div class="section-title-row"><p class="section-title">Apariencia</p></div>
          <div class="appear-grid">
            <div v-for="f in visibleAppearanceFields" :key="f.key" class="appear-row">
              <span class="appear-lbl">{{ f.label }}</span>
              <span v-if="!isEditing('appearance_' + f.key)" class="appear-val">{{ character[f.key] || "—" }}</span>
              <div v-else class="appear-inline-edit">
                <input v-model="fieldDraft" :placeholder="f.label" />
              </div>
              <div class="mini-edit-actions">
                <button v-if="!isEditing('appearance_' + f.key)" type="button" class="icon-action edit" @click="startFieldEdit('appearance_' + f.key, character[f.key] || '')">✎</button>
                <template v-else>
                  <button type="button" class="icon-action save" @click="saveFieldEdit">✓</button>
                  <button type="button" class="icon-action cancel" @click="cancelFieldEdit">✕</button>
                </template>
              </div>
            </div>
          </div>
          <div class="section-title-row mt-2">
            <p class="form-label">Descripción</p>
            <div class="mini-edit-actions">
              <button v-if="!isEditing('backstory_appearance')" type="button" class="icon-action edit" @click="startFieldEdit('backstory_appearance', character.appearance_notes || '')">✎</button>
              <template v-else>
                <button type="button" class="icon-action save" @click="saveFieldEdit">✓</button>
                <button type="button" class="icon-action cancel" @click="cancelFieldEdit">✕</button>
              </template>
            </div>
          </div>
          <div v-if="isEditing('backstory_appearance')" class="inline-editor"><textarea v-model="fieldDraft" rows="4"></textarea></div>
          <p v-else-if="character.appearance_notes" style="
            margin-top: 0.5rem;
            font-size: 0.85rem;
            color: var(--text-secondary);
            white-space: pre-line;
          ">
            {{ character.appearance_notes }}
          </p>
        </div>
        <div class="card" v-if="character.allies_organizations || character.faction">
          <p class="section-title">Alianzas & Organizaciones</p>
          <div class="trait-grid">
            <div class="trait-box">
              <div class="trait-head">
                <p class="trait-lbl">Alianzas</p>
                <button v-if="!isEditing('backstory_alliances')" type="button" class="icon-action edit" @click="startFieldEdit('backstory_alliances', character.allies_organizations || '')">✎</button>
                <template v-else>
                  <button type="button" class="icon-action save" @click="saveFieldEdit">✓</button>
                  <button type="button" class="icon-action cancel" @click="cancelFieldEdit">✕</button>
                </template>
              </div>
              <div v-if="isEditing('backstory_alliances')" class="inline-editor"><textarea v-model="fieldDraft" rows="3"></textarea></div>
              <p v-else class="trait-val">{{ character.allies_organizations || "—" }}</p>
            </div>
            <div class="trait-box">
              <div class="trait-head">
                <p class="trait-lbl">Organización / Facción</p>
                <button v-if="!isEditing('backstory_faction')" type="button" class="icon-action edit" @click="startFieldEdit('backstory_faction', character.faction || '')">✎</button>
                <template v-else>
                  <button type="button" class="icon-action save" @click="saveFieldEdit">✓</button>
                  <button type="button" class="icon-action cancel" @click="cancelFieldEdit">✕</button>
                </template>
              </div>
              <div v-if="isEditing('backstory_faction')" class="inline-editor"><input v-model="fieldDraft" placeholder="Nombre de facción" /></div>
              <p v-else class="trait-val">{{ character.faction || "—" }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- ── PESTAÑA: Rasgos ── -->
      <div v-if="activeTab === 'features'" class="tab-content">
        <div class="card mb-4" v-if="features.length">
          <div class="section-title-row"><p class="section-title">Rasgos & Capacidades</p><div class="mini-edit-actions"><button v-if="!isEditing('features_traits')" type="button" class="icon-action edit" @click="startFieldEdit('features_traits', (features || []).map(f => (typeof f === 'string' ? f : f?.name || '')).join('\n'))">✎</button><template v-else><button type="button" class="icon-action save" @click="saveFieldEdit">✓</button><button type="button" class="icon-action cancel" @click="cancelFieldEdit">✕</button></template></div></div>
          <div v-if="isEditing('features_traits')" class="inline-editor"><textarea v-model="fieldDraft" rows="5"></textarea></div>
          <div v-for="(feat, i) in features" :key="i" class="feat-block">
            <p class="feat-name">{{ feat.name }}</p>
            <p class="feat-desc" v-if="feat.description">
              {{ feat.description }}
            </p>
          </div>
        </div>
        <div class="card" v-if="languages.length || otherProfs.length">
          <div class="section-title-row"><p class="section-title">Competencias & Idiomas</p><div class="mini-edit-actions"><button v-if="!isEditing('features_competencies')" type="button" class="icon-action edit" @click="startFieldEdit('features_competencies')">✎</button><template v-else><button type="button" class="icon-action save" @click="saveFieldEdit">✓</button><button type="button" class="icon-action cancel" @click="cancelFieldEdit">✕</button></template></div></div>
          <div v-if="isEditing('features_competencies')" class="inline-editor">
            <div class="two-col">
              <div>
                <label class="form-label">Idiomas (separados por coma)</label>
                <input v-model="fieldDraft.languages" placeholder="Común, Élfico..." />
              </div>
              <div>
                <label class="form-label">Competencias (separadas por coma)</label>
                <input v-model="fieldDraft.proficiencies" placeholder="Armaduras, Herramientas..." />
              </div>
            </div>
          </div>
          <div v-else class="lang-tags">
            <span v-for="l in languages" :key="l" class="badge badge-blue">{{
              l
            }}</span>
            <span v-for="p in otherProfs" :key="p" class="badge badge-gold">{{
              p
            }}</span>
          </div>
        </div>
      </div>
      <div v-if="activeTab === 'notes'" class="tab-content">
        <CharacterNotesPanel :char-id="id" />
      </div>
      </section>
    </div>
  </div>

  <div v-else class="loading-screen">
    <div class="spinner"></div>
    <span>Cargando ficha...</span>
  </div>
</template>

<script>
import { charactersAPI, dmAPI } from "../services/api.js";
import { exportCharacterPdf } from "../services/pdfExport.js";
import CharacterNotesPanel from "../components/CharacterNotesPanel.vue";
import {
  ATTRIBUTES,
  SKILLS,
  SPELLCASTING_ABILITIES,
  getModifier,
  formatModifier,
} from "../services/dndData.js";

export default {
  name: "CharacterFullView",
  components: { CharacterNotesPanel },
  inject: ["showToast"],
  data() {
    return {
      character: null,
      activeTab: "skills",
      fieldEditKey: null,
      fieldDraft: "",
      ATTRIBUTES,
      SKILLS,
      tabs: [
        { id: "skills", label: "Habilidades" },
        { id: "combat", label: "Combate" },
        { id: "equipment", label: "Equipo" },
        { id: "backstory", label: "Trasfondo" },
        { id: "features", label: "Rasgos" },
        { id: "notes", label: "Notas" },
      ],
      coins: [
        { key: "copper_pieces", label: "PC", icon: "🟤", color: "#92400e" },
        { key: "silver_pieces", label: "PP", icon: "⚪", color: "#9ca3af" },
        { key: "electrum_pieces", label: "PE", icon: "🔵", color: "#3b82f6" },
        { key: "gold_pieces", label: "PO", icon: "🟡", color: "#d97706" },
        { key: "platinum_pieces", label: "PPl", icon: "⬜", color: "#e2e8f0" },
      ],
      appearanceFields: [
        { key: "age", label: "Edad" },
        { key: "height", label: "Altura" },
        { key: "weight", label: "Peso" },
        { key: "eyes", label: "Ojos" },
        { key: "skin", label: "Piel" },
        { key: "hair", label: "Cabello" },
      ],
    };
  },
  computed: {
    visibleAppearanceFields() {
      return this.appearanceFields.filter(f => this.character[f.key])
    },
    id() {
      return this.$route.params.id;
    },
    campaignId() {
      return this.$route.params.campaignId;
    },
    isDmCampaignReader() {
      return this.$route.name === "DmCampaignCharacter";
    },
    attacks() {
      return Array.isArray(this.character?.attacks_spellcasting)
        ? this.character.attacks_spellcasting
        : [];
    },
    spells() {
      return this.normalizeSpells(this.character?.spells)
    },

    visibleSpellBlocks() {
      const spells = this.spells
      const blocks = []

      const cantrips = spells.cantrips
        .map(spell => String(spell).trim())
        .filter(Boolean)

      if (cantrips.length) {
        blocks.push({
          key: 'cantrips',
          label: 'Trucos',
          spells: cantrips,
          slots: 0,
          slotsUsed: 0,
          showSlots: false
        })
      }

      for (let i = 1; i <= 9; i++) {
        const key = `level${i}`
        const level = spells[key]

        const levelSpells = Array.isArray(level.spells)
          ? level.spells.map(spell => String(spell).trim()).filter(Boolean)
          : []

        const slots = Number(level.slots || 0)
        const slotsUsed = Number(level.slots_used || 0)

        const hasSpells = levelSpells.length > 0
        const hasSlots = slots > 0

        if (!hasSpells && !hasSlots) continue

        blocks.push({
          key,
          label: `Nivel ${i}`,
          spells: levelSpells,
          slots,
          slotsUsed,
          showSlots: hasSlots
        })
      }

      return blocks
    },
    equipment() {
      return Array.isArray(this.character?.equipment)
        ? this.character.equipment
        : [];
    },
    features() {
      return Array.isArray(this.character?.features_traits)
        ? this.character.features_traits
        : [];
    },
    languages() {
      return Array.isArray(this.character?.languages)
        ? this.character.languages
        : [];
    },
    otherProfs() {
      return Array.isArray(this.character?.other_proficiencies)
        ? this.character.other_proficiencies
        : [];
    },
    abilityLabel() {
      const sa = SPELLCASTING_ABILITIES.find(
        (a) => a.value === this.character?.spellcasting_ability,
      );
      return sa ? sa.label.split(" ")[0] : "—";
    }
  },
  async mounted() {
    try {
      if (this.isDmCampaignReader) {
        const { data } = await dmAPI.getCampaignCharacter(this.campaignId, this.id);
        this.character = data;
      } else {
        const { data } = await charactersAPI.getFull(this.id);
        this.character = data;
      }
    } catch {
      this.showToast("Error al cargar ficha", "error");
      this.$router.back();
    }
  },
  methods: {
    startFieldEdit(key, initialValue) {
      this.fieldEditKey = key;
      if (key === "skills_saves") {
        this.fieldDraft = Array.isArray(this.character?.saving_throws_prof) ? [...this.character.saving_throws_prof] : [];
        return;
      }
      if (key === "skills_skills") {
        this.fieldDraft = {
          prof: Array.isArray(this.character?.skills_prof) ? [...this.character.skills_prof] : [],
          expertise: Array.isArray(this.character?.skills_expertise) ? [...this.character.skills_expertise] : []
        };
        return;
      }
      if (key === "combat_attacks") {
        this.fieldDraft = Array.isArray(this.character?.attacks_spellcasting)
          ? this.character.attacks_spellcasting.map(a => ({ ...a }))
          : [];
        return;
      }
      if (key === "combat_spellcasting") {
        this.fieldDraft = {
          spellcasting_ability: this.character?.spellcasting_ability || "",
          spell_save_dc: this.character?.spell_save_dc ?? "",
          spell_attack_bonus: this.character?.spell_attack_bonus ?? ""
        };
        return;
      }
      if (key === "combat_spells") {
        this.fieldDraft = this.normalizeSpells(this.character?.spells);
        return;
      }
      if (key === "equipment_coins") {
        this.fieldDraft = {
          copper_pieces: Number(this.character?.copper_pieces || 0),
          silver_pieces: Number(this.character?.silver_pieces || 0),
          electrum_pieces: Number(this.character?.electrum_pieces || 0),
          gold_pieces: Number(this.character?.gold_pieces || 0),
          platinum_pieces: Number(this.character?.platinum_pieces || 0)
        };
        return;
      }
      if (key === "features_competencies") {
        this.fieldDraft = {
          languages: (this.character?.languages || []).join(", "),
          proficiencies: (this.character?.other_proficiencies || []).join(", ")
        };
        return;
      }
      this.fieldDraft = initialValue ?? "";
    },
    cancelFieldEdit() {
      this.fieldEditKey = null;
      this.fieldDraft = "";
    },
    toList(value) {
      return String(value || "")
        .split(",")
        .map(v => v.trim())
        .filter(Boolean);
    },
    isEditing(key) {
      return this.fieldEditKey === key;
    },
    async persistCharacterPatch(patch) {
      const { data } = await charactersAPI.updateFields(this.id, patch);
      this.character = data?.character || { ...this.character, ...patch };
    },
    async saveFieldEdit() {
      try {
        const key = this.fieldEditKey;
        const value = this.fieldDraft;
        if (!key) return;

        if (key === "state_hp") {
          await this.persistCharacterPatch({
            hit_points_current: Number(value || 0)
          });
        } else if (key === "state_ac") {
          await this.persistCharacterPatch({ armor_class: Number(value || 0) });
        } else if (key === "state_ini") {
          await this.persistCharacterPatch({ initiative: Number(value || 0) });
        } else if (key === "state_speed") {
          await this.persistCharacterPatch({ speed: Number(value || 0) });
        } else if (key === "state_prof") {
          await this.persistCharacterPatch({ proficiency_bonus: Number(value || 0) });
        } else if (key === "state_insp") {
          await this.persistCharacterPatch({ inspiration: String(value).toLowerCase() === "si" || String(value).toLowerCase() === "true" });
        } else if (key === "state_passive") {
          await this.persistCharacterPatch({ passive_perception: Number(value || 0) });
        } else if (key === "state_xp") {
          await this.persistCharacterPatch({ experience_points: Number(value || 0) });
        } else if (key === "skills_saves") {
          await this.persistCharacterPatch({ saving_throws_prof: Array.isArray(this.fieldDraft) ? this.fieldDraft : [] });
        } else if (key === "skills_skills") {
          await this.persistCharacterPatch({
            skills_prof: Array.isArray(this.fieldDraft?.prof) ? this.fieldDraft.prof : [],
            skills_expertise: Array.isArray(this.fieldDraft?.expertise) ? this.fieldDraft.expertise : []
          });
        } else if (key === "combat_attacks") {
          const attacks = (Array.isArray(this.fieldDraft) ? this.fieldDraft : [])
            .map((a) => ({
              name: String(a?.name || "").trim(),
              bonus: String(a?.bonus || "").trim(),
              damage: String(a?.damage || "").trim(),
              type: String(a?.type || "").trim()
            }))
            .filter((a) => a.name || a.bonus || a.damage || a.type);
          await this.persistCharacterPatch({ attacks_spellcasting: attacks });
        } else if (key === "combat_spellcasting") {
          const draft = this.fieldDraft || {};
          await this.persistCharacterPatch({
            spellcasting_ability: String(draft.spellcasting_ability || "").trim() || null,
            spell_save_dc: draft.spell_save_dc === "" ? null : Number(draft.spell_save_dc),
            spell_attack_bonus: draft.spell_attack_bonus === "" ? null : Number(draft.spell_attack_bonus)
          });
        } else if (key === "combat_spells") {
          await this.persistCharacterPatch({ spells: this.fieldDraft || this.emptySpells() });
        } else if (key === "equipment_coins") {
          await this.persistCharacterPatch({
            copper_pieces: Number(this.fieldDraft?.copper_pieces || 0),
            silver_pieces: Number(this.fieldDraft?.silver_pieces || 0),
            electrum_pieces: Number(this.fieldDraft?.electrum_pieces || 0),
            gold_pieces: Number(this.fieldDraft?.gold_pieces || 0),
            platinum_pieces: Number(this.fieldDraft?.platinum_pieces || 0)
          });
        } else if (key === "equipment_items") {
          await this.persistCharacterPatch({
            equipment: String(value || "").split("\n").map(v => v.trim()).filter(Boolean)
          });
        } else if (key === "equipment_treasure") {
          await this.persistCharacterPatch({ treasure: String(value || "") });
        } else if (key === "backstory_traits") {
          await this.persistCharacterPatch({ personality_traits: String(value || "") });
        } else if (key === "backstory_ideals") {
          await this.persistCharacterPatch({ ideals: String(value || "") });
        } else if (key === "backstory_bonds") {
          await this.persistCharacterPatch({ bonds: String(value || "") });
        } else if (key === "backstory_flaws") {
          await this.persistCharacterPatch({ flaws: String(value || "") });
        } else if (key === "backstory_history") {
          await this.persistCharacterPatch({ backstory: String(value || "") });
        } else if (key === "backstory_appearance") {
          await this.persistCharacterPatch({ appearance_notes: String(value || "") });
        } else if (key.startsWith("appearance_")) {
          const appearanceField = key.replace("appearance_", "");
          await this.persistCharacterPatch({ [appearanceField]: String(value || "") });
        } else if (key === "backstory_alliances") {
          await this.persistCharacterPatch({ allies_organizations: String(value || "") });
        } else if (key === "backstory_faction") {
          await this.persistCharacterPatch({ faction: String(value || "") });
        } else if (key === "features_traits") {
          const features = String(value || "")
            .split("\n")
            .map(v => v.trim())
            .filter(Boolean)
            .map(name => ({ name, description: "" }));
          await this.persistCharacterPatch({ features_traits: features });
        } else if (key === "features_competencies") {
          await this.persistCharacterPatch({
            languages: this.toList(this.fieldDraft?.languages),
            other_proficiencies: this.toList(this.fieldDraft?.proficiencies)
          });
        }
        this.showToast("Seccion actualizada", "success");
        this.cancelFieldEdit();
      } catch {
        this.showToast("No se pudo guardar el campo", "error");
      }
    },
    fmtMod(v) {
      return formatModifier(v);
    },
    toggleDraftArrayValue(arrKey, value) {
      if (!this.fieldDraft || !Array.isArray(this.fieldDraft[arrKey])) return;
      const idx = this.fieldDraft[arrKey].indexOf(value);
      if (idx >= 0) this.fieldDraft[arrKey].splice(idx, 1);
      else this.fieldDraft[arrKey].push(value);
    },
    toggleDraftRootArrayValue(value) {
      if (!Array.isArray(this.fieldDraft)) return;
      const idx = this.fieldDraft.indexOf(value);
      if (idx >= 0) this.fieldDraft.splice(idx, 1);
      else this.fieldDraft.push(value);
    },
    addDraftAttack() {
      if (!Array.isArray(this.fieldDraft)) this.fieldDraft = [];
      this.fieldDraft.push({ name: "", bonus: "", damage: "", type: "" });
    },
    removeDraftAttack(i) {
      if (Array.isArray(this.fieldDraft)) this.fieldDraft.splice(i, 1);
    },
    addDraftSpell(levelKey) {
      if (!this.fieldDraft || typeof this.fieldDraft !== "object") return;
      if (levelKey === "cantrips") {
        this.fieldDraft.cantrips.push("");
      } else {
        this.fieldDraft[levelKey].spells.push("");
      }
    },
    removeDraftSpell(levelKey, idx) {
      if (!this.fieldDraft || typeof this.fieldDraft !== "object") return;
      if (levelKey === "cantrips") {
        this.fieldDraft.cantrips.splice(idx, 1);
      } else {
        this.fieldDraft[levelKey].spells.splice(idx, 1);
      }
    },
    downloadDmPdf() {
      if (this.character) exportCharacterPdf(this.character);
    },
    hasSavingThrow(attr) {
      return (this.character?.saving_throws_prof || []).includes(attr);
    },
    hasSkill(key) {
      return (this.character?.skills_prof || []).includes(key);
    },
    hasExpertise(key) {
      return (this.character?.skills_expertise || []).includes(key);
    },
    getSavingThrowBonus(attr) {
      const mod = getModifier(this.character?.[attr] || 10);
      const pb = this.character?.proficiency_bonus || 2;
      return formatModifier(this.hasSavingThrow(attr) ? mod + pb : mod);
    },
    getSkillBonus(sk) {
      const mod = getModifier(this.character?.[sk.attr] || 10);
      const pb = this.character?.proficiency_bonus || 2;
      let bonus = mod;
      if (this.hasExpertise(sk.key)) bonus += pb * 2;
      else if (this.hasSkill(sk.key)) bonus += pb;
      return formatModifier(bonus);
    },
    attrShort(attr) {
      return (
        ATTRIBUTES.find((a) => a.key === attr)?.short ||
        attr.toUpperCase().slice(0, 3)
      );
    },
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
    level9: { slots: 0, slots_used: 0, spells: [] },
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

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return base
  }

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
    levelLabel(key) {
      if (key === "cantrips") return "Trucos";
      return `Nivel ${key.replace("level", "")}`;
    },
  },
};
</script>

<style scoped>
.full-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
  gap: 0.5rem;
}

.full-header-actions {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-shrink: 0;
}

.full-title {
  font-family: var(--font-title);
  font-size: 1.1rem;
  color: var(--text-primary);
  text-align: left;
}
.full-layout {
  display: block;
}
.full-sidebar {
  margin-bottom: 0.75rem;
}
.sidebar-title {
  margin-bottom: 0.6rem;
}
.sidebar-name {
  font-family: var(--font-display);
  font-size: 1.1rem;
  color: var(--text-primary);
  line-height: 1.15;
}
.sidebar-meta {
  margin-top: 0.25rem;
  color: var(--text-secondary);
  font-size: 0.82rem;
}
.quick-states-wrap {
  margin-bottom: 0.7rem;
}
.quick-state-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.45rem;
}
.state-pill {
  border: 1px solid var(--border);
  background: var(--bg-surface);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  min-height: 2.5rem;
  padding: 0.35rem 0.45rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  cursor: pointer;
}
.state-pill:hover {
  border-color: var(--gold-dark);
  color: var(--gold-light);
}
.state-key {
  font-size: 0.55rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.state-head {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.25rem;
}
.state-edit {
  font-size: 0.62rem;
  color: var(--text-dim);
}
.state-val {
  font-family: var(--font-title);
  font-size: 0.9rem;
  line-height: 1.15;
}

/* Tabs */
.tabs {
  display: flex;
  gap: 0.25rem;
  overflow-x: auto;
  padding-bottom: 0.1rem;
  margin-bottom: 0.75rem;
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.tabs::-webkit-scrollbar {
  display: none;
}

.tab-btn {
  flex-shrink: 0;
  font-family: var(--font-title);
  font-size: 0.7rem;
  letter-spacing: 0.05em;
  padding: 0.35rem 0.7rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--bg-surface);
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.2s;
  text-transform: uppercase;
}

.tab-btn.active {
  background: linear-gradient(135deg, var(--gold-dark), var(--gold));
  color: var(--bg-deep);
  border-color: var(--gold);
}

.tab-content {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}
.inline-actions {
  display: flex;
  gap: 0.4rem;
}
.inline-editor {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}
.inline-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.45rem;
}
.check-inline {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  color: var(--text-secondary);
  font-size: 0.82rem;
}
.section-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.45rem;
}
.mini-edit-actions {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}
.icon-action {
  border: 1px solid var(--border);
  background: var(--bg-surface);
  color: var(--text-muted);
  border-radius: 999px;
  width: 1.6rem;
  height: 1.6rem;
  font-size: 0.78rem;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.icon-action:hover { border-color: var(--gold-dark); color: var(--gold-light); }
.icon-action.save { color: #4ade80; }
.icon-action.cancel { color: #f87171; }
.inline-state-editor {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  margin-top: 0.45rem;
}
.trait-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.4rem;
}

.mb-4 {
  margin-bottom: 0 !important;
}

/* Skills */
.skill-list {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.skill-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.2rem 0;
  border-bottom: 1px solid var(--bg-deep);
}

.prof-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 2px solid var(--text-dim);
  flex-shrink: 0;
  transition: all 0.2s;
}

.prof-dot.filled {
  background: var(--gold);
  border-color: var(--gold);
}

.prof-dot.expertise {
  background: var(--gold-light);
  border-color: var(--gold-light);
  box-shadow: 0 0 4px var(--gold-light);
}

.skill-name {
  flex: 1;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.skill-attr {
  font-size: 0.7rem;
  color: var(--text-dim);
}

.skill-bonus {
  font-family: var(--font-title);
  font-weight: 700;
  font-size: 0.9rem;
  color: var(--gold-light);
  min-width: 2rem;
  text-align: right;
}

/* Attacks */
.attacks-list {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.attack-row {
  display: grid;
  grid-template-columns: 1fr auto auto auto;
  gap: 0.5rem;
  align-items: center;
  padding: 0.35rem 0;
  border-bottom: 1px solid var(--bg-deep);
}

.atk-name {
  font-size: 0.85rem;
  color: var(--text-primary);
}

.atk-dmg {
  font-family: var(--font-title);
  font-size: 0.85rem;
  color: var(--text-secondary);
}

/* Spells */
.spell-meta {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
}

.spell-meta-box {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.5rem;
}

.smb-val {
  font-family: var(--font-title);
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--gold-light);
}

.smb-lbl {
  font-size: 0.6rem;
  font-family: var(--font-title);
  color: var(--text-muted);
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.spell-level-block {
  margin-bottom: 0.6rem;
}

.spell-level-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.25rem;
}

.spell-level-name {
  font-family: var(--font-title);
  font-size: 0.75rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.slots-indicator {
  display: flex;
  gap: 3px;
}

.slot-pip {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--purple);
  opacity: 0.9;
}

.slot-pip.used {
  background: var(--bg-deep);
  border: 1px solid var(--purple);
  opacity: 0.5;
}

.spell-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
}

.spell-tag {
  font-size: 0.78rem;
  padding: 0.15rem 0.5rem;
  background: rgba(124, 58, 237, 0.1);
  border: 1px solid var(--purple);
  border-radius: 999px;
  color: #a78bfa;
}

/* Coins */
.coins-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 0.35rem;
}

.coin-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: var(--bg-surface);
  border: 1px solid;
  border-radius: var(--radius-sm);
  padding: 0.4rem 0.15rem;
}

.coin-icon {
  font-size: 1rem;
  line-height: 1;
}

.coin-val {
  font-family: var(--font-title);
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text-primary);
}

.coin-lbl {
  font-size: 0.55rem;
  color: var(--text-muted);
  font-family: var(--font-title);
}

/* Equipment */
.equip-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.25rem 0;
  border-bottom: 1px solid var(--bg-deep);
  font-size: 0.88rem;
  color: var(--text-secondary);
}

.equip-qty {
  color: var(--text-muted);
  font-size: 0.78rem;
}

/* Traits */
.trait-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}

.trait-box {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 0.6rem;
}

.trait-lbl {
  font-family: var(--font-title);
  font-size: 0.65rem;
  color: var(--gold);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 0.2rem;
}

.trait-val {
  font-size: 0.82rem;
  color: var(--text-secondary);
  line-height: 1.5;
}

/* Appearance */
.appear-grid {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.appear-row {
  display: flex;
  gap: 0.75rem;
  font-size: 0.85rem;
  padding: 0.15rem 0;
  border-bottom: 1px solid var(--bg-deep);
}

.appear-lbl {
  font-family: var(--font-title);
  color: var(--text-muted);
  font-size: 0.78rem;
  min-width: 4rem;
}

.appear-val {
  color: var(--text-secondary);
}

/* Features */
.feat-block {
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--bg-deep);
}

.feat-name {
  font-family: var(--font-title);
  font-size: 0.85rem;
  color: var(--gold-light);
  margin-bottom: 0.2rem;
}

.feat-desc {
  font-size: 0.82rem;
  color: var(--text-secondary);
  line-height: 1.5;
}

.lang-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.skill-row-editable {
  cursor: default;
}

.skills-check-wrap {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
}

.skills-check-wrap input[type="checkbox"] {
  width: 14px;
  height: 14px;
}

.chips-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.4rem;
}

.chip-check {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 0.35rem 0.5rem;
  font-size: 0.78rem;
}

.chip-check.active {
  border-color: var(--gold-mid);
  background: color-mix(in srgb, var(--gold-mid) 12%, transparent);
}

.attack-edit-row {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr 1fr 1fr auto;
  gap: 0.4rem;
  margin-bottom: 0.45rem;
}

.two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.45rem;
}

.spells-editor {
  max-height: 26rem;
  overflow: auto;
}

.spell-edit-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.4rem;
  margin-bottom: 0.35rem;
}

.btn-secondary {
  border: 1px dashed var(--border-color);
  background: transparent;
  color: var(--text-secondary);
  border-radius: 8px;
  padding: 0.3rem 0.55rem;
  font-size: 0.78rem;
}

.coins-edit-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.5rem;
}

.coin-edit-row {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.appear-inline-edit {
  min-width: 0;
}

.mt-2 {
  margin-top: 0.55rem;
}

.mb-1 {
  margin-bottom: 0.35rem;
}

@media (max-width: 760px) {
  .full-header {
    flex-wrap: wrap;
  }
  .quick-state-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .inline-grid { grid-template-columns: 1fr; }
  .attack-row {
    grid-template-columns: 1fr auto;
    gap: 0.35rem;
  }
  .atk-dmg,
  .atk-type {
    grid-column: 1 / -1;
  }
  .spell-meta {
    grid-template-columns: 1fr;
  }
  .coins-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .trait-grid {
    grid-template-columns: 1fr;
  }
  .attack-edit-row,
  .two-col {
    grid-template-columns: 1fr;
  }
}

@media (min-width: 980px) {
  .full-layout {
    display: grid;
    grid-template-columns: minmax(220px, 280px) minmax(0, 1fr);
    gap: 1rem;
    align-items: start;
  }
  .full-sidebar {
    position: sticky;
    top: 5.4rem;
    margin-bottom: 0;
  }
  .tabs {
    flex-direction: column;
    overflow: visible;
    gap: 0.35rem;
    margin-bottom: 0;
  }
  .tab-btn {
    width: 100%;
    text-align: left;
    font-size: 0.8rem;
    letter-spacing: 0.02em;
    padding: 0.5rem 0.7rem;
  }
  .coins-grid {
    grid-template-columns: repeat(5, minmax(0, 1fr));
    max-width: 34rem;
  }
}
</style>

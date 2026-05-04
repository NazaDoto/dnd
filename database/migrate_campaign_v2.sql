-- ============================================================
--  Migración: campaña rica + roster (personaje <-> campaña)
--  Ejecutar una vez sobre una BD ya existente (MySQL 5.7+ / 8+).
--  Si algún ADD COLUMN falla por "Duplicate column", ignorá esa línea.
-- ============================================================

USE dnd_vault;

CREATE TABLE IF NOT EXISTS campaign_characters (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  campaign_id    INT UNSIGNED NOT NULL,
  character_id   INT UNSIGNED NOT NULL,
  status         ENUM('pending','active','rejected') NOT NULL DEFAULT 'pending',
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  responded_at   DATETIME DEFAULT NULL,
  UNIQUE KEY uq_campaign_character (campaign_id, character_id),
  CONSTRAINT fk_cc_campaign FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  CONSTRAINT fk_cc_character FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_cc_campaign ON campaign_characters (campaign_id);
CREATE INDEX idx_cc_character ON campaign_characters (character_id);
CREATE INDEX idx_cc_status ON campaign_characters (campaign_id, status);

ALTER TABLE campaigns
  ADD COLUMN invite_code VARCHAR(24) NULL AFTER name,
  ADD COLUMN campaign_hook VARCHAR(280) NULL AFTER next_session_date,
  ADD COLUMN themes_truths LONGTEXT NULL AFTER campaign_hook,
  ADD COLUMN fronts_antagonists LONGTEXT NULL AFTER themes_truths,
  ADD COLUMN npcs_json JSON NULL AFTER fronts_antagonists,
  ADD COLUMN locations_maps LONGTEXT NULL AFTER npcs_json,
  ADD COLUMN session_prep LONGTEXT NULL AFTER locations_maps,
  ADD COLUMN last_session_recap LONGTEXT NULL AFTER session_prep,
  ADD COLUMN active_quests LONGTEXT NULL AFTER last_session_recap,
  ADD COLUMN treasure_log LONGTEXT NULL AFTER active_quests,
  ADD COLUMN house_rules LONGTEXT NULL AFTER treasure_log,
  ADD COLUMN dm_private_notes LONGTEXT NULL AFTER house_rules,
  ADD COLUMN resources_links LONGTEXT NULL AFTER dm_private_notes;

UPDATE campaigns
SET invite_code = CONCAT('CMP', LPAD(id, 8, '0'))
WHERE invite_code IS NULL OR invite_code = '';

ALTER TABLE campaigns MODIFY invite_code VARCHAR(24) NOT NULL;

-- Índice único de código (si ya existe uq_campaign_invite, omitir esta línea)
-- ALTER TABLE campaigns ADD UNIQUE KEY uq_campaign_invite (invite_code);

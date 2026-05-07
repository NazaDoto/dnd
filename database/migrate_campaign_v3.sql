-- ============================================================
--  Migración v3 — Entidades estructuradas por campaña
--  (sesiones, misiones, NPCs, lugares, facciones, items)
--  + columnas extra en campaigns (calendario, panteón, xp, nivel grupo)
--  Idempotente. MySQL 5.7 / 8.0+.
-- ============================================================

USE dnd_vault;

SET @db := DATABASE();

-- ------------------------------------------------------------
-- 1) Columnas extra en campaigns
-- ------------------------------------------------------------
SET @sql := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE campaigns ADD COLUMN world_calendar LONGTEXT DEFAULT NULL AFTER resources_links',
    'SELECT ''campaigns.world_calendar ya existe'' AS migrate_note'
  )
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'campaigns' AND COLUMN_NAME = 'world_calendar'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE campaigns ADD COLUMN pantheon LONGTEXT DEFAULT NULL AFTER world_calendar',
    'SELECT ''campaigns.pantheon ya existe'' AS migrate_note'
  )
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'campaigns' AND COLUMN_NAME = 'pantheon'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE campaigns ADD COLUMN xp_mode ENUM(''xp'',''hitos'') NOT NULL DEFAULT ''xp'' AFTER pantheon',
    'SELECT ''campaigns.xp_mode ya existe'' AS migrate_note'
  )
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'campaigns' AND COLUMN_NAME = 'xp_mode'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE campaigns ADD COLUMN current_party_level TINYINT UNSIGNED DEFAULT NULL AFTER xp_mode',
    'SELECT ''campaigns.current_party_level ya existe'' AS migrate_note'
  )
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'campaigns' AND COLUMN_NAME = 'current_party_level'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ------------------------------------------------------------
-- 2) Sesiones (bitácora cronológica)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS campaign_sessions (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  campaign_id     INT UNSIGNED NOT NULL,
  session_number  INT UNSIGNED DEFAULT NULL,
  session_date    DATE DEFAULT NULL,
  title           VARCHAR(200) DEFAULT NULL,
  summary         LONGTEXT DEFAULT NULL,
  recap           LONGTEXT DEFAULT NULL,
  dm_notes        LONGTEXT DEFAULT NULL,
  attendance      JSON DEFAULT NULL,
  xp_awarded      INT UNSIGNED NOT NULL DEFAULT 0,
  loot_summary    TEXT DEFAULT NULL,
  mvp_notes       TEXT DEFAULT NULL,
  next_hooks      TEXT DEFAULT NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_session_campaign FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
) ENGINE=InnoDB;

SET @sql := (
  SELECT IF(
    COUNT(*) = 0,
    'CREATE INDEX idx_session_camp ON campaign_sessions (campaign_id, session_date)',
    'SELECT ''idx_session_camp ya existe'' AS migrate_note'
  )
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'campaign_sessions' AND INDEX_NAME = 'idx_session_camp'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ------------------------------------------------------------
-- 3) Misiones / Quests
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS campaign_quests (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  campaign_id     INT UNSIGNED NOT NULL,
  title           VARCHAR(200) NOT NULL,
  status          ENUM('activa','completada','fallida','pausada','rumor') NOT NULL DEFAULT 'activa',
  type            ENUM('principal','secundaria','personal','rumor') NOT NULL DEFAULT 'secundaria',
  giver           VARCHAR(160) DEFAULT NULL,
  location        VARCHAR(200) DEFAULT NULL,
  reward          TEXT DEFAULT NULL,
  description     LONGTEXT DEFAULT NULL,
  deadline        VARCHAR(80) DEFAULT NULL,
  dm_notes        LONGTEXT DEFAULT NULL,
  sort_order      INT UNSIGNED NOT NULL DEFAULT 0,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_quest_campaign FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
) ENGINE=InnoDB;

SET @sql := (
  SELECT IF(
    COUNT(*) = 0,
    'CREATE INDEX idx_quest_camp ON campaign_quests (campaign_id, status)',
    'SELECT ''idx_quest_camp ya existe'' AS migrate_note'
  )
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'campaign_quests' AND INDEX_NAME = 'idx_quest_camp'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ------------------------------------------------------------
-- 4) NPCs estructurados
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS campaign_npcs (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  campaign_id     INT UNSIGNED NOT NULL,
  name            VARCHAR(160) NOT NULL,
  role            VARCHAR(160) DEFAULT NULL,
  race            VARCHAR(80) DEFAULT NULL,
  faction         VARCHAR(160) DEFAULT NULL,
  location        VARCHAR(200) DEFAULT NULL,
  disposition     ENUM('aliado','amistoso','neutral','desconfiado','hostil','desconocido') NOT NULL DEFAULT 'neutral',
  status          ENUM('vivo','desaparecido','muerto','retirado','desconocido') NOT NULL DEFAULT 'vivo',
  voice_quirk     TEXT DEFAULT NULL,
  description     TEXT DEFAULT NULL,
  secret          LONGTEXT DEFAULT NULL,
  dm_notes        LONGTEXT DEFAULT NULL,
  portrait_url    VARCHAR(500) DEFAULT NULL,
  sort_order      INT UNSIGNED NOT NULL DEFAULT 0,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_npc_campaign FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
) ENGINE=InnoDB;

SET @sql := (
  SELECT IF(
    COUNT(*) = 0,
    'CREATE INDEX idx_npc_camp ON campaign_npcs (campaign_id)',
    'SELECT ''idx_npc_camp ya existe'' AS migrate_note'
  )
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'campaign_npcs' AND INDEX_NAME = 'idx_npc_camp'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ------------------------------------------------------------
-- 5) Lugares (con jerarquía padre/hijo)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS campaign_locations (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  campaign_id     INT UNSIGNED NOT NULL,
  name            VARCHAR(200) NOT NULL,
  type            ENUM('region','ciudad','pueblo','aldea','mazmorra','templo','fortaleza','taberna','tienda','ruina','plano','otro') NOT NULL DEFAULT 'otro',
  parent_id       INT UNSIGNED DEFAULT NULL,
  description     LONGTEXT DEFAULT NULL,
  map_url         VARCHAR(500) DEFAULT NULL,
  discovered      BOOLEAN NOT NULL DEFAULT TRUE,
  dm_notes        LONGTEXT DEFAULT NULL,
  sort_order      INT UNSIGNED NOT NULL DEFAULT 0,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_loc_campaign FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  CONSTRAINT fk_loc_parent FOREIGN KEY (parent_id) REFERENCES campaign_locations(id) ON DELETE SET NULL
) ENGINE=InnoDB;

SET @sql := (
  SELECT IF(
    COUNT(*) = 0,
    'CREATE INDEX idx_loc_camp ON campaign_locations (campaign_id)',
    'SELECT ''idx_loc_camp ya existe'' AS migrate_note'
  )
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'campaign_locations' AND INDEX_NAME = 'idx_loc_camp'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ------------------------------------------------------------
-- 6) Facciones / Organizaciones
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS campaign_factions (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  campaign_id       INT UNSIGNED NOT NULL,
  name              VARCHAR(200) NOT NULL,
  type              VARCHAR(80) DEFAULT NULL,
  alignment         VARCHAR(40) DEFAULT NULL,
  leader            VARCHAR(160) DEFAULT NULL,
  goals             LONGTEXT DEFAULT NULL,
  resources         TEXT DEFAULT NULL,
  allies            TEXT DEFAULT NULL,
  enemies           TEXT DEFAULT NULL,
  party_reputation  TINYINT NOT NULL DEFAULT 0,
  description       LONGTEXT DEFAULT NULL,
  dm_notes          LONGTEXT DEFAULT NULL,
  sort_order        INT UNSIGNED NOT NULL DEFAULT 0,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_faction_campaign FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
) ENGINE=InnoDB;

SET @sql := (
  SELECT IF(
    COUNT(*) = 0,
    'CREATE INDEX idx_faction_camp ON campaign_factions (campaign_id)',
    'SELECT ''idx_faction_camp ya existe'' AS migrate_note'
  )
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'campaign_factions' AND INDEX_NAME = 'idx_faction_camp'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ------------------------------------------------------------
-- 7) Items / Botín
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS campaign_items (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  campaign_id     INT UNSIGNED NOT NULL,
  name            VARCHAR(200) NOT NULL,
  rarity          ENUM('comun','no_comun','raro','muy_raro','legendario','artefacto','sin_clasificar') NOT NULL DEFAULT 'sin_clasificar',
  type            VARCHAR(80) DEFAULT NULL,
  attunement      BOOLEAN NOT NULL DEFAULT FALSE,
  attuned_to      VARCHAR(160) DEFAULT NULL,
  current_owner   VARCHAR(200) DEFAULT NULL,
  source          VARCHAR(200) DEFAULT NULL,
  awarded_at      DATE DEFAULT NULL,
  value_gp        INT UNSIGNED DEFAULT NULL,
  quantity        SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  description     LONGTEXT DEFAULT NULL,
  dm_notes        LONGTEXT DEFAULT NULL,
  sort_order      INT UNSIGNED NOT NULL DEFAULT 0,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_item_campaign FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
) ENGINE=InnoDB;

SET @sql := (
  SELECT IF(
    COUNT(*) = 0,
    'CREATE INDEX idx_item_camp ON campaign_items (campaign_id, rarity)',
    'SELECT ''idx_item_camp ya existe'' AS migrate_note'
  )
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'campaign_items' AND INDEX_NAME = 'idx_item_camp'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ============================================================
--  DnD Vault — Schema MySQL
--  Motor: InnoDB | Charset: utf8mb4
-- ============================================================

CREATE DATABASE IF NOT EXISTS dnd_vault
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE dnd_vault;

-- ------------------------------------------------------------
-- USUARIOS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username    VARCHAR(50)  NOT NULL UNIQUE,
  email       VARCHAR(120) NOT NULL UNIQUE,
  password    VARCHAR(255) NOT NULL,
  role        ENUM('administrador','jugador','dm') NOT NULL DEFAULT 'jugador',
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- PERSONAJES
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS characters (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id             INT UNSIGNED NOT NULL,
  photo_url           VARCHAR(500) DEFAULT NULL,

  -- Identidad
  name                VARCHAR(100) NOT NULL,
  class               VARCHAR(50)  NOT NULL,
  subclass            VARCHAR(80)  DEFAULT NULL,
  level               TINYINT UNSIGNED NOT NULL DEFAULT 1,
  background          VARCHAR(80)  DEFAULT NULL,
  race                VARCHAR(60)  NOT NULL,
  subrace             VARCHAR(80)  DEFAULT NULL,
  alignment           VARCHAR(30)  DEFAULT NULL,
  experience_points   INT UNSIGNED NOT NULL DEFAULT 0,

  -- Atributos base (1-30)
  strength            TINYINT UNSIGNED NOT NULL DEFAULT 10,
  dexterity           TINYINT UNSIGNED NOT NULL DEFAULT 10,
  constitution        TINYINT UNSIGNED NOT NULL DEFAULT 10,
  intelligence        TINYINT UNSIGNED NOT NULL DEFAULT 10,
  wisdom              TINYINT UNSIGNED NOT NULL DEFAULT 10,
  charisma            TINYINT UNSIGNED NOT NULL DEFAULT 10,

  -- Combate
  armor_class         TINYINT UNSIGNED NOT NULL DEFAULT 10,
  initiative          TINYINT          NOT NULL DEFAULT 0,
  speed               TINYINT UNSIGNED NOT NULL DEFAULT 30,
  hit_points_max      SMALLINT UNSIGNED NOT NULL DEFAULT 8,
  hit_points_current  SMALLINT          NOT NULL DEFAULT 8,
  hit_points_temp     SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  hit_dice            VARCHAR(20)       DEFAULT '1d8',

  -- Salvaciones (proficiencias como bitmask o JSON)
  saving_throws_prof  JSON DEFAULT NULL,   -- ["strength","wisdom"]

  -- Habilidades con proficiencia
  skills_prof         JSON DEFAULT NULL,   -- ["acrobatics","stealth"]
  skills_expertise    JSON DEFAULT NULL,

  -- Inspiración & bono de proficiencia
  inspiration         BOOLEAN NOT NULL DEFAULT FALSE,
  proficiency_bonus   TINYINT UNSIGNED NOT NULL DEFAULT 2,

  -- Percepción pasiva (calculada pero almacenada para rapidez)
  passive_perception  TINYINT UNSIGNED NOT NULL DEFAULT 10,

  -- Trasfondo
  personality_traits  TEXT DEFAULT NULL,
  ideals              TEXT DEFAULT NULL,
  bonds               TEXT DEFAULT NULL,
  flaws               TEXT DEFAULT NULL,
  backstory           LONGTEXT DEFAULT NULL,

  -- Apariencia
  age                 VARCHAR(30) DEFAULT NULL,
  height              VARCHAR(30) DEFAULT NULL,
  weight              VARCHAR(30) DEFAULT NULL,
  eyes                VARCHAR(30) DEFAULT NULL,
  skin                VARCHAR(30) DEFAULT NULL,
  hair                VARCHAR(30) DEFAULT NULL,
  appearance_notes    TEXT DEFAULT NULL,

  -- Equipo & monedas
  equipment           JSON DEFAULT NULL,
  copper_pieces       SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  silver_pieces       SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  electrum_pieces     SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  gold_pieces         SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  platinum_pieces     SMALLINT UNSIGNED NOT NULL DEFAULT 0,

  -- Ataques y conjuros
  attacks_spellcasting JSON DEFAULT NULL,

  -- Rasgos, dotes, capacidades especiales
  features_traits     JSON DEFAULT NULL,

  -- Conjuros
  spellcasting_ability VARCHAR(20) DEFAULT NULL,
  spell_save_dc        TINYINT UNSIGNED DEFAULT NULL,
  spell_attack_bonus   TINYINT          DEFAULT NULL,
  spells               JSON DEFAULT NULL,
  -- { "cantrips": [], "level1": { "slots": 2, "slots_used": 0, "spells": [] }, ... }

  -- Idiomas y otras proficiencias
  languages           JSON DEFAULT NULL,
  other_proficiencies JSON DEFAULT NULL,

  -- Alianzas
  allies_organizations TEXT DEFAULT NULL,
  faction             VARCHAR(80) DEFAULT NULL,

  -- Tesoros
  treasure            TEXT DEFAULT NULL,

  -- Timestamps
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_char_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- NOTAS DE CAMPAÑA
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notes (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  character_id INT UNSIGNED NOT NULL,
  user_id      INT UNSIGNED NOT NULL,
  title        VARCHAR(200) DEFAULT NULL,
  content      LONGTEXT     NOT NULL,
  session_date DATE         DEFAULT NULL,
  tags         JSON         DEFAULT NULL,   -- ["combat","npc","loot"]
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_note_char FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
  CONSTRAINT fk_note_user FOREIGN KEY (user_id)      REFERENCES users(id)      ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- VÍNCULOS DM <-> JUGADORES
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dm_player_links (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  dm_user_id      INT UNSIGNED NOT NULL,
  player_user_id  INT UNSIGNED NOT NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_dm_player (dm_user_id, player_user_id),
  CONSTRAINT fk_link_dm FOREIGN KEY (dm_user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_link_player FOREIGN KEY (player_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- CAMPAÑAS (gestionadas por DM)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS campaigns (
  id                   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  dm_user_id           INT UNSIGNED NOT NULL,
  name                 VARCHAR(120) NOT NULL,
  invite_code          VARCHAR(24)  NOT NULL,
  setting_name         VARCHAR(120) DEFAULT NULL,
  summary              LONGTEXT DEFAULT NULL,
  status               ENUM('activa','pausada','finalizada') NOT NULL DEFAULT 'activa',
  start_date           DATE DEFAULT NULL,
  next_session_date    DATE DEFAULT NULL,
  campaign_hook        VARCHAR(280) DEFAULT NULL,
  themes_truths        LONGTEXT DEFAULT NULL,
  fronts_antagonists   LONGTEXT DEFAULT NULL,
  npcs_json            JSON DEFAULT NULL,
  locations_maps       LONGTEXT DEFAULT NULL,
  session_prep         LONGTEXT DEFAULT NULL,
  last_session_recap   LONGTEXT DEFAULT NULL,
  active_quests        LONGTEXT DEFAULT NULL,
  treasure_log         LONGTEXT DEFAULT NULL,
  house_rules          LONGTEXT DEFAULT NULL,
  dm_private_notes     LONGTEXT DEFAULT NULL,
  resources_links      LONGTEXT DEFAULT NULL,
  world_calendar       LONGTEXT DEFAULT NULL,
  pantheon             LONGTEXT DEFAULT NULL,
  xp_mode              ENUM('xp','hitos') NOT NULL DEFAULT 'xp',
  current_party_level  TINYINT UNSIGNED DEFAULT NULL,
  created_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_campaign_dm FOREIGN KEY (dm_user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uq_campaign_invite (invite_code)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- SESIONES (bitácora cronológica por campaña)
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

-- ------------------------------------------------------------
-- MISIONES / QUESTS
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

-- ------------------------------------------------------------
-- NPCs estructurados
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

-- ------------------------------------------------------------
-- LUGARES (con jerarquía padre/hijo)
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

-- ------------------------------------------------------------
-- FACCIONES / ORGANIZACIONES
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

-- ------------------------------------------------------------
-- ITEMS / BOTÍN
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

-- ------------------------------------------------------------
-- PERSONAJES EN CAMPAÑA (solicitud del jugador + aceptación DM)
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- Índices de búsqueda
-- ------------------------------------------------------------
CREATE INDEX idx_characters_user ON characters(user_id);
CREATE INDEX idx_notes_character  ON notes(character_id);
CREATE INDEX idx_notes_user       ON notes(user_id);
CREATE INDEX idx_users_role       ON users(role);
CREATE INDEX idx_links_dm         ON dm_player_links(dm_user_id);
CREATE INDEX idx_links_player     ON dm_player_links(player_user_id);
CREATE INDEX idx_campaigns_dm     ON campaigns(dm_user_id);
CREATE INDEX idx_cc_campaign      ON campaign_characters(campaign_id);
CREATE INDEX idx_cc_character     ON campaign_characters(character_id);
CREATE INDEX idx_cc_status        ON campaign_characters(campaign_id, status);
CREATE INDEX idx_session_camp     ON campaign_sessions(campaign_id, session_date);
CREATE INDEX idx_quest_camp       ON campaign_quests(campaign_id, status);
CREATE INDEX idx_npc_camp         ON campaign_npcs(campaign_id);
CREATE INDEX idx_loc_camp         ON campaign_locations(campaign_id);
CREATE INDEX idx_loc_parent       ON campaign_locations(parent_id);
CREATE INDEX idx_faction_camp     ON campaign_factions(campaign_id);
CREATE INDEX idx_item_camp        ON campaign_items(campaign_id, rarity);

-- ------------------------------------------------------------
-- ILUSTRACIONES DE SESIÓN (generadas por IA)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS session_illustrations (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  session_id      INT UNSIGNED NOT NULL,
  campaign_id     INT UNSIGNED NOT NULL,
  image_url       VARCHAR(500) NOT NULL,
  prompt          LONGTEXT NOT NULL,
  model           VARCHAR(80) NOT NULL,
  references_used JSON DEFAULT NULL,
  intensity       ENUM('soft','medium','hard') NOT NULL DEFAULT 'medium',
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_illust_session FOREIGN KEY (session_id) REFERENCES campaign_sessions(id) ON DELETE CASCADE,
  CONSTRAINT fk_illust_campaign FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE INDEX idx_illust_session   ON session_illustrations(session_id, created_at);
CREATE INDEX idx_illust_campaign  ON session_illustrations(campaign_id);
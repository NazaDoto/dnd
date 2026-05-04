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
-- Índices de búsqueda
-- ------------------------------------------------------------
CREATE INDEX idx_characters_user ON characters(user_id);
CREATE INDEX idx_notes_character  ON notes(character_id);
CREATE INDEX idx_notes_user       ON notes(user_id);
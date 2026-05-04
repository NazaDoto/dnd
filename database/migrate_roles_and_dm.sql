-- ============================================================
--  DnD Vault — Migración roles + DM (MySQL 5.7 / 8.0)
--  Idempotente: no borra datos. No usa IF NOT EXISTS en ALTER/INDEX
--  (no soportado en muchas versiones de MySQL).
-- ============================================================

USE dnd_vault;

-- ------------------------------------------------------------
-- 1) Columna users.role (solo si no existe)
-- ------------------------------------------------------------
SET @db := DATABASE();
SET @sql := (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE users ADD COLUMN role ENUM(''administrador'',''jugador'',''dm'') NOT NULL DEFAULT ''jugador'' AFTER password',
    'SELECT ''users.role ya existe'' AS migrate_note'
  )
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db
    AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'role'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ------------------------------------------------------------
-- 2) Índice users(role) (solo si no existe)
-- ------------------------------------------------------------
SET @sql := (
  SELECT IF(
    COUNT(*) = 0,
    'CREATE INDEX idx_users_role ON users (role)',
    'SELECT ''idx_users_role ya existe'' AS migrate_note'
  )
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = @db
    AND TABLE_NAME = 'users'
    AND INDEX_NAME = 'idx_users_role'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ------------------------------------------------------------
-- 3) Tablas nuevas
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

CREATE TABLE IF NOT EXISTS campaigns (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  dm_user_id        INT UNSIGNED NOT NULL,
  name              VARCHAR(120) NOT NULL,
  setting_name      VARCHAR(120) DEFAULT NULL,
  summary           LONGTEXT DEFAULT NULL,
  status            ENUM('activa','pausada','finalizada') NOT NULL DEFAULT 'activa',
  start_date        DATE DEFAULT NULL,
  next_session_date DATE DEFAULT NULL,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_campaign_dm FOREIGN KEY (dm_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- 4) Índices en tablas nuevas (solo si no existen)
-- ------------------------------------------------------------
SET @sql := (
  SELECT IF(
    COUNT(*) = 0,
    'CREATE INDEX idx_links_dm ON dm_player_links (dm_user_id)',
    'SELECT ''idx_links_dm ya existe'' AS migrate_note'
  )
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = @db
    AND TABLE_NAME = 'dm_player_links'
    AND INDEX_NAME = 'idx_links_dm'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    COUNT(*) = 0,
    'CREATE INDEX idx_links_player ON dm_player_links (player_user_id)',
    'SELECT ''idx_links_player ya existe'' AS migrate_note'
  )
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = @db
    AND TABLE_NAME = 'dm_player_links'
    AND INDEX_NAME = 'idx_links_player'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    COUNT(*) = 0,
    'CREATE INDEX idx_campaigns_dm ON campaigns (dm_user_id)',
    'SELECT ''idx_campaigns_dm ya existe'' AS migrate_note'
  )
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = @db
    AND TABLE_NAME = 'campaigns'
    AND INDEX_NAME = 'idx_campaigns_dm'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

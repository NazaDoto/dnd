-- ============================================================
--  Migración v4 — Ilustraciones de sesión generadas por IA
--  Idempotente. MySQL 5.7 / 8.0+.
-- ============================================================

USE dnd_vault;

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

SET @db := DATABASE();
SET @sql := (
  SELECT IF(
    COUNT(*) = 0,
    'CREATE INDEX idx_illust_session ON session_illustrations (session_id, created_at)',
    'SELECT ''idx_illust_session ya existe'' AS migrate_note'
  )
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'session_illustrations' AND INDEX_NAME = 'idx_illust_session'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(
    COUNT(*) = 0,
    'CREATE INDEX idx_illust_campaign ON session_illustrations (campaign_id)',
    'SELECT ''idx_illust_campaign ya existe'' AS migrate_note'
  )
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'session_illustrations' AND INDEX_NAME = 'idx_illust_campaign'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

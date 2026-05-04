USE dnd_vault;

START TRANSACTION;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS role ENUM('administrador','jugador','dm') NOT NULL DEFAULT 'jugador' AFTER password;

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

CREATE TABLE IF NOT EXISTS dm_player_links (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  dm_user_id      INT UNSIGNED NOT NULL,
  player_user_id  INT UNSIGNED NOT NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_dm_player (dm_user_id, player_user_id),
  CONSTRAINT fk_link_dm FOREIGN KEY (dm_user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_link_player FOREIGN KEY (player_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE INDEX IF NOT EXISTS idx_links_dm ON dm_player_links(dm_user_id);
CREATE INDEX IF NOT EXISTS idx_links_player ON dm_player_links(player_user_id);

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

CREATE INDEX IF NOT EXISTS idx_campaigns_dm ON campaigns(dm_user_id);

COMMIT;

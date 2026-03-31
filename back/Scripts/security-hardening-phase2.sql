-- Security hardening phase 2
-- Execute in staging first. Keep soft-delete semantics only.

START TRANSACTION;

-- 1) Soft-delete columns for legacy tables
ALTER TABLE image
  ADD COLUMN state TINYINT NOT NULL DEFAULT 1;

ALTER TABLE schedule
  ADD COLUMN state TINYINT NOT NULL DEFAULT 1;

ALTER TABLE notifications
  ADD COLUMN state TINYINT NOT NULL DEFAULT 1;

-- 2) Audit log for sensitive actions
CREATE TABLE IF NOT EXISTS audit_log (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  actor_id INT UNSIGNED NULL,
  action VARCHAR(100) NOT NULL,
  target_table VARCHAR(64) NULL,
  target_id BIGINT NULL,
  details JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_audit_actor_created (actor_id, created_at),
  INDEX idx_audit_action_created (action, created_at)
) ENGINE=InnoDB;

-- 3) Suspicious activity logs
CREATE TABLE IF NOT EXISTS suspicious_activity_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NULL,
  ip_address VARCHAR(64) NULL,
  event_type VARCHAR(100) NOT NULL,
  details JSON NULL,
  severity ENUM('low','medium','high','critical') NOT NULL DEFAULT 'medium',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_suspicious_user_created (user_id, created_at),
  INDEX idx_suspicious_event_created (event_type, created_at),
  INDEX idx_suspicious_severity_created (severity, created_at)
) ENGINE=InnoDB;

-- 4) Blacklist tables
CREATE TABLE IF NOT EXISTS security_blacklist (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  subject_type ENUM('ip','user') NOT NULL,
  subject_value VARCHAR(128) NOT NULL,
  is_permanent TINYINT NOT NULL DEFAULT 0,
  expires_at DATETIME NULL,
  reason VARCHAR(255) NULL,
  created_by INT UNSIGNED NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_blacklist_subject (subject_type, subject_value)
) ENGINE=InnoDB;

-- 5) Config table managed by admin endpoints
CREATE TABLE IF NOT EXISTS app_config (
  config_key VARCHAR(100) NOT NULL,
  config_value JSON NOT NULL,
  updated_by INT UNSIGNED NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (config_key)
) ENGINE=InnoDB;

-- 6) Useful indexes for security/report paths
CREATE INDEX idx_notifications_user_state_created ON notifications(userId, state, createdAt);
CREATE INDEX idx_image_request_state ON image(idRequest, state);
CREATE INDEX idx_schedule_request_state ON schedule(requestId, state);
CREATE INDEX idx_material_state_name ON material(state, name);
CREATE INDEX idx_announcement_state_created ON announcement(state, createdDate);

COMMIT;

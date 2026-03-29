import db from '../config/DBConnect.js';

let warnedMissingTables = false;

const warnMissingTables = (error) => {
  if (warnedMissingTables) return;
  if (error?.code === 'ER_NO_SUCH_TABLE') {
    console.warn('[SECURITY] Tablas de seguridad no existen aun. Ejecuta migracion de seguridad.');
    warnedMissingTables = true;
  }
};

export const logSuspiciousActivity = async ({
  userId = null,
  ip = null,
  eventType,
  details = null,
  severity = 'medium'
}) => {
  try {
    await db.query(
      `INSERT INTO suspicious_activity_logs (user_id, ip_address, event_type, details, severity, created_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [userId, ip, eventType, details ? JSON.stringify(details) : null, severity]
    );
  } catch (error) {
    warnMissingTables(error);
  }
};

export const logAuditAction = async ({
  actorId = null,
  action,
  targetTable = null,
  targetId = null,
  details = null
}) => {
  try {
    await db.query(
      `INSERT INTO audit_log (actor_id, action, target_table, target_id, details, created_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [actorId, action, targetTable, targetId, details ? JSON.stringify(details) : null]
    );
  } catch (error) {
    warnMissingTables(error);
  }
};

export const getConfigValue = async (key) => {
  const [rows] = await db.query(
    `SELECT config_key, config_value, updated_by, updated_at
     FROM app_config
     WHERE config_key = ?`,
    [key]
  );
  return rows[0] || null;
};

export const upsertConfigValue = async ({ key, value, updatedBy = null }) => {
  await db.query(
    `INSERT INTO app_config (config_key, config_value, updated_by)
     VALUES (?, CAST(? AS JSON), ?)
     ON DUPLICATE KEY UPDATE
       config_value = CAST(VALUES(config_value) AS JSON),
       updated_by = VALUES(updated_by),
       updated_at = CURRENT_TIMESTAMP`,
    [key, JSON.stringify(value), updatedBy]
  );
};

export const getSuspiciousActivity = async ({ limit = 100, offset = 0 }) => {
  const [rows] = await db.query(
    `SELECT id, user_id, ip_address, event_type, details, severity, created_at
     FROM suspicious_activity_logs
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [limit, offset]
  );
  return rows;
};

export const addBlacklistEntry = async ({
  subjectType,
  subjectValue,
  isPermanent = false,
  expiresAt = null,
  reason = null,
  createdBy = null
}) => {
  await db.query(
    `INSERT INTO security_blacklist (subject_type, subject_value, is_permanent, expires_at, reason, created_by)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       is_permanent = VALUES(is_permanent),
       expires_at = VALUES(expires_at),
       reason = VALUES(reason),
       created_by = VALUES(created_by),
       created_at = CURRENT_TIMESTAMP`,
    [subjectType, subjectValue, isPermanent ? 1 : 0, expiresAt, reason, createdBy]
  );
};

export const isBlacklisted = async ({ userId = null, ip = null }) => {
  const subjects = [];
  const params = [];

  if (userId) {
    subjects.push(`(subject_type = 'user' AND subject_value = ?)`);
    params.push(String(userId));
  }

  if (ip) {
    subjects.push(`(subject_type = 'ip' AND subject_value = ?)`);
    params.push(String(ip));
  }

  if (subjects.length === 0) return false;

  try {
    const [rows] = await db.query(
      `SELECT id
       FROM security_blacklist
       WHERE (${subjects.join(' OR ')})
         AND (is_permanent = 1 OR (expires_at IS NOT NULL AND expires_at > NOW()))
       LIMIT 1`,
      params
    );

    return rows.length > 0;
  } catch (error) {
    warnMissingTables(error);
    return false;
  }
};

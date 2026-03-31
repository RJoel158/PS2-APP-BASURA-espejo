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
  try {
    const [rows] = await db.query(
      `SELECT config_key, config_value, updated_by, updated_at
       FROM app_config
       WHERE config_key = ?`,
      [key]
    );
    return rows[0] || null;
  } catch (error) {
    warnMissingTables(error);
    return null;
  }
};

export const listConfigValues = async ({ limit = 100, offset = 0 } = {}) => {
  try {
    const [rows] = await db.query(
      `SELECT config_key, config_value, updated_by, updated_at
       FROM app_config
       ORDER BY config_key ASC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    return rows;
  } catch (error) {
    warnMissingTables(error);
    return [];
  }
};

export const upsertConfigValue = async ({ key, value, updatedBy = null }) => {
  try {
    await db.query(
      `INSERT INTO app_config (config_key, config_value, updated_by)
       VALUES (?, CAST(? AS JSON), ?)
       ON DUPLICATE KEY UPDATE
         config_value = CAST(VALUES(config_value) AS JSON),
         updated_by = VALUES(updated_by),
         updated_at = CURRENT_TIMESTAMP`,
      [key, JSON.stringify(value), updatedBy]
    );
  } catch (error) {
    warnMissingTables(error);
    throw error;
  }
};

export const getSuspiciousActivity = async ({ limit = 100, offset = 0 }) => {
  try {
    const [rows] = await db.query(
      `SELECT
         s.id,
         s.user_id,
         COALESCE(
           NULLIF(TRIM(CONCAT(p.firstname, ' ', p.lastname)), ''),
           NULLIF(TRIM(i.companyName), ''),
           u.email,
           'Anónimo'
         ) AS user_name,
         s.ip_address,
         s.event_type,
         s.details,
         s.severity,
         s.created_at
       FROM suspicious_activity_logs s
       LEFT JOIN users u ON u.id = s.user_id
       LEFT JOIN person p ON p.userId = u.id
       LEFT JOIN institution i ON i.userId = u.id
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    return rows;
  } catch (error) {
    warnMissingTables(error);
    return [];
  }
};

export const getSuspiciousActivityGrouped = async ({ limit = 100, offset = 0 }) => {
  try {
    const [rows] = await db.query(
      `SELECT
         DATE(s.created_at) AS activity_date,
         s.user_id,
         COALESCE(
           NULLIF(TRIM(CONCAT(p.firstname, ' ', p.lastname)), ''),
           NULLIF(TRIM(i.companyName), ''),
           u.email,
           'Anónimo'
         ) AS user_name,
         s.ip_address,
         COUNT(*) AS violation_count,
         MAX(s.created_at) AS last_event_at,
         GROUP_CONCAT(DISTINCT s.event_type ORDER BY s.event_type SEPARATOR ', ') AS event_types
       FROM suspicious_activity_logs s
       LEFT JOIN users u ON u.id = s.user_id
       LEFT JOIN person p ON p.userId = u.id
       LEFT JOIN institution i ON i.userId = u.id
       GROUP BY DATE(s.created_at), s.user_id, s.ip_address
       ORDER BY last_event_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    return rows;
  } catch (error) {
    warnMissingTables(error);
    return [];
  }
};

export const getSuspiciousActivityDetails = async ({ activityDate, userId = null, ipAddress = null, limit = 100, offset = 0 }) => {
  try {
    const conditions = ['DATE(created_at) = ?'];
    const params = [activityDate];

    if (userId === null || userId === undefined || userId === '') {
      conditions.push('user_id IS NULL');
    } else {
      conditions.push('user_id = ?');
      params.push(Number(userId));
    }

    if (ipAddress === null || ipAddress === undefined || ipAddress === '') {
      conditions.push('ip_address IS NULL');
    } else {
      conditions.push('ip_address = ?');
      params.push(String(ipAddress));
    }

    params.push(limit, offset);

    const [rows] = await db.query(
      `SELECT id, user_id, ip_address, event_type, details, severity, created_at
       FROM suspicious_activity_logs
       WHERE ${conditions.join(' AND ')}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      params
    );

    return rows;
  } catch (error) {
    warnMissingTables(error);
    return [];
  }
};

export const getAuditLog = async ({ limit = 100, offset = 0 }) => {
  try {
    const [rows] = await db.query(
      `SELECT
         a.id,
         a.actor_id,
         COALESCE(
           NULLIF(TRIM(CONCAT(p.firstname, ' ', p.lastname)), ''),
           NULLIF(TRIM(i.companyName), ''),
           u.email,
           'Sistema'
         ) AS actor_name,
         a.action,
         a.target_table,
         a.target_id,
         a.details,
         a.created_at
       FROM audit_log a
       LEFT JOIN users u ON u.id = a.actor_id
       LEFT JOIN person p ON p.userId = u.id
       LEFT JOIN institution i ON i.userId = u.id
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    return rows;
  } catch (error) {
    warnMissingTables(error);
    return [];
  }
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

export const getBlacklistEntries = async ({ limit = 100, offset = 0 }) => {
  try {
    const [rows] = await db.query(
      `SELECT id, subject_type, subject_value, is_permanent, expires_at, reason, created_by, created_at,
              (is_permanent = 1 OR (expires_at IS NOT NULL AND expires_at > NOW())) AS is_active
       FROM security_blacklist
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    return rows;
  } catch (error) {
    warnMissingTables(error);
    return [];
  }
};

export const deactivateBlacklistEntry = async ({ id }) => {
  await db.query(
    `UPDATE security_blacklist
     SET is_permanent = 0,
         expires_at = NOW(),
         reason = CONCAT(COALESCE(reason, ''), IF(COALESCE(reason, '') = '', '', ' | '), 'deactivated')
     WHERE id = ?`,
    [id]
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

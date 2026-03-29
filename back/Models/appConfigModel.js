import db from '../config/DBConnect.js';

/**
 * Obtener una configuracion por su clave.
 */
export const getByKey = async (configKey) => {
  const [rows] = await db.query(
    `SELECT config_key, config_value, updated_by, updated_at
     FROM app_config
     WHERE config_key = ?
     LIMIT 1`,
    [configKey]
  );

  return rows[0] || null;
};

/**
 * Crea o actualiza una configuracion por config_key.

 */
export const upsert = async (configKey, configValue, updatedBy) => {
  const [result] = await db.query(
    `INSERT INTO app_config (config_key, config_value, updated_by, updated_at)
     VALUES (?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE
       config_value = VALUES(config_value),
       updated_by = VALUES(updated_by),
       updated_at = NOW()`,
    [configKey, configValue, updatedBy]
  );

  return result;
};

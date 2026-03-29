import * as AppConfigModel from '../Models/appConfigModel.js';

const parseUpdatedBy = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const isValidJson = (value) => {
  if (typeof value !== 'string') {
    return false;
  }

  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
};


const normalizeConfigValueForStorage = (value) => {
  if (typeof value === 'string') {
    return isValidJson(value) ? value : JSON.stringify(value);
  }

  return JSON.stringify(value);
};

const normalizeConfigValueForResponse = (value) => {
  if (typeof value !== 'string') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

/**
 * POST /api/app-config
 * Body: { config_key, config_value, updated_by }
 */
export const saveAppConfig = async (req, res) => {
  try {
    const { config_key, config_value, updated_by } = req.body;

    if (!config_key || typeof config_key !== 'string' || !config_key.trim()) {
      return res.status(400).json({
        success: false,
        error: 'config_key es requerido y debe ser texto'
      });
    }

    if (config_value === undefined || config_value === null) {
      return res.status(400).json({
        success: false,
        error: 'config_value es requerido'
      });
    }

    const updatedBy = parseUpdatedBy(updated_by);
    if (!updatedBy) {
      return res.status(400).json({
        success: false,
        error: 'updated_by es requerido y debe ser un entero positivo'
      });
    }

    const configKey = config_key.trim();
    const normalizedValue = normalizeConfigValueForStorage(config_value);
    await AppConfigModel.upsert(configKey, normalizedValue, updatedBy);

   
    return res.status(201).json({
      success: true,
      message: 'Configuracion guardada correctamente',
      data: {
        config_key: configKey,
        config_value: config_value,
        updated_by: updatedBy,
        updated_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[ERROR] appConfigController.saveAppConfig:', error);

    if (error?.errno === 4025 || error?.sqlState === '23000') {
      return res.status(400).json({
        success: false,
        error: 'config_value no cumple el constraint de la tabla (debe ser JSON valido)'
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Error al guardar configuracion'
    });
  }
};

/**
 * GET /api/app-config/:configKey
 */
export const getAppConfigByKey = async (req, res) => {
  try {
    const { configKey } = req.params;

    if (!configKey || !configKey.trim()) {
      return res.status(400).json({
        success: false,
        error: 'configKey es requerido'
      });
    }

    const config = await AppConfigModel.getByKey(configKey.trim());

    if (!config) {
      return res.status(404).json({
        success: false,
        error: 'Configuracion no encontrada'
      });
    }

    config.config_value = normalizeConfigValueForResponse(config.config_value);

    return res.json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('[ERROR] appConfigController.getAppConfigByKey:', error);
    return res.status(500).json({
      success: false,
      error: 'Error al obtener configuracion'
    });
  }
};

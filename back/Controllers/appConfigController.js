import * as AppConfigModel from '../Models/appConfigModel.js';
import { invalidateCoverageConfigCache } from '../Services/geofenceService.js';

const ALLOWED_APP_CONFIG_KEYS = new Set([
  'start_hour',
  'end_hour',
  'ranking_decrease',
  'geo_restriction_enabled',
  'geo_restriction_message',
  'geo_bolivia_bbox',
  'geo_allowed_zones',
]);

const HOUR_24H_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const validateBoundingBox = (value) => {
  if (!value || typeof value !== 'object') return false;
  const minLat = Number(value.minLat);
  const maxLat = Number(value.maxLat);
  const minLng = Number(value.minLng);
  const maxLng = Number(value.maxLng);

  if (![minLat, maxLat, minLng, maxLng].every(Number.isFinite)) {
    return false;
  }

  return minLat <= maxLat && minLng <= maxLng;
};

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

const validateAndNormalizeAllowedConfig = (configKey, configValue) => {
  if (!ALLOWED_APP_CONFIG_KEYS.has(configKey)) {
    return {
      valid: false,
      error: 'config_key no permitida para este modulo'
    };
  }

  if (configKey === 'start_hour' || configKey === 'end_hour') {
    if (typeof configValue !== 'string' || !HOUR_24H_PATTERN.test(configValue)) {
      return {
        valid: false,
        error: 'Para start_hour y end_hour se requiere formato HH:mm'
      };
    }

    return {
      valid: true,
      normalizedValue: configValue
    };
  }

  if (configKey === 'ranking_decrease') {
    const parsed = Number(configValue);

    if (!Number.isFinite(parsed)) {
      return {
        valid: false,
        error: 'ranking_decrease debe ser numerico'
      };
    }

    const normalizedPercent = Math.max(0, Math.min(100, Math.round(parsed)));
    return {
      valid: true,
      normalizedValue: normalizedPercent
    };
  }

  if (configKey === 'geo_restriction_enabled') {
    if (typeof configValue === 'boolean') {
      return {
        valid: true,
        normalizedValue: configValue,
      };
    }

    if (configValue === 0 || configValue === 1 || configValue === '0' || configValue === '1') {
      return {
        valid: true,
        normalizedValue: String(configValue) === '1',
      };
    }

    return {
      valid: false,
      error: 'geo_restriction_enabled debe ser boolean'
    };
  }

  if (configKey === 'geo_restriction_message') {
    if (typeof configValue !== 'string' || !configValue.trim()) {
      return {
        valid: false,
        error: 'geo_restriction_message debe ser texto no vacio'
      };
    }

    return {
      valid: true,
      normalizedValue: configValue.trim().slice(0, 220)
    };
  }

  if (configKey === 'geo_bolivia_bbox') {
    if (!validateBoundingBox(configValue)) {
      return {
        valid: false,
        error: 'geo_bolivia_bbox debe incluir minLat, maxLat, minLng, maxLng validos'
      };
    }

    return {
      valid: true,
      normalizedValue: configValue
    };
  }

  if (configKey === 'geo_allowed_zones') {
    if (!Array.isArray(configValue)) {
      return {
        valid: false,
        error: 'geo_allowed_zones debe ser un arreglo de zonas'
      };
    }

    const validZones = configValue.every((zone) => validateBoundingBox(zone));
    if (!validZones) {
      return {
        valid: false,
        error: 'Cada zona en geo_allowed_zones debe incluir minLat, maxLat, minLng, maxLng'
      };
    }

    return {
      valid: true,
      normalizedValue: configValue
    };
  }

  return {
    valid: false,
    error: 'config_key no soportada'
  };
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
    const validation = validateAndNormalizeAllowedConfig(configKey, config_value);

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.error
      });
    }

    const normalizedValue = normalizeConfigValueForStorage(validation.normalizedValue);
    await AppConfigModel.upsert(configKey, normalizedValue, updatedBy);
    if (configKey.startsWith('geo_')) {
      invalidateCoverageConfigCache();
    }

   
    return res.status(201).json({
      success: true,
      message: 'Configuracion guardada correctamente',
      data: {
        config_key: configKey,
        config_value: validation.normalizedValue,
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

import api from './api';
import { API_ENDPOINTS } from '../config/endpoints';

export interface AppConfigEntry {
  config_key: string;
  config_value: unknown;
  updated_by: number;
  updated_at: string;
}

export interface ClockConfig {
  startHour: string;
  endHour: string;
}

export interface GeoBoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export interface GeoZoneBox extends GeoBoundingBox {
  id?: number;
  name?: string;
  shapeType?: 'rectangle' | 'circle';
  centerLat?: number;
  centerLng?: number;
  radiusMeters?: number;
}

export interface GeoCoverageConfig {
  enabled: boolean;
  message: string;
  boliviaBbox: GeoBoundingBox;
  allowedZones: GeoZoneBox[];
}

export interface LocationValidationResult {
  allowed: boolean;
  code?: string;
  message?: string;
  zone?: {
    id: number;
    name: string;
  };
}

const normalizeClockValue = (value: unknown, fallback: string) => {
  if (!value || typeof value !== 'string') {
    return fallback;
  }

  // Si viene HH:mm:ss lo convertimos a HH:mm para el input time.
  return value.length >= 5 ? value.substring(0, 5) : fallback;
};

export const getAppConfigByKey = async (configKey: string): Promise<AppConfigEntry | null> => {
  try {
    const response = await api.get(API_ENDPOINTS.APP_CONFIG.GET_BY_KEY(configKey));
    if (!response.data?.success) {
      return null;
    }
    return response.data.data ?? null;
  } catch (error: any) {
    if (error?.response?.status === 404) {
      return null;
    }
    throw error;
  }
};

export const saveAppConfig = async (
  configKey: string,
  configValue: unknown,
  updatedBy: number
): Promise<AppConfigEntry | null> => {
  const response = await api.post(API_ENDPOINTS.APP_CONFIG.SAVE, {
    config_key: configKey,
    config_value: configValue,
    updated_by: updatedBy,
  });

  if (!response.data?.success) {
    return null;
  }

  return response.data.data ?? null;
};

export const getClockConfig = async (): Promise<ClockConfig> => {
  const [startConfig, endConfig] = await Promise.all([
    getAppConfigByKey('start_hour'),
    getAppConfigByKey('end_hour'),
  ]);

  return {
    startHour: normalizeClockValue(startConfig?.config_value, '08:00'),
    endHour: normalizeClockValue(endConfig?.config_value, '18:00'),
  };
};

export const saveClockConfig = async (
  startHour: string,
  endHour: string,
  updatedBy: number
): Promise<void> => {
  await Promise.all([
    saveAppConfig('start_hour', startHour, updatedBy),
    saveAppConfig('end_hour', endHour, updatedBy),
  ]);
};

export const getRankingDecreaseConfig = async (fallback = 10): Promise<number> => {
  const config = await getAppConfigByKey('ranking_decrease');
  const rawValue = config?.config_value;

  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  if (parsed < 0) return 0;
  if (parsed > 100) return 100;
  return parsed;
};

export const saveRankingDecreaseConfig = async (
  percent: number,
  updatedBy: number
): Promise<void> => {
  const normalizedPercent = Math.min(100, Math.max(0, Math.round(percent)));
  await saveAppConfig('ranking_decrease', String(normalizedPercent), updatedBy);
};

export const validateRequestLocationCoverage = async (
  latitude: number,
  longitude: number,
): Promise<LocationValidationResult> => {
  const response = await api.get(API_ENDPOINTS.REQUESTS.VALIDATE_LOCATION, {
    params: {
      latitude,
      longitude,
    }
  });

  return response.data?.data || {
    allowed: true,
    code: 'FALLBACK_ALLOWED',
    message: 'Validacion no disponible, permitiendo flujo.',
  };
};

const DEFAULT_GEO_COVERAGE_CONFIG: GeoCoverageConfig = {
  enabled: true,
  message: 'Lo lamentamos, GreenBit aun no se encuentra disponible en esta zona',
  boliviaBbox: {
    minLat: -22.91,
    maxLat: -9.66,
    minLng: -69.65,
    maxLng: -57.45,
  },
  allowedZones: [],
};

const asNumberOrFallback = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const getGeoCoverageConfig = async (): Promise<GeoCoverageConfig> => {
  const [enabledRow, messageRow, bboxRow, zonesRow] = await Promise.all([
    getAppConfigByKey('geo_restriction_enabled'),
    getAppConfigByKey('geo_restriction_message'),
    getAppConfigByKey('geo_bolivia_bbox'),
    getAppConfigByKey('geo_allowed_zones'),
  ]);

  const enabledRaw = enabledRow?.config_value;
  const messageRaw = messageRow?.config_value;
  const bboxRaw = bboxRow?.config_value as Partial<GeoBoundingBox> | null;
  const zonesRaw = zonesRow?.config_value;

  const enabled = enabledRaw === true
    || enabledRaw === 1
    || enabledRaw === '1'
    || enabledRaw === 'true'
    || enabledRaw === undefined
    || enabledRaw === null;

  const message = typeof messageRaw === 'string' && messageRaw.trim()
    ? messageRaw.trim()
    : DEFAULT_GEO_COVERAGE_CONFIG.message;

  const boliviaBbox: GeoBoundingBox = {
    minLat: asNumberOrFallback(bboxRaw?.minLat, DEFAULT_GEO_COVERAGE_CONFIG.boliviaBbox.minLat),
    maxLat: asNumberOrFallback(bboxRaw?.maxLat, DEFAULT_GEO_COVERAGE_CONFIG.boliviaBbox.maxLat),
    minLng: asNumberOrFallback(bboxRaw?.minLng, DEFAULT_GEO_COVERAGE_CONFIG.boliviaBbox.minLng),
    maxLng: asNumberOrFallback(bboxRaw?.maxLng, DEFAULT_GEO_COVERAGE_CONFIG.boliviaBbox.maxLng),
  };

  const allowedZones = Array.isArray(zonesRaw)
    ? zonesRaw.map((zone) => ({
      id: Number((zone as GeoZoneBox).id) || undefined,
      name: typeof (zone as GeoZoneBox).name === 'string' ? (zone as GeoZoneBox).name : undefined,
      shapeType: (zone as GeoZoneBox).shapeType === 'circle' ? 'circle' : 'rectangle',
      centerLat: asNumberOrFallback((zone as GeoZoneBox).centerLat, NaN),
      centerLng: asNumberOrFallback((zone as GeoZoneBox).centerLng, NaN),
      radiusMeters: asNumberOrFallback((zone as GeoZoneBox).radiusMeters, NaN),
      minLat: asNumberOrFallback((zone as GeoZoneBox).minLat, 0),
      maxLat: asNumberOrFallback((zone as GeoZoneBox).maxLat, 0),
      minLng: asNumberOrFallback((zone as GeoZoneBox).minLng, 0),
      maxLng: asNumberOrFallback((zone as GeoZoneBox).maxLng, 0),
    }))
    : [];

  return {
    enabled,
    message,
    boliviaBbox,
    allowedZones,
  };
};

export const saveGeoCoverageConfig = async (
  geoConfig: GeoCoverageConfig,
  updatedBy: number,
): Promise<void> => {
  await Promise.all([
    saveAppConfig('geo_restriction_enabled', geoConfig.enabled, updatedBy),
    saveAppConfig('geo_restriction_message', geoConfig.message, updatedBy),
    saveAppConfig('geo_bolivia_bbox', geoConfig.boliviaBbox, updatedBy),
    saveAppConfig('geo_allowed_zones', geoConfig.allowedZones, updatedBy),
  ]);
};

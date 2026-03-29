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
  configValue: string,
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

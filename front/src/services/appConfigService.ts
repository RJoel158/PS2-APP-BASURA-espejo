import api from './api';
import { API_ENDPOINTS } from '../config/endpoints';

export interface AppConfigEntry {
  config_key: string;
  config_value: string;
  updated_by: number;
  updated_at: string;
}

export interface ClockConfig {
  startHour: string;
  endHour: string;
}

const normalizeClockValue = (value: string | undefined, fallback: string) => {
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

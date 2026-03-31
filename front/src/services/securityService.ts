import api from './api';
import { API_ENDPOINTS } from '../config/endpoints';

export interface SecurityConfigRow {
  config_key: string;
  config_value: any;
  updated_by: number | null;
  updated_at: string;
}

export interface SuspiciousActivityRow {
  id: number;
  user_id: number | null;
  user_name?: string;
  ip_address: string | null;
  event_type: string;
  details: any;
  severity: 'low' | 'medium' | 'high' | 'critical';
  created_at: string;
}

export interface SuspiciousActivityGroupRow {
  activity_date: string;
  user_id: number | null;
  user_name: string;
  ip_address: string | null;
  violation_count: number;
  last_event_at: string;
  event_types: string | null;
}

export interface BlacklistRow {
  id: number;
  subject_type: 'ip' | 'user';
  subject_value: string;
  is_permanent: number;
  expires_at: string | null;
  reason: string | null;
  created_by: number | null;
  created_at: string;
  is_active: number;
}

export interface AuditLogRow {
  id: number;
  actor_id: number | null;
  actor_name?: string;
  action: string;
  target_table: string | null;
  target_id: number | null;
  details: any;
  created_at: string;
}

export const getSecurityConfig = async (): Promise<SecurityConfigRow[]> => {
  const response = await api.get(API_ENDPOINTS.SECURITY.CONFIG_LIST);
  return response.data?.data || [];
};

export const saveSecurityConfig = async (key: string, value: any): Promise<void> => {
  await api.put(API_ENDPOINTS.SECURITY.CONFIG_BY_KEY(key), { value });
};

export const getSuspiciousActivity = async (): Promise<SuspiciousActivityRow[]> => {
  const response = await api.get(API_ENDPOINTS.SECURITY.SUSPICIOUS_ACTIVITY);
  return response.data?.data || [];
};

export const getSuspiciousActivityGrouped = async (): Promise<SuspiciousActivityGroupRow[]> => {
  const response = await api.get(API_ENDPOINTS.SECURITY.SUSPICIOUS_ACTIVITY_GROUPED);
  return response.data?.data || [];
};

export const getSuspiciousActivityDetails = async (payload: {
  activityDate: string;
  userId?: number | null;
  ipAddress?: string | null;
}): Promise<SuspiciousActivityRow[]> => {
  const response = await api.get(API_ENDPOINTS.SECURITY.SUSPICIOUS_ACTIVITY_DETAILS, {
    params: {
      activityDate: payload.activityDate,
      userId: payload.userId ?? undefined,
      ipAddress: payload.ipAddress ?? undefined
    }
  });
  return response.data?.data || [];
};

export const getBlacklist = async (): Promise<BlacklistRow[]> => {
  const response = await api.get(API_ENDPOINTS.SECURITY.BLACKLIST_LIST);
  return response.data?.data || [];
};

export const addBlacklist = async (payload: {
  subjectType: 'ip' | 'user';
  subjectValue: string;
  isPermanent?: boolean;
  expiresAt?: string | null;
  reason?: string | null;
}): Promise<void> => {
  await api.post(API_ENDPOINTS.SECURITY.BLACKLIST_ADD, payload);
};

export const deactivateBlacklist = async (id: number): Promise<void> => {
  await api.patch(API_ENDPOINTS.SECURITY.BLACKLIST_DEACTIVATE(id));
};

export const getAuditLog = async (): Promise<AuditLogRow[]> => {
  const response = await api.get(API_ENDPOINTS.SECURITY.AUDIT_LOG);
  return response.data?.data || [];
};

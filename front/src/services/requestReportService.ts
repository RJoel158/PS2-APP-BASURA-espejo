import api from './api';
import { API_ENDPOINTS } from '../config/endpoints';

export interface RequestReportItem {
  id: number;
  reason: string;
  description: string | null;
  requestId: number;
  prosecutorId: number;
  reportedAt: string;
  state: number;
  prosecutorEmail: string;
  prosecutorName: string;
  materialName?: string | null;
  requestDescription?: string | null;
}

export const getAllRequestReports = async (): Promise<RequestReportItem[]> => {
  try {
    const response = await api.get(API_ENDPOINTS.REQUEST_REPORTS.GET_ALL);
    return response.data?.data || [];
  } catch (error) {
    console.error('[requestReportService] Error al obtener denuncias:', error);
    return [];
  }
};

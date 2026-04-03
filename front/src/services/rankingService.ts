import api from './api';
import { API_ENDPOINTS } from '../config/endpoints';

const roleToBucket = (role: string): 'recicladores' | 'recolectores' => {
  return role === 'reciclador' ? 'recicladores' : 'recolectores';
};

export async function getActiveOrLastPeriod() {
  // Obtiene el periodo activo o el último cerrado
  const res = await api.get(API_ENDPOINTS.RANKING.GET_ACTIVE_OR_LAST);
  return res.data;
}

export async function getLiveRanking(periodId: number, role: string) {
  // Obtiene el ranking en vivo desde users.score
  const res = await api.get(API_ENDPOINTS.RANKING.GET_LIVE(periodId, role));
  const payload = res.data;

  if (Array.isArray(payload)) {
    return payload;
  }

  const bucket = roleToBucket(role);
  const byRole = payload?.[bucket];
  return Array.isArray(byRole) ? byRole : [];
}

export async function getHistoricalRanking(periodId: number, role: string) {
  // Obtiene el ranking histórico desde ranking_tops
  const res = await api.get(API_ENDPOINTS.RANKING.GET_TOPS(periodId, role));
  const payload = res.data;

  if (Array.isArray(payload)) {
    return payload;
  }

  const tops = Array.isArray(payload?.tops) ? payload.tops : [];
  return tops.filter((item: any) => item?.rol === role);
}

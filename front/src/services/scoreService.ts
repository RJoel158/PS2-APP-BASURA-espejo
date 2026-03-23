import api from './api';
import { API_ENDPOINTS } from '../config/endpoints';

export interface CreateScoreData {
  appointmentId: number;
  ratedByUserId: number;
  ratedToUserId: number;
  rating?: number;  // OPCIONAL: estrellas 1-5
  comment?: string; // OPCIONAL
}

export interface Score {
  id: number;
  appointmentConfirmationId: number;
  ratedByUserId: number;
  ratedToUserId: number;
  rating: number | null;      // Puede ser NULL
  score: number;              // Puntos calculados
  comment: string | null;
  createdDate: string;
  state: number;
  raterName: string;
  ratedName: string;
}

export interface UserScore {
  userId: number;
  totalScore: number;         // Suma de todos los puntos
}

export interface UserRating {
  averageRating: number;      // Promedio de estrellas
  totalRatings: number;       // Cantidad de ratings recibidos
}

/**
 * Crear una calificación
 */
export const createScore = async (scoreData: CreateScoreData) => {
  try {
    console.log('[scoreService] Sending score data:', scoreData);
    
    const response = await api.post(API_ENDPOINTS.SCORES.CREATE, scoreData);

    console.log('[scoreService] Response status:', response.status);
    console.log('[scoreService] Success response:', response.data);
    return response.data;
  } catch (error) {
    console.error('[scoreService] Error creating score:', error);
    throw error;
  }
};

/**
 * Verificar si un usuario ya calificó una cita
 */
export const checkUserRated = async (appointmentId: number, userId: number): Promise<boolean> => {
  try {
    const response = await api.get(API_ENDPOINTS.SCORES.CHECK(appointmentId, userId));
    return response.data.data.hasRated;
  } catch (error) {
    console.error('[scoreService] Error checking if user rated:', error);
    return false;
  }
};

/**
 * Obtener calificaciones de una cita
 */
export const getAppointmentScores = async (appointmentId: number): Promise<Score[]> => {
  try {
    const response = await api.get(API_ENDPOINTS.SCORES.GET_BY_APPOINTMENT(appointmentId));
    return response.data.data;
  } catch (error) {
    console.error('[scoreService] Error getting appointment scores:', error);
    return [];
  }
};

/**
 * Obtener puntaje total acumulado de un usuario
 */
export const getUserTotalScore = async (userId: number): Promise<UserScore> => {
  try {
    const response = await api.get(API_ENDPOINTS.SCORES.GET_USER_TOTAL(userId));
    return response.data.data;
  } catch (error) {
    console.error('[scoreService] Error getting total score:', error);
    return { userId, totalScore: 0 };
  }
};

/**
 * Obtener promedio de calificaciones de un usuario
 */
export const getUserAverageRating = async (userId: number): Promise<UserRating> => {
  try {
    const response = await api.get(API_ENDPOINTS.SCORES.GET_USER_AVERAGE(userId));
    return response.data.data;
  } catch (error) {
    console.error('[scoreService] Error getting user average rating:', error);
    return { totalRatings: 0, averageRating: 0 };
  }
};

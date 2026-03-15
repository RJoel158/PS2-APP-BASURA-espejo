// shared/constants.js
// Constantes globales para estados de la aplicación

/**
 * Estados de Request (Solicitud de reciclaje)
 */
export const REQUEST_STATE = {
  REQUESTED: 0,   // Un collector ha solicitado recoger el material (temporal)
  OPEN: 1,        // Disponible para ser recogido (aparece en mapa)
  ACCEPTED: 2,    // Reciclador aceptó la solicitud del recolector
  REJECTED: 3,    // Reciclador rechazó la solicitud del recolector
  CLOSED: 4,      // Recolección completada
  CANCELLED: 5,    // Cancelado por alguna de las partes
  REPORTED: 6     // Reportado y eliminado (estado especial para reportes)

};

/**
 * Estados de AppointmentConfirmation (Cita de recolección)
 */
export const APPOINTMENT_STATE = {
  PENDING: 0,     // Esperando confirmación del reciclador
  ACCEPTED: 1,    // Reciclador aceptó la cita
  IN_PROGRESS: 2, // Recolección en progreso (opcional, puede no usarse)
  REJECTED: 3,    // Reciclador rechazó la cita
  COMPLETED: 4,   // Recolección completada
  CANCELLED: 5    // Cancelado por alguna de las partes
};

/**
 * Etiquetas legibles para estados de Request
 */
export const REQUEST_STATE_LABELS = {
  [REQUEST_STATE.REQUESTED]: 'Solicitado',
  [REQUEST_STATE.OPEN]: 'Abierto',
  [REQUEST_STATE.ACCEPTED]: 'Aceptado',
  [REQUEST_STATE.REJECTED]: 'Rechazado',
  [REQUEST_STATE.CLOSED]: 'Cerrado',
  [REQUEST_STATE.CANCELLED]: 'Cancelado',
  [REQUEST_STATE.REPORTED]: 'Reportado'

};

/**
 * Etiquetas legibles para estados de Appointment
 */
export const APPOINTMENT_STATE_LABELS = {
  [APPOINTMENT_STATE.PENDING]: 'Pendiente',
  [APPOINTMENT_STATE.ACCEPTED]: 'Aceptado',
  [APPOINTMENT_STATE.IN_PROGRESS]: 'En Progreso',
  [APPOINTMENT_STATE.REJECTED]: 'Rechazado',
  [APPOINTMENT_STATE.COMPLETED]: 'Completado',
  [APPOINTMENT_STATE.CANCELLED]: 'Cancelado'
};

/**
 * Función helper para validar estados de Request
 */
export const isValidRequestState = (state) => {
  return Object.values(REQUEST_STATE).includes(parseInt(state));
};

/**
 * Función helper para validar estados de Appointment
 */
export const isValidAppointmentState = (state) => {
  return Object.values(APPOINTMENT_STATE).includes(parseInt(state));
};

/**
 * Función para obtener la etiqueta de un estado de Request
 */
export const getRequestStateLabel = (state) => {
  return REQUEST_STATE_LABELS[parseInt(state)] || 'Desconocido';
};

/**
 * Función para obtener la etiqueta de un estado de Appointment
 */
export const getAppointmentStateLabel = (state) => {
  return APPOINTMENT_STATE_LABELS[parseInt(state)] || 'Desconocido';
};

/**
 * Constantes del sistema de puntuación/calificación
 * 
 * Sistema dual:
 * - rating: Calificación en estrellas (1-5) que un usuario da a otro
 * - score: Puntos acumulados para el ranking
 * 
 * Fórmula: score = BASE_POINTS + rating (si hay rating)
 *          score = BASE_POINTS (si no hay rating)
 */
export const SCORE_CONSTANTS = {
  BASE_POINTS: 10,      // Puntos base por cita completada
  MIN_RATING: 1,        // Mínimo de estrellas
  MAX_RATING: 5         // Máximo de estrellas
};

/**
 * Función para calcular score basado en rating
 */
export const calculateScore = (rating = null) => {
  if (rating !== null && rating !== undefined) {
    return SCORE_CONSTANTS.BASE_POINTS + parseInt(rating);
  }
  return SCORE_CONSTANTS.BASE_POINTS;
};

/**
 * Función para validar rating
 */
export const isValidRating = (rating) => {
  if (rating === null || rating === undefined) return true; // Rating es opcional
  const r = parseInt(rating);
  return r >= SCORE_CONSTANTS.MIN_RATING && r <= SCORE_CONSTANTS.MAX_RATING;
};

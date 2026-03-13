import db from '../config/DBConnect.js';
import { SCORE_CONSTANTS, calculateScore } from '../shared/constants.js';

/**
 * Crear una nueva calificación
 * @param {number} appointmentId - ID de la cita
 * @param {number} ratedByUserId - Usuario que califica
 * @param {number} ratedToUserId - Usuario calificado
 * @param {number|null} rating - Estrellas (1-5), opcional
 * @param {string|null} comment - Comentario, opcional
 * @returns {Promise<number>} ID del registro creado
 */
export const createScore = async (appointmentId, ratedByUserId, ratedToUserId, rating = null, comment = null) => {
  try {
    // Calcular score basado en si hay rating o no
    const scoreValue = calculateScore(rating);

    console.log('[INFO] ScoreModel.createScore - Parameters:', { 
      appointmentId, 
      ratedByUserId, 
      ratedToUserId, 
      rating,
      scoreValue,
      comment 
    });
    
    const query = `
      INSERT INTO score (
        appointmentConfirmationId, 
        ratedByUserId, 
        ratedToUserId, 
        rating,
        score, 
        comment, 
        state
      )
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `;
    
    const [result] = await db.query(query, [
      appointmentId, 
      ratedByUserId, 
      ratedToUserId, 
      rating,      // Puede ser NULL
      scoreValue,  // Calculado: BASE_POINTS + rating o solo BASE_POINTS
      comment
    ]);
    
    console.log('[INFO] ScoreModel.createScore - Success!', {
      insertId: result.insertId,
      rating,
      scoreValue
    });
    
    return result.insertId;
  } catch (err) {
    console.error('[ERROR] ScoreModel.createScore:', err);
    console.error('[ERROR] Query parameters:', { 
      appointmentId, 
      ratedByUserId, 
      ratedToUserId, 
      rating,
      comment 
    });
    throw err;
  }
};

/**
 * Verificar si un usuario ya calificó en una cita específica
 */
export const hasUserRated = async (appointmentId, userId) => {
  try {
    const query = `
      SELECT COUNT(*) as count
      FROM score
      WHERE appointmentConfirmationId = ? 
        AND ratedByUserId = ?
        AND state = 1
    `;
    
    const [rows] = await db.query(query, [appointmentId, userId]);
    return rows[0].count > 0;
  } catch (err) {
    console.error('[ERROR] ScoreModel.hasUserRated:', err);
    throw err;
  }
};

/**
 * Obtener calificaciones de una cita
 */
export const getScoresByAppointment = async (appointmentId) => {
  try {
    const query = `
      SELECT 
        s.id,
        s.rating,
        s.score,
        s.comment,
        s.createdDate,
        s.ratedByUserId,
        s.ratedToUserId,
        COALESCE(CONCAT(p1.firstname, ' ', p1.lastname), u1.email) as ratedByName,
        COALESCE(CONCAT(p2.firstname, ' ', p2.lastname), u2.email) as ratedToName
      FROM score s
      LEFT JOIN users u1 ON s.ratedByUserId = u1.id
      LEFT JOIN person p1 ON p1.userId = u1.id
      LEFT JOIN users u2 ON s.ratedToUserId = u2.id
      LEFT JOIN person p2 ON p2.userId = u2.id
      WHERE s.appointmentConfirmationId = ?
        AND s.state = 1
      ORDER BY s.createdDate DESC
    `;
    
    const [rows] = await db.query(query, [appointmentId]);
    return rows;
  } catch (err) {
    console.error('[ERROR] ScoreModel.getScoresByAppointment:', err);
    throw err;
  }
};

/**
 * Obtener puntaje total acumulado de un usuario
 * Suma todos los puntos (score) donde el usuario fue calificado
 * @param {number} userId - ID del usuario
 * @returns {Promise<number>} Suma total de puntos
 */
export const getUserTotalScore = async (userId) => {
  try {
    const query = `
      SELECT COALESCE(SUM(score), 0) as totalScore
      FROM score
      WHERE ratedToUserId = ? AND state = 1
    `;
    
    const [rows] = await db.query(query, [userId]);
    return parseInt(rows[0].totalScore);
  } catch (err) {
    console.error('[ERROR] ScoreModel.getUserTotalScore:', err);
    throw err;
  }
};

/**
 * Obtener promedio de rating (estrellas) de un usuario
 * Solo cuenta las calificaciones donde rating no es NULL
 * @param {number} userId - ID del usuario
 * @returns {Promise<{averageRating: number, totalRatings: number}>}
 */
export const getUserAverageRating = async (userId) => {
  try {
    const query = `
      SELECT 
        COUNT(*) as totalRatings,
        COALESCE(AVG(rating), 0) as averageRating
      FROM score
      WHERE ratedToUserId = ? 
        AND state = 1
        AND rating IS NOT NULL
    `;
    
    const [rows] = await db.query(query, [userId]);
    return {
      averageRating: parseFloat(rows[0].averageRating.toFixed(2)),
      totalRatings: parseInt(rows[0].totalRatings)
    };
  } catch (err) {
    console.error('[ERROR] ScoreModel.getUserAverageRating:', err);
    throw err;
  }
};

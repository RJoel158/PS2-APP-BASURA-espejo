import * as ScoreModel from '../Models/scoreModel.js';
import { SCORE_CONSTANTS, isValidRating } from '../shared/constants.js';

/**
 * Crear una calificación
 * POST /api/score
 * Body: { appointmentId, ratedByUserId, ratedToUserId, rating?, comment? }
 */
export const createScore = async (req, res) => {
  try {
    const { appointmentId, ratedByUserId, ratedToUserId, rating, comment } = req.body;

    console.log('[INFO] scoreController.createScore - Request body:', req.body);

    // Validaciones básicas
    if (!appointmentId || !ratedByUserId || !ratedToUserId) {
      return res.status(400).json({
        success: false,
        error: 'Faltan campos requeridos: appointmentId, ratedByUserId, ratedToUserId'
      });
    }

    // Validar rating si se proporciona
    if (rating !== undefined && rating !== null) {
      if (!isValidRating(rating)) {
        return res.status(400).json({
          success: false,
          error: `El rating debe ser un número entre ${SCORE_CONSTANTS.MIN_RATING} y ${SCORE_CONSTANTS.MAX_RATING}`
        });
      }
    }

    // Verificar si ya calificó
    const alreadyRated = await ScoreModel.hasUserRated(appointmentId, ratedByUserId);
    if (alreadyRated) {
      return res.status(400).json({
        success: false,
        error: 'Ya has calificado esta cita'
      });
    }

    // Crear calificación (rating puede ser null)
    const scoreId = await ScoreModel.createScore(
      appointmentId,
      ratedByUserId,
      ratedToUserId,
      rating || null,
      comment || null
    );

    res.status(201).json({
      success: true,
      message: 'Calificación creada exitosamente',
      data: { 
        id: scoreId,
        rating: rating || null,
        scoreAwarded: rating ? (SCORE_CONSTANTS.BASE_POINTS + parseInt(rating)) : SCORE_CONSTANTS.BASE_POINTS
      }
    });
  } catch (error) {
    console.error('[ERROR] scoreController.createScore:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear la calificación'
    });
  }
};

/**
 * Verificar si un usuario ya calificó
 * GET /api/scores/check/:appointmentId/:userId
 */
export const checkUserRated = async (req, res) => {
  try {
    const { appointmentId, userId } = req.params;

    const hasRated = await ScoreModel.hasUserRated(appointmentId, userId);

    res.json({
      success: true,
      data: { hasRated }
    });
  } catch (error) {
    console.error('[ERROR] scoreController.checkUserRated:', error);
    res.status(500).json({
      success: false,
      error: 'Error al verificar calificación'
    });
  }
};

/**
 * Obtener calificaciones de una cita
 * GET /api/scores/appointment/:appointmentId
 */
export const getAppointmentScores = async (req, res) => {
  try {
    const { appointmentId } = req.params;

    const scores = await ScoreModel.getScoresByAppointment(appointmentId);

    res.json({
      success: true,
      data: scores
    });
  } catch (error) {
    console.error('[ERROR] scoreController.getAppointmentScores:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener calificaciones'
    });
  }
};

/**
 * Obtener puntaje total acumulado de un usuario
 * GET /api/score/user/:userId/total
 */
export const getUserTotalScore = async (req, res) => {
  try {
    const { userId } = req.params;

    const totalScore = await ScoreModel.getUserTotalScore(userId);

    res.json({
      success: true,
      data: { 
        userId: parseInt(userId),
        totalScore 
      }
    });
  } catch (error) {
    console.error('[ERROR] scoreController.getUserTotalScore:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener puntaje total'
    });
  }
};

/**
 * Obtener promedio de calificaciones de un usuario
 * GET /api/scores/user/:userId/average
 */
export const getUserAverageRating = async (req, res) => {
  try {
    const { userId } = req.params;

    const rating = await ScoreModel.getUserAverageRating(userId);

    res.json({
      success: true,
      data: rating
    });
  } catch (error) {
    console.error('[ERROR] scoreController.getUserAverageRating:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener promedio de calificaciones'
    });
  }
};

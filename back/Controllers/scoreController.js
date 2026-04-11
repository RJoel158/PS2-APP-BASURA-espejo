import * as ScoreModel from '../Models/scoreModel.js';
import { APPOINTMENT_STATE, SCORE_CONSTANTS, isValidRating } from '../shared/constants.js';
import { getOrSetCached, invalidateByPrefix } from '../shared/responseCache.js';

const SCORE_CACHE_TTL_MS = Number(process.env.CACHE_TTL_SCORE_MS || 20000);

/**
 * Crear una calificación
 * POST /api/score
 * Body: { appointmentId, ratedByUserId, ratedToUserId, rating?, comment? }
 */
export const createScore = async (req, res) => {
  try {
    const { appointmentId, ratedByUserId, ratedToUserId, rating, comment } = req.body;
    const normalizedComment = typeof comment === 'string' ? comment.trim() : '';
    const isComplaint = normalizedComment.toUpperCase().startsWith('[RECLAMO]');

    console.log('[INFO] scoreController.createScore - Request body:', req.body);

    // Validaciones básicas
    if (!appointmentId || !ratedByUserId || !ratedToUserId) {
      return res.status(400).json({
        success: false,
        error: 'Faltan campos requeridos: appointmentId, ratedByUserId, ratedToUserId'
      });
    }

    // Validar rating solo para flujo normal (no reclamo)
    if (!isComplaint && rating !== undefined && rating !== null) {
      if (!isValidRating(rating)) {
        return res.status(400).json({
          success: false,
          error: `El rating debe ser un número entre ${SCORE_CONSTANTS.MIN_RATING} y ${SCORE_CONSTANTS.MAX_RATING}`
        });
      }
    }

    if (isComplaint) {
      const appointmentState = await ScoreModel.getAppointmentStateById(appointmentId);

      if (appointmentState === null) {
        return res.status(404).json({
          success: false,
          error: 'Cita no encontrada para registrar reclamo'
        });
      }

      if (appointmentState === APPOINTMENT_STATE.COMPLETED) {
        return res.status(409).json({
          success: false,
          error: 'No puedes registrar un reclamo en una cita completada'
        });
      }

      if (appointmentState !== APPOINTMENT_STATE.CANCELLED) {
        return res.status(400).json({
          success: false,
          error: 'Los reclamos solo se permiten para citas canceladas'
        });
      }
    }

    // Verificar si ya existe un registro y si ya ha calificado
    const existingRow = await ScoreModel.checkIfRowExists(appointmentId, ratedByUserId);

    if (existingRow) {
      if (existingRow.rating !== null) {
        return res.status(400).json({
          success: false,
          error: 'Ya has calificado esta cita'
        });
      } else {
        if (isComplaint) {
          await ScoreModel.updateComplaintScore(appointmentId, ratedByUserId, normalizedComment || '[RECLAMO]');
        } else {
          // MODO UPSERT: Ya existe la fila de puntos base, actualizamos con el rating y comentario
          await ScoreModel.updateScoreRating(appointmentId, ratedByUserId, rating, comment);
        }

        invalidateByPrefix(`score:user:${ratedToUserId}:`);

        return res.status(200).json({
          success: true,
          message: 'Calificación actualizada exitosamente',
          data: { 
            id: existingRow.id,
            rating: isComplaint ? 1 : (rating || null),
            scoreAwarded: isComplaint ? 1 : parseInt(rating) // reclamo fijo 1, rating normal suma adicional
          }
        });
      }
    }

    let scoreId;
    if (isComplaint) {
      scoreId = await ScoreModel.createComplaintScore(
        appointmentId,
        ratedByUserId,
        ratedToUserId,
        normalizedComment || '[RECLAMO]'
      );
    } else {
      // Crear calificación (rating puede ser null) - fallback por si no se creó la base
      scoreId = await ScoreModel.createScore(
        appointmentId,
        ratedByUserId,
        ratedToUserId,
        rating || null,
        comment || null
      );
    }

    invalidateByPrefix(`score:user:${ratedToUserId}:`);

    res.status(201).json({
      success: true,
      message: 'Calificación creada exitosamente',
      data: { 
        id: scoreId,
        rating: isComplaint ? 1 : (rating || null),
        scoreAwarded: isComplaint
          ? 1
          : (rating ? (SCORE_CONSTANTS.BASE_POINTS + parseInt(rating)) : SCORE_CONSTANTS.BASE_POINTS)
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

    const cacheKey = `score:user:${userId}:total`;
    const totalScore = await getOrSetCached(
      cacheKey,
      async () => ScoreModel.getUserTotalScore(userId),
      SCORE_CACHE_TTL_MS
    );

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

    const cacheKey = `score:user:${userId}:average`;
    const rating = await getOrSetCached(
      cacheKey,
      async () => ScoreModel.getUserAverageRating(userId),
      SCORE_CACHE_TTL_MS
    );

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

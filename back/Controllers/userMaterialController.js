import * as UserMaterialModel from '../Models/userMaterialModel.js';

const parsePositiveInt = (value) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
};

/**
 * Obtener favoritos activos por usuario
 * GET /api/user-materials/:userId
 */
export const getUserFavoriteMaterials = async (req, res) => {
  try {
    const userId = parsePositiveInt(req.params.userId);

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'ID de usuario inválido'
      });
    }

    const favorites = await UserMaterialModel.getActiveFavoritesByUser(userId);

    return res.json({
      success: true,
      data: favorites
    });
  } catch (error) {
    console.error('[ERROR] userMaterialController.getUserFavoriteMaterials:', error);
    return res.status(500).json({
      success: false,
      error: 'Error al obtener materiales favoritos'
    });
  }
};

/**
 * Obtener conteo de solicitudes abiertas que coinciden con favoritos activos del usuario
 * GET /api/user-materials/:userId/matching-requests-count
 */
export const getMatchingRequestsCount = async (req, res) => {
  try {
    const userId = parsePositiveInt(req.params.userId);

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'ID de usuario inválido'
      });
    }

    const total = await UserMaterialModel.countMatchingOpenRequestsByUser(userId);

    return res.json({
      success: true,
      data: { total }
    });
  } catch (error) {
    console.error('[ERROR] userMaterialController.getMatchingRequestsCount:', error);
    return res.status(500).json({
      success: false,
      error: 'Error al obtener conteo de solicitudes por favoritos'
    });
  }
};

/**
 * Verificar si un material está en favoritos de un usuario
 * GET /api/user-materials/check/:userId/:materialId
 */
export const checkFavoriteMaterial = async (req, res) => {
  try {
    const userId = parsePositiveInt(req.params.userId);
    const materialId = parsePositiveInt(req.params.materialId);

    if (!userId || !materialId) {
      return res.status(400).json({
        success: false,
        error: 'ID de usuario o material inválido'
      });
    }

    const existing = await UserMaterialModel.getByUserAndMaterial(userId, materialId);

    return res.json({
      success: true,
      data: {
        isFavorite: !!existing && existing.state === 1,
        state: existing ? existing.state : null
      }
    });
  } catch (error) {
    console.error('[ERROR] userMaterialController.checkFavoriteMaterial:', error);
    return res.status(500).json({
      success: false,
      error: 'Error al verificar material favorito'
    });
  }
};

/**
 * Agregar material a favoritos
 * Si existe en state=0, reactiva (state=1)
 * Si existe en state=1, no duplica
 * POST /api/user-materials
 * Body: { userId, materialId }
 */
export const addFavoriteMaterial = async (req, res) => {
  try {
    const userId = parsePositiveInt(req.body.userId);
    const materialId = parsePositiveInt(req.body.materialId);

    if (!userId || !materialId) {
      return res.status(400).json({
        success: false,
        error: 'userId y materialId son requeridos y válidos'
      });
    }

    const existing = await UserMaterialModel.getByUserAndMaterial(userId, materialId);

    if (!existing) {
      await UserMaterialModel.createFavorite(userId, materialId);
      return res.status(201).json({
        success: true,
        message: 'Material agregado a favoritos'
      });
    }

    if (existing.state === 1) {
      return res.status(200).json({
        success: true,
        message: 'El material ya está en favoritos'
      });
    }

    await UserMaterialModel.updateFavoriteState(userId, materialId, 1);
    return res.status(200).json({
      success: true,
      message: 'Material favorito reactivado'
    });
  } catch (error) {
    console.error('[ERROR] userMaterialController.addFavoriteMaterial:', error);

    if (error?.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({
        success: false,
        error: 'Usuario o material no existe'
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Error al agregar material a favoritos'
    });
  }
};

/**
 * Quitar material de favoritos (soft delete state=0)
 * DELETE /api/user-materials/:userId/:materialId
 */
export const removeFavoriteMaterial = async (req, res) => {
  try {
    const userId = parsePositiveInt(req.params.userId);
    const materialId = parsePositiveInt(req.params.materialId);

    if (!userId || !materialId) {
      return res.status(400).json({
        success: false,
        error: 'ID de usuario o material inválido'
      });
    }

    const existing = await UserMaterialModel.getByUserAndMaterial(userId, materialId);

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Favorito no encontrado'
      });
    }

    if (existing.state === 0) {
      return res.status(200).json({
        success: true,
        message: 'El material ya estaba removido de favoritos'
      });
    }

    await UserMaterialModel.updateFavoriteState(userId, materialId, 0);

    return res.status(200).json({
      success: true,
      message: 'Material removido de favoritos'
    });
  } catch (error) {
    console.error('[ERROR] userMaterialController.removeFavoriteMaterial:', error);
    return res.status(500).json({
      success: false,
      error: 'Error al remover material de favoritos'
    });
  }
};

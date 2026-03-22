import db from '../config/DBConnect.js';

/**
 * Obtener relación usuario-material
 */
export const getByUserAndMaterial = async (userId, materialId) => {
  try {
    const [rows] = await db.query(
      `SELECT userId, materialId, state
       FROM user_materials
       WHERE userId = ? AND materialId = ?
       LIMIT 1`,
      [userId, materialId]
    );

    return rows[0] || null;
  } catch (err) {
    console.error('[ERROR] UserMaterialModel.getByUserAndMaterial:', {
      userId,
      materialId,
      message: err.message,
      stack: err.stack
    });
    throw err;
  }
};

/**
 * Obtener materiales favoritos activos por usuario
 */
export const getActiveFavoritesByUser = async (userId) => {
  try {
    const [rows] = await db.query(
      `SELECT
        um.userId,
        um.materialId,
        um.state,
        m.name,
        COALESCE(m.description, '') AS description
       FROM user_materials um
       INNER JOIN material m ON m.id = um.materialId
       WHERE um.userId = ?
         AND um.state = 1
         AND m.state = 1
       ORDER BY m.name ASC`,
      [userId]
    );

    return rows;
  } catch (err) {
    console.error('[ERROR] UserMaterialModel.getActiveFavoritesByUser:', {
      userId,
      message: err.message,
      stack: err.stack
    });
    throw err;
  }
};

/**
 * Crear relación usuario-material en estado activo
 */
export const createFavorite = async (userId, materialId) => {
  try {
    const [result] = await db.query(
      `INSERT INTO user_materials (userId, materialId, state)
       VALUES (?, ?, 1)`,
      [userId, materialId]
    );

    return result.affectedRows > 0;
  } catch (err) {
    console.error('[ERROR] UserMaterialModel.createFavorite:', {
      userId,
      materialId,
      message: err.message,
      stack: err.stack
    });
    throw err;
  }
};

/**
 * Actualizar estado de favorito
 */
export const updateFavoriteState = async (userId, materialId, state) => {
  try {
    const [result] = await db.query(
      `UPDATE user_materials
       SET state = ?
       WHERE userId = ? AND materialId = ?`,
      [state, userId, materialId]
    );

    return result.affectedRows > 0;
  } catch (err) {
    console.error('[ERROR] UserMaterialModel.updateFavoriteState:', {
      userId,
      materialId,
      state,
      message: err.message,
      stack: err.stack
    });
    throw err;
  }
};

/**
 * Contar solicitudes que coinciden con materiales favoritos del usuario
 */
export const countMatchingOpenRequestsByUser = async (userId) => {
  try {
    const [rows] = await db.query(
      `SELECT COUNT(DISTINCT r.id) AS total
       FROM user_materials um
       INNER JOIN material m ON m.id = um.materialId
       INNER JOIN request r ON r.materialId = um.materialId
       WHERE um.userId = ?
         AND um.state = 1
         AND m.state = 1
         AND r.state = 1`,
      [userId]
    );

    return Number(rows[0]?.total || 0);
  } catch (err) {
    console.error('[ERROR] UserMaterialModel.countMatchingOpenRequestsByUser:', {
      userId,
      message: err.message,
      stack: err.stack
    });
    throw err;
  }
};

/**
 * Desactivar favoritos activos asociados a un material
 */
export const deactivateFavoritesByMaterialId = async (conn, materialId) => {
  try {
    const executor = conn || db;
    const [result] = await executor.query(
      `UPDATE user_materials
       SET state = 0
       WHERE materialId = ?
         AND state = 1`,
      [materialId]
    );

    return result.affectedRows;
  } catch (err) {
    console.error('[ERROR] UserMaterialModel.deactivateFavoritesByMaterialId:', {
      materialId,
      message: err.message,
      stack: err.stack
    });
    throw err;
  }
};

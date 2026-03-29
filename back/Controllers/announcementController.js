// Controllers/announcementController.js
import * as AnnouncementModel from "../Models/announcementModel.js";
import db from '../config/DBConnect.js';
import { Validator } from '../shared/Validator.js';

const MAX_ANNOUNCEMENT_DESCRIPTION_LENGTH = 255;

/**
 * Obtener todos los anuncios (con opción de filtrar por estado)
 * Query params: state (opcional) - Si no se especifica, retorna todos
 */
export const getAllAnnouncements = async (req, res) => {
  try {
    console.log("[INFO] getAllAnnouncements controller called");
    
    const { state, limit = '50', offset = '0' } = req.query;
    console.log("[INFO] getAllAnnouncements - Query params:", { state, limit, offset });

    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);
    const parsedOffset = Math.max(parseInt(offset, 10) || 0, 0);

    let stateParam = 1;
    
    if (state !== undefined) {
      const stateValue = parseInt(state, 10);
      if (![0, 1].includes(stateValue)) {
        return res.status(400).json({
          success: false,
          error: "Estado debe ser 0 (inactivo) o 1 (activo)"
        });
      }
      stateParam = stateValue;
      console.log("[INFO] getAllAnnouncements - Filtrando por estado:", stateValue);
    } else {
      console.log("[INFO] getAllAnnouncements - Sin estado, filtrando activos por defecto");
    }

    const { rows: announcements, total } = await AnnouncementModel.getAllPaginated(
      stateParam,
      parsedLimit,
      parsedOffset
    );
    
    console.log("[INFO] getAllAnnouncements controller - announcements found:", announcements.length);
    
    res.json({
      success: true,
      data: announcements,
      meta: {
        total,
        limit: parsedLimit,
        offset: parsedOffset
      }
    });
  } catch (error) {
    console.error("[ERROR] getAllAnnouncements controller:", error);
    res.status(500).json({
      success: false,
      error: "Error al obtener anuncios",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Obtener anuncio por ID
 */
export const getAnnouncementById = async (req, res) => {
  try {
    const { id } = req.params;
    console.log("[INFO] getAnnouncementById controller called with id:", id);
    
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        error: "ID de anuncio inválido"
      });
    }
    
    const announcement = await AnnouncementModel.getById(parseInt(id));
    
    if (!announcement) {
      return res.status(404).json({
        success: false,
        error: "Anuncio no encontrado"
      });
    }
    
    console.log("[INFO] getAnnouncementById controller - announcement found:", announcement.title);
    res.json({
      success: true,
      data: announcement
    });
    
  } catch (error) {
    console.error("[ERROR] getAnnouncementById controller:", {
      id: req.params.id,
      message: error.message,
      stack: error.stack,
    });
    
    res.status(500).json({
      success: false,
      error: "Error al obtener anuncio",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Crear anuncio
 */
export const createAnnouncement = async (req, res) => {
  try {
    const { title, description, url, imagePath, targetRole, createdBy } = req.body;
    const normalizedTitle = Validator.normalizeSpaces(title || '');
    const normalizedDescription = Validator.normalizeDescription(description || '');
    const normalizedUrl = Validator.normalizeSpaces(url || '');
    
    console.log("[INFO] createAnnouncement controller called:", { title: normalizedTitle, description: normalizedDescription, url: normalizedUrl, imagePath, targetRole, createdBy });
    
    // Validaciones básicas
    if (!normalizedTitle) {
      return res.status(400).json({
        success: false,
        error: "El título del anuncio es requerido"
      });
    }
    
    if (!imagePath || typeof imagePath !== 'string' || imagePath.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: "La ruta de la imagen es requerida"
      });
    }

    if (normalizedDescription) {
      const descriptionError = Validator.validateDescription(
        normalizedDescription,
        MAX_ANNOUNCEMENT_DESCRIPTION_LENGTH,
        1
      );

      if (descriptionError) {
        return res.status(400).json({
          success: false,
          error: descriptionError
        });
      }
    }

    const urlError = Validator.validateUrl(normalizedUrl, false);
    if (urlError) {
      return res.status(400).json({
        success: false,
        error: urlError
      });
    }
    
    if (!targetRole || !['recolector', 'reciclador', 'both'].includes(targetRole)) {
      return res.status(400).json({
        success: false,
        error: "El rol objetivo debe ser: recolector, reciclador o both"
      });
    }
    
    if (!createdBy || isNaN(parseInt(createdBy))) {
      return res.status(400).json({
        success: false,
        error: "El createdBy (usuario) es requerido y debe ser un número"
      });
    }
    
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      
      const announcementId = await AnnouncementModel.create(
        conn,
        normalizedTitle,
        normalizedDescription,
        normalizedUrl,
        imagePath.trim(),
        targetRole,
        parseInt(createdBy)
      );
      
      await conn.commit();
      
      console.log("[INFO] createAnnouncement controller - announcement created:", { announcementId, title });
      
      res.status(201).json({
        success: true,
        data: { id: announcementId },
        message: "Anuncio creado exitosamente"
      });
      
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
    
  } catch (error) {
    console.error("[ERROR] createAnnouncement controller:", {
      body: req.body,
      message: error.message,
      code: error.code,
      sqlMessage: error.sqlMessage,
      stack: error.stack,
    });
    
    let errorMessage = "Error al crear anuncio";
    let statusCode = 500;
    
    if (error.message.includes("Usuario con ID")) {
      errorMessage = error.message;
      statusCode = 400;
    } else if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      errorMessage = "El usuario especificado no existe";
      statusCode = 400;
    }
    
    res.status(statusCode).json({
      success: false,
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Actualizar anuncio
 */
export const updateAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, url, imagePath, targetRole, state } = req.body;
    const normalizedTitle = Validator.normalizeSpaces(title || '');
    const normalizedDescription = Validator.normalizeDescription(description || '');
    const normalizedUrl = Validator.normalizeSpaces(url || '');
    
    console.log("[INFO] updateAnnouncement controller called:", { id, title: normalizedTitle, description: normalizedDescription, url: normalizedUrl, targetRole, state });
    
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        error: "ID de anuncio inválido"
      });
    }
    
    if (!normalizedTitle) {
      return res.status(400).json({
        success: false,
        error: "El título del anuncio es requerido"
      });
    }
    
    if (!imagePath || typeof imagePath !== 'string' || imagePath.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: "La ruta de la imagen es requerida"
      });
    }

    if (normalizedDescription) {
      const descriptionError = Validator.validateDescription(
        normalizedDescription,
        MAX_ANNOUNCEMENT_DESCRIPTION_LENGTH,
        1
      );

      if (descriptionError) {
        return res.status(400).json({
          success: false,
          error: descriptionError
        });
      }
    }

    const urlError = Validator.validateUrl(normalizedUrl, false);
    if (urlError) {
      return res.status(400).json({
        success: false,
        error: urlError
      });
    }
    
    if (!targetRole || !['recolector', 'reciclador', 'both'].includes(targetRole)) {
      return res.status(400).json({
        success: false,
        error: "El rol objetivo debe ser: recolector, reciclador o both"
      });
    }
    
    if (state === undefined || ![0, 1].includes(parseInt(state))) {
      return res.status(400).json({
        success: false,
        error: "El estado debe ser 0 o 1"
      });
    }
    
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      
      const updated = await AnnouncementModel.update(
        conn,
        parseInt(id),
        normalizedTitle,
        normalizedDescription,
        normalizedUrl,
        imagePath.trim(),
        targetRole,
        parseInt(state)
      );
      
      if (!updated) {
        await conn.rollback();
        return res.status(404).json({
          success: false,
          error: "Anuncio no encontrado"
        });
      }
      
      await conn.commit();
      
      console.log("[INFO] updateAnnouncement controller - announcement updated:", { id, title });
      
      res.json({
        success: true,
        message: "Anuncio actualizado exitosamente"
      });
      
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
    
  } catch (error) {
    console.error("[ERROR] updateAnnouncement controller:", {
      id: req.params.id,
      body: req.body,
      message: error.message,
      stack: error.stack,
    });
    
    res.status(500).json({
      success: false,
      error: "Error al actualizar anuncio",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Eliminar anuncio (soft delete)
 */
export const deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log("[INFO] deleteAnnouncement controller called with id:", id);
    
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        error: "ID de anuncio inválido"
      });
    }
    
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      
      const deleted = await AnnouncementModel.softDelete(conn, parseInt(id));
      
      if (!deleted) {
        await conn.rollback();
        return res.status(404).json({
          success: false,
          error: "Anuncio no encontrado"
        });
      }
      
      await conn.commit();
      
      console.log("[INFO] deleteAnnouncement controller - announcement deleted:", { id });
      
      res.json({
        success: true,
        message: "Anuncio eliminado exitosamente"
      });
      
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
    
  } catch (error) {
    console.error("[ERROR] deleteAnnouncement controller:", {
      id: req.params.id,
      message: error.message,
      stack: error.stack,
    });
    
    res.status(500).json({
      success: false,
      error: "Error al eliminar anuncio",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Obtener anuncios por rol
 */
export const getAnnouncementsByRole = async (req, res) => {
  try {
    const { role } = req.params;
    
    console.log("[INFO] getAnnouncementsByRole controller called with role:", role);
    
    if (!role || !['recolector', 'reciclador', 'both'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: "Rol inválido. Debe ser: recolector, reciclador o both"
      });
    }
    
    const announcements = await AnnouncementModel.getByRole(role);
    
    console.log("[INFO] getAnnouncementsByRole controller - announcements found:", announcements.length);
    
    res.json({
      success: true,
      data: announcements,
      message: "Anuncios obtenidos correctamente"
    });
    
  } catch (error) {
    console.error("[ERROR] getAnnouncementsByRole controller:", {
      role: req.params.role,
      message: error.message,
      stack: error.stack,
    });
    
    res.status(500).json({
      success: false,
      error: "Error al obtener anuncios",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

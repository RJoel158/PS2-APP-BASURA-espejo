// Controllers/notificationController.js
import * as NotificationModel from "../Models/notificationModel.js";
import { getOrSetCached, invalidateByPrefix } from '../shared/responseCache.js';

const NOTIFICATION_CACHE_TTL_MS = Number(process.env.CACHE_TTL_NOTIFICATIONS_MS || 15000);

/**
 * Obtener notificaciones del usuario logueado
 */
export const getUserNotifications = async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 20, offset = 0, unreadOnly = false } = req.query;

    const requestedLimit = Number(limit);
    const requestedOffset = Number(offset);
    const safeLimit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 100) : 20;
    const safeOffset = Number.isFinite(requestedOffset) ? Math.max(requestedOffset, 0) : 0;

    console.log("[INFO] getUserNotifications called:", { userId, limit: safeLimit, offset: safeOffset, unreadOnly });

    if (!userId || isNaN(parseInt(userId))) {
      return res.status(400).json({
        success: false,
        error: "ID de usuario inválido"
      });
    }

    // Convertir unreadOnly a boolean
    const onlyUnread = unreadOnly === 'true' || unreadOnly === true;

    const numericUserId = parseInt(userId);
    const listCacheKey = `notifications:user:${numericUserId}:list:${safeLimit}:${safeOffset}:${onlyUnread ? 1 : 0}`;
    const countCacheKey = `notifications:user:${numericUserId}:unread-count`;

    const notifications = await getOrSetCached(
      listCacheKey,
      async () => NotificationModel.getUserNotifications(
        numericUserId,
        safeLimit,
        safeOffset,
        onlyUnread
      ),
      NOTIFICATION_CACHE_TTL_MS
    );

    const unreadCount = await getOrSetCached(
      countCacheKey,
      async () => NotificationModel.getUnreadCount(numericUserId),
      NOTIFICATION_CACHE_TTL_MS
    );

    res.json({
      success: true,
      data: notifications,
      unreadCount,
      total: notifications.length
    });

  } catch (error) {
    console.error("[ERROR] getUserNotifications controller:", {
      userId: req.params.userId,
      message: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: "Error al obtener notificaciones",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Marcar notificación como leída
 */
export const markNotificationAsRead = async (req, res) => {
  try {
    const { id, userId } = req.body;

    console.log("[INFO] markNotificationAsRead called:", { id, userId });

    if (!id || !userId || isNaN(parseInt(id)) || isNaN(parseInt(userId))) {
      return res.status(400).json({
        success: false,
        error: "ID de notificación y usuario requeridos"
      });
    }

    const updated = await NotificationModel.markAsRead(parseInt(id), parseInt(userId));

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: "Notificación no encontrada"
      });
    }

    invalidateByPrefix(`notifications:user:${parseInt(userId)}:`);

    res.json({
      success: true,
      message: "Notificación marcada como leída"
    });

  } catch (error) {
    console.error("[ERROR] markNotificationAsRead controller:", {
      body: req.body,
      message: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: "Error al marcar notificación como leída",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Obtener contador de notificaciones no leídas
 */
export const getUnreadCount = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId || isNaN(parseInt(userId))) {
      return res.status(400).json({
        success: false,
        error: "ID de usuario inválido"
      });
    }

    const numericUserId = parseInt(userId);
    const cacheKey = `notifications:user:${numericUserId}:unread-count`;
    const count = await getOrSetCached(
      cacheKey,
      async () => NotificationModel.getUnreadCount(numericUserId),
      NOTIFICATION_CACHE_TTL_MS
    );

    res.json({
      success: true,
      unreadCount: count
    });

  } catch (error) {
    console.error("[ERROR] getUnreadCount controller:", {
      userId: req.params.userId,
      message: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: "Error al obtener contador de notificaciones",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
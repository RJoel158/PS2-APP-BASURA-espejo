// services/notificationService.ts
import api from './api';
import { io, Socket } from 'socket.io-client';
import { apiUrl } from '../config/environment';
import { API_ENDPOINTS } from '../config/endpoints';

export interface Notification {
  id: number;
  type: 'request_received' | 'appointment_accepted' | 'appointment_rejected' | 'appointment_canceled' | 'appointment_completed';
  title: string;
  body: string;
  requestId?: number;
  appointmentId?: number;
  read: boolean;
  readAt?: string;
  createdAt: string;
  actorEmail?: string;
}

let socket: Socket | null = null;
let connectedUserId: number | null = null;
let socketConsumers = 0;

/**
 * Conectar usuario a Socket.IO para recibir notificaciones en tiempo real
 */
export const connectNotifications = (userId: number): Socket => {
  if (socket && connectedUserId === userId) {
    socketConsumers += 1;
    if (socket.connected) {
      socket.emit('join', userId);
    }
    return socket;
  }

  if (socket && connectedUserId !== userId) {
    socket.disconnect();
    socket = null;
    connectedUserId = null;
    socketConsumers = 0;
  }

  socket = io(apiUrl(''), {
    transports: ['websocket', 'polling'],
    withCredentials: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    timeout: 20000,
  });

  connectedUserId = userId;
  socketConsumers = 1;

  socket.on('connect', () => {
    console.log(`[NotificationService] Conectado a Socket.IO (socketId: ${socket?.id || 'n/a'})`);
    socket?.emit('join', connectedUserId);
  });

  socket.on('reconnect_attempt', (attempt) => {
    console.log(`[NotificationService] Reintentando conexión Socket.IO (#${attempt})`);
  });

  socket.on('reconnect', (attempt) => {
    console.log(`[NotificationService] Reconectado a Socket.IO (#${attempt})`);
    if (connectedUserId) {
      socket?.emit('join', connectedUserId);
    }
  });

  socket.on('connect_error', (error) => {
    console.error('[NotificationService] Error de conexión Socket.IO:', error?.message || error);
  });

  socket.on('disconnect', (reason) => {
    console.log(`[NotificationService] Desconectado de Socket.IO (${reason})`);
  });

  return socket;
};

/**
 * Desconectar de Socket.IO
 */
export const disconnectNotifications = (): void => {
  if (socketConsumers > 0) {
    socketConsumers -= 1;
  }

  if (socketConsumers > 0) {
    return;
  }

  if (socket) {
    socket.disconnect();
    socket = null;
    connectedUserId = null;
  }
};

/**
 * Escuchar notificaciones en tiempo real
 */
export const onNotificationReceived = (callback: (notification: Notification) => void): void => {
  if (socket) {
    socket.off('notification', callback);
    socket.on('notification', callback);
  }
};

/**
 * Dejar de escuchar notificaciones en tiempo real
 */
export const offNotificationReceived = (callback: (notification: Notification) => void): void => {
  if (socket) {
    socket.off('notification', callback);
  }
};

/**
 * Obtener notificaciones del usuario
 */
export const fetchNotifications = async (userId: number, limit: number = 20, unreadOnly: boolean = true): Promise<Notification[]> => {
  try {
    const response = await api.get(API_ENDPOINTS.NOTIFICATIONS.GET_BY_USER(userId, limit), {
      params: {
        unreadOnly
      }
    });
    return response.data.data || [];
  } catch (error) {
    console.error('[NotificationService] Error fetching notifications:', error);
    return [];
  }
};

/**
 * Obtener contador de notificaciones no leídas
 */
export const fetchUnreadCount = async (userId: number): Promise<number> => {
  try {
    const response = await api.get(API_ENDPOINTS.NOTIFICATIONS.GET_UNREAD(userId));
    return response.data.unreadCount || 0;
  } catch (error) {
    console.error('[NotificationService] Error fetching unread count:', error);
    return 0;
  }
};

/**
 * Marcar notificación como leída
 */
export const markAsRead = async (notificationId: number, userId: number): Promise<boolean> => {
  try {
    const response = await api.put(API_ENDPOINTS.NOTIFICATIONS.MARK_AS_READ, {
      id: notificationId,
      userId: userId,
    });
    return response.data.success || true;
  } catch (error) {
    console.error('[NotificationService] Error marking as read:', error);
    return false;
  }
};
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, ChevronLeft } from 'lucide-react';
import {
  connectNotifications,
  disconnectNotifications,
  onNotificationReceived,
  offNotificationReceived,
  fetchNotifications,
  markAsRead,
  type Notification,
} from '../../services/notificationService';
import './NotificationsPage.css';

const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'todos' | 'nuevas' | 'solicitudes' | 'aprobadas' | 'completadas' | 'rechazadas'>('todos');
  
  // Obtener userId del localStorage
  const getUserId = (): number => {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        return user?.id || 0;
      }
      return 0;
    } catch (error) {
      console.error('Error getting userId:', error);
      return 0;
    }
  };

  const userId = getUserId();

  const formatNotificationTime = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    
    // Resetear las horas para comparar solo fechas
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    
    const dateStart = new Date(date);
    dateStart.setHours(0, 0, 0, 0);
    
    const diffInMs = todayStart.getTime() - dateStart.getTime();
    const daysDiff = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    // Formatter para hora (14:35)
    const timeFormatter = new Intl.DateTimeFormat('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    
    const time = timeFormatter.format(date);
    
    // Si fue hoy, mostrar solo la hora
    if (daysDiff === 0) {
      return time;
    }
    
    // Si fue ayer, mostrar "Ayer" + hora
    if (daysDiff === 1) {
      return `Ayer, ${time}`;
    }
    
    // Si fue antes, mostrar fecha completa + hora
    const dateFormatter = new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    
    return dateFormatter.format(date);
  };

  const getDateGroupLabel = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);

    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const dateStart = new Date(date);
    dateStart.setHours(0, 0, 0, 0);

    const diffInMs = todayStart.getTime() - dateStart.getTime();
    const daysDiff = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (daysDiff === 0) {
      return 'Hoy';
    }

    if (daysDiff === 1) {
      return 'Ayer';
    }

    const dateFormatter = new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    return dateFormatter.format(date);
  };

  const getNavigationUrl = (notification: Notification) => {
    // Por defecto, ir a pickupDetails con requestId
    if (notification.requestId) {
      if (notification.appointmentId) {
        return `/pickupDetails/${notification.requestId}?appointmentId=${notification.appointmentId}`;
      }
      return `/pickupDetails/${notification.requestId}`;
    }
    return null;
  };

  useEffect(() => {
    if (!userId || userId === 0) {
      navigate('/login');
      return;
    }

    // Conectar Socket.IO
    connectNotifications(userId);

    const handleIncomingNotification = (notification: Notification) => {
      setNotifications(prev => [notification, ...prev]);
    };

    // Escuchar nuevas notificaciones
    onNotificationReceived(handleIncomingNotification);

    // Cargar notificaciones
    loadNotifications();

    return () => {
      offNotificationReceived(handleIncomingNotification);
      disconnectNotifications();
    };
  }, [userId, navigate]);

  const loadNotifications = async () => {
    setIsLoading(true);
    try {
      // Cargar TODAS las notificaciones (no solo no leídas)
      const fetchedNotifications = await fetchNotifications(userId, 100, false);
      setNotifications(fetchedNotifications);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getFilteredNotifications = () => {
    switch (activeFilter) {
      case 'nuevas':
        return notifications.filter(n => !n.read);
      case 'solicitudes':
        return notifications.filter(n => n.type === 'request_received');
      case 'aprobadas':
        return notifications.filter(n => n.type === 'appointment_accepted');
      case 'completadas':
        return notifications.filter(n => n.type === 'appointment_completed');
      case 'rechazadas':
        return notifications.filter(n => n.type === 'appointment_rejected' || n.type === 'appointment_canceled');
      default:
        return notifications;
    }
  };

  const handleMarkAsRead = async (notificationId: number) => {
    try {
      const success = await markAsRead(notificationId, userId);
      if (success) {
        // Actualizar estado de la notificación a leída (NO eliminarla)
        setNotifications(prev => 
          prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
        );
      }
    } catch (error) {
      console.error('[NotificationsPage] Error marking as read:', error);
    }
  };

  const handleViewDetails = (notification: Notification) => {
    const url = getNavigationUrl(notification);
    if (!url) return;

    if (!notification.read) {
      void handleMarkAsRead(notification.id);
    }

    navigate(url);
  };

  const filteredNotifications = getFilteredNotifications();
  const groupedNotifications = filteredNotifications.reduce<
    Array<{ key: string; label: string; items: Notification[] }>
  >((groups, notification) => {
    const date = new Date(notification.createdAt);
    const dayKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    const existingGroup = groups.find(group => group.key === dayKey);

    if (existingGroup) {
      existingGroup.items.push(notification);
      return groups;
    }

    return [
      ...groups,
      {
        key: dayKey,
        label: getDateGroupLabel(notification.createdAt),
        items: [notification],
      },
    ];
  }, []);

  const tabItems: Array<{
    key: 'todos' | 'nuevas' | 'solicitudes' | 'aprobadas' | 'completadas' | 'rechazadas';
    label: string;
  }> = [
    { key: 'todos', label: 'Todas' },
    { key: 'nuevas', label: 'Nuevas' },
    { key: 'solicitudes', label: 'Solicitudes' },
    { key: 'aprobadas', label: 'Aprobadas' },
    { key: 'completadas', label: 'Completadas' },
    {
      key: 'rechazadas',
      label: 'Rechazadas',
    },
  ];

  return (
    <div className="notifications-page">
      <div className="notifications-page-header">
        <div className="header-top">
          <button
            className="back-button"
            onClick={() => navigate(-1)}
            title="Volver"
          >
            <ChevronLeft size={28} />
          </button>

          <div className="header-title-group">
            <h1 className="notifications-page-title">Notificaciones</h1>
            <p className="notifications-page-subtitle">
              Mantente al día con tus solicitudes y citas
            </p>
          </div>

          <div className="header-spacer"></div>
        </div>

        <div className="tabs-container">
          {tabItems.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key)}
              className={`tab-button ${activeFilter === tab.key ? 'active' : ''}`}
            >
              <span className="tab-label">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="notifications-page-container">
        {isLoading ? (
          <div className="empty-state">
            <Bell size={48} />
            <p>Cargando notificaciones...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="empty-state">
            <Bell size={48} />
            <p>No hay notificaciones</p>
          </div>
        ) : (
          <div className="notifications-items-list timeline-list">
            {groupedNotifications.map((group) => (
              <section key={group.key} className="timeline-group">
                <div className="timeline-date-col">
                  <span className="timeline-date-label">{group.label}</span>
                </div>

                <div className="timeline-group-content">
                  {group.items.map((notification) => (
                    <article
                      key={notification.id}
                      className={`notification-item-card ${notification.read ? 'read' : 'unread'}`}
                    >
                      <span className="timeline-node" aria-hidden="true" />

                      <div className="notification-item-icon">
                        <Bell size={24} />
                        {!notification.read && <span className="unread-indicator">●</span>}
                      </div>

                      <div className="notification-item-content">
                        <div className="notification-item-header">
                          <h3 className="notification-item-title">
                            {notification.title}
                          </h3>
                          <div className="notification-item-time">
                            {formatNotificationTime(notification.createdAt)}
                          </div>
                        </div>

                        <p className="notification-item-description">{notification.body}</p>

                        <div className="notification-item-actions">
                          {getNavigationUrl(notification) && (
                            <button
                              className="btn-ver-detalles"
                              onClick={() => handleViewDetails(notification)}
                            >
                              Ver Detalles
                            </button>
                          )}
                          {!notification.read && (
                            <button
                              className="btn-marcar-leida"
                              onClick={() => handleMarkAsRead(notification.id)}
                            >
                              Marcar como leída
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;

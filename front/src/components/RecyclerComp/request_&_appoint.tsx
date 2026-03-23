import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import "./requestandappointment.css";
import { getRequestsByUserAndState } from "../../services/requestService";
import { getAppointmentsByRecycler, getAppointmentsByCollector } from "../../services/appointmentService";
import type { Appointment } from "../../services/appointmentService";
import type { Request } from "../../services/requestService";
import { REQUEST_STATE, APPOINTMENT_STATE } from "../../shared/constants";

interface User {
  id: number;
  email: string;
  username: string;
  role: string;
  state: number;
  avatar?: string;
}

interface RequestAndAppointProps {
  user: User;
}

export default function RequestAndAppoint({ user }: RequestAndAppointProps) {
  const [activeRequests, setActiveRequests] = useState<Request[]>([]);
  const [activeAppointments, setActiveAppointments] = useState<Appointment[]>([]);
  const [appointmentHistory, setAppointmentHistory] = useState<Appointment[]>([]);
  const [pendingAppointments, setPendingAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0); // Trigger para refrescar historial
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    solicitudes: true,
    citas: false,
    historial: false,
    pendientes: true,
    citasCollector: false,
    historialCollector: false
  });

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Función para refrescar el historial (se llama desde otros componentes)
  // const refreshHistory = () => {
  //   console.log('[DEBUG] refreshHistory called, incrementing trigger');
  //   setRefreshTrigger(prev => prev + 1);
  // };

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        if (user.role === 'reciclador') {
          // Para recicladores
          // Solicitudes activas: requests con state = OPEN (1) - disponibles para recoger
          const requests = await getRequestsByUserAndState(user.id, REQUEST_STATE.OPEN);
          setActiveRequests(requests);

          // Citas activas: appointmentconfirmation con state = ACCEPTED (1)
          const activeAppts = await getAppointmentsByRecycler(user.id, APPOINTMENT_STATE.ACCEPTED);
          setActiveAppointments(activeAppts);

          // Historial: TODAS las citas finalizadas (COMPLETED, REJECTED, CANCELLED) - limitado a 5 más recientes
          const allAppointments = await getAppointmentsByRecycler(user.id, undefined, 5);
          // Filtrar solo las que están en estado final (no pendientes ni activas)
          const history = allAppointments.filter(apt => 
            apt.state === APPOINTMENT_STATE.COMPLETED || 
            apt.state === APPOINTMENT_STATE.REJECTED || 
            apt.state === APPOINTMENT_STATE.CANCELLED
          );
          setAppointmentHistory(history);

        } else if (user.role === 'recolector') {
          // Para recolectores
          // Citas pendientes: appointmentconfirmation con state = PENDING (0)
          const pendingAppts = await getAppointmentsByCollector(user.id, APPOINTMENT_STATE.PENDING);
          setPendingAppointments(pendingAppts);

          // Citas activas: appointmentconfirmation con state = ACCEPTED (1)
          const activeAppts = await getAppointmentsByCollector(user.id, APPOINTMENT_STATE.ACCEPTED);
          setActiveAppointments(activeAppts);

          // Historial: TODAS las citas finalizadas (COMPLETED, REJECTED, CANCELLED) - limitado a 5 más recientes
          const allAppointments = await getAppointmentsByCollector(user.id, undefined, 5);
          // Filtrar solo las que están en estado final (no pendientes ni activas)
          const history = allAppointments.filter(apt => 
            apt.state === APPOINTMENT_STATE.COMPLETED || 
            apt.state === APPOINTMENT_STATE.REJECTED || 
            apt.state === APPOINTMENT_STATE.CANCELLED
          );
          setAppointmentHistory(history);
        }
        
        // Limpiar flag de completado
        localStorage.removeItem('appointmentCompleted');

      } catch (err) {
        console.error('Error loading data:', err);
        setError('Error al cargar los datos');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      loadData();
    }
  }, [user, refreshTrigger]);

  // Escuchar cambios en localStorage para refrescar cuando se completa una cita
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'appointmentCompleted' && e.newValue) {
        console.log('[INFO] Appointment completed detected, refreshing history...');
        setRefreshTrigger(prev => prev + 1);
      }
    };

    // Listener para cambios desde otra pestaña
    window.addEventListener('storage', handleStorageChange);
    
    // Para cambios en la MISMA pestaña, usar polling
    const checkInterval = setInterval(() => {
      const completed = localStorage.getItem('appointmentCompleted');
      if (completed) {
        // Verificar si es reciente (menos de 5 segundos)
        const completedTime = parseInt(completed);
        const now = Date.now();
        if (now - completedTime < 5000) {
          console.log('[INFO] Recent appointment completion detected, refreshing...');
          setRefreshTrigger(prev => prev + 1);
        }
      }
    }, 1000); // Chequear cada segundo

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(checkInterval);
    };
  }, []);

  const renderAppointmentSidebarCard = (appointment: Appointment) => (
    <div key={appointment.id} className="request-card green">
      <div className="card-icon"><i className="bi bi-recycle" aria-hidden="true"></i></div>
      <h4>{appointment.materialName || 'Reciclaje de cartón'}</h4>
      <p>{appointment.description || '2 cajas medianas de cartón en buen estado para reciclar'}</p>
      <Link 
        to={`/pickupDetails/${appointment.idRequest}?appointmentId=${appointment.id}`} 
        className="btn-details"
      >
        Ver Detalles
      </Link>
    </div>
  );

  const renderRequestSidebarCard = (request: Request, idx: number) => (
    <div key={request.id} className={`request-card ${idx === 0 ? 'orange' : 'green'}`}>
      <div className="card-icon"><i className="bi bi-box-seam" aria-hidden="true"></i></div>
      <h4>{request.materialName || 'Reciclaje de cartón'}</h4>
      <p>{request.description || '2 cajas medianas de cartón en buen estado para reciclar'}</p>
      <Link to={`/pickupDetails/${request.id}`} className="btn-details">
        Ver Detalles
      </Link>
    </div>
  );

  const renderCarousel = (cards: React.ReactNode[]) => (
    <div className="appointments-carousel" role="region" aria-label="Lista desplazable horizontal">
      {cards}
    </div>
  );

  if (loading) {
    return (
      <div className="container my-5">
        <div className="text-center">
          <div className="spinner-border text-success" role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
          <p className="mt-3">Cargando...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container my-5">
        <div className="alert alert-danger" role="alert">
          <strong>Error:</strong> {error}
        </div>
      </div>
    );
  }

  return (
    <div className="sidebar-sections">
      {user.role === 'reciclador' ? (
        <>
          {/* Para Recicladores */}
          {/* Solicitudes Activas */}
          <div className="sidebar-section">
            <div 
              className="sidebar-header active"
              onClick={() => toggleSection('solicitudes')}
            >
              <span className={`arrow ${expandedSections.solicitudes ? 'rotated' : ''}`}>›</span>
              <i className="bi bi-box-seam section-icon" aria-hidden="true"></i>
              <h3>Solicitudes activas</h3>
            </div>
            <div className={`sidebar-content ${expandedSections.solicitudes ? '' : 'collapsed'}`}>
              {activeRequests.length > 0 ? (
                renderCarousel(activeRequests.slice(0, 5).map((request, idx) => renderRequestSidebarCard(request, idx)))
              ) : (
                <div className="no-data-sidebar">No hay solicitudes activas</div>
              )}
            </div>
          </div>

          {/* Citas Activas */}
          <div className="sidebar-section">
            <div 
              className="sidebar-header"
              onClick={() => toggleSection('citas')}
            >
              <span className={`arrow ${expandedSections.citas ? 'rotated' : ''}`}>›</span>
              <i className="bi bi-calendar2-check section-icon" aria-hidden="true"></i>
              <h3>Citas activas</h3>
            </div>
            <div className={`sidebar-content ${expandedSections.citas ? '' : 'collapsed'}`}>
              {activeAppointments.length > 0 ? (
                renderCarousel(activeAppointments.slice(0, 5).map(renderAppointmentSidebarCard))
              ) : (
                <div className="no-data-sidebar">No hay citas activas</div>
              )}
            </div>
          </div>

          {/* Historial de Citas */}
          <div className="sidebar-section">
            <div 
              className="sidebar-header"
              onClick={() => toggleSection('historial')}
            >
              <span className={`arrow ${expandedSections.historial ? 'rotated' : ''}`}>›</span>
              <i className="bi bi-check2-circle section-icon" aria-hidden="true"></i>
              <h3>Historial de citas</h3>
            </div>
            <div className={`sidebar-content ${expandedSections.historial ? '' : 'collapsed'}`}>
              {appointmentHistory.length > 0 ? (
                renderCarousel(appointmentHistory.slice(0, 5).map(renderAppointmentSidebarCard))
              ) : (
                <div className="no-data-sidebar">No hay historial</div>
              )}
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Para Recolectores */}
          {/* Citas Pendientes */}
          <div className="sidebar-section">
            <div 
              className="sidebar-header active"
              onClick={() => toggleSection('pendientes')}
            >
              <span className={`arrow ${expandedSections.pendientes ? 'rotated' : ''}`}>›</span>
              <i className="bi bi-clock-history section-icon" aria-hidden="true"></i>
              <h3>Citas pendientes</h3>
            </div>
            <div className={`sidebar-content ${expandedSections.pendientes ? '' : 'collapsed'}`}>
              {pendingAppointments.length > 0 ? (
                renderCarousel(pendingAppointments.slice(0, 5).map(renderAppointmentSidebarCard))
              ) : (
                <div className="no-data-sidebar">No hay citas pendientes</div>
              )}
            </div>
          </div>

          {/* Citas Activas */}
          <div className="sidebar-section">
            <div 
              className="sidebar-header"
              onClick={() => toggleSection('citasCollector')}
            >
              <span className={`arrow ${expandedSections.citasCollector ? 'rotated' : ''}`}>›</span>
              <i className="bi bi-calendar2-check section-icon" aria-hidden="true"></i>
              <h3>Citas activas</h3>
            </div>
            <div className={`sidebar-content ${expandedSections.citasCollector ? '' : 'collapsed'}`}>
              {activeAppointments.length > 0 ? (
                renderCarousel(activeAppointments.slice(0, 5).map(renderAppointmentSidebarCard))
              ) : (
                <div className="no-data-sidebar">No hay citas activas</div>
              )}
            </div>
          </div>


          {/* Historial de Citas */}
          <div className="sidebar-section">
            <div 
              className="sidebar-header"
              onClick={() => toggleSection('historialCollector')}
            >
              <span className={`arrow ${expandedSections.historialCollector ? 'rotated' : ''}`}>›</span>
              <i className="bi bi-check2-circle section-icon" aria-hidden="true"></i>
              <h3>Historial de citas</h3>
            </div>
            <div className={`sidebar-content ${expandedSections.historialCollector ? '' : 'collapsed'}`}>
              {appointmentHistory.length > 0 ? (
                renderCarousel(appointmentHistory.slice(0, 5).map(renderAppointmentSidebarCard))
              ) : (
                <div className="no-data-sidebar">No hay historial</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

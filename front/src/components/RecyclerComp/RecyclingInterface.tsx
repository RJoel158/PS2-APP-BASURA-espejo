import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./RecyclingInterface.css";
import Header from "./headerRecycler";
import { getActiveOrLastPeriod, getLiveRanking, getHistoricalRanking } from "../../services/rankingService";
import RequestAndAppoint from "./request_&_appoint";
import ChangePasswordModal from "../PasswordComp/ChangePasswordModal";
import AnnouncementBanner from "../CommonComp/AnnouncementBanner";
import Footer from "../HomeComps/Footer";
import {
  connectNotifications,
  disconnectNotifications,
  fetchUnreadCount,
  offNotificationReceived,
  onNotificationReceived,
} from "../../services/notificationService";

interface Recycler {
  id: number;
  name?: string;
  points?: number;
  score?: number;
  total_score?: number;
  score_total?: number;
  avatar?: string;
  rol?: string;
  user_id?: number;
  email?: string;
  puntaje_final?: number | string;
}

// Definición de la interfaz User
interface User {
  id: number;
  email: string;
  username: string;
  role: string;
  state: number;
  avatar?: string;
}

// El top real se carga dinámicamente
const RecyclingInterface: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [recyclers, setRecyclers] = useState<Recycler[]>([]);
  const [periodState, setPeriodState] = useState<'activo' | 'cerrado' | null>(null);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [showTopRecyclers, setShowTopRecyclers] = useState<boolean>(true);
  const [showHowTo, setShowHowTo] = useState<boolean>(true);
  const navigate = useNavigate();
  const location = useLocation();

  const getRankingPoints = (recycler: Recycler): number => {
    const rawPoints =
      recycler.puntaje_final
      ?? recycler.score
      ?? recycler.total_score
      ?? recycler.score_total
      ?? recycler.points
      ?? 0;

    const points = Number(rawPoints);
    return Number.isFinite(points) ? points : 0;
  };

  useEffect(() => {
    const updateViewportState = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      setShowTopRecyclers(!mobile);
      setShowHowTo(!mobile);
    };

    updateViewportState();
    window.addEventListener('resize', updateViewportState);
    return () => window.removeEventListener('resize', updateViewportState);
  }, []);

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (!userStr) {
      navigate("/login", { replace: true });
      return;
    }
    const u = JSON.parse(userStr);
    u.state = Number(u.state);
    if (!u.email) {
      u.email = "";
    }
    setUser(u as User);
    if (u.state === 1) {
      setShowModal(true);
    }
    async function fetchTop() {
      try {
        const period = await getActiveOrLastPeriod();
        console.log('Periodo recibido:', period);
        setPeriodState(period.estado);
        if (period.estado === 'activo') {
          const top = await getLiveRanking(period.id, 'reciclador');
          console.log('Top recibido (activo):', top);
          if (top && Array.isArray(top)) {
            setRecyclers(top);
          } else if (top && Array.isArray(top.recicladores)) {
            setRecyclers(top.recicladores);
          } else {
            setRecyclers([]);
          }
        } else {
          const top = await getHistoricalRanking(period.id, 'reciclador');
          setRecyclers(Array.isArray(top) ? top : []);
        }
      } catch (err) {
        setRecyclers([]);
      }
    }
    fetchTop();
  }, [navigate]);

  useEffect(() => {
    if (!user?.id) return;

    connectNotifications(user.id);

    const handleIncomingNotification = () => {
      setUnreadCount((prev) => prev + 1);
    };

    onNotificationReceived(handleIncomingNotification);

    return () => {
      offNotificationReceived(handleIncomingNotification);
      disconnectNotifications();
    };
  }, [user?.id]);

  useEffect(() => {
    const loadUnreadCount = async () => {
      if (!user?.id) {
        setUnreadCount(0);
        return;
      }

      const count = await fetchUnreadCount(user.id);
      setUnreadCount(count);
    };

    void loadUnreadCount();
  }, [user?.id, location.pathname]);

  if (!user) return null;

  // Maneja el click en el botón de reciclar
  const handleRecycleClick = () => {
    navigate("/recycle-form"); // navega al formulario
  };

  return (
    <div className={`recycling-container recycler-role-view ${isMobile ? 'is-mobile-view' : ''}`}>
      {/* Header */}
      <Header user={user} />

      {/* Modal de cambio de contraseña */}
      {showModal && (
        <ChangePasswordModal
          userId={user.id}
          role={user.role}
        />
      )}

      <div className="main-content-new">
        {/* Sidebar Izquierdo - Solicitudes y Citas */}
        <div className="left-sidebar ui-animate ui-animate-left">
          <RequestAndAppoint user={user} />
        </div>

        {/* Contenido Central */}
        <div className="center-content ui-animate ui-animate-up">
          {/* Botón RECICLA */}
          <button className="recycle-banner ui-animate-pop" onClick={handleRecycleClick}>
            <i className="bi bi-recycle me-2" aria-hidden="true"></i>
            R E C I C L A
          </button>

          {/* Top Recicladores */}
          <section className={`mobile-collapsible ${showTopRecyclers ? 'expanded' : ''}`}>
            <button
              type="button"
              className="mobile-collapsible-toggle"
              onClick={() => setShowTopRecyclers((prev) => !prev)}
              aria-expanded={showTopRecyclers}
            >
              <span>Top Recicladores</span>
              <span className="mobile-collapsible-arrow">⌄</span>
            </button>

            <div className="mobile-collapsible-body">
              <div className="top-recyclers-card">
                <h3 className="card-title">Top Recicladores</h3>
                <p className="card-subtitle">
                  {periodState === 'activo' ? 'Índice de reciclaje este mes' : 'Último ranking de periodo cerrado'}
                </p>

                <div className="recyclers-list-new">
                  {recyclers
                    .filter(r => r.rol === 'reciclador')
                    .slice(0, 4)
                    .map((recycler, idx) => (
                      <div key={recycler.user_id || recycler.id || idx} className="recycler-item-new">
                        <div className={`recycler-avatar-new recycler-avatar-color-${idx % 5}`}>
                          {(recycler.email || recycler.name || 'U').charAt(0).toUpperCase()}
                        </div>
                        <span className="recycler-name-new">{recycler.name || recycler.email || 'Reciclador'}</span>
                        <span className="recycler-points-new">{getRankingPoints(recycler)}</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </section>

          {/* Cómo puedo reciclar (desktop) */}
          {!isMobile && (
            <div className="how-to-recycle">
              <h2>¿Cómo puedo reciclar?</h2>
              <div className="steps-container">
                <div className="step-card">
                  <div className="step-number">1</div>
                  <h3>Rellena el formulario</h3>
                  <p>Apreta el botón recicla y rellena el formulario.</p>
                </div>
                <div className="step-card">
                  <div className="step-number">2</div>
                  <h3>Espera</h3>
                  <p>Espera a que soliciten recoger tu material.</p>
                </div>
                <div className="step-card">
                  <div className="step-number">3</div>
                  <h3>Coordina</h3>
                  <p>Si tienes una solicitud puedes aceptarla o rechazarla, habla con el recolector ante cualquier duda.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Derecho - Anuncio */}
        <div className="right-sidebar ui-animate ui-animate-right">
          <AnnouncementBanner role="reciclador" position="right" />
        </div>
      </div>

      {/* Cómo puedo reciclar - Sección al nivel más bajo del index en móvil */}
      {isMobile && (
        <section className={`mobile-collapsible how-to-bottom-section ${showHowTo ? 'expanded' : ''}`}>
          <button
            type="button"
            className="mobile-collapsible-toggle"
            onClick={() => setShowHowTo((prev) => !prev)}
            aria-expanded={showHowTo}
          >
            <span>¿Cómo puedo reciclar?</span>
            <span className="mobile-collapsible-arrow">⌄</span>
          </button>

          <div className="mobile-collapsible-body">
            <div className="how-to-recycle">
              <h2>¿Cómo puedo reciclar?</h2>
              <div className="steps-container">
                <div className="step-card">
                  <div className="step-number">1</div>
                  <h3>Rellena el formulario</h3>
                  <p>Apreta el botón recicla y rellena el formulario.</p>
                </div>
                <div className="step-card">
                  <div className="step-number">2</div>
                  <h3>Espera</h3>
                  <p>Espera a que soliciten recoger tu material.</p>
                </div>
                <div className="step-card">
                  <div className="step-number">3</div>
                  <h3>Coordina</h3>
                  <p>Si tienes una solicitud puedes aceptarla o rechazarla, habla con el recolector ante cualquier duda.</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Bottom Navigation (solo móvil) */}
      <nav className="mobile-bottom-nav" aria-label="Navegación móvil principal">
        <button
          type="button"
          className={`mobile-nav-item ${location.pathname === '/notifications' ? 'active' : ''}`}
          onClick={() => navigate('/notifications')}
        >
          <span className="mobile-nav-icon-wrap">
            <i className="bi bi-bell"></i>
            {unreadCount > 0 && (
              <span className="mobile-nav-notification-alert">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </span>
          <span>Notificaciones</span>
        </button>

        <button
          type="button"
          className={`mobile-nav-item mobile-nav-item-primary ${location.pathname === '/recycle-form' ? 'active' : ''}`}
          onClick={() => navigate('/recycle-form')}
        >
          <i className="bi bi-recycle"></i>
          <span>Reciclar</span>
        </button>

        <button
          type="button"
          className={`mobile-nav-item ${location.pathname === '/userInfo' ? 'active' : ''}`}
          onClick={() => navigate('/userInfo')}
        >
          <i className="bi bi-person"></i>
          <span>Perfil</span>
        </button>
      </nav>

      {/* Footer */}
      {!isMobile && <Footer />}
    </div>
  );
};

export default RecyclingInterface;
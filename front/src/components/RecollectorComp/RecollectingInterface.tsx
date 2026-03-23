import { useEffect, useState } from "react";
import "../RecyclerComp/RecyclingInterface.css";
import Header from "../RecyclerComp/headerRecycler";
import { getActiveOrLastPeriod, getLiveRanking, getHistoricalRanking } from "../../services/rankingService";
import { useLocation, useNavigate } from "react-router-dom";
import RequestAndAppoint from "../RecyclerComp/request_&_appoint";
import ChangePasswordModal from "../PasswordComp/ChangePasswordModal";
import AnnouncementBanner from "../CommonComp/AnnouncementBanner";
import Footer from "../HomeComps/Footer";
import FavoriteRequestsSummaryCard from "./FavoriteRequestsSummaryCard";

interface Recycler {
  id: number;
  name?: string;
  points?: number;
  avatar?: string;
  rol?: string;
  user_id?: number;
  email?: string;
  puntaje_final?: number;
}

interface User {
  id: number;
  email: string;
  username: string;
  role: string;
  state: number;
  avatar?: string;
}

const RecollectingInterface: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [recyclers, setRecyclers] = useState<Recycler[]>([]);
  const [periodState, setPeriodState] = useState<'activo' | 'cerrado' | null>(null);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [showTopCollectors, setShowTopCollectors] = useState<boolean>(true);
  const [showHowTo, setShowHowTo] = useState<boolean>(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const updateViewportState = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      setShowTopCollectors(!mobile);
      setShowHowTo(!mobile);
    };

    updateViewportState();
    window.addEventListener('resize', updateViewportState);
    return () => window.removeEventListener('resize', updateViewportState);
  }, []);

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    //Revisa si hay un usuario con la sesión iniciada
   if (!userStr) {

      navigate("/login", { replace: true });
      return;
    }

    const u = JSON.parse(userStr);
    u.state = Number(u.state); // asegurarse de que sea número

    // Ensure email property exists (fallback to username if needed)
    if (!u.email && u.username) {
      u.email = u.username;
    }

    setUser(u);
    if (u.state === 1) {
      setShowModal(true);
    }

    // Cargar el top dinámico
    async function fetchTop() {
      try {
        const period = await getActiveOrLastPeriod();
        console.log('Periodo recibido:', period);
        setPeriodState(period.estado);
        if (period.estado === 'activo') {
          const top = await getLiveRanking(period.id, 'recolector');
          console.log('Top recibido (activo):', top);
          if (top && Array.isArray(top)) {
            setRecyclers(top);
          } else if (top && Array.isArray(top.recolectores)) {
            setRecyclers(top.recolectores);
          } else {
            setRecyclers([]);
          }
        } else {
          const top = await getHistoricalRanking(period.id, 'recolector');
          setRecyclers(Array.isArray(top) ? top : []);
        }
      } catch (err) {
        setRecyclers([]);
      }
    }
    fetchTop();
  }, [navigate]);
   if (!user) return null;

  return (
    <div className={`recycling-container ${isMobile ? 'is-mobile-view' : ''}`}>
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
          <FavoriteRequestsSummaryCard userId={user.id} />
        </div>

        {/* Contenido Central */}
        <div className="center-content ui-animate ui-animate-up">
          {/* Botón COLECTA */}
          <button className="recycle-banner ui-animate-pop" onClick={() => navigate("/recycling-points")}>
            <i className="bi bi-recycle me-2" aria-hidden="true"></i>
            C O L E C T A
          </button>

          {/* Top Recolectores */}
          <section className={`mobile-collapsible ${showTopCollectors ? 'expanded' : ''}`}>
            <button
              type="button"
              className="mobile-collapsible-toggle"
              onClick={() => setShowTopCollectors((prev) => !prev)}
              aria-expanded={showTopCollectors}
            >
              <span>Top Recolectores</span>
              <span className="mobile-collapsible-arrow">⌄</span>
            </button>

            <div className="mobile-collapsible-body">
              <div className="top-recyclers-card">
                <h3 className="card-title">Top Recolectores</h3>
                <p className="card-subtitle">
                  {periodState === 'activo' ? 'Índice de reciclaje este mes' : 'Último ranking de periodo cerrado'}
                </p>

                <div className="recyclers-list-new">
                  {recyclers
                    .filter(r => r.rol === 'recolector')
                    .slice(0, 4)
                    .map((recycler, idx) => (
                      <div key={recycler.user_id || recycler.id || idx} className="recycler-item-new">
                        <div className={`recycler-avatar-new recycler-avatar-color-${idx % 5}`}>
                          {(recycler.email || recycler.name || 'U').charAt(0).toUpperCase()}
                        </div>
                        <span className="recycler-name-new">{recycler.name || recycler.email || 'Recolector'}</span>
                        <span className="recycler-points-new">{recycler.puntaje_final || recycler.points || 0}</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </section>

          {/* Cómo puedo recolectar (desktop) */}
          {!isMobile && (
            <div className="how-to-recycle">
              <h2>¿Cómo puedo recolectar?</h2>
              <div className="steps-container">
                <div className="step-card">
                  <div className="step-number">1</div>
                  <h3>Busca</h3>
                  <p>Apreta colecta y revisa las solicitudes activas en el mapa, puedes filtrar por material.</p>
                </div>
                <div className="step-card">
                  <div className="step-number">2</div>
                  <h3>Solicita</h3>
                  <p>Selecciona alguna solicitud de reciclaje que te interesa, revisa bien la hora y fecha, ingresa una hora que te sea cómoda.</p>
                </div>
                <div className="step-card">
                  <div className="step-number">3</div>
                  <h3>Coordina</h3>
                  <p>Si tu solicitud es aceptada, coordina con el reciclador para recoger el material.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Derecho - Anuncio */}
        <div className="right-sidebar ui-animate ui-animate-right">
          <AnnouncementBanner role="recolector" position="right" />
        </div>
      </div>

      {/* Cómo puedo recolectar - Sección al nivel más bajo del index */}
      {isMobile && (
        <section className={`mobile-collapsible how-to-bottom-section ${showHowTo ? 'expanded' : ''}`}>
          <button
            type="button"
            className="mobile-collapsible-toggle"
            onClick={() => setShowHowTo((prev) => !prev)}
            aria-expanded={showHowTo}
          >
            <span>¿Cómo puedo recolectar?</span>
            <span className="mobile-collapsible-arrow">⌄</span>
          </button>

          <div className="mobile-collapsible-body">
            <div className="how-to-recycle">
              <h2>¿Cómo puedo recolectar?</h2>
              <div className="steps-container">
                <div className="step-card">
                  <div className="step-number">1</div>
                  <h3>Busca</h3>
                  <p>Apreta colecta y revisa las solicitudes activas en el mapa, puedes filtrar por material.</p>
                </div>
                <div className="step-card">
                  <div className="step-number">2</div>
                  <h3>Solicita</h3>
                  <p>Selecciona alguna solicitud de reciclaje que te interesa, revisa bien la hora y fecha, ingresa una hora que te sea cómoda.</p>
                </div>
                <div className="step-card">
                  <div className="step-number">3</div>
                  <h3>Coordina</h3>
                  <p>Si tu solicitud es aceptada, coordina con el reciclador para recoger el material.</p>
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
          <i className="bi bi-bell"></i>
          <span>Notificaciones</span>
        </button>

        <button
          type="button"
          className={`mobile-nav-item mobile-nav-item-primary ${location.pathname === '/recycling-points' ? 'active' : ''}`}
          onClick={() => navigate('/recycling-points')}
        >
          <i className="bi bi-recycle"></i>
          <span>Colectar</span>
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

export default RecollectingInterface;

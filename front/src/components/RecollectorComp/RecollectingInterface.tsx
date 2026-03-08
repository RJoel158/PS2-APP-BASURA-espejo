import { useEffect, useState } from "react";
import "../RecyclerComp/RecyclingInterface.css";
import Header from "../RecyclerComp/headerRecycler";
import { getActiveOrLastPeriod, getLiveRanking, getHistoricalRanking } from "../../services/rankingService";
import { useNavigate } from "react-router-dom";
import RequestAndAppoint from "../RecyclerComp/request_&_appoint";
import ChangePasswordModal from "../PasswordComp/ChangePasswordModal";
import AnnouncementBanner from "../CommonComp/AnnouncementBanner";
import Footer from "../HomeComps/Footer";

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
  const navigate = useNavigate();

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
    <div className="recycling-container">
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
        <div className="left-sidebar">
          <RequestAndAppoint user={user} />
        </div>

        {/* Contenido Central */}
        <div className="center-content">
          {/* Botón COLECTA */}
          <button className="recycle-banner" onClick={() => navigate("/recycling-points")}>
            ♻️ C O L E C T A ♻️
          </button>

          {/* Top Recolectores */}
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

          {/* Cómo puedo recolectar */}
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

        {/* Sidebar Derecho - Anuncio */}
        <div className="right-sidebar">
          <AnnouncementBanner role="recolector" position="right" />
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default RecollectingInterface;

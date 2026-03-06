import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./RecyclingInterface.css";
import Header from "./headerRecycler";
import { getActiveOrLastPeriod, getLiveRanking, getHistoricalRanking } from "../../services/rankingService";
import RequestAndAppoint from "./request_&_appoint";
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
  const navigate = useNavigate();

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

  if (!user) return null;

  // Maneja el click en el botón de reciclar
  const handleRecycleClick = () => {
    navigate("/recycle-form"); // navega al formulario
  };

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
          {/* Botón RECICLA */}
          <button className="recycle-banner" onClick={handleRecycleClick}>
            ♻️ R E C I C L A ♻️
          </button>

          {/* Top Recicladores */}
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
                    <span className="recycler-points-new">{recycler.puntaje_final || recycler.points || 0}</span>
                  </div>
                ))}
            </div>
          </div>

          {/* Cómo puedo reciclar */}
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

        {/* Sidebar Derecho - Anuncio */}
        <div className="right-sidebar">
          <AnnouncementBanner role="reciclador" position="right" />
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default RecyclingInterface;
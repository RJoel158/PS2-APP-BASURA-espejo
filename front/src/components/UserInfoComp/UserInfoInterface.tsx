import { useEffect, useState } from "react";
import "./UserInfo.css";
import HeaderUserInfo from "./HeaderUserInfo";
import { useNavigate } from "react-router-dom";
import api from '../../services/api';
import { API_ENDPOINTS } from '../../config/endpoints';
import { getUserTotalScore, getUserAverageRating } from '../../services/scoreService';

//Estructura del usuario
interface User {
  userId: number;
  email: string;
  phone: string;
  registerDate: string;
  avatar?: string;
  totalScore?: number;        // Puntaje total acumulado (para rankings)
  averageRating?: number;     // Promedio de estrellas (1-5)
  totalRatings?: number;      // Cantidad de ratings recibidos
  roleId?: number;
  state?: number;
  // Campos de Persona
  firstname?: string;
  lastname?: string;
  // Campos de Institución
  companyName?: string;
  nit?: string;
  institutionState?: number;
}

const UserInfo: React.FC = () => {
  //Guardar información de usuario y rol
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const navigate=useNavigate();

  // Función para cargar puntajes del usuario
  const loadUserScores = async (userId: number) => {
    try {
      // Cargar puntaje total acumulado
      const scoreData = await getUserTotalScore(userId);
      
      // Cargar promedio de rating
      const ratingData = await getUserAverageRating(userId);
      
      setUser(prevUser => prevUser ? {
        ...prevUser,
        totalScore: scoreData.totalScore,
        averageRating: ratingData.averageRating,
        totalRatings: ratingData.totalRatings
      } : null);
    } catch (error) {
      console.error('Error al cargar puntajes:', error);
    }
  };

  useEffect(() => {
    const loadProfile = async () => {
      const userStr = localStorage.getItem("user");
      //Revisa si hay un usuario con la sesión iniciada
      if(!userStr){
        navigate("/login", { replace: true });
        return;
      }

      try {
        const parsedUser = JSON.parse(userStr);
        setRole(parsedUser.role || "");
        const userId = Number(parsedUser.id);

        const response = await api.get(API_ENDPOINTS.USERS.GET_USER(userId));
        if (!response.data.success || !response.data.user) {
          throw new Error('No se pudo obtener la información del usuario');
        }

        let resolvedUser = response.data.user;
        const hasPersonData = Boolean(resolvedUser.firstname || resolvedUser.lastname);
        const hasInstitutionData = Boolean(resolvedUser.companyName || resolvedUser.nit);

        if (!hasPersonData && !hasInstitutionData) {
          const institutionResponse = await api.get(API_ENDPOINTS.USERS.GET_USER_WITH_INSTITUTION(userId));
          if (institutionResponse.data.success && institutionResponse.data.user) {
            resolvedUser = institutionResponse.data.user;
          }
        }

        setUser(resolvedUser);
        await loadUserScores(userId);
      } catch (err) {
        console.error('Error al obtener perfil de usuario:', err);
        setError('No se pudo cargar la información del perfil.');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [navigate]);

  const handleBack = () => {
    window.history.back();
  };
  const handleLogout = () => {
    localStorage.removeItem("user"); // borra la sesión
    navigate("/login", { replace: true });// reemplaza la URL y evita volver atrás
  };

  // Establecer si es institución o persona para mostrar nombre adecuado
  const isInstitution = !!(user?.companyName || user?.nit);
  
  const displayName = isInstitution 
    ? (user?.companyName || 'Empresa')
    : user?.firstname && user?.lastname 
      ? `${user.firstname} ${user.lastname}`.trim()
      : 'Nombre completo';

  const formattedRegisterDate = user?.registerDate
    ? new Date(user.registerDate).toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      })
    : 'Sin fecha registrada';

  const displayPhone = user?.phone || 'Sin teléfono registrado';
  const displayEmail = user?.email || 'Sin correo registrado';
  const displayRole = role || 'usuario';

  const ratingValue = user?.averageRating ?? 0;
  const ratingStars = Math.max(0, Math.min(5, Math.round(ratingValue)));

  // Mostrar loading mientras se cargan los datos
  if (loading) {
    return (
      <div className="user-info-container">
        <HeaderUserInfo />
        <div className="user-info-wrapper">
          <div className="user-info-card">
            <div className="loading-container">
              <div className="spinner-border text-success" role="status">
                <span className="visually-hidden">Cargando...</span>
              </div>
              <p className="loading-text">Cargando información...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="user-info-container">
        <HeaderUserInfo />
        <div className="user-info-wrapper">
          <div className="user-info-card">
            <div className="loading-container">
              <p className="loading-text">{error}</p>
              <button className="btn btn-outline-success" onClick={handleBack}>Volver</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="user-info-container">
      <HeaderUserInfo />

      <div className="user-info-wrapper">
        <div className="user-info-card">
          <div className="user-top-actions">
            <button className="btn btn-outline-success user-back-inline" onClick={handleBack}>
              ← Volver
            </button>
          </div>

          <div className="user-hero">
            <h2 className="user-title">
              {isInstitution ? 'Perfil institucional' : 'Perfil de usuario'}
            </h2>

            <div className="user-avatar-large">
              <span className="user-avatar-initial">
                {(displayName?.charAt(0) || 'U').toUpperCase()}
              </span>
            </div>

            <h3 className="user-display-name">{displayName}</h3>

            <div className="user-role mt-2 mb-3">
              <span className="role-badge">{displayRole}</span>
            </div>
          </div>

          <div className="user-details-grid">
            {isInstitution && user?.companyName && (
              <div className="detail-item">
                <span className="detail-label">Nombre de la Empresa</span>
                <span className="detail-value">{user.companyName}</span>
              </div>
            )}

            {isInstitution && user?.nit && (
              <div className="detail-item">
                <span className="detail-label">NIT</span>
                <span className="detail-value">{user.nit}</span>
              </div>
            )}

            <div className="detail-item">
              <span className="detail-label">{isInstitution ? "Teléfono de Contacto" : "Número de Referencia"}</span>
              <span className="detail-value">{displayPhone}</span>
            </div>

            <div className="detail-item">
              <span className="detail-label">Correo electrónico</span>
              <span className="detail-value detail-value-wrap">{displayEmail}</span>
            </div>

            <div className="detail-item">
              <span className="detail-label">Inicio como {displayRole}</span>
              <span className="detail-value">{formattedRegisterDate}</span>
            </div>

            <div className="detail-item detail-item-highlight">
              <span className="detail-label">Puntos Totales (Ranking)</span>
              <span className="detail-value">{user?.totalScore !== undefined ? user.totalScore : 0}</span>
            </div>

            <div className="detail-item detail-item-rating">
              <span className="detail-label">Calificación Promedio</span>
              <div className="rating-display">
                <span className="stars">{'⭐'.repeat(ratingStars)}</span>
                <span className="rating-text">{ratingValue.toFixed(2)} / 5.00</span>
                <span className="rating-count">({user?.totalRatings || 0} calificaciones)</span>
              </div>
            </div>
          </div>

          <div className="action-buttons text-center mt-4">
            <button className="btn btn-close-session" onClick={handleLogout }>Cerrar sesión</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserInfo;

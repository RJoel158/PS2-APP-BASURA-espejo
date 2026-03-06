import React from "react";
import "./RecyclingInterface.css";
import logoText from "../../assets/logoText.svg";
import NotificationBell from "../CommonComp/NotificationBell";

//Definicion de usuario
interface User {
  id: number;
  email: string;
  role: string;
  state: number;
  avatar?: string;
}

interface HeaderProps {
  user: User | null;
}

const handleLogout = () => {
  localStorage.removeItem("user"); // borra la sesión
  window.location.replace("/login"); // reemplaza la URL y evita volver atrás
};
//Paso el usuario como prop
const Header: React.FC<HeaderProps> = ({ user }) => {
  return (
    <header className="recycler-header d-flex justify-content-between align-items-center px-4">
      <div 
        className="logo-container d-flex align-items-center"
        style={{
          width: '350px',
          height: '100px',
          minWidth: '350px'
        }}
      >
        <img 
          src={logoText} 
          alt="Logo GreenBit" 
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            objectPosition: 'left center',
            maxWidth: 'none',
            maxHeight: 'none'
          }}
        />
      </div>

      
      <div className="user-profile d-flex align-items-center gap-3">
        {/* Campana de notificaciones */}
        <div className="position-relative">
          {user?.id ? (
            <NotificationBell userId={user.id} />
          ) : null}
        </div>

        {/* Avatar circular */}
        <div className="user-avatar">
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: '#149D52',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.9rem',
            fontWeight: '600',
            color: 'white',
            border: '2px solid white'
          }}>
            {user?.email?.charAt(0).toUpperCase() || 'U'}
          </div>
        </div>

        {/* Nombre y dropdown */}
        <div className="dropdown">
          <button
            className="btn btn-link p-0 text-white text-decoration-none d-flex align-items-center user-dropdown-btn"
            type="button"
            id="userDropdown"
            data-bs-toggle="dropdown"
            aria-expanded="false"
            style={{
              fontSize: '0.95rem',
              fontWeight: '500'
            }}
          >
            <span className="me-2 user-name">{user ? user.email : "Invitado"}</span>
            <i className="bi bi-chevron-down" style={{ fontSize: '0.75rem' }}></i>
          </button>
          <ul className="dropdown-menu dropdown-menu-end shadow-sm" aria-labelledby="userDropdown">
            <li><a className="dropdown-item" href="/UserInfo"><i className="bi bi-person me-2"></i>Perfil</a></li>
            <li><hr className="dropdown-divider" /></li>
            <li>
              <button className="dropdown-item text-danger" onClick={handleLogout}>
                <i className="bi bi-box-arrow-right me-2"></i>Cerrar sesión
              </button>
            </li>
          </ul>
        </div>
      </div>
    </header>
  );
};

export default Header;
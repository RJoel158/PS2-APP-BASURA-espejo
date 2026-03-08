import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminDashboard.css';
import '../UserManagementComp/UserManagement.css';
import NotificationBell from '../CommonComp/NotificationBell';

interface User {
  id: number;
  email: string;
  role: string;
  state: number;
}

export default function Header() {
  const [user, setUser] = useState<User | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/login", { replace: true });
  };

  const handleProfileClick = () => {
    navigate("/UserInfo");
  };

  return (
    <div className="user-management-header">
      <div className="user-management-header-top">
        <h1 className="user-management-header-title" style={{ fontSize: '2rem', margin: 0 }}>Panel de control</h1>
        <div className="user-management-header-actions">
          {/* User dropdown */}
          <div className="user-management-header-user-wrapper">
            <div 
              onClick={() => setShowDropdown(!showDropdown)}
              className="user-management-header-user-trigger"
            >
              <div className="user-management-header-user-avatar">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              <span className="user-management-header-user-name">
                {user?.email || 'Usuario'}
              </span>
              <span className="user-management-header-user-arrow">▼</span>
            </div>
            
            {showDropdown && (
              <div className="user-management-header-dropdown">
                <button
                  onClick={() => {
                    setShowDropdown(false);
                    handleProfileClick();
                  }}
                  className="user-management-header-dropdown-item"
                >
                  Perfil
                </button>
                <hr className="user-management-header-dropdown-divider" />
                <button
                  onClick={() => {
                    setShowDropdown(false);
                    handleLogout();
                  }}
                  className="user-management-header-dropdown-item"
                >
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>

          {/* Notification Bell */}
          <div className="user-management-header-notification-wrapper">
            {user?.id ? (
              <NotificationBell userId={user.id} />
            ) : (
              <button className="user-management-header-notif-btn">
                🔔
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

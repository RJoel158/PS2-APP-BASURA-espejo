import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import './AdminDashboard.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import logo from '../../assets/logo.png'

interface SidebarProps {
  onMenuSelect: (menuId: string) => void;
  activeMenu: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ onMenuSelect, activeMenu, isOpen, onClose }: SidebarProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeSection, setActiveSection] = useState<'menu' | 'otros'>('menu');

  const menuSections = useMemo(() => ([
    {
      id: 'menu' as const,
      title: 'MENÚ',
      items: [
        { id: 'reportes', label: 'Reportes', icon: 'bi-graph-up' },
        { id: 'denuncias', label: 'Denuncias', icon: 'bi-exclamation-octagon-fill' },
        { id: 'usuarios', label: 'Administrar Usuarios', icon: 'bi-people-fill' },
        { id: 'materiales', label: 'Materiales', icon: 'bi-recycle' },
        { id: 'anuncios', label: 'Anuncios', icon: 'bi-megaphone-fill' },
        { id: 'accesos', label: 'Accesos', icon: 'bi-person-check-fill' },
        { id: 'ranking', label: 'Ranking', icon: 'bi-trophy-fill' }
      ]
    },
    {
      id: 'otros' as const,
      title: 'OTROS',
      items: [
        { id: 'configuraciones', label: 'Configuraciones', icon: 'bi-gear-fill' },
        { id: 'seguridad', label: 'Seguridad', icon: 'bi-shield-lock-fill' }
      ]
    }
  ]), []);

  useEffect(() => {
    if (activeMenu === 'configuraciones' || activeMenu === 'seguridad') {
      setActiveSection('otros');
      return;
    }
    if (activeMenu !== 'control') {
      setActiveSection('menu');
    }
  }, [activeMenu]);

  const visibleItems = useMemo(() => {
    const section = menuSections.find((s) => s.id === activeSection);
    return section ? section.items : [];
  }, [menuSections, activeSection]);

  const handleMenuClick = (menuId: string) => {
    onMenuSelect(menuId);
    
    // Actualizar la URL con el parámetro ?menu=
    const params = new URLSearchParams(searchParams.toString());
    if (menuId === 'control') {
      // Si se vuelve al panel de control, eliminar el parámetro para limpiar la URL
      params.delete('menu');
    } else {
      params.set('menu', menuId);
    }
    setSearchParams(params);
    
    // Cerrar el sidebar en móvil después de seleccionar
    if (window.innerWidth < 768) {
      onClose();
    }
  };

  return (
    <>
      {/* Overlay para cerrar el sidebar en móvil */}
      {isOpen && (
        <div className="sidebar-overlay" onClick={onClose}></div>
      )}
      
      
      <div className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-container">
           <img src={logo} alt="EcoApp logo" className="sidebar-logo-img" />
        </div>
      </div>

      {/* Acceso principal fijo */}
      <div className="sidebar-control-fixed">
        <button
          onClick={() => handleMenuClick('control')}
          className={`sidebar-button sidebar-button-primary ${activeMenu === 'control' ? 'active' : ''}`}
        >
          <i className="bi bi-grid-fill sidebar-button-icon"></i>
          <span>Panel de Control</span>
        </button>
      </div>

      <div className="sidebar-scroll-content">
        <div className="sidebar-section-switcher" role="tablist" aria-label="Secciones del menú">
          {menuSections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`sidebar-switcher-btn ${activeSection === section.id ? 'active' : ''}`}
              role="tab"
              aria-selected={activeSection === section.id}
            >
              {section.title}
            </button>
          ))}
        </div>

        <div className="sidebar-group sidebar-group-static">
          <div className="sidebar-group-header">
            <span className="sidebar-section-title">{activeSection === 'menu' ? 'MENÚ PRINCIPAL' : 'HERRAMIENTAS'}</span>
          </div>
          <nav className="sidebar-nav sidebar-nav-compact">
            {visibleItems.map(item => (
              <button
                key={item.id}
                onClick={() => handleMenuClick(item.id)}
                className={`sidebar-button ${activeMenu === item.id ? 'active' : ''}`}
              >
                <i className={`bi ${item.icon} sidebar-button-icon`}></i>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>
    </div>
    </>
  );
}
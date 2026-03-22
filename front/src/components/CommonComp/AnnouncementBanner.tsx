import React, { useEffect, useState } from 'react';
import { getAnnouncementsByRole } from '../../services/announcementService';
import { config } from '../../config/environment';

interface Announcement {
  id: number;
  title: string;
  description: string | null;
  url: string | null;
  imagePath: string;
  targetRole: 'recolector' | 'reciclador' | 'both';
  state: number;
  createdDate: string;
  createdBy: number;
}

interface AnnouncementBannerProps {
  role: 'recolector' | 'reciclador' | 'both';
  position?: 'left' | 'right';
}

const AnnouncementBanner: React.FC<AnnouncementBannerProps> = ({ role, position = 'left' }) => {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    const loadAnnouncements = async () => {
      try {
        setLoading(true);
        const data = await getAnnouncementsByRole(role);
        console.log('📢 Anuncios cargados para rol', role, ':', data);
        
        if (data && data.length > 0) {
          console.log('✅ Anuncios encontrados:', data.length);
          data.forEach((a: Announcement, idx: number) => {
            console.log(`  [${idx}] "${a.title}" - targetRole: ${a.targetRole}, imagePath: ${a.imagePath}`);
          });
          setAnnouncements(data);
          setAnnouncement(data[0]);
        } else {
          console.log('⚠️ No hay anuncios para el rol:', role);
        }
      } catch (error) {
        console.error('❌ Error cargando anuncios:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAnnouncements();
  }, [role]);

  // Auto-cambiar de anuncio cada 5 segundos
  useEffect(() => {
    if (announcements.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % announcements.length);
      setAnnouncement(announcements[(currentIndex + 1) % announcements.length]);
    }, 5000);

    return () => clearInterval(interval);
  }, [announcements, currentIndex]);

  // Función para obtener la URL correcta de la imagen
  const getImageUrl = (imagePath: string) => {
    if (!imagePath) return '';
    
    // Si ya es una URL completa, retornarla
    if (imagePath.startsWith('http')) {
      return imagePath;
    }
    
    // Si es relativa, agregar el backend desde config
    return `${config.api.baseUrl}${imagePath}`;
  };

  const bannerClass = position === 'left' ? 'banner-left' : 'banner-right';

  return (
    <div className={`announcement-sidebar-card ${bannerClass}`}>
      {loading ? (
        <div className="announcement-loading">
          Cargando anuncios...
        </div>
      ) : announcement ? (
        <>
          {/* Imagen del anuncio */}
          <div className="announcement-image-section">
            <img
              src={getImageUrl(announcement.imagePath)}
              alt={announcement.title}
              className="announcement-image"
              onError={() => {
                console.error('❌ Error cargando imagen:', getImageUrl(announcement.imagePath));
              }}
              onLoad={() => {
                console.log('✅ Imagen cargada:', getImageUrl(announcement.imagePath));
              }}
            />
          </div>

          {/* Contenido del anuncio */}
          <div className="announcement-content-section">
            <h3 className="announcement-title">{announcement.title}</h3>
            <p className="announcement-description">
              {announcement.description || 'Sin descripción'}
            </p>
            <button
              className="announcement-explore-btn"
              type="button"
              onClick={() => {
                if (announcement.url) {
                  window.open(announcement.url, '_blank', 'noopener,noreferrer');
                }
              }}
              disabled={!announcement.url}
            >
              Explorar →
            </button>

            {/* Indicadores de página */}
            {announcements.length > 1 && (
              <div className="announcement-indicators">
                {announcements.map((_, idx) => (
                  <div
                    key={idx}
                    className={`indicator-dot ${idx === currentIndex ? 'active' : ''}`}
                    onClick={() => {
                      setCurrentIndex(idx);
                      setAnnouncement(announcements[idx]);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="announcement-empty">
          Sin anuncios disponibles
        </div>
      )}
    </div>
  );
};

export default AnnouncementBanner;

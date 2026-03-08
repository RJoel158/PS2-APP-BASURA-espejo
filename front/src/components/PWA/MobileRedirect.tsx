import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * Detects if user is on mobile and redirects from "/" to "/login".
 * Also skips redirect if user is already logged in.
 */
const MobileRedirect: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Only redirect on the home page
    if (location.pathname !== '/') return;

    // Check if already logged in
    const user = localStorage.getItem('user');
    if (user) return; // Don't redirect if already logged in

    // Detect mobile device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );

    // Also check screen width for tablets in portrait
    const isSmallScreen = window.innerWidth <= 768;

    // Check if running as PWA
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (isMobile || isSmallScreen || isStandalone) {
      navigate('/login', { replace: true });
    }
  }, [location.pathname, navigate]);

  return null;
};

export default MobileRedirect;

import React, { useState, useEffect } from 'react';
import './PWAInstallButton.css';

// Extend Window interface for the beforeinstallprompt event
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

const PWAInstallButton: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showButton, setShowButton] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [hasModalOpen, setHasModalOpen] = useState(false);

  // Detectar modales abiertos con MutationObserver
  useEffect(() => {
    const checkModals = () => {
      const modals = document.querySelectorAll(
        '.forgot-modal-overlay, .modal-overlay, [class*="modal-overlay"]'
      );
      setHasModalOpen(modals.length > 0);
    };

    const observer = new MutationObserver(checkModals);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    // Check if already installed as PWA
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as any).standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowButton(true);

      // Auto show tooltip after 2 seconds
      setTimeout(() => {
        setShowTooltip(true);
        setTimeout(() => setShowTooltip(false), 5000);
      }, 2000);
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowButton(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // On mobile, always show the button (even if beforeinstallprompt hasn't fired)
    // This handles iOS which doesn't support beforeinstallprompt
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile && !isStandalone) {
      setShowButton(true);
      setTimeout(() => {
        setShowTooltip(true);
        setTimeout(() => setShowTooltip(false), 5000);
      }, 3000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Pulse animation every 8 seconds
  useEffect(() => {
    if (!showButton) return;
    const interval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 1000);
    }, 8000);
    return () => clearInterval(interval);
  }, [showButton]);

  const handleInstallClick = async () => {
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

    if (deferredPrompt) {
      // Android / Chrome - use the native prompt
      try {
        await deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        if (choiceResult.outcome === 'accepted') {
          setShowButton(false);
        }
        setDeferredPrompt(null);
      } catch (err) {
        console.error('Error installing PWA:', err);
        // If prompt fails, show manual instructions
        setShowTooltip(true);
      }
    } else if (isIOS) {
      // iOS - show instructions since there's no native prompt
      setShowTooltip(true);
    } else {
      // Android sin prompt aún — mostrar instrucciones manuales
      setShowTooltip(true);
    }
  };

  // Ocultar si está instalada, no hay botón, o hay un modal abierto
  if (isInstalled || !showButton || hasModalOpen) return null;

  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

  return (
    <>
      {/* Floating install button */}
      <button
        className={`pwa-install-fab ${isAnimating ? 'pwa-pulse' : ''}`}
        onClick={handleInstallClick}
        aria-label="Descargar la App"
      >
        <div className="pwa-fab-content">
          <svg
            className="pwa-fab-icon"
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          <span className="pwa-fab-text">Descarga la App</span>
        </div>
      </button>

      {/* Tooltip / Instructions overlay */}
      {showTooltip && (
        <div className="pwa-tooltip-overlay" onClick={() => setShowTooltip(false)}>
          <div className="pwa-tooltip-card" onClick={(e) => e.stopPropagation()}>
            <button
              className="pwa-tooltip-close"
              onClick={() => setShowTooltip(false)}
              aria-label="Cerrar"
            >
              &times;
            </button>

            <div className="pwa-tooltip-icon-wrapper">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
                <rect width="48" height="48" rx="12" fill="#198754" />
                <text x="24" y="28" fontFamily="Arial" fontSize="16" fontWeight="bold" fill="white" textAnchor="middle">GB</text>
              </svg>
            </div>

            <h3 className="pwa-tooltip-title">Instala GreenBit</h3>

            {isIOS ? (
              <div className="pwa-tooltip-instructions">
                <p>Para instalar GreenBit en tu iPhone:</p>
                <ol>
                  <li>
                    Toca el botón <strong>Compartir</strong>{' '}
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#007AFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle' }}>
                      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                      <polyline points="16 6 12 2 8 6" />
                      <line x1="12" y1="2" x2="12" y2="15" />
                    </svg>
                    {' '}en la barra inferior
                  </li>
                  <li>
                    Desplázate y selecciona <strong>"Agregar a pantalla de inicio"</strong>
                  </li>
                  <li>
                    Toca <strong>"Agregar"</strong> para confirmar
                  </li>
                </ol>
                <p className="pwa-tooltip-note">
                  La app aparecerá en tu pantalla de inicio como una aplicación nativa.
                </p>
              </div>
            ) : deferredPrompt ? (
              <div className="pwa-tooltip-instructions">
                <p>Agrega GreenBit a tu pantalla de inicio para acceder más rápido sin abrir el navegador.</p>
                <button
                  className="pwa-tooltip-install-btn"
                  onClick={handleInstallClick}
                >
                  Instalar ahora
                </button>
              </div>
            ) : (
              <div className="pwa-tooltip-instructions">
                <p>Para instalar GreenBit en tu dispositivo:</p>
                <ol>
                  <li>Toca el menú del navegador <strong>( ⋮ )</strong> en la esquina superior derecha</li>
                  <li>Busca <strong>"Instalar aplicación"</strong> o <strong>"Agregar a pantalla de inicio"</strong></li>
                  <li>Confirma tocando <strong>"Instalar"</strong></li>
                </ol>
                <p className="pwa-tooltip-note">
                  Si no ves la opción, asegúrate de usar <strong>Google Chrome</strong> o <strong>Samsung Internet</strong>.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default PWAInstallButton;

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
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowButton(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // On mobile, keep install CTA visible even if beforeinstallprompt hasn't fired yet.
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile && !isStandalone) {
      setShowButton(true);
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
      }
    } else {
      console.info('Install prompt is not available yet on this browser/session.');
    }
  };

  // Ocultar si está instalada, no hay botón, o hay un modal abierto
  if (isInstalled || !showButton || hasModalOpen) return null;

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
    </>
  );
};

export default PWAInstallButton;

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Index.css';
import PWAInstallButton from '../PWA/PWAInstallButton';

import centerLogo from '../../res/centerLogo.png';

const M = 'RECICLA ✦ RECOLECTA ✦ REDUCE ✦ ';
const MARQUEE = M + M + M + M;
const TITLE = 'GreenBit';

export default function Index() {
  const navigate = useNavigate();
  const [showLoader, setShowLoader] = useState(false);
  const [loaderExiting, setLoaderExiting] = useState(false);
  const [ready, setReady] = useState(false);

  const titleChars = useMemo(() => TITLE.split(''), []);

  useEffect(() => {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
    const isSmallScreen = window.innerWidth <= 768;

    if (!(isMobile || isSmallScreen)) {
      // Desktop: animaciones inmediatas
      setReady(true);
      return;
    }

    setShowLoader(true);
    const exitTimer = window.setTimeout(() => {
      setLoaderExiting(true); // inicia fade-out del loader
    }, 1500);
    const hideTimer = window.setTimeout(() => {
      setShowLoader(false);
      setLoaderExiting(false);
      setReady(true); // dispara animaciones de entrada
    }, 2000);
    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(hideTimer);
    };
  }, []);

  return (
    <div className="lp">

      {showLoader && (
        <div
          className={`lp-loader ${loaderExiting ? 'lp-loader--exit' : ''}`}
          role="status"
          aria-live="polite"
          aria-label="Cargando pantalla de inicio"
        >
          <img src={centerLogo} alt="GreenBit" className="lp-loader-logo lp-loader-bounce" />
          <h2 className="lp-loader-title lp-loader-fade">{TITLE}</h2>
          <div className="lp-spinner" />
          <p className="lp-loader-text lp-loader-fade">Cargando...</p>
        </div>
      )}

      {/* ═══════ BANDA SUPERIOR ═══════ */}
      <div className={`lp-band-wrap ${ready ? 'lp-anim-band-top' : 'lp-anim-hidden'}`}>
        <div className="lp-band">
          <div className="lp-marquee"><span>{MARQUEE}</span><span>{MARQUEE}</span></div>
        </div>
      </div>

      {/* ═══════ HERO ═══════ */}
      <main className="lp-hero">
        <img
          src={centerLogo}
          alt="GreenBit"
          className={`lp-logo ${ready ? 'lp-anim-logo' : 'lp-anim-hidden'}`}
        />
        <h1 className="lp-title" aria-label={TITLE}>
          {titleChars.map((char, index) => (
            <span
              key={`${char}-${index}`}
              className={`lp-title-char ${ready ? '' : 'lp-anim-hidden'}`}
              style={{
                animationDelay: ready ? `${0.3 + index * 0.08}s` : '0s',
                animationPlayState: ready ? 'running' : 'paused',
              }}
            >
              {char}
            </span>
          ))}
        </h1>
        <p className={`lp-subtitle ${ready ? 'lp-anim-subtitle' : 'lp-anim-hidden'}`}>
          Se parte de la plataforma de reciclaje<br/>inteligente
        </p>
        <button
          className={`lp-cta ${ready ? 'lp-anim-cta' : 'lp-anim-hidden'}`}
          onClick={() => navigate('/register')}
        >
          U N E T E
        </button>
        <p className={`lp-login ${ready ? 'lp-anim-login' : 'lp-anim-hidden'}`}>
          ¿Ya tienes cuenta? <a onClick={() => navigate('/login')}>Inicia sesión</a>
        </p>
      </main>

      {/* ═══════ BANDA INFERIOR ═══════ */}
      <div className={`lp-band-wrap lp-band-wrap--bot ${ready ? 'lp-anim-band-bot' : 'lp-anim-hidden'}`}>
        <div className="lp-band">
          <div className="lp-marquee lp-marquee--rev"><span>{MARQUEE}</span><span>{MARQUEE}</span></div>
        </div>
      </div>

      <PWAInstallButton />
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import './ClockConfiguration.css';

// Convierte HH:mm a minutos desde las 00:00 para simplificar calculos.
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

// Obtiene la hora actual tambien en minutos del dia.
function getCurrentMinutesOfDay(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

// Retorna el progreso transcurrido del horario en un valor entre 0 y 1.

function calculateElapsedProgress(start: string, end: string, nowMinutes: number): number {
  const startMinutes = timeToMinutes(start);
  const endMinutes = timeToMinutes(end);

  // Si inicio y fin son iguales, tomamos el periodo como completo (100%).
  if (startMinutes === endMinutes) {
    return 1;
  }

  const overnight = startMinutes > endMinutes;

  if (!overnight) {
    const duration = endMinutes - startMinutes;

    if (nowMinutes < startMinutes) {
      return 0;
    }

    if (nowMinutes >= endMinutes) {
      return 1;
    }

    return (nowMinutes - startMinutes) / duration;
  }

  const duration = (24 * 60 - startMinutes) + endMinutes;
  const isActive = nowMinutes >= startMinutes || nowMinutes < endMinutes;

  if (!isActive) {
    return 1;
  }

  const elapsed = nowMinutes >= startMinutes
    ? nowMinutes - startMinutes
    : (24 * 60 - startMinutes) + nowMinutes;

  return elapsed / duration;
}

export default function ClockConfiguration() {
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('18:00');
  const [draftStartTime, setDraftStartTime] = useState(startTime);
  const [draftEndTime, setDraftEndTime] = useState(endTime);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nowMinutes, setNowMinutes] = useState(getCurrentMinutesOfDay());

  useEffect(() => {
    // Refresca cada minuto para que el aro avance automaticamente.
    const intervalId = window.setInterval(() => {
      setNowMinutes(getCurrentMinutesOfDay());
    }, 60 * 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const elapsedRatio = useMemo(
    () => calculateElapsedProgress(startTime, endTime, nowMinutes),
    [startTime, endTime, nowMinutes]
  );

  // Validacion de hora inicio y hora fin
  const isInvalidRange = useMemo(
    () => timeToMinutes(draftStartTime) > timeToMinutes(draftEndTime),
    [draftStartTime, draftEndTime]
  );

  const radius = 47;
  const circumference = 2 * Math.PI * radius;
  // arcLength define cuanto tramo verde se dibuja en el aro.
  const arcLength = Math.max(0, Math.min(circumference, elapsedRatio * circumference));

  const openModal = () => {
    setDraftStartTime(startTime);
    setDraftEndTime(endTime);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const applyHours = () => {
    if (isInvalidRange) {
      return;
    }

    setStartTime(draftStartTime);
    setEndTime(draftEndTime);
    setIsModalOpen(false);
  };

  return (
    <>
      <div className="card clock-config-card">
        <div className="card-header clock-config-header">
          <div>
            <h2 className="card-title">Horario de reciclaje</h2>
          </div>
        </div>

        <div className="clock-visual-wrapper">
          <div className="clock-ring">
            <svg className="clock-ring-svg" viewBox="0 0 120 120" aria-hidden="true">
              <defs>
                <linearGradient id="clockProgressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#27c568" />
                  <stop offset="100%" stopColor="#13ad7f" />
                </linearGradient>
              </defs>
              <circle className="clock-ring-track" cx="60" cy="60" r={radius} />
              <g transform="rotate(-90 60 60)">
                <circle
                  className="clock-ring-window"
                  cx="60"
                  cy="60"
                  r={radius}
                  stroke="url(#clockProgressGradient)"
                  strokeDasharray={`${arcLength} ${circumference}`}
                />
              </g>
            </svg>
            <div className="clock-ring-center">
              <strong className="clock-ring-value">{startTime} - {endTime}</strong>
            </div>
          </div>
        </div>

        <div className="clock-config-footer">
          <button className="clock-config-button" type="button" onClick={openModal}>
            Cambiar horarios
          </button>
        </div>
      </div>

      {isModalOpen && (
        <div className="clock-modal-overlay" role="dialog" aria-modal="true" aria-label="Cambiar horarios">
          <div className="clock-modal-card">
            <div className="clock-modal-header">
              <h3>Cambiar horarios</h3>
              <button className="clock-modal-close" type="button" onClick={closeModal} aria-label="Cerrar modal">
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            <div className="clock-modal-body">
              <label className="clock-input-group" htmlFor="modal-clock-start-time">
                <span className="clock-input-label">Hora de inicio</span>
                <input
                  id="modal-clock-start-time"
                  className="clock-input"
                  type="time"
                  value={draftStartTime}
                  onChange={(event) => setDraftStartTime(event.target.value)}
                  aria-label="Hora de inicio"
                />
              </label>

              <label className="clock-input-group" htmlFor="modal-clock-end-time">
                <span className="clock-input-label">Hora de fin</span>
                <input
                  id="modal-clock-end-time"
                  className="clock-input"
                  type="time"
                  value={draftEndTime}
                  onChange={(event) => setDraftEndTime(event.target.value)}
                  aria-label="Hora de fin"
                />
              </label>
            </div>

            {isInvalidRange && (
              <p className="clock-modal-error" role="alert">
                La hora de inicio no puede ser mayor que la hora de fin.
              </p>
            )}

            <div className="clock-modal-actions">
              <button className="clock-modal-cancel" type="button" onClick={closeModal}>
                Cancelar
              </button>
              <button
                className="clock-config-button"
                type="button"
                onClick={applyHours}
                disabled={isInvalidRange}
              >
                Aplicar horario
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

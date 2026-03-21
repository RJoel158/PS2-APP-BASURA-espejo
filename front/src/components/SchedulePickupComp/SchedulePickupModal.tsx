import React, { useEffect, useMemo, useState } from 'react';
import './SchedulePickup.css';
import SuccessModal from '../CommonComp/SuccesModal';
import api from '../../services/api';
import { API_ENDPOINTS } from '../../config/endpoints';

interface SchedulePickupModalProps {
  show: boolean;
  onClose: () => void;
  selectedRequest: { id: number };
  onScheduleSuccess?: () => void;
  variant?: 'modal' | 'inline';
}

interface DayAvailability {
  day: string;
  shortName: string;
  available: boolean;
}

interface RequestData {
  id: number;
  idUser: number;
  name: string;
  startHour: string;
  endHour: string;
  daysAvailability: {
    Monday: number;
    Tuesday: number;
    Wednesday: number;
    Thursday: number;
    Friday: number;
    Saturday: number;
    Sunday: number;
  };
}


const SchedulePickupModal: React.FC<SchedulePickupModalProps> = ({ show, onClose, selectedRequest, onScheduleSuccess, variant = 'modal' }) => {
  const isInline = variant === 'inline';
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [showSuccess, setShowSuccess] = useState<boolean>(false);
  const [showErrorModal, setShowErrorModal] = useState<boolean>(false);
  const [errorModalMessage, setErrorModalMessage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [requestData, setRequestData] = useState<RequestData | null>(null);
  const [daysAvailability, setDaysAvailability] = useState<DayAvailability[]>([]);
  const [timeError, setTimeError] = useState<string>('');

  const availableDays = useMemo(() => daysAvailability.filter((day) => day.available), [daysAvailability]);

  //Valida el formato de hora
  const validateTimeFormat = (time: string): boolean => {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
    return timeRegex.test(time);
  };
  //Convierte la hora al formato HH:MM:SS
  const normalizeTimeToSQL = (time: string): string => {
    if (!time) return '';

    if (time.split(':').length === 3) {
      return time;
    }

    if (time.split(':').length === 2) {
      return `${time}:00`;
    }

    return time;
  };

  const dayMapping: { [key: string]: { full: string; short: string } } = {
    Monday: { full: 'Lunes', short: 'Lun' },
    Tuesday: { full: 'Martes', short: 'Mar' },
    Wednesday: { full: 'Miércoles', short: 'Mié' },
    Thursday: { full: 'Jueves', short: 'Jue' },
    Friday: { full: 'Viernes', short: 'Vie' },
    Saturday: { full: 'Sábado', short: 'Sáb' },
    Sunday: { full: 'Domingo', short: 'Dom' }
  };

  useEffect(() => {
    if (show && selectedRequest?.id) {
      fetchRequestData();
    }
  }, [show, selectedRequest]);

  const formatTime = (time: string): string => {
    if (!time) return '';
    return time.substring(0, 5);
  };

  const fetchRequestData = async () => {
    try {
      setLoading(true);
      setError(null);
      setTimeError('');
      setSelectedTime('');

      const response = await api.get(
        API_ENDPOINTS.REQUESTS.SCHEDULE(selectedRequest.id)
      );

      if (response.data.success && response.data.data) {
        const formattedData = {
          ...response.data.data,
          startHour: formatTime(response.data.data.startHour || ''),
          endHour: formatTime(response.data.data.endHour || '')
        };

        setRequestData(formattedData);

        const daysData = typeof response.data.data.daysAvailability === 'string'
          ? JSON.parse(response.data.data.daysAvailability)
          : response.data.data.daysAvailability;

        const days: DayAvailability[] = Object.entries(dayMapping).map(([engDay, spanish]) => ({
          day: spanish.full,
          shortName: spanish.short,
          available: daysData[engDay] === 1
        }));

        setDaysAvailability(days);

        const firstAvailable = days.find(d => d.available);
        if (firstAvailable) {
          setSelectedDay(firstAvailable.day);
        } else {
          setSelectedDay('');
        }
      }
    } catch (err) {
      console.error('Error fetching request data:', err);
      setError('No se pudieron cargar los datos de la solicitud');
    } finally {
      setLoading(false);
    }
  };

  const getNextDateForDay = (dayName: string): string => {
    const daysMap: { [key: string]: number } = {
      'Domingo': 0,
      'Lunes': 1,
      'Martes': 2,
      'Miércoles': 3,
      'Jueves': 4,
      'Viernes': 5,
      'Sábado': 6
    };

    const today = new Date();
    const targetDay = daysMap[dayName];
    const todayDay = today.getDay();

    let diff = targetDay - todayDay;
    if (diff <= 0) diff += 7;

    const nextDate = new Date(today);
    nextDate.setDate(today.getDate() + diff);

    const day = nextDate.getDate().toString().padStart(2, '0');
    const month = (nextDate.getMonth() + 1).toString().padStart(2, '0');
    const year = nextDate.getFullYear().toString().slice(-2);

    return `${day}/${month}/${year}`;
  };

  const isTimeInRange = (time: string): boolean => {
    if (!time || !requestData) return false;

    const selectedMinutes = parseInt(time.split(':')[0]) * 60 + parseInt(time.split(':')[1]);
    const startMinutes = parseInt(requestData.startHour.split(':')[0]) * 60 + parseInt(requestData.startHour.split(':')[1]);
    const endMinutes = parseInt(requestData.endHour.split(':')[0]) * 60 + parseInt(requestData.endHour.split(':')[1]);

    return selectedMinutes >= startMinutes && selectedMinutes <= endMinutes;
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = e.target.value;
    setSelectedTime(newTime);

    if (timeError) {
      setTimeError('');
    }
  };

  const handleConfirm = async () => {
    if (!selectedDay) {
      setTimeError('Selecciona un día disponible');
      return;
    }

    if (!selectedTime) {
      setTimeError('Por favor selecciona una hora');
      return;
    }
    
    if (!validateTimeFormat(selectedTime)) {
      setTimeError('Formato de hora inválido. Use HH:MM');
      return;
    }
    
    if (!isTimeInRange(selectedTime)) {
      setTimeError(`La hora debe estar entre ${requestData?.startHour} y ${requestData?.endHour}`);
      return;
    }
    
    setSubmitting(true);
    
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) {
        setTimeError('No se encontró información del usuario. Por favor inicia sesión nuevamente.');
        setSubmitting(false);
        return;
      }

      const parsedUser = JSON.parse(userStr);
      const collectorId = parsedUser.id;

      if (!collectorId) {
        setTimeError('No se pudo obtener el ID del recolector');
        setSubmitting(false);
        return;
      }

      if (requestData && requestData.idUser === collectorId) {
        setTimeError('No puedes aceptar tu propia solicitud de reciclaje');
        setErrorModalMessage('No puedes aceptar tu propia solicitud de reciclaje. Debes esperar a que otro recolector la acepte.');
        setShowErrorModal(true);
        setSubmitting(false);
        return;
      }

      const dateString = getNextDateForDay(selectedDay);
      const [day, month, year] = dateString.split('/');
      const fullYear = `20${year}`;
      
      const acceptedDate = `${fullYear}-${month}-${day}`;

      const acceptedHour = normalizeTimeToSQL(selectedTime);

      const appointmentData = {
        idRequest: selectedRequest.id,
        acceptedDate,
        collectorId,
        acceptedHour
      };

      const response = await api.post(API_ENDPOINTS.APPOINTMENTS.SCHEDULE, appointmentData);
      const result = response.data;

      if (!result.success) {
        const errorMsg = result.error || result.message || 'Error desconocido al crear la cita';
        throw new Error(errorMsg);
      }

      setTimeError('');
      setShowSuccess(true);

      setTimeout(() => {
        onClose();
        if (onScheduleSuccess) {
          onScheduleSuccess();
        } else {
          window.location.reload();
        }
      }, 1500);

    } catch (err) {
      let errorMessage = 'Error al agendar el recojo. Intenta nuevamente.';
      let isConflict = false;
      
      if (typeof err === 'object' && err !== null) {
        const status = (err as any).response?.status;
        const errorData = (err as any).response?.data;
        
        if (status === 409) {
          isConflict = true;
          errorMessage = 'Ya existe una cita en ese horario. Por favor elige otro horario.';
        } else if (status === 403) {
          errorMessage = 'No puedes aceptar tu propia solicitud de reciclaje.';
        } else if (errorData?.error) {
          errorMessage = errorData.error;
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      if (!isConflict) {
        setTimeError(errorMessage);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!show) return null;

  const scheduleContent = (
    <div className={`schedule-card ${isInline ? 'schedule-inline' : 'schedule-modal'}`}>
      <div className="schedule-header">
        <h4>Programar recojo{requestData?.name ? `: ${requestData.name}` : ''}</h4>
        {!isInline && (
          <button type="button" className="schedule-close" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        )}
      </div>

      {loading ? (
        <div className="schedule-loading">
          <div className="spinner-border text-success" role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
          <p>Cargando disponibilidad...</p>
        </div>
      ) : error ? (
        <div className="alert alert-danger mb-0" role="alert">
          {error}
        </div>
      ) : requestData ? (
        <>
          <div className="schedule-range-banner">
            Horario disponible: <strong>{requestData.startHour} - {requestData.endHour}</strong>
          </div>

          <div className="schedule-days-section">
            <span className="schedule-label">Días disponibles</span>
            <div className="schedule-day-grid">
              {availableDays.map((day) => (
                <button
                  key={day.day}
                  type="button"
                  className={`schedule-day-chip ${selectedDay === day.day ? 'selected' : ''}`}
                  onClick={() => setSelectedDay(day.day)}
                >
                  {day.shortName}
                </button>
              ))}
            </div>
            {availableDays.length === 0 && (
              <p className="schedule-empty-days">Esta solicitud no tiene días habilitados para recojo.</p>
            )}
            {selectedDay && (
              <small className="schedule-next-date">Próxima fecha: {getNextDateForDay(selectedDay)}</small>
            )}
          </div>

          <div className="schedule-time-section">
            <label htmlFor="schedule-time" className="schedule-label">Hora de recojo</label>
            <input
              id="schedule-time"
              type="time"
              className="form-control schedule-time-input"
              min={requestData.startHour}
              max={requestData.endHour}
              value={selectedTime}
              onChange={handleTimeChange}
            />
          </div>

          {timeError && (
            <div className="alert alert-danger mt-2 mb-0" role="alert">
              {timeError}
            </div>
          )}

          <div className="schedule-actions">
            <button type="button" className="btn btn-light" onClick={onClose} disabled={submitting}>
              Cancelar
            </button>
            <button
              type="button"
              className="btn schedule-confirm-btn"
              onClick={handleConfirm}
              disabled={submitting || !selectedDay || !selectedTime || availableDays.length === 0}
            >
              {submitting ? 'Agendando...' : 'Confirmar recojo'}
            </button>
          </div>
        </>
      ) : null}
    </div>
  );

  return (
    <>
      {isInline ? (
        <div className="schedule-inline-host">{scheduleContent}</div>
      ) : (
        <div className="schedule-overlay" onClick={onClose}>
          <div className="schedule-modal-host" onClick={(e) => e.stopPropagation()}>
            {scheduleContent}
          </div>
        </div>
      )}

      {showSuccess && requestData && (
        <SuccessModal
          title="¡Recojo agendado!"
          message={`Has agendado tu recojo de ${requestData.name} para el ${selectedDay} ${getNextDateForDay(selectedDay)} a las ${selectedTime}. Espera la confirmación del reciclador.`}
          redirectUrl="/recolectorIndex"
        />
      )}

      {showErrorModal && (
        <SuccessModal
          title="Error"
          message={errorModalMessage}
          onClose={() => setShowErrorModal(false)}
        />
      )}
    </>
  );
};

export default SchedulePickupModal;
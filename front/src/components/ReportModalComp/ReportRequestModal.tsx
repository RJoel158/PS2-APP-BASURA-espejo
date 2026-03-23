import React, { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import './ReportRequestModal.css';
import api from '../../services/api';
import { API_ENDPOINTS } from '../../config/endpoints';
import { debugLog } from '../../config/environment';
import { Validator } from '../../common/Validator';

interface ReportRequestModalProps {
  show: boolean;
  requestId: number;
  onClose: () => void;
  onSubmit: () => void;  // llamado solo al tener éxito
}

const MAX_DESC = 150;
const MIN_DESC = 10;

const ReportRequestModal: React.FC<ReportRequestModalProps> = ({
  show,
  requestId,
  onClose,
  onSubmit
}) => {
  const [reportReason, setReportReason] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [reportValidationError, setReportValidationError] = useState('');
  const [alreadyReported, setAlreadyReported] = useState(false);
  const [checkingExistingReport, setCheckingExistingReport] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showToast = (icon: 'success' | 'info' | 'error', title: string, text?: string) => {
    Swal.fire({
      icon,
      title,
      text,
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 2500,
      customClass: {
        container: 'report-toast-container'
      }
    });
  };

  useEffect(() => {
    if (!show) {
      setReportReason('');
      setReportDescription('');
      setReportValidationError('');
      setAlreadyReported(false);
      setCheckingExistingReport(false);
      setIsSubmitting(false);
    }
  }, [show]);

  useEffect(() => {
    if (!show) {
      return;
    }

    let isMounted = true;

    const checkExistingReport = async () => {
      const userString = localStorage.getItem('user');
      if (!userString) {
        return;
      }

      const currentUser = JSON.parse(userString);
      const prosecutorId = Number(currentUser?.id);
      if (!Number.isInteger(prosecutorId) || prosecutorId <= 0) {
        return;
      }

      setCheckingExistingReport(true);
      try {
        const response = await api.get(API_ENDPOINTS.REQUEST_REPORTS.CHECK(requestId, prosecutorId));
        const hasReported = Boolean(response?.data?.data?.hasReported);
        if (!isMounted) {
          return;
        }

        setAlreadyReported(hasReported);
        if (hasReported) {
          setReportValidationError('Ya reportaste esta solicitud anteriormente.');
          showToast('info', 'Ya reportaste esta solicitud', 'No puedes reportar la misma solicitud dos veces.');
        }
      } catch (error) {
        if (isMounted) {
          debugLog('[WARN] ReportRequestModal - No se pudo verificar reporte previo', error);
        }
      } finally {
        if (isMounted) {
          setCheckingExistingReport(false);
        }
      }
    };

    checkExistingReport();

    return () => {
      isMounted = false;
    };
  }, [show, requestId]);

  if (!show) return null;

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= MAX_DESC) {
      setReportDescription(value);
    }

    if (reportValidationError) {
      setReportValidationError('');
    }
  };

  const handleSubmit = async () => {
    if (alreadyReported) {
      showToast('info', 'Ya reportaste esta solicitud', 'No puedes reportar la misma solicitud dos veces.');
      return;
    }

    if (!reportReason) {
      setReportValidationError('Selecciona una razón del reporte.');
      return;
    }

    const descriptionError = Validator.validateDescription(reportDescription, MAX_DESC, MIN_DESC);
    if (descriptionError) {
      if (descriptionError === 'La descripción es requerida') {
        setReportValidationError('Ingresa una descripción del reporte.');
      } else {
        setReportValidationError(descriptionError);
      }
      return;
    }


    const userString = localStorage.getItem('user');
    if (!userString) {
      setReportValidationError('No se encontró información del usuario. Por favor inicia sesión nuevamente.');
      return;
    }

    const currentUser = JSON.parse(userString);
    const prosecutorId = currentUser.id;

    if (!prosecutorId) {
      setReportValidationError('No se pudo obtener el ID del usuario.');
      return;
    }

    setIsSubmitting(true);
    setReportValidationError('');

    try {
      debugLog('[INFO] ReportRequestModal - Enviando reporte:', { requestId, prosecutorId, reason: reportReason });

      const response = await api.post(API_ENDPOINTS.REQUEST_REPORTS.CREATE, {
        reason: reportReason,
        description: Validator.normalizeDescription(reportDescription),
        prosecutorId,
        requestId
      });

      if (!response.data.success) {
        throw new Error(response.data.error || 'Error al enviar el reporte');
      }

      debugLog('[INFO] ReportRequestModal - Reporte creado:', response.data);
      showToast('success', 'Reporte enviado correctamente');
      setAlreadyReported(true);

      // Espera breve para que el usuario vea el snackbar de éxito.
      setTimeout(() => {
        onSubmit();
      }, 1100);
    } catch (error: any) {
      console.error('[ERROR] ReportRequestModal - Error al enviar reporte:', error);

      const status = error?.response?.status;
      const backendMsg = error?.response?.data?.error;

      if (status === 409) {
        setAlreadyReported(true);
        setReportValidationError('Ya has reportado esta solicitud anteriormente.');
        showToast('info', 'Ya reportaste esta solicitud', 'No puedes reportar la misma solicitud dos veces.');
      } else {
        setReportValidationError(backendMsg || error?.message || 'Error al enviar el reporte. Intenta nuevamente.');
        showToast('error', 'No se pudo enviar el reporte');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="report-modal-overlay">
      <div className="report-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="report-modal-header">
          <h5 className="report-modal-title">Reportar solicitud</h5>
        </div>

        <div className="report-modal-body">
          <label className="report-label" htmlFor="report-reason">Razón</label>
          <select
            id="report-reason"
            className="report-select"
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            disabled={isSubmitting || checkingExistingReport || alreadyReported}
          >
            <option value="">Selecciona una razón</option>
            <option value="Incumplimiento de horario">Incumplimiento de horario</option>
            <option value="Comportamiento inapropiado">Comportamiento inapropiado</option>
            <option value="Información incorrecta">Información incorrecta</option>
            <option value="Otro">Otro</option>
          </select>

          <label className="report-label mt-2" htmlFor="report-description">Descripción</label>
          <textarea
            id="report-description"
            className="report-textarea"
            rows={4}
            placeholder="Describe el motivo del reporte (mín. 10 caracteres)"
            value={reportDescription}
            onChange={handleDescriptionChange}
            maxLength={MAX_DESC}
            disabled={isSubmitting || checkingExistingReport || alreadyReported}
          />
          <div className={`report-char-counter ${reportDescription.length >= MAX_DESC - 20 ? 'report-char-counter--warning' : ''}`}>
            {reportDescription.length}/{MAX_DESC}
          </div>

          {reportValidationError && (
            <div className="report-error-text">{reportValidationError}</div>
          )}

        </div>

        <div className="report-modal-actions">
          <button
            type="button"
            className="report-cancel-btn"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="report-submit-btn"
            onClick={handleSubmit}
            disabled={isSubmitting || checkingExistingReport || alreadyReported}
          >
            {checkingExistingReport ? 'Verificando...' : alreadyReported ? 'Ya reportado' : isSubmitting ? 'Enviando...' : 'Enviar reporte'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default ReportRequestModal;

import React, { useEffect, useState } from 'react';
import './ReportRequestModal.css';

interface ReportRequestModalProps {
  show: boolean;
  onClose: () => void;
  onSubmit: (reason: string, description: string) => void;
}

const ReportRequestModal: React.FC<ReportRequestModalProps> = ({
  show,
  onClose,
  onSubmit
}) => {
  const [reportReason, setReportReason] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [reportValidationError, setReportValidationError] = useState('');

  useEffect(() => {
    if (!show) {
      setReportReason('');
      setReportDescription('');
      setReportValidationError('');
    }
  }, [show]);

  if (!show) return null;

  const handleSubmit = () => {
    if (!reportReason) {
      setReportValidationError('Selecciona una razón del reporte.');
      return;
    }

    if (!reportDescription.trim()) {
      setReportValidationError('Ingresa una descripción del reporte.');
      return;
    }

    onSubmit(reportReason, reportDescription.trim());
  };

  return (
    <div className="report-modal-overlay" onClick={onClose}>
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
            placeholder="Describe el motivo del reporte"
            value={reportDescription}
            onChange={(e) => setReportDescription(e.target.value)}
          />

          {reportValidationError && (
            <div className="report-error-text">{reportValidationError}</div>
          )}
        </div>

        <div className="report-modal-actions">
          <button
            type="button"
            className="report-cancel-btn"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="report-submit-btn"
            onClick={handleSubmit}
          >
            Enviar reporte
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportRequestModal;

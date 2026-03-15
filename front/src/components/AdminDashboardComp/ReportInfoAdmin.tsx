import { useEffect, useMemo, useState } from 'react';
import CommonHeader from '../CommonComp/CommonHeader';
import ConfirmModal from '../CommonComp/ConfirmModal';
import { getAllRequestReports, type RequestReportItem } from '../../services/requestReportService';
import api from '../../services/api';
import { API_ENDPOINTS } from '../../config/endpoints';
import ImageCarousel from '../SchedulePickupComp/ImageCarousel';
import SimplePickupMap from '../PickupDetailsComp/SimplePickupMap';
import 'leaflet/dist/leaflet.css';
import './ReportInfoAdmin.css';
import '../UserManagementComp/UserManagement.css';

interface GroupedReports {
  requestId: number;
  reports: RequestReportItem[];
}

interface RequestScheduleData {
  id: number;
  name?: string;
  description?: string;
  startHour?: string;
  endHour?: string;
  images?: Array<{ id: number; image: string; uploadedDate: string }>;
  daysAvailability?: Record<string, number | boolean> | string;
}

interface RequestBaseData {
  id: number;
  userName?: string;
  userEmail?: string;
  registerDate?: string;
  latitude?: number;
  longitude?: number;
  schedule?: Array<Record<string, number | boolean>>;
}

const SELECTED_REPORT_STORAGE_KEY = 'denuncias_selected_report_id';

const formatDate = (dateString: string) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
};

const getStateBadge = (state: number) => {
  if (state === 0) return 'Verificado';
  return 'Pendiente';
};

const getStateClass = (state: number) => {
  if (state === 0) return 'verified';
  return 'pending';
};

const getDateTimestamp = (dateString: string) => {
  const parsedDate = new Date(dateString);
  if (Number.isNaN(parsedDate.getTime())) return 0;
  return parsedDate.getTime();
};

const getGroupMaterialLabel = (reports: RequestReportItem[]) => {
  const uniqueMaterials = Array.from(
    new Set(reports.map((report) => report.materialName || '-'))
  );

  if (uniqueMaterials.length === 1) return uniqueMaterials[0];
  return 'Varios materiales';
};

const formatAvailableDays = (
  daysAvailability?: Record<string, number | boolean> | string,
  fallbackSchedule?: Array<Record<string, number | boolean>>
) => {
  let parsedAvailability: Record<string, number | boolean> | undefined;

  if (daysAvailability && typeof daysAvailability === 'object') {
    parsedAvailability = daysAvailability;
  } else if (typeof daysAvailability === 'string') {
    try {
      const parsed = JSON.parse(daysAvailability);
      if (parsed && typeof parsed === 'object') {
        parsedAvailability = parsed as Record<string, number | boolean>;
      }
    } catch {
      parsedAvailability = undefined;
    }
  }

  if (!parsedAvailability && fallbackSchedule && fallbackSchedule.length > 0) {
    parsedAvailability = fallbackSchedule[0];
  }

  if (!parsedAvailability) return '-';

  const dayLabels: Record<string, string> = {
    Monday: 'Lunes',
    monday: 'Lunes',
    Tuesday: 'Martes',
    tuesday: 'Martes',
    Wednesday: 'Miércoles',
    wednesday: 'Miércoles',
    Thursday: 'Jueves',
    thursday: 'Jueves',
    Friday: 'Viernes',
    friday: 'Viernes',
    Saturday: 'Sábado',
    saturday: 'Sábado',
    Sunday: 'Domingo',
    sunday: 'Domingo'
  };

  const available = Object.entries(parsedAvailability)
    .filter(([, value]) => value === 1 || value === true)
    .map(([day]) => dayLabels[day] || day);

  return available.length > 0 ? available.join(', ') : '-';
};

export default function DenunciasAdmin() {
  const [reports, setReports] = useState<RequestReportItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [stateFilter, setStateFilter] = useState<0 | 1>(1);
  const [dateSort, setDateSort] = useState<'desc' | 'asc'>('desc');
  const [expandedRequests, setExpandedRequests] = useState<Record<number, boolean>>({});
  const [selectedReport, setSelectedReport] = useState<RequestReportItem | null>(null);
  const [detailsLoading, setDetailsLoading] = useState<boolean>(false);
  const [requestDetails, setRequestDetails] = useState<RequestScheduleData | null>(null);
  const [requestBaseData, setRequestBaseData] = useState<RequestBaseData | null>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);

  const openReportDetails = async (report: RequestReportItem, persistSelection: boolean = true) => {
    setSelectedReport(report);
    setDetailsLoading(true);
    setRequestDetails(null);
    setRequestBaseData(null);

    if (persistSelection) {
      window.localStorage.setItem(SELECTED_REPORT_STORAGE_KEY, String(report.id));
    }

    try {
      const [scheduleResponse, requestResponse] = await Promise.all([
        api.get(API_ENDPOINTS.REQUESTS.SCHEDULE(report.requestId)),
        api.get(API_ENDPOINTS.REQUESTS.GET_BY_ID(report.requestId))
      ]);

      if (scheduleResponse.data?.success && scheduleResponse.data?.data) {
        setRequestDetails(scheduleResponse.data.data);
      }

      if (requestResponse.data?.success && requestResponse.data?.data) {
        setRequestBaseData(requestResponse.data.data);
      }
    } catch (error) {
      console.error('[DenunciasAdmin] Error cargando detalle de solicitud:', error);
    } finally {
      setDetailsLoading(false);
    }
  };

  const loadReports = async () => {
    try {
      setLoading(true);
      const data = await getAllRequestReports();
      setReports(data);

      const savedReportId = window.localStorage.getItem(SELECTED_REPORT_STORAGE_KEY);
      if (savedReportId) {
        const reportToRestore = data.find((item) => item.id === Number(savedReportId));
        if (reportToRestore) {
          await openReportDetails(reportToRestore, false);
        } else {
          window.localStorage.removeItem(SELECTED_REPORT_STORAGE_KEY);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const groupedReports = useMemo<GroupedReports[]>(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    const groups = new Map<number, RequestReportItem[]>();

    reports.forEach((report) => {
      if (report.state !== stateFilter) {
        return;
      }

      if (normalizedSearch) {
        const searchableText = [
          report.reason,
          report.prosecutorEmail,
          report.materialName || '',
          getStateBadge(report.state)
        ].join(' ').toLowerCase();

        if (!searchableText.includes(normalizedSearch)) {
          return;
        }
      }

      const current = groups.get(report.requestId) || [];
      current.push(report);
      groups.set(report.requestId, current);
    });

    return Array.from(groups.entries())
      .map(([requestId, grouped]) => {
        const sortedReports = [...grouped].sort((a, b) => {
          const aTime = getDateTimestamp(a.reportedAt);
          const bTime = getDateTimestamp(b.reportedAt);
          return dateSort === 'desc' ? bTime - aTime : aTime - bTime;
        });

        return { requestId, reports: sortedReports };
      })
      .sort((a, b) => {
        const aTime = getDateTimestamp(a.reports[0]?.reportedAt || '');
        const bTime = getDateTimestamp(b.reports[0]?.reportedAt || '');
        return dateSort === 'desc' ? bTime - aTime : aTime - bTime;
      });
  }, [reports, searchQuery, stateFilter, dateSort]);

  const toggleRequestGroup = (requestId: number) => {
    setExpandedRequests((prev) => ({
      ...prev,
      [requestId]: !prev[requestId]
    }));
  };

  const toggleDateSort = () => {
    setDateSort((prev) => (prev === 'desc' ? 'asc' : 'desc'));
  };

  const handleOpenDetails = async (report: RequestReportItem) => {
    await openReportDetails(report);
  };

  const handleCloseDetails = () => {
    setSelectedReport(null);
    setRequestDetails(null);
    setRequestBaseData(null);
    setDetailsLoading(false);
    setShowDeleteConfirm(false);
    window.localStorage.removeItem(SELECTED_REPORT_STORAGE_KEY);
  };

  const handleMantener = async () => {
    if (!selectedReport) return;
    setActionLoading(true);
    try {
      await api.patch(API_ENDPOINTS.REQUEST_REPORTS.UPDATE_STATE(selectedReport.id), { state: 0 });
      handleCloseDetails();
      await loadReports();
    } catch (error) {
      console.error('[DenunciasAdmin] Error al mantener reporte:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEliminarSolicitud = async () => {
    if (!selectedReport) return;
    setActionLoading(true);
    try {
      await Promise.all([
        api.patch(API_ENDPOINTS.REQUEST_REPORTS.UPDATE_STATE(selectedReport.id), { state: 0 }),
        api.put(API_ENDPOINTS.REQUESTS.UPDATE_STATE(selectedReport.requestId), { state: 6 }),
      ]);
      handleCloseDetails();
      await loadReports();
    } catch (error) {
      console.error('[DenunciasAdmin] Error al eliminar solicitud:', error);
    } finally {
      setActionLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const requestMarkerPosition =
    requestBaseData?.latitude !== undefined && requestBaseData?.longitude !== undefined
      ? [Number(requestBaseData.latitude), Number(requestBaseData.longitude)] as [number, number]
      : undefined;

  return (
    <div className="denuncias-admin-page">
      <CommonHeader
        title="Denuncias"
        searchPlaceholder="Buscar por tipo, correo o material..."
        searchQuery={searchQuery}
        onSearch={setSearchQuery}
        additionalFilters={
          <div className="denuncias-filter-group">
            <label className="denuncias-filter-label" htmlFor="denuncias-state-filter">Estado</label>
            <select
              id="denuncias-state-filter"
              className="denuncias-filter-select"
              value={stateFilter}
              onChange={(e) => setStateFilter(Number(e.target.value) as 0 | 1)}
            >
              <option value={1}>Pendiente</option>
              <option value={0}>Verificado</option>
            </select>
          </div>
        }
      />

      {selectedReport ? (
        <div className="denuncia-fullscreen-content">
          <button type="button" className="denuncia-back-button" onClick={handleCloseDetails}>
            ← Volver a denuncias
          </button>

          <div className="denuncia-fullscreen-layout">
            <div className="denuncia-map-section">
              <h3>Ubicación del Recojo</h3>
              <div className="denuncia-map-wrapper">
                <SimplePickupMap
                  markerPosition={requestMarkerPosition}
                  center={requestMarkerPosition}
                  markerText="Solicitud reportada"
                />
              </div>
            </div>

            <div className="denuncia-info-section">
              {detailsLoading ? (
                <p className="denuncia-details-loading">Cargando detalles...</p>
              ) : (
                <>
                  <h2 className="denuncia-details-title">
                    {requestDetails?.name ? `Reciclaje de ${requestDetails.name}` : `Reciclaje de ${selectedReport.materialName || 'Material'}`}
                  </h2>

                  <p className="denuncia-report-created-highlight">
                    Reportado el: {formatDate(selectedReport.reportedAt)}
                  </p>

                  <div className="denuncia-details-carousel-wrapper">
                    <ImageCarousel
                      images={requestDetails?.images || []}
                      altText={`Material ${requestDetails?.name || selectedReport.materialName || 'reciclable'}`}
                    />
                  </div>

                  <p className="denuncia-details-description">
                    {requestDetails?.description || selectedReport.requestDescription || '-'}
                  </p>

                  <section className="denuncia-details-section">
                    <h4>Datos de la solicitud</h4>
                    <div className="denuncia-details-grid">
                      <div>
                        <span className="denuncia-details-label">Material</span>
                        <p className="denuncia-details-value">{requestDetails?.name || selectedReport.materialName || '-'}</p>
                      </div>
                      <div>
                        <span className="denuncia-details-label">Horario</span>
                        <p className="denuncia-details-value">
                          {requestDetails?.startHour && requestDetails?.endHour
                            ? `${requestDetails.startHour} - ${requestDetails.endHour}`
                            : '-'}
                        </p>
                      </div>
                      <div className="denuncia-details-grid-span-2 denuncia-days-email-row">
                        <div>
                          <span className="denuncia-details-label">Días disponibles</span>
                          <p className="denuncia-details-value">
                            {formatAvailableDays(requestDetails?.daysAvailability, requestBaseData?.schedule)}
                          </p>
                        </div>
                        <div>
                          <span className="denuncia-details-label">Correo del solicitante</span>
                          <p className="denuncia-details-value">{requestBaseData?.userEmail || '-'}</p>
                        </div>
                      </div>
                      <div>
                        <span className="denuncia-details-label">Fecha de solicitud</span>
                        <p className="denuncia-details-value">{formatDate(requestBaseData?.registerDate || '')}</p>
                      </div>
                    </div>
                  </section>

                  <section className="denuncia-details-section">
                    <h4>Datos del reporte</h4>
                    <div className="denuncia-details-grid">
                      <div>
                        <span className="denuncia-details-label">Quién reportó</span>
                        <p className="denuncia-details-value">{selectedReport.prosecutorEmail || '-'}</p>
                      </div>
                      <div>
                        <span className="denuncia-details-label">Tipo</span>
                        <p className="denuncia-details-value">{selectedReport.reason || '-'}</p>
                      </div>
                      <div>
                        <span className="denuncia-details-label">Estado</span>
                        <p className="denuncia-details-value">{getStateBadge(selectedReport.state)}</p>
                      </div>
                    </div>
                    <div>
                      <span className="denuncia-details-label">Descripción</span>
                      <p className="denuncia-details-value">{selectedReport.description || '-'}</p>
                    </div>
                  </section>

                  {selectedReport.state !== 0 && (
                    <div className="denuncia-actions-row">
                      <button
                        type="button"
                        className="denuncia-action-btn denuncia-action-btn-danger"
                        disabled={actionLoading}
                        onClick={() => setShowDeleteConfirm(true)}
                      >
                        Eliminar solicitud
                      </button>
                      <button
                        type="button"
                        className="denuncia-action-btn denuncia-action-btn-secondary"
                        disabled={actionLoading}
                        onClick={handleMantener}
                      >
                        {actionLoading ? 'Procesando...' : 'Mantener'}
                      </button>
                    </div>
                  )}

                  {showDeleteConfirm && (
                    <ConfirmModal
                      title="¿Eliminar solicitud?"
                      message="Esta acción marcará la denuncia como verificada y eliminará la solicitud. "
                      confirmText={actionLoading ? 'Eliminando...' : 'Sí, eliminar'}
                      cancelText="Cancelar"
                      isDangerous
                      onConfirm={handleEliminarSolicitud}
                      onCancel={() => setShowDeleteConfirm(false)}
                    />
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="denuncias-admin-content">
          {loading ? (
            <div className="denuncias-state-message">Cargando denuncias...</div>
          ) : groupedReports.length === 0 ? (
            <div className="denuncias-state-message">No hay denuncias registradas.</div>
          ) : (
            <div className="user-management-table-container denuncias-table-wrapper">
              <div className="user-management-table-scroll">
                <table className="user-management-table denuncias-table">
                  <thead>
                    <tr className="user-management-table-head-row">
                      <th className="user-management-table-head-cell">Material</th>
                      <th className="user-management-table-head-cell">Tipo</th>
                      <th className="user-management-table-head-cell">Correo</th>
                      <th className="user-management-table-head-cell">
                        <button type="button" className="denuncias-date-sort-btn" onClick={toggleDateSort}>
                          Fecha {dateSort === 'desc' ? '↓' : '↑'}
                        </button>
                      </th>
                      <th className="user-management-table-head-cell">Estado</th>
                      <th className="user-management-table-head-cell">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedReports.map((group) => {
                      const isGrouped = group.reports.length > 1;
                      const isOpen = expandedRequests[group.requestId] ?? false;

                      if (!isGrouped) {
                        const report = group.reports[0];
                        return (
                          <tr className="user-management-table-body-row" key={report.id}>
                            <td className="user-management-table-body-cell" data-label="Material">{report.materialName || '-'}</td>
                            <td className="user-management-table-body-cell" data-label="Tipo">{report.reason}</td>
                            <td className="user-management-table-body-cell" data-label="Correo">{report.prosecutorEmail || '-'}</td>
                            <td className="user-management-table-body-cell" data-label="Fecha">{formatDate(report.reportedAt)}</td>
                            <td className="user-management-table-body-cell" data-label="Estado">
                              <span className={`denuncia-state ${getStateClass(report.state)}`}>
                                {getStateBadge(report.state)}
                              </span>
                            </td>
                            <td className="user-management-table-body-cell" data-label="Acción">
                              <button type="button" className="denuncia-detail-btn" onClick={() => handleOpenDetails(report)}>
                                Ver detalles
                              </button>
                            </td>
                          </tr>
                        );
                      }

                      return (
                        <>
                          <tr className="user-management-table-body-row denuncias-group-row" key={`group-${group.requestId}`}>
                            <td className="user-management-table-body-cell" data-label="Material">
                              <button
                                type="button"
                                className="denuncias-group-toggle-btn"
                                onClick={() => toggleRequestGroup(group.requestId)}
                              >
                                {getGroupMaterialLabel(group.reports)} ({group.reports.length} denuncias)
                                <span className={`denuncias-group-arrow ${isOpen ? 'open' : ''}`}>▾</span>
                              </button>
                            </td>
                            <td className="user-management-table-body-cell" data-label="Tipo">-</td>
                            <td className="user-management-table-body-cell" data-label="Correo">-</td>
                            <td className="user-management-table-body-cell" data-label="Fecha">-</td>
                            <td className="user-management-table-body-cell" data-label="Estado">-</td>
                            <td className="user-management-table-body-cell" data-label="Acción">-</td>
                          </tr>

                          {isOpen && group.reports.map((report) => (
                            <tr className="user-management-table-body-row denuncias-subrow" key={report.id}>
                              <td className="user-management-table-body-cell denuncias-subrow-cell" data-label="Material">↳ {report.materialName || '-'}</td>
                              <td className="user-management-table-body-cell" data-label="Tipo">{report.reason}</td>
                              <td className="user-management-table-body-cell" data-label="Correo">{report.prosecutorEmail || '-'}</td>
                              <td className="user-management-table-body-cell" data-label="Fecha">{formatDate(report.reportedAt)}</td>
                              <td className="user-management-table-body-cell" data-label="Estado">
                                <span className={`denuncia-state ${getStateClass(report.state)}`}>
                                  {getStateBadge(report.state)}
                                </span>
                              </td>
                              <td className="user-management-table-body-cell" data-label="Acción">
                                <button type="button" className="denuncia-detail-btn" onClick={() => handleOpenDetails(report)}>
                                  Ver detalles
                                </button>
                              </td>
                            </tr>
                          ))}
                        </>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

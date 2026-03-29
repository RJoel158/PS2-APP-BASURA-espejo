import React, { useEffect, useState } from 'react';
import CommonHeader from '../CommonComp/CommonHeader';
import CheckModal from '../CommonComp/CheckModal';
import RankingConfiguration from './RankingConfiguration';
import api from '../../services/api';
import { API_ENDPOINTS } from '../../config/endpoints';
import './RankingPeriodsAdminTheme.css';

interface Period {
  id: number;
  fecha_inicio: string;
  fecha_fin: string;
  estado: string;
  creado_por?: number;
}

interface RankingItem {
  user_id: number;
  email: string;
  rol: string;
  puntaje_final: number;
}

interface RankingData {
  recicladores: RankingItem[];
  recolectores: RankingItem[];
}

// Utilidad para mostrar fecha legible
function formatDateDisplay(dateStr: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr.replace(' ', 'T'));
  return d.toLocaleString('es-ES', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

const RankingPeriodsAdmin: React.FC = () => {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<number | null>(null);
  const [ranking, setRanking] = useState<RankingData>({ recicladores: [], recolectores: [] });
  const [loadingRanking, setLoadingRanking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showCloseConfirmModal, setShowCloseConfirmModal] = useState(false);
  const [periodToClose, setPeriodToClose] = useState<number | null>(null);

  useEffect(() => {
    fetchPeriods();
  }, []);

  useEffect(() => {
    if (selectedPeriodId) {
      const period = periods.find(p => p.id === selectedPeriodId);
      if (period) {
        if (period.estado === 'cerrado') {
          fetchHistoricalRanking(selectedPeriodId);
        } else {
          fetchLiveRanking(selectedPeriodId);
        }
      }
    } else {
      setRanking({ recicladores: [], recolectores: [] });
    }
  }, [selectedPeriodId, periods]);

  const fetchPeriods = async () => {
    setLoading(true);
    try {
      const res = await api.get(API_ENDPOINTS.RANKING.GET_PERIODS);
      setPeriods(res.data.periods || []);
      setError(null);
    } catch (err) {
      setError('Error al cargar los periodos');
    } finally {
      setLoading(false);
    }
  };

  // Ranking en tiempo real (periodo activo)
  const fetchLiveRanking = async (periodId: number) => {
    setLoadingRanking(true);
    try {
      const res = await api.get(API_ENDPOINTS.RANKING.GET_LIVE(periodId));
      setRanking({
        recicladores: res.data.recicladores || [],
        recolectores: res.data.recolectores || []
      });
      setError(null);
    } catch (err) {
      const message = (err as any)?.response?.data?.error || 'Error al cargar ranking en vivo';
      setError(message);
      setRanking({ recicladores: [], recolectores: [] });
    } finally {
      setLoadingRanking(false);
    }
  };

  // Ranking histórico (periodo cerrado)
  const fetchHistoricalRanking = async (periodId: number) => {
    setLoadingRanking(true);
    try {
      const res = await api.get(API_ENDPOINTS.RANKING.GET_TOPS(periodId));
      // Agrupa por rol
      const recicladores = res.data.tops.filter((r: any) => r.rol === 'reciclador');
      const recolectores = res.data.tops.filter((r: any) => r.rol === 'recolector');
      setRanking({ recicladores, recolectores });
      setError(null);
    } catch (err) {
      const message = (err as any)?.response?.data?.error || 'Error al cargar ranking histórico';
      setError(message);
      setRanking({ recicladores: [], recolectores: [] });
    } finally {
      setLoadingRanking(false);
    }
  };

  const handleStartPeriod = async () => {
    setMensaje('');
    try {
      await api.post(API_ENDPOINTS.RANKING.CREATE_PERIOD, {
        fecha_inicio: new Date().toISOString().slice(0, 19).replace('T', ' '),
        estado: 'activo'
      });
      fetchPeriods();
      setMensaje('✅ Periodo iniciado correctamente');
    } catch (err) {
      setMensaje('❌ Error al iniciar periodo');
    }
  };

  const handleClose = async (id: number) => {
    setPeriodToClose(id);
    setShowCloseConfirmModal(true);
  };

  const confirmClosePeriod = async () => {
    if (!periodToClose) return;
    
    setShowCloseConfirmModal(false);
    setMensaje('');
    setLoadingRanking(true);
    try {
      const closeRes = await api.post(API_ENDPOINTS.RANKING.CLOSE_PERIOD, { periodo_id: periodToClose });
      await fetchPeriods();
      if (closeRes?.data?.success) {
        setMensaje('Periodo cerrado y ranking guardado');
      } else {
        setMensaje(closeRes?.data?.message || 'Periodo cerrado sin datos de ranking para mostrar');
      }
      if (selectedPeriodId === periodToClose) {
        await fetchHistoricalRanking(periodToClose);
      }
      setError(null);
    } catch (err) {
      const message = (err as any)?.response?.data?.error || 'Error al cerrar periodo';
      setMensaje(message);
      setError(message);
    } finally {
      setLoadingRanking(false);
      setPeriodToClose(null);
    }
  };

  // Filtrar periodos eliminados (solo mostrar 'activo' y 'cerrado')
  const visiblePeriods = periods.filter(p => p.estado === 'activo' || p.estado === 'cerrado');
  const hasSelectedPeriod = selectedPeriodId !== null;

  return (
    <div
      className="ranking-periods-dashboard ranking-theme-page"
      style={{
        paddingLeft: '2.5rem',
        paddingRight: '2.5rem',
        maxHeight: '100vh',
        overflowY: 'auto'
      }}
    >
      <CommonHeader
        title="Gestión de Periodos de Ranking"
        searchPlaceholder="Buscar periodo..."
        searchQuery=""
        onSearch={() => {}}
      />
      <div className="card mb-4 p-4 ranking-theme-card">
        <button
          className="btn btn-success mb-3"
          disabled={periods.some(p => p.estado === 'activo')}
          onClick={handleStartPeriod}
        >
          Empezar nueva temporada
        </button>
        {mensaje && (
          <div className={`alert mt-2 ${mensaje.startsWith('❌') ? 'alert-danger' : 'alert-success'}`}>{mensaje}</div>
        )}
        <div className="d-flex align-items-center gap-3 mb-3">
          <label htmlFor="ranking-period-selector" style={{ fontWeight: 600 }}>Selecciona periodo:</label>
          <select
            id="ranking-period-selector"
            title="Selecciona un periodo de ranking"
            className="form-select"
            style={{ maxWidth: 220 }}
            value={selectedPeriodId ?? ''}
            onChange={(e) => {
              const value = e.target.value;
              setSelectedPeriodId(value ? Number(value) : null);
            }}
          >
            <option value="">-- Selecciona --</option>
            {periods.map(p => (
              <option key={p.id} value={p.id}>
                {`Temporada ${p.id}`}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="card mb-4 p-4 ranking-theme-card">
        <RankingConfiguration />
      </div>

      {hasSelectedPeriod && (
      <div className="card mb-4 p-4 ranking-theme-card">
        {(
          <div className="mb-3">
            {(() => {
              const period = periods.find(p => p.id === selectedPeriodId);
              if (!period) return null;
              return (
                <div>
                  <strong>Fecha inicio:</strong> {formatDateDisplay(period.fecha_inicio)}<br />
                  <strong>Fecha fin:</strong> {period.estado === 'cerrado' ? formatDateDisplay(period.fecha_fin) : <span className="badge ranking-status-pill">En curso</span>}
                  {period.estado === 'activo' && (
                    <button className="btn ms-3 ranking-close-btn" onClick={() => handleClose(period.id)}>Cerrar periodo</button>
                  )}
                </div>
              );
            })()}
          </div>
        )}
        {/* Ranking por periodo */}
        {(
          <div className="row">
            <div className="col-md-6">
              <div className="card mb-4 ranking-top-card" style={{ minHeight: 350, overflowX: 'auto' }}>
                <div className="card-body">
                  <h5 className="card-title ranking-top-title">Top 10 Recicladores</h5>
                  <div className="table-responsive ranking-top-table-wrap" style={{ maxHeight: 300, overflowY: 'auto' }}>
                    {loadingRanking ? (
                      <div className="ranking-top-loading" style={{ textAlign: 'center', padding: '2rem' }}>
                        <span className="spinner-border spinner-border-sm" /> Procesando ranking...
                      </div>
                    ) : (
                      <table className="table table-bordered table-hover ranking-table user-management-table ranking-top-table" style={{ minWidth: 350 }}>
                        <thead className="table-light ranking-top-thead">
                          <tr>
                            <th className="ranking-top-col-pos">Posición</th>
                            <th className="ranking-top-col-email">Correo</th>
                            <th className="ranking-top-col-score">Puntaje</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ranking.recicladores && ranking.recicladores.length > 0 ? (
                            ranking.recicladores.map((r, idx) => (
                              <tr key={r.user_id}>
                                <td style={{ textAlign: 'center' }}>
                                  <span className="badge ranking-top-badge ranking-top-badge-recycler">{idx + 1}</span>
                                </td>
                                <td style={{ wordBreak: 'break-all' }}>{r.email}</td>
                                <td style={{ textAlign: 'center' }}>
                                  <span className="badge ranking-score-badge">{r.puntaje_final}</span>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={3} className="text-center">No hay recicladores en este periodo.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="card mb-4 ranking-top-card" style={{ minHeight: 350, overflowX: 'auto' }}>
                <div className="card-body">
                  <h5 className="card-title ranking-top-title">Top 10 Recolectores</h5>
                  <div className="table-responsive ranking-top-table-wrap" style={{ maxHeight: 300, overflowY: 'auto' }}>
                    {loadingRanking ? (
                      <div className="ranking-top-loading" style={{ textAlign: 'center', padding: '2rem' }}>
                        <span className="spinner-border spinner-border-sm" /> Procesando ranking...
                      </div>
                    ) : (
                      <table className="table table-bordered table-hover ranking-table user-management-table ranking-top-table" style={{ minWidth: 350 }}>
                        <thead className="table-light ranking-top-thead">
                          <tr>
                            <th className="ranking-top-col-pos">Posición</th>
                            <th className="ranking-top-col-email">Correo</th>
                            <th className="ranking-top-col-score">Puntaje</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ranking.recolectores && ranking.recolectores.length > 0 ? (
                            ranking.recolectores.map((r, idx) => (
                              <tr key={r.user_id}>
                                <td style={{ textAlign: 'center' }}>
                                  <span className="badge ranking-top-badge ranking-top-badge-collector">{idx + 1}</span>
                                </td>
                                <td style={{ wordBreak: 'break-all' }}>{r.email}</td>
                                <td style={{ textAlign: 'center' }}>
                                  <span className="badge ranking-score-badge">{r.puntaje_final}</span>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={3} className="text-center">No hay recolectores en este periodo.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      )}
      {/* Tabla de periodos (gestión) */}
      <div className="ranking-periods-panel mt-4 ranking-theme-card">
        {loading ? <div className="ranking-loading">Cargando...</div> : error ? <div className="alert alert-danger">{error}</div> : (
          <div className="table-responsive ranking-bottom-table-wrap">
            <table className="table table-bordered table-hover ranking-table user-management-table ranking-bottom-table mb-0">
              <thead className="table-light ranking-bottom-thead">
                <tr>
                  <th>Inicio</th>
                  <th>Fin</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {visiblePeriods.map(period => (
                  <tr key={period.id}>
                    <td>{formatDateDisplay(period.fecha_inicio)}</td>
                    <td>{period.estado === 'cerrado' ? formatDateDisplay(period.fecha_fin) : <span className="badge ranking-status-pill">En curso</span>}</td>
                    <td>
                      <span className={`badge ${period.estado === 'activo' ? 'ranking-state-active' : 'ranking-state-closed'}`}>{period.estado}</span>
                    </td>
                    <td>
                      {period.estado === 'activo' && (
                        <button className="btn btn-sm ranking-close-btn" onClick={() => handleClose(period.id)}>
                          <i className="bi bi-lock"></i> Cerrar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de confirmación para cerrar periodo */}
      {showCloseConfirmModal && (
        <CheckModal
          title="Cerrar Periodo"
          message="¿Cerrar este periodo? Se guardará el ranking histórico y no podrá ser modificado posteriormente."
          onConfirm={confirmClosePeriod}
          onCancel={() => {
            setShowCloseConfirmModal(false);
            setPeriodToClose(null);
          }}
        />
      )}
    </div>
  );
};

export default RankingPeriodsAdmin;

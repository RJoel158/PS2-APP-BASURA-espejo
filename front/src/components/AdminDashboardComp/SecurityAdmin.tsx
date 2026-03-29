import { useEffect, useMemo, useState } from 'react';
import CommonHeader from '../CommonComp/CommonHeader';
import {
  addBlacklist,
  deactivateBlacklist,
  getAuditLog,
  getBlacklist,
  getSuspiciousActivity,
  type AuditLogRow,
  type BlacklistRow,
  type SuspiciousActivityRow
} from '../../services/securityService';
import './SecurityAdmin.css';

const formatDate = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('es-ES');
};

const toPrettyJson = (value: any) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') {
    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch {
      return value;
    }
  }
  return JSON.stringify(value, null, 2);
};

export default function SecurityAdmin() {
  const [activeTab, setActiveTab] = useState<'blacklist' | 'suspicious' | 'audit'>('blacklist');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [blacklistRows, setBlacklistRows] = useState<BlacklistRow[]>([]);
  const [subjectType, setSubjectType] = useState<'ip' | 'user'>('ip');
  const [subjectValue, setSubjectValue] = useState('');
  const [blacklistReason, setBlacklistReason] = useState('');
  const [isPermanent, setIsPermanent] = useState(true);
  const [expiresAt, setExpiresAt] = useState('');

  const [suspiciousRows, setSuspiciousRows] = useState<SuspiciousActivityRow[]>([]);
  const [auditRows, setAuditRows] = useState<AuditLogRow[]>([]);

  const loadAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [blacklist, suspicious, audit] = await Promise.all([
        getBlacklist(),
        getSuspiciousActivity(),
        getAuditLog()
      ]);
      setBlacklistRows(blacklist);
      setSuspiciousRows(suspicious);
      setAuditRows(audit);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'No se pudo cargar el módulo de seguridad');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
  }, []);

  const filteredBlacklist = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return blacklistRows;
    return blacklistRows.filter(row =>
      row.subject_type.toLowerCase().includes(q) ||
      row.subject_value.toLowerCase().includes(q) ||
      String(row.reason || '').toLowerCase().includes(q)
    );
  }, [blacklistRows, searchQuery]);

  const filteredSuspicious = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return suspiciousRows;
    return suspiciousRows.filter(row =>
      row.event_type.toLowerCase().includes(q) ||
      String(row.ip_address || '').toLowerCase().includes(q) ||
      String(row.user_id || '').includes(q)
    );
  }, [suspiciousRows, searchQuery]);

  const filteredAudit = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return auditRows;
    return auditRows.filter(row =>
      row.action.toLowerCase().includes(q) ||
      String(row.target_table || '').toLowerCase().includes(q) ||
      String(row.actor_id || '').includes(q)
    );
  }, [auditRows, searchQuery]);

  const handleAddBlacklist = async () => {
    if (!subjectValue.trim()) {
      setError('subjectValue es requerido');
      return;
    }

    if (!isPermanent && !expiresAt) {
      setError('Debes especificar fecha de expiración si no es permanente');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await addBlacklist({
        subjectType,
        subjectValue: subjectValue.trim(),
        isPermanent,
        expiresAt: isPermanent ? null : new Date(expiresAt).toISOString().slice(0, 19).replace('T', ' '),
        reason: blacklistReason.trim() || null
      });
      setSubjectValue('');
      setBlacklistReason('');
      setExpiresAt('');
      await loadAll();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'No se pudo actualizar la blacklist');
      setLoading(false);
    }
  };

  const handleDeactivate = async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      await deactivateBlacklist(id);
      await loadAll();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'No se pudo desactivar el bloqueo');
      setLoading(false);
    }
  };

  return (
    <div className="security-admin-page">
      <CommonHeader
        title="Seguridad Operativa"
        searchPlaceholder="Buscar en el módulo de seguridad..."
        searchQuery={searchQuery}
        onSearch={setSearchQuery}
      />

      <div className="security-admin-content">
        <div className="security-alert security-alert-info">
          Configuración Global se administra desde el apartado Configuraciones.
        </div>

        <div className="security-tabs">
          <button className={activeTab === 'blacklist' ? 'active' : ''} onClick={() => setActiveTab('blacklist')}>Bloqueos (Blacklist)</button>
          <button className={activeTab === 'suspicious' ? 'active' : ''} onClick={() => setActiveTab('suspicious')}>Monitoreo de Actividad</button>
          <button className={activeTab === 'audit' ? 'active' : ''} onClick={() => setActiveTab('audit')}>Auditoría de Cambios</button>
        </div>

        {error && <div className="security-alert">{error}</div>}
        {loading && <div className="security-loading">Cargando...</div>}

        {activeTab === 'blacklist' && (
          <section className="security-section">
            <div className="security-form-grid security-form-grid-4">
              <select value={subjectType} onChange={(e) => setSubjectType(e.target.value as 'ip' | 'user')}>
                <option value="ip">IP</option>
                <option value="user">User ID</option>
              </select>
              <input
                type="text"
                value={subjectValue}
                onChange={(e) => setSubjectValue(e.target.value)}
                placeholder={subjectType === 'ip' ? 'Ej: 127.0.0.1' : 'Ej: 211'}
              />
              <input
                type="text"
                value={blacklistReason}
                onChange={(e) => setBlacklistReason(e.target.value)}
                placeholder="Razón del bloqueo"
              />
              <label className="checkbox-line">
                <input type="checkbox" checked={isPermanent} onChange={(e) => setIsPermanent(e.target.checked)} />
                Permanente
              </label>
              {!isPermanent && (
                <input
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                />
              )}
              <button onClick={handleAddBlacklist}>Agregar/Actualizar bloqueo</button>
            </div>

            <div className="security-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Tipo</th>
                    <th>Valor</th>
                    <th>Activo</th>
                    <th>Expira</th>
                    <th>Razón</th>
                    <th>Fecha</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBlacklist.map((row) => (
                    <tr key={row.id}>
                      <td>{row.subject_type}</td>
                      <td>{row.subject_value}</td>
                      <td>{row.is_active ? 'Sí' : 'No'}</td>
                      <td>{formatDate(row.expires_at)}</td>
                      <td>{row.reason || '-'}</td>
                      <td>{formatDate(row.created_at)}</td>
                      <td>
                        {row.is_active ? (
                          <button onClick={() => handleDeactivate(row.id)}>Desactivar</button>
                        ) : (
                          <span>-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredBlacklist.length === 0 && (
                    <tr><td colSpan={7}>Sin registros en blacklist</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeTab === 'suspicious' && (
          <section className="security-section">
            <div className="security-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Severidad</th>
                    <th>Evento</th>
                    <th>User ID</th>
                    <th>IP</th>
                    <th>Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSuspicious.map((row) => (
                    <tr key={row.id}>
                      <td>{formatDate(row.created_at)}</td>
                      <td>{row.severity}</td>
                      <td>{row.event_type}</td>
                      <td>{row.user_id ?? '-'}</td>
                      <td>{row.ip_address || '-'}</td>
                      <td><pre>{toPrettyJson(row.details) || '-'}</pre></td>
                    </tr>
                  ))}
                  {filteredSuspicious.length === 0 && (
                    <tr><td colSpan={6}>Sin actividad sospechosa registrada</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeTab === 'audit' && (
          <section className="security-section">
            <div className="security-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Actor</th>
                    <th>Acción</th>
                    <th>Tabla</th>
                    <th>Target ID</th>
                    <th>Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAudit.map((row) => (
                    <tr key={row.id}>
                      <td>{formatDate(row.created_at)}</td>
                      <td>{row.actor_id ?? '-'}</td>
                      <td>{row.action}</td>
                      <td>{row.target_table || '-'}</td>
                      <td>{row.target_id ?? '-'}</td>
                      <td><pre>{toPrettyJson(row.details) || '-'}</pre></td>
                    </tr>
                  ))}
                  {filteredAudit.length === 0 && (
                    <tr><td colSpan={6}>Sin eventos en auditoría</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

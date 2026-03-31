import { useEffect, useMemo, useState } from 'react';
import CommonHeader from '../CommonComp/CommonHeader';
import {
  addBlacklist,
  deactivateBlacklist,
  getAuditLog,
  getBlacklist,
  getSuspiciousActivity,
  getSuspiciousActivityDetails,
  getSuspiciousActivityGrouped,
  type AuditLogRow,
  type BlacklistRow,
  type SuspiciousActivityGroupRow,
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
  const [groupedRows, setGroupedRows] = useState<SuspiciousActivityGroupRow[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<SuspiciousActivityGroupRow | null>(null);
  const [groupDetails, setGroupDetails] = useState<SuspiciousActivityRow[]>([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [blacklistReason, setBlacklistReason] = useState('');
  const [isPermanent, setIsPermanent] = useState(true);
  const [expiresAt, setExpiresAt] = useState('');

  const [suspiciousRows, setSuspiciousRows] = useState<SuspiciousActivityRow[]>([]);
  const [auditRows, setAuditRows] = useState<AuditLogRow[]>([]);

  const loadAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [blacklist, grouped, suspicious, audit] = await Promise.all([
        getBlacklist(),
        getSuspiciousActivityGrouped(),
        getSuspiciousActivity(),
        getAuditLog()
      ]);
      setBlacklistRows(blacklist);
      setGroupedRows(grouped);
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

  const filteredGroupedRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return groupedRows;
    return groupedRows.filter(row =>
      String(row.user_name || '').toLowerCase().includes(q) ||
      String(row.ip_address || '').toLowerCase().includes(q) ||
      String(row.activity_date || '').toLowerCase().includes(q)
    );
  }, [groupedRows, searchQuery]);

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
      String(row.actor_name || '').toLowerCase().includes(q)
    );
  }, [auditRows, searchQuery]);

  const handleLoadDetails = async (group: SuspiciousActivityGroupRow) => {
    setSelectedGroup(group);
    setDetailsLoading(true);
    setError(null);
    try {
      const details = await getSuspiciousActivityDetails({
        activityDate: group.activity_date,
        userId: group.user_id,
        ipAddress: group.ip_address
      });
      setGroupDetails(details);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'No se pudo cargar el detalle de violaciones');
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleBanByGroupIp = async (group: SuspiciousActivityGroupRow) => {
    const ipToBan = (group.ip_address || '').trim();
    if (!ipToBan) {
      setError('No se encontró una IP para este grupo de violaciones');
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
        subjectType: 'ip',
        subjectValue: ipToBan,
        isPermanent,
        expiresAt: isPermanent ? null : new Date(expiresAt).toISOString().slice(0, 19).replace('T', ' '),
        reason: blacklistReason.trim() || `Ban por ${group.violation_count} violaciones detectadas`
      });
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
            <div className="security-alert security-alert-info">
              Flujo recomendado: revisa grupos de violaciones, abre detalle y aplica ban por IP directo.
            </div>

            <div className="security-table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Usuario</th>
                    <th>IP</th>
                    <th>Violaciones</th>
                    <th>Tipos de evento</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGroupedRows.map((row, index) => (
                    <tr key={`${row.activity_date}-${row.user_id ?? 'anon'}-${row.ip_address ?? 'noip'}-${index}`}>
                      <td>{formatDate(row.activity_date)}</td>
                      <td>{row.user_name || 'Anónimo'}</td>
                      <td>{row.ip_address || '-'}</td>
                      <td>{row.violation_count}</td>
                      <td>{row.event_types || '-'}</td>
                      <td className="security-actions-cell">
                        <button onClick={() => handleLoadDetails(row)}>Ver detalle</button>
                        <button onClick={() => handleBanByGroupIp(row)} disabled={!row.ip_address}>Ban IP</button>
                      </td>
                    </tr>
                  ))}
                  {filteredGroupedRows.length === 0 && (
                    <tr><td colSpan={6}>Sin grupos de violaciones para mostrar</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="security-form-grid security-form-grid-4">
              <input type="text" value={selectedGroup?.ip_address || ''} readOnly placeholder="Selecciona un grupo para banear IP" />
              <input type="text" value={selectedGroup?.user_name || ''} readOnly placeholder="Usuario del grupo" />
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
            </div>

            {selectedGroup && (
              <div className="security-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Severidad</th>
                      <th>Evento</th>
                      <th>Detalle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailsLoading && (
                      <tr><td colSpan={4}>Cargando detalle...</td></tr>
                    )}
                    {!detailsLoading && groupDetails.map((row) => (
                      <tr key={row.id}>
                        <td>{formatDate(row.created_at)}</td>
                        <td>{row.severity}</td>
                        <td>{row.event_type}</td>
                        <td><pre>{toPrettyJson(row.details) || '-'}</pre></td>
                      </tr>
                    ))}
                    {!detailsLoading && groupDetails.length === 0 && (
                      <tr><td colSpan={4}>Este grupo no tiene eventos detallados</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            <div className="security-form-grid security-form-grid-4">
              <div className="security-alert security-alert-info" style={{ gridColumn: '1 / -1' }}>
                Blacklist activa: visualiza aquí los bloqueos actuales y desactiva cuando corresponda.
              </div>
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
                    <th>Usuario</th>
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
                      <td>{row.user_name || 'Anónimo'}</td>
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
                    <th>Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAudit.map((row) => (
                    <tr key={row.id}>
                      <td>{formatDate(row.created_at)}</td>
                      <td>{row.actor_name || 'Sistema'}</td>
                      <td>{row.action}</td>
                      <td>{row.target_table || '-'}</td>
                      <td><pre>{toPrettyJson(row.details) || '-'}</pre></td>
                    </tr>
                  ))}
                  {filteredAudit.length === 0 && (
                    <tr><td colSpan={5}>Sin eventos en auditoría</td></tr>
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

import { useEffect, useMemo, useState } from 'react';
import CommonHeader from '../CommonComp/CommonHeader';
import { getSecurityConfig, saveSecurityConfig, type SecurityConfigRow } from '../../services/securityService';
import './AppConfigAdmin.css';

const DEFAULT_CONFIG_KEYS = [
  'security.login.maxAttempts',
  'security.login.blockMinutes',
  'security.suspicious.defaultSeverity'
];

const normalizeConfigValue = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed);
  } catch {
    if (trimmed === 'true') return true;
    if (trimmed === 'false') return false;
    const asNumber = Number(trimmed);
    if (!Number.isNaN(asNumber) && trimmed === String(asNumber)) {
      return asNumber;
    }
    return trimmed;
  }
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

const formatDate = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('es-ES');
};

export default function AppConfigAdmin() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [rows, setRows] = useState<SecurityConfigRow[]>([]);
  const [configKey, setConfigKey] = useState(DEFAULT_CONFIG_KEYS[0]);
  const [configValueText, setConfigValueText] = useState('');

  const loadConfig = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getSecurityConfig();
      setRows(data);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'No se pudo cargar configuración global');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadConfig();
  }, []);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => row.config_key.toLowerCase().includes(q));
  }, [rows, searchQuery]);

  const handleSaveConfig = async () => {
    if (!configKey.trim()) {
      setError('La clave de configuración es requerida');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const parsedValue = normalizeConfigValue(configValueText);
      await saveSecurityConfig(configKey.trim(), parsedValue);
      setConfigValueText('');
      await loadConfig();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'No se pudo guardar la configuración');
      setLoading(false);
    }
  };

  return (
    <div className="app-config-page">
      <CommonHeader
        title="Configuraciones Globales"
        searchPlaceholder="Buscar clave de configuración..."
        searchQuery={searchQuery}
        onSearch={setSearchQuery}
      />

      <div className="app-config-content">
        <div className="app-config-tip">
          Gestiona variables globales de la app. Los valores aceptan JSON, número, boolean o texto.
        </div>

        <div className="app-config-form">
          <input
            type="text"
            value={configKey}
            onChange={(e) => setConfigKey(e.target.value)}
            list="app-config-keys"
            placeholder="Clave (ej: security.login.maxAttempts)"
          />
          <datalist id="app-config-keys">
            {DEFAULT_CONFIG_KEYS.map((key) => (
              <option value={key} key={key} />
            ))}
          </datalist>

          <textarea
            value={configValueText}
            onChange={(e) => setConfigValueText(e.target.value)}
            placeholder='Valor JSON (ej: {"value": 5} o 10 o true)'
          />

          <button onClick={handleSaveConfig} disabled={loading}>Guardar configuración</button>
        </div>

        {error && <div className="app-config-error">{error}</div>}
        {loading && <div className="app-config-loading">Cargando...</div>}

        <div className="app-config-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Clave</th>
                <th>Valor</th>
                <th>Actualizado por</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr key={row.config_key}>
                  <td>{row.config_key}</td>
                  <td><pre>{toPrettyJson(row.config_value) || '-'}</pre></td>
                  <td>{row.updated_by ?? '-'}</td>
                  <td>{formatDate(row.updated_at)}</td>
                </tr>
              ))}
              {filteredRows.length === 0 && (
                <tr><td colSpan={4}>Sin configuraciones registradas</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

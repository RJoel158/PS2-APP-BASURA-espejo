import { useEffect, useMemo, useState } from 'react';
import CommonHeader from '../CommonComp/CommonHeader';
import { getSecurityConfig, saveSecurityConfig, type SecurityConfigRow } from '../../services/securityService';
import './AppConfigAdmin.css';

type PresetType = 'number' | 'select' | 'text';

interface ConfigPreset {
  key: string;
  label: string;
  description: string;
  type: PresetType;
  min?: number;
  max?: number;
  options?: string[];
  fallback: string;
}

const CONFIG_PRESETS: ConfigPreset[] = [
  {
    key: 'security.login.maxAttempts',
    label: 'Intentos máximos de login',
    description: 'Cantidad de intentos fallidos permitidos antes de disparar controles de seguridad.',
    type: 'number',
    min: 1,
    max: 20,
    fallback: '5'
  },
  {
    key: 'security.login.blockMinutes',
    label: 'Minutos de bloqueo temporal',
    description: 'Tiempo de bloqueo para intentos excesivos de inicio de sesión.',
    type: 'number',
    min: 1,
    max: 240,
    fallback: '30'
  },
  {
    key: 'security.suspicious.defaultSeverity',
    label: 'Severidad por defecto para eventos sospechosos',
    description: 'Nivel base asignado cuando el sistema registra actividad sospechosa.',
    type: 'select',
    options: ['low', 'medium', 'high', 'critical'],
    fallback: 'medium'
  }
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
  const [draftValues, setDraftValues] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [customKey, setCustomKey] = useState('');
  const [customValue, setCustomValue] = useState('');

  const loadConfig = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getSecurityConfig();
      setRows(data);
      const mapped = data.reduce<Record<string, string>>((acc, row) => {
        const value = row.config_value;
        if (value === null || value === undefined) {
          acc[row.config_key] = '';
        } else if (typeof value === 'object') {
          acc[row.config_key] = JSON.stringify(value);
        } else {
          acc[row.config_key] = String(value);
        }
        return acc;
      }, {});

      setDraftValues((prev) => ({ ...mapped, ...prev }));
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

  const handleSavePreset = async (preset: ConfigPreset) => {
    const value = draftValues[preset.key] ?? preset.fallback;
    setLoading(true);
    setSavingKey(preset.key);
    setError(null);
    try {
      const parsedValue = normalizeConfigValue(value);
      await saveSecurityConfig(preset.key, parsedValue);
      await loadConfig();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'No se pudo guardar la configuración');
      setLoading(false);
    } finally {
      setSavingKey(null);
    }
  };

  const handleSaveCustom = async () => {
    if (!customKey.trim()) {
      setError('La clave personalizada es requerida');
      return;
    }

    setLoading(true);
    setSavingKey('custom');
    setError(null);
    try {
      await saveSecurityConfig(customKey.trim(), normalizeConfigValue(customValue));
      setCustomKey('');
      setCustomValue('');
      await loadConfig();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'No se pudo guardar la configuración personalizada');
      setLoading(false);
    } finally {
      setSavingKey(null);
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
          Configura parámetros clave con controles guiados. Evita editar claves técnicas manualmente salvo casos avanzados.
        </div>

        <div className="app-config-cards">
          {CONFIG_PRESETS.map((preset) => {
            const value = draftValues[preset.key] ?? preset.fallback;
            return (
              <div className="app-config-card" key={preset.key}>
                <h3>{preset.label}</h3>
                <p>{preset.description}</p>

                {preset.type === 'number' && (
                  <input
                    type="number"
                    min={preset.min}
                    max={preset.max}
                    value={value}
                    onChange={(e) => setDraftValues((prev) => ({ ...prev, [preset.key]: e.target.value }))}
                  />
                )}

                {preset.type === 'select' && (
                  <select
                    value={value}
                    onChange={(e) => setDraftValues((prev) => ({ ...prev, [preset.key]: e.target.value }))}
                  >
                    {(preset.options || []).map((option) => (
                      <option value={option} key={option}>{option}</option>
                    ))}
                  </select>
                )}

                {preset.type === 'text' && (
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => setDraftValues((prev) => ({ ...prev, [preset.key]: e.target.value }))}
                  />
                )}

                <button onClick={() => handleSavePreset(preset)} disabled={loading}>
                  {savingKey === preset.key ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            );
          })}
        </div>

        <div className="app-config-form">
          <input
            type="text"
            value={customKey}
            onChange={(e) => setCustomKey(e.target.value)}
            placeholder="Clave personalizada (avanzado)"
          />
          <textarea
            value={customValue}
            onChange={(e) => setCustomValue(e.target.value)}
            placeholder='Valor (JSON, número, boolean o texto)'
          />
          <button onClick={handleSaveCustom} disabled={loading}>
            {savingKey === 'custom' ? 'Guardando...' : 'Guardar clave personalizada'}
          </button>
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

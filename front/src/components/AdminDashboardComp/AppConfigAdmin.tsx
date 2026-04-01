import { useEffect, useMemo, useState } from 'react';
import CommonHeader from '../CommonComp/CommonHeader';
import {
  type GeoBoundingBox,
  type GeoZoneBox,
  getClockConfig,
  getGeoCoverageConfig,
  getRankingDecreaseConfig,
  saveGeoCoverageConfig,
  saveClockConfig,
  saveRankingDecreaseConfig,
} from '../../services/appConfigService';
import GeoCoverageMap from './GeoCoverageMap';
import './AppConfigAdmin.css';

const minutesFromTime = (timeValue: string) => {
  const [hours, minutes] = timeValue.split(':').map(Number);
  return (hours * 60) + minutes;
};

const formatDuration = (totalMinutes: number) => {
  const safeMinutes = Math.max(0, totalMinutes);
  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;

  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} h`;
  return `${hours} h ${minutes} min`;
};

export default function AppConfigAdmin() {
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingHours, setSavingHours] = useState(false);
  const [savingRanking, setSavingRanking] = useState(false);
  const [savingGeo, setSavingGeo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [startHour, setStartHour] = useState('08:00');
  const [endHour, setEndHour] = useState('18:00');
  const [rankingDecrease, setRankingDecrease] = useState(10);
  const [geoRestrictionEnabled, setGeoRestrictionEnabled] = useState(true);
  const [geoRestrictionMessage, setGeoRestrictionMessage] = useState('Lo lamentamos, GreenBit aun no se encuentra disponible en esta zona');
  const [boliviaBbox, setBoliviaBbox] = useState<GeoBoundingBox>({
    minLat: -22.91,
    maxLat: -9.66,
    minLng: -69.65,
    maxLng: -57.45,
  });
  const [allowedZones, setAllowedZones] = useState<GeoZoneBox[]>([]);

  const loadConfig = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setError(null);
    try {
      const [clockConfig, rankingConfig, geoConfig] = await Promise.all([
        getClockConfig(),
        getRankingDecreaseConfig(10),
        getGeoCoverageConfig(),
      ]);

      setStartHour(clockConfig.startHour);
      setEndHour(clockConfig.endHour);
      setRankingDecrease(rankingConfig);
      setGeoRestrictionEnabled(geoConfig.enabled);
      setGeoRestrictionMessage(geoConfig.message);
      setBoliviaBbox(geoConfig.boliviaBbox);
      setAllowedZones(geoConfig.allowedZones);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'No se pudo cargar la configuración global.');
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  useEffect(() => {
    void loadConfig(true);
  }, []);

  const isInvalidHourRange = useMemo(
    () => minutesFromTime(startHour) > minutesFromTime(endHour),
    [startHour, endHour]
  );

  const operationWindow = useMemo(() => {
    const duration = minutesFromTime(endHour) - minutesFromTime(startHour);
    return formatDuration(duration);
  }, [startHour, endHour]);

  const resolveUpdatedBy = () => {
    const userRaw = localStorage.getItem('user');
    const user = userRaw ? JSON.parse(userRaw) : null;
    const updatedBy = Number(user?.id);
    return Number.isInteger(updatedBy) && updatedBy > 0 ? updatedBy : null;
  };

  const handleSaveHours = async () => {
    if (isInvalidHourRange) {
      setError('La hora de inicio no puede ser mayor que la hora de fin.');
      return;
    }

    const updatedBy = resolveUpdatedBy();
    if (!updatedBy) {
      setError('No se pudo identificar al usuario administrador.');
      return;
    }

    setSavingHours(true);
    setError(null);
    setStatusMessage(null);
    try {
      await saveClockConfig(startHour, endHour, updatedBy);
      setStatusMessage('Horario guardado correctamente.');
      await loadConfig(false);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'No se pudo guardar el horario.');
    } finally {
      setSavingHours(false);
    }
  };

  if (loading) {
    return (
      <div className="app-config-page">
        <CommonHeader
          title="Configuraciones Operativas"
          searchPlaceholder="Configuraciones permitidas"
          searchQuery={searchQuery}
          onSearch={setSearchQuery}
        />

        <div className="app-config-content">
          <div className="app-config-tip app-config-tip--loading">
            Cargando configuraciones desde el servidor...
          </div>

          <div className="app-config-cards app-config-cards--skeleton" aria-hidden="true">
            <section className="app-config-card app-config-card--skeleton">
              <div className="app-config-skeleton app-config-skeleton--title" />
              <div className="app-config-skeleton app-config-skeleton--text" />
              <div className="app-config-skeleton app-config-skeleton--text app-config-skeleton--short" />
              <div className="app-config-skeleton app-config-skeleton--input" />
              <div className="app-config-skeleton app-config-skeleton--input" />
              <div className="app-config-skeleton app-config-skeleton--button" />
            </section>

            <section className="app-config-card app-config-card--skeleton">
              <div className="app-config-skeleton app-config-skeleton--title" />
              <div className="app-config-skeleton app-config-skeleton--text" />
              <div className="app-config-skeleton app-config-skeleton--text app-config-skeleton--short" />
              <div className="app-config-skeleton app-config-skeleton--range" />
              <div className="app-config-skeleton app-config-skeleton--input" />
              <div className="app-config-skeleton app-config-skeleton--button" />
            </section>

            <section className="app-config-card app-config-card--skeleton">
              <div className="app-config-skeleton app-config-skeleton--title" />
              <div className="app-config-skeleton app-config-skeleton--text" />
              <div className="app-config-skeleton app-config-skeleton--text app-config-skeleton--short" />
              <div className="app-config-skeleton app-config-skeleton--placeholder" />
            </section>
          </div>
        </div>
      </div>
    );
  }

  const handleSaveRanking = async () => {
    const updatedBy = resolveUpdatedBy();
    if (!updatedBy) {
      setError('No se pudo identificar al usuario administrador.');
      return;
    }

    const safePercent = Math.max(0, Math.min(100, Math.round(rankingDecrease)));

    setSavingRanking(true);
    setError(null);
    setStatusMessage(null);
    try {
      await saveRankingDecreaseConfig(safePercent, updatedBy);
      setRankingDecrease(safePercent);
      setStatusMessage('Reducción de ranking guardada correctamente.');
      await loadConfig(false);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'No se pudo guardar la reducción de ranking.');
    } finally {
      setSavingRanking(false);
    }
  };

  const handleBoliviaBoxChange = (field: keyof GeoBoundingBox, value: string) => {
    setBoliviaBbox((prev) => ({
      ...prev,
      [field]: Number(value),
    }));
  };

  const handleSaveGeoCoverage = async () => {
    const updatedBy = resolveUpdatedBy();
    if (!updatedBy) {
      setError('No se pudo identificar al usuario administrador.');
      return;
    }

    if (!geoRestrictionMessage.trim()) {
      setError('El mensaje para zona no disponible es obligatorio.');
      return;
    }

    if (
      !Number.isFinite(boliviaBbox.minLat)
      || !Number.isFinite(boliviaBbox.maxLat)
      || !Number.isFinite(boliviaBbox.minLng)
      || !Number.isFinite(boliviaBbox.maxLng)
      || boliviaBbox.minLat > boliviaBbox.maxLat
      || boliviaBbox.minLng > boliviaBbox.maxLng
    ) {
      setError('La caja de Bolivia no es valida. Revisa min/max latitud y longitud.');
      return;
    }

    const invalidZone = allowedZones.find((zone) => {
      const hasFiniteBox = Number.isFinite(Number(zone.minLat))
        && Number.isFinite(Number(zone.maxLat))
        && Number.isFinite(Number(zone.minLng))
        && Number.isFinite(Number(zone.maxLng));
      const hasValidOrder = Number(zone.minLat) <= Number(zone.maxLat)
        && Number(zone.minLng) <= Number(zone.maxLng);
      return !hasFiniteBox || !hasValidOrder;
    });

    if (invalidZone) {
      setError('Cada zona permitida debe tener minLat, maxLat, minLng y maxLng validos.');
      return;
    }

    setSavingGeo(true);
    setError(null);
    setStatusMessage(null);
    try {
      await saveGeoCoverageConfig({
        enabled: geoRestrictionEnabled,
        message: geoRestrictionMessage.trim(),
        boliviaBbox,
        allowedZones,
      }, updatedBy);

      setStatusMessage('Cobertura geografica guardada correctamente.');
      await loadConfig(false);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'No se pudo guardar la cobertura geografica.');
    } finally {
      setSavingGeo(false);
    }
  };

  const handleCreateZone = (zone: GeoZoneBox) => {
    setAllowedZones((prev) => [...prev, zone]);
  };

  const handleZoneFieldChange = (index: number, field: keyof GeoZoneBox, value: string) => {
    setAllowedZones((prev) => prev.map((zone, currentIndex) => {
      if (currentIndex !== index) return zone;

      if (field === 'name') {
        return { ...zone, name: value };
      }

      return {
        ...zone,
        [field]: Number(value),
      };
    }));
  };

  const handleRemoveZone = (index: number) => {
    setAllowedZones((prev) => prev.filter((_, currentIndex) => currentIndex !== index));
  };

  return (
    <div className="app-config-page">
      <CommonHeader
        title="Configuraciones Operativas"
        searchPlaceholder="Configuraciones permitidas"
        searchQuery={searchQuery}
        onSearch={setSearchQuery}
      />

      <div className="app-config-content">
        <div className="app-config-tip">
          Esta sección solo permite parámetros operativos oficiales del sistema. No se pueden crear claves nuevas.
        </div>

        <div className="app-config-layout">
          <div className="app-config-secondary-grid">
            <section className="app-config-card app-config-card--hours" aria-label="Horario de solicitudes">
            <div className="app-config-card-header">
              <h3>Horario para crear solicitudes</h3>
              <span className="app-config-badge">Solicitudes</span>
            </div>
            <p className="app-config-description">
              Define el rango diario disponible para la creación de solicitudes de reciclaje.
            </p>

            <div className="app-config-time-grid">
              <label className="app-config-field" htmlFor="config-start-hour">
                <span>Hora de inicio</span>
                <input
                  id="config-start-hour"
                  type="time"
                  value={startHour}
                  onChange={(e) => setStartHour(e.target.value)}
                />
              </label>

              <label className="app-config-field" htmlFor="config-end-hour">
                <span>Hora de fin</span>
                <input
                  id="config-end-hour"
                  type="time"
                  value={endHour}
                  onChange={(e) => setEndHour(e.target.value)}
                />
              </label>
            </div>

            <div className="app-config-summary">
              <span>Ventana actual: {operationWindow}</span>
              {isInvalidHourRange && (
                <span className="app-config-warning">La hora de inicio no puede ser mayor que la hora de fin.</span>
              )}
            </div>

            <button onClick={handleSaveHours} disabled={loading || savingHours || isInvalidHourRange}>
              {savingHours ? 'Guardando...' : 'Guardar horario'}
            </button>
            </section>

            <section className="app-config-card" aria-label="Reducción de ranking">
            <div className="app-config-card-header">
              <h3>Reducción al cierre de temporada</h3>
              <span className="app-config-badge">Ranking</span>
            </div>
            <p className="app-config-description">
              Porcentaje aplicado al finalizar una temporada para ajustar el puntaje acumulado.
            </p>

            <div className="app-config-range-wrap">
              <input
                id="ranking-decrease"
                type="range"
                min={0}
                max={100}
                value={rankingDecrease}
                onChange={(e) => setRankingDecrease(Number(e.target.value))}
              />
              <div className="app-config-percent">{rankingDecrease}%</div>
            </div>

            <label className="app-config-field" htmlFor="ranking-decrease-number">
              <span>Valor exacto</span>
              <input
                id="ranking-decrease-number"
                type="number"
                min={0}
                max={100}
                value={rankingDecrease}
                onChange={(e) => setRankingDecrease(Number(e.target.value))}
              />
            </label>

            <button onClick={handleSaveRanking} disabled={loading || savingRanking}>
              {savingRanking ? 'Guardando...' : 'Guardar reducción'}
            </button>
            </section>
          </div>

          <section className="app-config-card app-config-card--geo-primary" aria-label="Cobertura geografica">
            <div className="app-config-card-header">
              <h3>Cobertura geografica de solicitudes</h3>
              <span className="app-config-badge">Geo</span>
            </div>
            <p className="app-config-description">
              Configura la validacion de zonas permitidas directamente desde Admin.
            </p>

            <div className="app-config-geo-main-grid">
              <div className="app-config-geo-config-col">
                <label className="app-config-checkbox" htmlFor="geo-restriction-enabled">
                  <input
                    id="geo-restriction-enabled"
                    type="checkbox"
                    checked={geoRestrictionEnabled}
                    onChange={(e) => setGeoRestrictionEnabled(e.target.checked)}
                  />
                  <span>Activar restriccion geografica</span>
                </label>

                <label className="app-config-field" htmlFor="geo-restriction-message">
                  <span>Mensaje para zona no disponible</span>
                  <input
                    id="geo-restriction-message"
                    type="text"
                    value={geoRestrictionMessage}
                    onChange={(e) => setGeoRestrictionMessage(e.target.value)}
                    maxLength={220}
                  />
                </label>

                <div className="app-config-geo-box-grid">
                  <label className="app-config-field" htmlFor="geo-min-lat">
                    <span>Bolivia minLat</span>
                    <input
                      id="geo-min-lat"
                      type="number"
                      step="0.000001"
                      value={boliviaBbox.minLat}
                      onChange={(e) => handleBoliviaBoxChange('minLat', e.target.value)}
                    />
                  </label>
                  <label className="app-config-field" htmlFor="geo-max-lat">
                    <span>Bolivia maxLat</span>
                    <input
                      id="geo-max-lat"
                      type="number"
                      step="0.000001"
                      value={boliviaBbox.maxLat}
                      onChange={(e) => handleBoliviaBoxChange('maxLat', e.target.value)}
                    />
                  </label>
                  <label className="app-config-field" htmlFor="geo-min-lng">
                    <span>Bolivia minLng</span>
                    <input
                      id="geo-min-lng"
                      type="number"
                      step="0.000001"
                      value={boliviaBbox.minLng}
                      onChange={(e) => handleBoliviaBoxChange('minLng', e.target.value)}
                    />
                  </label>
                  <label className="app-config-field" htmlFor="geo-max-lng">
                    <span>Bolivia maxLng</span>
                    <input
                      id="geo-max-lng"
                      type="number"
                      step="0.000001"
                      value={boliviaBbox.maxLng}
                      onChange={(e) => handleBoliviaBoxChange('maxLng', e.target.value)}
                    />
                  </label>
                </div>

                <button onClick={handleSaveGeoCoverage} disabled={savingGeo}>
                  {savingGeo ? 'Guardando...' : 'Guardar cobertura geografica'}
                </button>
              </div>

              <div className="app-config-geo-map-col">
                <div className="app-config-field">
                  <span>Zonas permitidas en mapa</span>
                  <GeoCoverageMap
                    boliviaBbox={boliviaBbox}
                    zones={allowedZones}
                    onCreateZone={handleCreateZone}
                  />
                </div>
              </div>
            </div>

            <div className="app-config-zones-list">
              {allowedZones.length === 0 && (
                <div className="app-config-placeholder-box">Aun no hay zonas. Crea una con 2 clics sobre el mapa.</div>
              )}

              {allowedZones.map((zone, index) => (
                <div className="app-config-zone-item" key={zone.id ?? `zone-${index}`}>
                  <div className="app-config-zone-item-head">
                    <strong>
                      Zona {index + 1}
                      <span className="app-config-zone-shape">{zone.shapeType === 'circle' ? 'Circulo' : 'Rectangulo'}</span>
                    </strong>
                    <button type="button" className="app-config-zone-remove" onClick={() => handleRemoveZone(index)}>
                      Eliminar
                    </button>
                  </div>

                  <div className="app-config-geo-box-grid">
                    <label className="app-config-field" htmlFor={`zone-name-${index}`}>
                      <span>Nombre</span>
                      <input
                        id={`zone-name-${index}`}
                        type="text"
                        value={zone.name || ''}
                        onChange={(e) => handleZoneFieldChange(index, 'name', e.target.value)}
                      />
                    </label>
                    <label className="app-config-field" htmlFor={`zone-min-lat-${index}`}>
                      <span>minLat</span>
                      <input
                        id={`zone-min-lat-${index}`}
                        type="number"
                        step="0.000001"
                        value={zone.minLat}
                        onChange={(e) => handleZoneFieldChange(index, 'minLat', e.target.value)}
                      />
                    </label>
                    <label className="app-config-field" htmlFor={`zone-max-lat-${index}`}>
                      <span>maxLat</span>
                      <input
                        id={`zone-max-lat-${index}`}
                        type="number"
                        step="0.000001"
                        value={zone.maxLat}
                        onChange={(e) => handleZoneFieldChange(index, 'maxLat', e.target.value)}
                      />
                    </label>
                    <label className="app-config-field" htmlFor={`zone-min-lng-${index}`}>
                      <span>minLng</span>
                      <input
                        id={`zone-min-lng-${index}`}
                        type="number"
                        step="0.000001"
                        value={zone.minLng}
                        onChange={(e) => handleZoneFieldChange(index, 'minLng', e.target.value)}
                      />
                    </label>
                    <label className="app-config-field" htmlFor={`zone-max-lng-${index}`}>
                      <span>maxLng</span>
                      <input
                        id={`zone-max-lng-${index}`}
                        type="number"
                        step="0.000001"
                        value={zone.maxLng}
                        onChange={(e) => handleZoneFieldChange(index, 'maxLng', e.target.value)}
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {statusMessage && <div className="app-config-success">{statusMessage}</div>}
        {error && <div className="app-config-error">{error}</div>}
      </div>
    </div>
  );
}

import * as AppConfigModel from '../Models/appConfigModel.js';

const DEFAULT_BOLIVIA_BBOX = {
  minLat: -22.91,
  maxLat: -9.66,
  minLng: -69.65,
  maxLng: -57.45,
};

const FALLBACK_DENY_MESSAGE = 'Lo lamentamos, GreenBit aun no se encuentra disponible en esta zona';
const CACHE_TTL_MS = 30 * 1000;

let cachedConfig = null;
let cacheExpiresAt = 0;

const parseBoolean = (value, fallback = false) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1') return true;
    if (normalized === 'false' || normalized === '0') return false;
  }
  return fallback;
};

const parseBox = (value, fallback) => {
  if (!value || typeof value !== 'object') return fallback;

  const minLat = Number(value.minLat);
  const maxLat = Number(value.maxLat);
  const minLng = Number(value.minLng);
  const maxLng = Number(value.maxLng);

  if (![minLat, maxLat, minLng, maxLng].every(Number.isFinite)) {
    return fallback;
  }

  if (minLat > maxLat || minLng > maxLng) {
    return fallback;
  }

  return { minLat, maxLat, minLng, maxLng };
};

const normalizeZones = (value) => {
  if (!Array.isArray(value)) return [];

  return value
    .map((zone, index) => {
      if (!zone || typeof zone !== 'object') return null;

      const id = Number(zone.id ?? index + 1);
      const name = typeof zone.name === 'string' && zone.name.trim()
        ? zone.name.trim()
        : `Zona ${index + 1}`;

      const bbox = parseBox(zone, null);
      if (!bbox) return null;

      return {
        id: Number.isFinite(id) ? id : index + 1,
        name,
        ...bbox,
      };
    })
    .filter(Boolean);
};

const inBox = (latitude, longitude, box) => (
  latitude >= box.minLat
  && latitude <= box.maxLat
  && longitude >= box.minLng
  && longitude <= box.maxLng
);

const getConfigValue = (entry, fallback) => {
  if (!entry) return fallback;
  if (entry.config_value === undefined || entry.config_value === null) return fallback;
  return entry.config_value;
};

const loadCoverageConfig = async () => {
  const now = Date.now();
  if (cachedConfig && now < cacheExpiresAt) {
    return cachedConfig;
  }

  const [enabledRow, messageRow, boliviaRow, zonesRow] = await Promise.all([
    AppConfigModel.getByKey('geo_restriction_enabled'),
    AppConfigModel.getByKey('geo_restriction_message'),
    AppConfigModel.getByKey('geo_bolivia_bbox'),
    AppConfigModel.getByKey('geo_allowed_zones'),
  ]);

  const enabled = parseBoolean(getConfigValue(enabledRow, true), true);
  const blockedMessageRaw = getConfigValue(messageRow, FALLBACK_DENY_MESSAGE);
  const blockedMessage = typeof blockedMessageRaw === 'string' && blockedMessageRaw.trim()
    ? blockedMessageRaw.trim()
    : FALLBACK_DENY_MESSAGE;

  const boliviaBbox = parseBox(getConfigValue(boliviaRow, null), DEFAULT_BOLIVIA_BBOX);
  const allowedZones = normalizeZones(getConfigValue(zonesRow, []));

  cachedConfig = {
    enabled,
    blockedMessage,
    boliviaBbox,
    allowedZones,
  };
  cacheExpiresAt = now + CACHE_TTL_MS;

  return cachedConfig;
};

export const invalidateCoverageConfigCache = () => {
  cachedConfig = null;
  cacheExpiresAt = 0;
};

export const evaluateCoverageByCoordinates = async (latitudeRaw, longitudeRaw) => {
  const latitude = Number(latitudeRaw);
  const longitude = Number(longitudeRaw);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return {
      allowed: false,
      code: 'INVALID_COORDINATES',
      message: 'La ubicacion seleccionada no es valida.',
    };
  }

  const config = await loadCoverageConfig();

  if (!config.enabled) {
    return {
      allowed: true,
      code: 'DISABLED',
      message: 'Validacion geografica desactivada.',
    };
  }

  // Filtro de bajo costo: corte temprano por caja Bolivia.
  if (!inBox(latitude, longitude, config.boliviaBbox)) {
    return {
      allowed: false,
      code: 'OUT_OF_BOLIVIA_BOUNDS',
      message: config.blockedMessage,
    };
  }

  // Si no hay subzonas configuradas, se habilita todo el bbox de Bolivia.
  if (config.allowedZones.length === 0) {
    return {
      allowed: true,
      code: 'ALLOWED_BY_COUNTRY_BOUNDS',
      message: 'Ubicacion dentro de cobertura.',
    };
  }

  const matchedZone = config.allowedZones.find((zone) => inBox(latitude, longitude, zone));

  if (!matchedZone) {
    return {
      allowed: false,
      code: 'OUT_OF_ALLOWED_ZONES',
      message: config.blockedMessage,
    };
  }

  return {
    allowed: true,
    code: 'ALLOWED_BY_ZONE',
    message: 'Ubicacion dentro de cobertura.',
    zone: {
      id: matchedZone.id,
      name: matchedZone.name,
    },
  };
};

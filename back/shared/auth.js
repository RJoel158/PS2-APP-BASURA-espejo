import jwt from 'jsonwebtoken';
import { isBlacklisted, logAuditAction, logSuspiciousActivity } from '../Services/securityLogService.js';

const FALLBACK_JWT_SECRET = 'greenbit-dev-insecure-secret-change-me';
const JWT_SECRET = process.env.JWT_SECRET || process.env.JWT_ACCESS_SECRET || FALLBACK_JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || `${JWT_SECRET}-refresh`;
const ACCESS_TOKEN_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
const REFRESH_TOKEN_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

const isSilentLogLevel = () => {
  const level = String(process.env.LOG_LEVEL || '').trim().toLowerCase();
  return ['silent', 'off', 'none', '0'].includes(level);
};

const isProd = process.env.NODE_ENV === 'production';
const cookieBaseOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: 'lax',
  path: '/'
};

export const cookieOptions = {
  access: {
    ...cookieBaseOptions,
    maxAge: 15 * 60 * 1000
  },
  refresh: {
    ...cookieBaseOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000
  }
};

if (JWT_SECRET === FALLBACK_JWT_SECRET && !isSilentLogLevel()) {
  console.warn('[SECURITY] JWT secret no configurado. Usando secreto de desarrollo temporal.');
}

export const signAccessToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    issuer: 'greenbit-api'
  });
};

export const signRefreshToken = (payload) => {
  return jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRES_IN,
    issuer: 'greenbit-api'
  });
};

export const verifyRefreshToken = (token) => {
  return jwt.verify(token, JWT_REFRESH_SECRET, { issuer: 'greenbit-api' });
};

const parseCookieHeader = (cookieHeader = '') => {
  if (!cookieHeader || typeof cookieHeader !== 'string') return {};

  return cookieHeader
    .split(';')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .reduce((acc, entry) => {
      const separatorIndex = entry.indexOf('=');
      if (separatorIndex === -1) return acc;
      const key = entry.slice(0, separatorIndex).trim();
      const value = entry.slice(separatorIndex + 1).trim();
      if (!key) return acc;
      acc[key] = decodeURIComponent(value);
      return acc;
    }, {});
};

const getTokenFromCookies = (req, cookieName) => {
  const cookies = parseCookieHeader(req.headers.cookie || '');
  return cookies[cookieName] || null;
};

const getBearerToken = (authHeader = '') => {
  if (!authHeader || typeof authHeader !== 'string') return null;
  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  return token;
};

export const requireAuth = async (req, res, next) => {
  const token = getBearerToken(req.headers.authorization) || getTokenFromCookies(req, 'access_token');

  if (!token) {
    void logSuspiciousActivity({
      ip: req.ip || req.socket?.remoteAddress || null,
      eventType: 'missing_auth_token',
      details: { path: req.path, method: req.method },
      severity: 'medium'
    });
    return res.status(401).json({ success: false, error: 'No autorizado' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET, { issuer: 'greenbit-api' });
    const requestIp = req.ip || req.socket?.remoteAddress || null;
    const blocked = await isBlacklisted({ userId: payload.id, ip: requestIp });
    if (blocked) {
      return res.status(403).json({ success: false, error: 'Acceso bloqueado temporalmente' });
    }

    req.user = {
      id: payload.id,
      email: payload.email,
      role: payload.role,
      roleId: payload.roleId,
      state: payload.state
    };
    return next();
  } catch (error) {
    void logSuspiciousActivity({
      ip: req.ip || req.socket?.remoteAddress || null,
      eventType: 'invalid_access_token',
      details: { path: req.path, method: req.method },
      severity: 'high'
    });
    return res.status(401).json({ success: false, error: 'Token inválido o expirado' });
  }
};

export const requireAdmin = (req, res, next) => {
  const roleId = Number(req.user?.roleId);
  const role = String(req.user?.role || '').toLowerCase();

  if (roleId === 1 || role === 'admin' || role === 'administrador') {
    return next();
  }

  void logAuditAction({
    actorId: req.user?.id || null,
    action: 'admin_access_denied',
    targetTable: null,
    targetId: null,
    details: { path: req.path, method: req.method }
  });

  return res.status(403).json({ success: false, error: 'Permisos insuficientes' });
};

const isAdminUser = (user) => {
  const roleId = Number(user?.roleId);
  const role = String(user?.role || '').toLowerCase();
  return roleId === 1 || role === 'admin' || role === 'administrador';
};

const parseOwnerId = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
};

const enforceOwnership = (req, res, next, ownerId) => {
  const authUserId = parseOwnerId(req.user?.id);
  if (!authUserId) {
    return res.status(401).json({ success: false, error: 'Sesión inválida' });
  }

  if (ownerId === null) {
    return res.status(400).json({ success: false, error: 'ID de propietario inválido' });
  }

  if (isAdminUser(req.user) || authUserId === ownerId) {
    return next();
  }

  return res.status(403).json({ success: false, error: 'No tienes permiso para acceder a este recurso' });
};

export const requireOwnershipByParam = (paramName) => {
  return (req, res, next) => {
    const ownerId = parseOwnerId(req.params?.[paramName]);
    return enforceOwnership(req, res, next, ownerId);
  };
};

export const requireOwnershipByBody = (bodyField) => {
  return (req, res, next) => {
    const ownerId = parseOwnerId(req.body?.[bodyField]);
    return enforceOwnership(req, res, next, ownerId);
  };
};

export const requireOwnershipByParamOrBody = ({ paramName, bodyField }) => {
  return (req, res, next) => {
    const paramOwnerId = paramName ? parseOwnerId(req.params?.[paramName]) : null;
    const bodyOwnerId = bodyField ? parseOwnerId(req.body?.[bodyField]) : null;

    if (paramOwnerId !== null && bodyOwnerId !== null && paramOwnerId !== bodyOwnerId) {
      return res.status(400).json({
        success: false,
        error: 'Inconsistencia entre identificadores de propietario'
      });
    }

    const ownerId = paramOwnerId ?? bodyOwnerId;
    return enforceOwnership(req, res, next, ownerId);
  };
};

export const setAuthCookies = (res, accessToken, refreshToken) => {
  res.cookie('access_token', accessToken, cookieOptions.access);
  res.cookie('refresh_token', refreshToken, cookieOptions.refresh);
};

export const clearAuthCookies = (res) => {
  res.clearCookie('access_token', { ...cookieBaseOptions });
  res.clearCookie('refresh_token', { ...cookieBaseOptions });
};

export const getRefreshTokenFromRequest = (req) => {
  return getTokenFromCookies(req, 'refresh_token');
};

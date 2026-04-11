import { logSuspiciousActivity } from '../Services/securityLogService.js';

const buckets = new Map();

const now = () => Date.now();

const envInt = (name, fallback) => {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
};

const envRatePerSecond = (name, fallback) => {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

const getClientIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }

  return req.ip || req.socket?.remoteAddress || 'unknown';
};

export const createTokenBucketLimiter = ({
  name,
  capacity,
  refillPerSecond,
  cost = 1,
  blockDurationMs,
  keyGenerator
}) => {
  if (!name) {
    throw new Error('createTokenBucketLimiter requiere un nombre único');
  }

  return (req, res, next) => {
    const bucketKeyRaw = keyGenerator ? keyGenerator(req) : getClientIp(req);
    const bucketKey = `${name}:${bucketKeyRaw || 'unknown'}`;
    const currentTime = now();

    const bucket = buckets.get(bucketKey) || {
      tokens: capacity,
      lastRefillAt: currentTime,
      blockedUntil: 0
    };

    if (bucket.blockedUntil > currentTime) {
      const retryAfter = Math.ceil((bucket.blockedUntil - currentTime) / 1000);
      void logSuspiciousActivity({
        userId: null,
        ip: getClientIp(req),
        eventType: 'rate_limit_blocked_request',
        details: { name, path: req.path, method: req.method, retryAfter },
        severity: 'medium'
      });
      res.setHeader('Retry-After', String(retryAfter));
      return res.status(429).json({
        success: false,
        error: 'Demasiadas solicitudes. Intenta nuevamente más tarde.'
      });
    }

    const elapsedSeconds = Math.max(0, (currentTime - bucket.lastRefillAt) / 1000);
    const refilledTokens = elapsedSeconds * refillPerSecond;
    bucket.tokens = Math.min(capacity, bucket.tokens + refilledTokens);
    bucket.lastRefillAt = currentTime;

    if (bucket.tokens < cost) {
      bucket.blockedUntil = currentTime + blockDurationMs;
      buckets.set(bucketKey, bucket);

      const retryAfter = Math.ceil(blockDurationMs / 1000);
      void logSuspiciousActivity({
        userId: null,
        ip: getClientIp(req),
        eventType: 'rate_limit_triggered',
        details: { name, path: req.path, method: req.method, retryAfter },
        severity: 'high'
      });
      res.setHeader('Retry-After', String(retryAfter));
      return res.status(429).json({
        success: false,
        error: 'Demasiadas solicitudes. Intenta nuevamente más tarde.'
      });
    }

    bucket.tokens -= cost;
    buckets.set(bucketKey, bucket);
    return next();
  };
};

export const loginRateLimiter = createTokenBucketLimiter({
  name: 'login',
  capacity: envInt('RL_LOGIN_CAPACITY', 8),
  refillPerSecond: envRatePerSecond('RL_LOGIN_REFILL_PER_SECOND', 8 / 60),
  blockDurationMs: envInt('RL_LOGIN_BLOCK_MS', 5 * 60 * 1000),
  keyGenerator: (req) => {
    const email = String(req.body?.email || '').toLowerCase().trim();
    const ip = getClientIp(req);
    return `${ip}:${email || 'anonymous'}`;
  }
});

export const forgotPasswordRateLimiter = createTokenBucketLimiter({
  name: 'forgot-password',
  capacity: envInt('RL_FORGOT_CAPACITY', 5),
  refillPerSecond: envRatePerSecond('RL_FORGOT_REFILL_PER_SECOND', 5 / 60),
  blockDurationMs: envInt('RL_FORGOT_BLOCK_MS', 10 * 60 * 1000),
  keyGenerator: (req) => {
    const email = String(req.body?.email || '').toLowerCase().trim();
    const ip = getClientIp(req);
    return `${ip}:${email || 'anonymous'}`;
  }
});

export const checkEmailRateLimiter = createTokenBucketLimiter({
  name: 'check-email',
  capacity: envInt('RL_CHECK_EMAIL_CAPACITY', 20),
  refillPerSecond: envRatePerSecond('RL_CHECK_EMAIL_REFILL_PER_SECOND', 20 / 60),
  blockDurationMs: envInt('RL_CHECK_EMAIL_BLOCK_MS', 2 * 60 * 1000),
  keyGenerator: (req) => getClientIp(req)
});

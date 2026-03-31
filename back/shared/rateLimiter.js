import { logSuspiciousActivity } from '../Services/securityLogService.js';

const buckets = new Map();

const now = () => Date.now();

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
  capacity: 8,
  refillPerSecond: 8 / 60,
  blockDurationMs: 5 * 60 * 1000,
  keyGenerator: (req) => {
    const email = String(req.body?.email || '').toLowerCase().trim();
    const ip = getClientIp(req);
    return `${ip}:${email || 'anonymous'}`;
  }
});

export const forgotPasswordRateLimiter = createTokenBucketLimiter({
  name: 'forgot-password',
  capacity: 5,
  refillPerSecond: 5 / 60,
  blockDurationMs: 10 * 60 * 1000,
  keyGenerator: (req) => {
    const email = String(req.body?.email || '').toLowerCase().trim();
    const ip = getClientIp(req);
    return `${ip}:${email || 'anonymous'}`;
  }
});

export const checkEmailRateLimiter = createTokenBucketLimiter({
  name: 'check-email',
  capacity: 20,
  refillPerSecond: 20 / 60,
  blockDurationMs: 2 * 60 * 1000,
  keyGenerator: (req) => getClientIp(req)
});

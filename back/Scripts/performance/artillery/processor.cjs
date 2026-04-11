'use strict';

function parseJson(body) {
  if (!body || typeof body !== 'string') return null;
  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
}

function trackResponse(req, res, context, events, done) {
  const statusCode = Number(res?.statusCode || 0);

  if (statusCode >= 500) {
    events.emit('counter', 'http.errors.5xx', 1);
  } else if (statusCode === 429) {
    events.emit('counter', 'http.errors.429', 1);
  } else if (statusCode >= 400) {
    events.emit('counter', 'http.errors.4xx', 1);
  }

  if (statusCode >= 200 && statusCode < 300) {
    events.emit('counter', 'http.success', 1);
  }

  done();
}

function captureAuthFromBody(req, res, context, events, done) {
  const parsed = parseJson(res?.body);
  const token = parsed?.user?.token;
  const userId = parsed?.user?.id;

  if (token) {
    context.vars.accessToken = token;
  }

  if (userId) {
    context.vars.authUserId = String(userId);
  }

  trackResponse(req, res, context, events, done);
}

function ensureUserId(context, events, done) {
  if (context.vars.authUserId) {
    context.vars.userId = context.vars.authUserId;
  }
  done();
}

module.exports = {
  trackResponse,
  captureAuthFromBody,
  ensureUserId,
};

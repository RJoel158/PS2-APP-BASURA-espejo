import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import db from '../config/DBConnect.js';
import * as RequestModel from '../Models/Forms/requestModel.js';
import { REQUEST_STATE } from '../shared/constants.js';

dotenv.config();

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000/api';
const JWT_SECRET = process.env.JWT_SECRET || process.env.JWT_ACCESS_SECRET || 'greenbit-dev-insecure-secret-change-me';
const TEST_TAG = '[AUTO-TEST-NOTIF-ENDPOINT]';

const results = [];

const logResult = (name, ok, details = {}) => {
  results.push({ name, ok, details });
  console.log(`\n[${ok ? 'PASS' : 'FAIL'}] ${name}`);
  if (Object.keys(details).length > 0) {
    console.log(details);
  }
};

const signToken = (user) => jwt.sign(
  {
    id: user.id,
    email: user.email,
    roleId: user.roleId,
    role: 'user',
    state: 1,
  },
  JWT_SECRET,
  {
    expiresIn: '15m',
    issuer: 'greenbit-api',
  }
);

const createRequest = async (recyclerId, materialId, suffix) => {
  const conn = await db.getConnection();
  try {
    return await RequestModel.create(
      conn,
      recyclerId,
      `${TEST_TAG} ${suffix}`,
      materialId,
      -17.3935,
      -66.157,
      REQUEST_STATE.OPEN
    );
  } finally {
    conn.release();
  }
};

const getNotificationRows = async ({ userId, appointmentId, type }) => {
  const [rows] = await db.query(
    `SELECT id, userId, type, title, body, requestId, appointmentId, createdAt
     FROM notifications
     WHERE userId = ?
       AND appointmentId = ?
       AND type = ?
     ORDER BY id DESC`,
    [userId, appointmentId, type]
  );
  return rows;
};

const callJson = async ({ method, path, body, token }) => {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  let json;
  try {
    json = await response.json();
  } catch {
    json = null;
  }

  return { status: response.status, json };
};

const run = async () => {
  const [users] = await db.query(
    `SELECT id, email, roleId
     FROM users
     WHERE state = 1
     ORDER BY id ASC
     LIMIT 10`
  );

  if (!users || users.length < 2) {
    throw new Error('No hay suficientes usuarios activos para pruebas');
  }

  const recycler = users[0];
  const collector = users.find((u) => Number(u.id) !== Number(recycler.id));
  if (!collector) throw new Error('No se pudo resolver collector');

  const [materials] = await db.query(
    `SELECT id
     FROM material
     WHERE state = 1
     ORDER BY id ASC
     LIMIT 1`
  );
  if (!materials?.[0]) throw new Error('No hay material activo');
  const materialId = Number(materials[0].id);

  const recyclerToken = signToken(recycler);
  const collectorToken = signToken(collector);

  console.log('[INFO] Usuarios de prueba:', {
    recycler: { id: recycler.id, email: recycler.email },
    collector: { id: collector.id, email: collector.email },
    materialId,
  });

  // 1) solicitud
  {
    const requestId = await createRequest(recycler.id, materialId, 'REQUEST_RECEIVED');
    const scheduleResp = await callJson({
      method: 'POST',
      path: '/appointments/schedule',
      token: collectorToken,
      body: {
        idRequest: requestId,
        acceptedDate: '2026-12-31',
        collectorId: collector.id,
        acceptedHour: '10:00:00',
      },
    });

    const appointmentId = scheduleResp?.json?.id;
    const notifications = appointmentId
      ? await getNotificationRows({ userId: recycler.id, appointmentId, type: 'request_received' })
      : [];

    const ok = scheduleResp.status === 201 && Number(notifications.length) === 1;
    logResult('Solicitud -> request_received (1 notificación al recycler)', ok, {
      requestId,
      appointmentId,
      status: scheduleResp.status,
      notifications: notifications.length,
    });
  }

  // 2) aceptado
  {
    const requestId = await createRequest(recycler.id, materialId, 'ACCEPTED');
    const scheduleResp = await callJson({
      method: 'POST',
      path: '/appointments/schedule',
      token: collectorToken,
      body: {
        idRequest: requestId,
        acceptedDate: '2026-12-31',
        collectorId: collector.id,
        acceptedHour: '10:00:00',
      },
    });

    const appointmentId = scheduleResp?.json?.id;
    const acceptResp = await callJson({
      method: 'PUT',
      path: `/appointments/${appointmentId}/accept`,
      body: { userId: recycler.id },
    });

    const notifications = await getNotificationRows({ userId: collector.id, appointmentId, type: 'appointment_accepted' });
    const ok = acceptResp.status === 200 && Number(notifications.length) === 1;
    logResult('Aceptado -> appointment_accepted (1 notificación al collector)', ok, {
      requestId,
      appointmentId,
      status: acceptResp.status,
      notifications: notifications.length,
    });
  }

  // 3) rechazado
  {
    const requestId = await createRequest(recycler.id, materialId, 'REJECTED');
    const scheduleResp = await callJson({
      method: 'POST',
      path: '/appointments/schedule',
      token: collectorToken,
      body: {
        idRequest: requestId,
        acceptedDate: '2026-12-31',
        collectorId: collector.id,
        acceptedHour: '10:00:00',
      },
    });

    const appointmentId = scheduleResp?.json?.id;
    const rejectResp = await callJson({
      method: 'PUT',
      path: `/appointments/${appointmentId}/reject`,
      body: { userId: recycler.id },
    });

    const notifications = await getNotificationRows({ userId: collector.id, appointmentId, type: 'appointment_rejected' });
    const ok = rejectResp.status === 200 && Number(notifications.length) === 1;
    logResult('Rechazado -> appointment_rejected (1 notificación al collector)', ok, {
      requestId,
      appointmentId,
      status: rejectResp.status,
      notifications: notifications.length,
    });
  }

  // 4) completado
  {
    const requestId = await createRequest(recycler.id, materialId, 'COMPLETED');
    const scheduleResp = await callJson({
      method: 'POST',
      path: '/appointments/schedule',
      token: collectorToken,
      body: {
        idRequest: requestId,
        acceptedDate: '2026-12-31',
        collectorId: collector.id,
        acceptedHour: '10:00:00',
      },
    });

    const appointmentId = scheduleResp?.json?.id;

    const acceptResp = await callJson({
      method: 'PUT',
      path: `/appointments/${appointmentId}/accept`,
      body: { userId: recycler.id },
    });

    const completeResp = await callJson({
      method: 'PUT',
      path: `/appointments/${appointmentId}/complete`,
      body: { userId: collector.id },
    });

    const collectorNotifications = await getNotificationRows({ userId: collector.id, appointmentId, type: 'appointment_completed' });
    const recyclerNotifications = await getNotificationRows({ userId: recycler.id, appointmentId, type: 'appointment_completed' });

    const ok = acceptResp.status === 200
      && completeResp.status === 200
      && Number(collectorNotifications.length) === 1
      && Number(recyclerNotifications.length) === 1;

    logResult('Completado -> appointment_completed (1 por usuario, sin duplicados)', ok, {
      requestId,
      appointmentId,
      acceptStatus: acceptResp.status,
      completeStatus: completeResp.status,
      collectorNotifications: collectorNotifications.length,
      recyclerNotifications: recyclerNotifications.length,
    });
  }

  // 5) cancelado por collector
  {
    const requestId = await createRequest(recycler.id, materialId, 'CANCEL_BY_COLLECTOR');
    const scheduleResp = await callJson({
      method: 'POST',
      path: '/appointments/schedule',
      token: collectorToken,
      body: {
        idRequest: requestId,
        acceptedDate: '2026-12-31',
        collectorId: collector.id,
        acceptedHour: '10:00:00',
      },
    });

    const appointmentId = scheduleResp?.json?.id;

    const cancelResp = await callJson({
      method: 'PUT',
      path: `/appointments/${appointmentId}/cancel`,
      token: collectorToken,
      body: { userId: collector.id, userRole: 'collector' },
    });

    const recyclerNotifications = await getNotificationRows({ userId: recycler.id, appointmentId, type: 'appointment_canceled' });
    const collectorNotifications = await getNotificationRows({ userId: collector.id, appointmentId, type: 'appointment_canceled' });

    const ok = cancelResp.status === 200
      && Number(recyclerNotifications.length) === 1
      && Number(collectorNotifications.length) === 0;

    logResult('Cancelado (collector) -> llega al recycler correcto, 0 duplicados/self', ok, {
      requestId,
      appointmentId,
      cancelStatus: cancelResp.status,
      recyclerNotifications: recyclerNotifications.length,
      collectorNotifications: collectorNotifications.length,
    });
  }

  const passed = results.filter((r) => r.ok).length;
  const total = results.length;

  console.log('\n=== Resumen endpoint notifications ===');
  results.forEach((r) => {
    console.log(`- ${r.ok ? 'PASS' : 'FAIL'} :: ${r.name}`);
  });
  console.log(`Total: ${passed}/${total} OK`);

  process.exit(passed === total ? 0 : 1);
};

run().catch((error) => {
  console.error('[ERROR] notification-main-endpoint-test:', error);
  process.exit(1);
});

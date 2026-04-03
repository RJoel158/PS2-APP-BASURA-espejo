import dotenv from 'dotenv';
import db from '../config/DBConnect.js';
import * as RequestModel from '../Models/Forms/requestModel.js';
import * as AppointmentModel from '../Models/appointmentModel.js';
import { REQUEST_STATE } from '../shared/constants.js';

dotenv.config();

const TEST_TAG = '[AUTO-TEST-NOTIF-MAIN-FLOW]';
const created = {
  requestIds: [],
  appointmentIds: [],
};

const results = [];

const logResult = (name, ok, details = {}) => {
  results.push({ name, ok, details });
  const status = ok ? 'PASS' : 'FAIL';
  console.log(`\n[${status}] ${name}`);
  if (Object.keys(details).length > 0) {
    console.log(details);
  }
};

const getActiveUsers = async () => {
  const [rows] = await db.query(
    `SELECT id, email, roleId
     FROM users
     WHERE state = 1
     ORDER BY id ASC
     LIMIT 10`
  );

  if (!rows || rows.length < 2) {
    throw new Error('No hay suficientes usuarios activos para ejecutar la prueba');
  }

  const recycler = rows[0];
  const collector = rows.find((u) => Number(u.id) !== Number(recycler.id));

  if (!collector) {
    throw new Error('No se pudo seleccionar un collector distinto para la prueba');
  }

  return { recycler, collector };
};

const getActiveMaterialId = async () => {
  const [rows] = await db.query(
    `SELECT id
     FROM material
     WHERE state = 1
     ORDER BY id ASC
     LIMIT 1`
  );

  if (!rows[0]) {
    throw new Error('No hay material activo para crear requests de prueba');
  }

  return Number(rows[0].id);
};

const createRequest = async (recyclerId, materialId, suffix) => {
  const conn = await db.getConnection();
  try {
    const requestId = await RequestModel.create(
      conn,
      recyclerId,
      `${TEST_TAG} ${suffix}`,
      materialId,
      -17.3935,
      -66.1570,
      REQUEST_STATE.OPEN
    );
    created.requestIds.push(requestId);
    return requestId;
  } finally {
    conn.release();
  }
};

const createPendingAppointment = async (requestId, collectorId) => {
  const appointmentId = await AppointmentModel.createAppointment(
    requestId,
    '2026-12-31',
    collectorId,
    '10:00:00'
  );
  created.appointmentIds.push(appointmentId);
  return appointmentId;
};

const getLatestNotification = async (userId, appointmentId, type) => {
  const [rows] = await db.query(
    `SELECT id, userId, type, title, body, requestId, appointmentId, createdAt
     FROM notifications
     WHERE userId = ?
       AND appointmentId = ?
       AND type = ?
     ORDER BY id DESC
     LIMIT 1`,
    [userId, appointmentId, type]
  );

  return rows[0] || null;
};

const run = async () => {
  console.log('\n=== Iniciando prueba E2E de notificaciones principales ===');

  const { recycler, collector } = await getActiveUsers();
  const materialId = await getActiveMaterialId();

  console.log('[INFO] Usuarios de prueba:', {
    recycler: { id: recycler.id, email: recycler.email, roleId: recycler.roleId },
    collector: { id: collector.id, email: collector.email, roleId: collector.roleId },
    materialId,
  });

  // 1) solicitud
  {
    const requestId = await createRequest(recycler.id, materialId, 'FLOW-REQUEST_RECEIVED');
    const appointmentId = await createPendingAppointment(requestId, collector.id);

    const notification = await getLatestNotification(recycler.id, appointmentId, 'request_received');
    const ok = Boolean(notification);

    logResult('Solicitud: llega request_received al recycler', ok, {
      requestId,
      appointmentId,
      notification,
    });
  }

  // 2) aceptado
  {
    const requestId = await createRequest(recycler.id, materialId, 'FLOW-ACCEPTED');
    const appointmentId = await createPendingAppointment(requestId, collector.id);

    await AppointmentModel.acceptAppointment(appointmentId, recycler.id);

    const notification = await getLatestNotification(collector.id, appointmentId, 'appointment_accepted');
    const ok = Boolean(notification);

    logResult('Aceptado: llega appointment_accepted al collector', ok, {
      requestId,
      appointmentId,
      notification,
    });
  }

  // 3) rechazado
  {
    const requestId = await createRequest(recycler.id, materialId, 'FLOW-REJECTED');
    const appointmentId = await createPendingAppointment(requestId, collector.id);

    await AppointmentModel.rejectAppointment(appointmentId, recycler.id);

    const notification = await getLatestNotification(collector.id, appointmentId, 'appointment_rejected');
    const ok = Boolean(notification);

    logResult('Rechazado: llega appointment_rejected al collector', ok, {
      requestId,
      appointmentId,
      notification,
    });
  }

  // 4) completado
  {
    const requestId = await createRequest(recycler.id, materialId, 'FLOW-COMPLETED');
    const appointmentId = await createPendingAppointment(requestId, collector.id);

    await AppointmentModel.acceptAppointment(appointmentId, recycler.id);
    await AppointmentModel.completeAppointment(appointmentId, collector.id);

    const notificationCollector = await getLatestNotification(collector.id, appointmentId, 'appointment_completed');

    const ok = Boolean(notificationCollector);

    logResult('Completado: llega appointment_completed al collector', ok, {
      requestId,
      appointmentId,
      notificationCollector,
    });
  }

  // 5a) cancelado (trigger base)
  {
    const requestId = await createRequest(recycler.id, materialId, 'FLOW-CANCEL-BASE');
    const appointmentId = await createPendingAppointment(requestId, collector.id);

    await AppointmentModel.cancelAppointment(appointmentId, recycler.id, 'recycler');

    const notification = await getLatestNotification(collector.id, appointmentId, 'appointment_canceled');
    const ok = Boolean(notification);

    logResult('Cancelado (trigger): llega appointment_canceled al collector', ok, {
      requestId,
      appointmentId,
      notification,
    });
  }

  // 5b) cancelado por collector (caso reportado)
  {
    const requestId = await createRequest(recycler.id, materialId, 'FLOW-CANCEL-BY-COLLECTOR');
    const appointmentId = await createPendingAppointment(requestId, collector.id);

    await AppointmentModel.cancelAppointment(appointmentId, collector.id, 'collector');

    const notification = await getLatestNotification(recycler.id, appointmentId, 'appointment_canceled');
    const ok = Boolean(notification);

    logResult('Cancelado (collector): llega appointment_canceled al recycler', ok, {
      requestId,
      appointmentId,
      notification,
    });
  }
};

try {
  await run();
} catch (error) {
  console.error('\n[ERROR] Ejecucion de prueba:', error);
} finally {
  const passed = results.filter((r) => r.ok).length;
  const total = results.length;

  console.log('\n=== Resumen notificaciones ===');
  results.forEach((r) => {
    console.log(`- ${r.ok ? 'PASS' : 'FAIL'} :: ${r.name}`);
  });
  console.log(`Total: ${passed}/${total} OK`);

  process.exit(total > 0 && passed === total ? 0 : 1);
}

import dotenv from 'dotenv';
import db from '../config/DBConnect.js';
import * as RequestModel from '../Models/Forms/requestModel.js';
import * as AppointmentModel from '../Models/appointmentModel.js';
import * as ScoreModel from '../Models/scoreModel.js';
import { createScore as createScoreController } from '../Controllers/scoreController.js';
import { REQUEST_STATE, APPOINTMENT_STATE } from '../shared/constants.js';

dotenv.config();

const TEST_TAG = '[AUTO-TEST-SCORE-FLOW]';
const created = {
  requestIds: [],
  appointmentIds: [],
  scoreIds: [],
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

const invokeCreateScore = async (payload) => {
  const req = { body: payload };
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(jsonBody) {
      this.body = jsonBody;
      return this;
    },
  };

  await createScoreController(req, res);
  return { statusCode: res.statusCode, body: res.body };
};

const getUsers = async () => {
  const [rows] = await db.query(
    `SELECT id, email, roleId, state
     FROM users
     WHERE email IN (?, ?)` ,
    ['ronaldjoelsaavedra@gmail.com', 'ninja4321jsvj@gmail.com']
  );
  return rows;
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

const fetchScoreRow = async (appointmentId, ratedByUserId) => {
  const [rows] = await db.query(
    `SELECT id, appointmentConfirmationId, ratedByUserId, ratedToUserId, rating, score, comment, state
     FROM score
     WHERE appointmentConfirmationId = ?
       AND ratedByUserId = ?
       AND state = 1
     ORDER BY id DESC
     LIMIT 1`,
    [appointmentId, ratedByUserId]
  );
  return rows[0] || null;
};

const markScoreInactive = async (scoreId) => {
  if (!scoreId) return;
  await db.query(`UPDATE score SET state = 0 WHERE id = ?`, [scoreId]);
};

const run = async () => {
  console.log('\n=== Iniciando pruebas E2E de score/rating ===');

  const users = await getUsers();
  const collector = users.find((u) => u.email === 'ronaldjoelsaavedra@gmail.com');
  const recycler = users.find((u) => u.email === 'ninja4321jsvj@gmail.com');

  if (!collector || !recycler) {
    throw new Error('No se encontraron ambos usuarios para la prueba');
  }

  const materialId = await getActiveMaterialId();

  console.log('Usuarios detectados:', {
    collector: { id: collector.id, email: collector.email, roleId: collector.roleId },
    recycler: { id: recycler.id, email: recycler.email, roleId: recycler.roleId },
    materialId,
  });

  // Flujo 1: Request -> cita -> accepted -> completed -> base 10 + rating 5 = 15
  {
    const requestId = await createRequest(recycler.id, materialId, 'FLOW-1-COMPLETE');
    const appointmentId = await createPendingAppointment(requestId, collector.id);
    await AppointmentModel.acceptAppointment(appointmentId, recycler.id);
    await AppointmentModel.completeAppointment(appointmentId, collector.id);

    // Simular inserción de puntos base al completar (como hace el endpoint complete)
    const baseScoreId = await ScoreModel.createScore(appointmentId, recycler.id, collector.id, null, null);
    created.scoreIds.push(baseScoreId);

    const response = await invokeCreateScore({
      appointmentId,
      ratedByUserId: recycler.id,
      ratedToUserId: collector.id,
      rating: 5,
      comment: `${TEST_TAG} rating 5 flow1`,
    });

    const row = await fetchScoreRow(appointmentId, recycler.id);
    if (row?.id) created.scoreIds.push(row.id);

    const ok = response.statusCode === 200 && Number(row?.rating) === 5 && Number(row?.score) === 15;
    logResult('Flow 1: completada + calificación normal suma base+rating', ok, {
      response,
      scoreRow: row,
    });
  }

  // Flujo 2: Request -> cita -> cancelada -> sin reclamo => no score
  {
    const requestId = await createRequest(recycler.id, materialId, 'FLOW-2-CANCEL-NO-COMPLAINT');
    const appointmentId = await createPendingAppointment(requestId, collector.id);
    await AppointmentModel.cancelAppointment(appointmentId, collector.id, 'collector');

    const [rows] = await db.query(
      `SELECT id FROM score WHERE appointmentConfirmationId = ? AND state = 1`,
      [appointmentId]
    );

    const ok = rows.length === 0;
    logResult('Flow 2: cancelada sin reclamo no genera score', ok, { activeScores: rows.length });
  }

  // Flujo 3: Request -> cita -> cancelada -> reclamo => rating=1 y score=1
  {
    const requestId = await createRequest(recycler.id, materialId, 'FLOW-3-CANCEL-WITH-COMPLAINT');
    const appointmentId = await createPendingAppointment(requestId, collector.id);
    await AppointmentModel.cancelAppointment(appointmentId, collector.id, 'collector');

    const response = await invokeCreateScore({
      appointmentId,
      ratedByUserId: recycler.id,
      ratedToUserId: collector.id,
      rating: 5,
      comment: `[RECLAMO] ${TEST_TAG} reclamo por cancelación`,
    });

    const row = await fetchScoreRow(appointmentId, recycler.id);
    if (row?.id) created.scoreIds.push(row.id);

    const ok = response.statusCode === 201 && Number(row?.rating) === 1 && Number(row?.score) === 1;
    logResult('Flow 3: cancelada + reclamo fuerza rating=1 y score=1', ok, {
      response,
      scoreRow: row,
    });
  }

  // Flujo 4: completada + reclamo => rechazado
  {
    const requestId = await createRequest(recycler.id, materialId, 'FLOW-4-COMPLETED-COMPLAINT-BLOCKED');
    const appointmentId = await createPendingAppointment(requestId, collector.id);
    await AppointmentModel.acceptAppointment(appointmentId, recycler.id);
    await AppointmentModel.completeAppointment(appointmentId, collector.id);

    const response = await invokeCreateScore({
      appointmentId,
      ratedByUserId: recycler.id,
      ratedToUserId: collector.id,
      rating: 1,
      comment: `[RECLAMO] ${TEST_TAG} intento reclamo en completada`,
    });

    const ok = response.statusCode === 409;
    logResult('Flow 4: reclamo en completada se bloquea', ok, { response });
  }

  // Flujo 5: pendiente + reclamo => rechazado
  {
    const requestId = await createRequest(recycler.id, materialId, 'FLOW-5-PENDING-COMPLAINT-BLOCKED');
    const appointmentId = await createPendingAppointment(requestId, collector.id);

    const response = await invokeCreateScore({
      appointmentId,
      ratedByUserId: recycler.id,
      ratedToUserId: collector.id,
      rating: 1,
      comment: `[RECLAMO] ${TEST_TAG} intento reclamo en pendiente`,
    });

    const ok = response.statusCode === 400;
    logResult('Flow 5: reclamo en pendiente se bloquea', ok, { response });
  }
};

const cleanup = async () => {
  // Evitar contaminar ranking: desactivar solo scores creados en prueba.
  if (created.scoreIds.length > 0) {
    const uniqueScoreIds = [...new Set(created.scoreIds)];
    await db.query(
      `UPDATE score
       SET state = 0
       WHERE id IN (${uniqueScoreIds.map(() => '?').join(',')})`,
      uniqueScoreIds
    );
    console.log(`\n[cleanup] scores desactivados: ${uniqueScoreIds.length}`);
  }
};

try {
  await run();
} catch (error) {
  console.error('\n[ERROR] Ejecución de pruebas:', error);
} finally {
  try {
    await cleanup();
  } catch (cleanupError) {
    console.error('[ERROR] Cleanup:', cleanupError);
  }

  const passed = results.filter((r) => r.ok).length;
  const total = results.length;

  console.log('\n=== Resumen ===');
  results.forEach((r) => {
    console.log(`- ${r.ok ? 'PASS' : 'FAIL'} :: ${r.name}`);
  });
  console.log(`Total: ${passed}/${total} OK`);

  process.exit(total > 0 && passed === total ? 0 : 1);
}

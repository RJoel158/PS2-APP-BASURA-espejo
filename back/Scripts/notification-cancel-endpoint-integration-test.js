import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import db from '../config/DBConnect.js';
import * as RequestModel from '../Models/Forms/requestModel.js';
import * as AppointmentModel from '../Models/appointmentModel.js';
import { REQUEST_STATE } from '../shared/constants.js';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || process.env.JWT_ACCESS_SECRET || 'greenbit-dev-insecure-secret-change-me';

const [users] = await db.query(
  `SELECT id, email, roleId
   FROM users
   WHERE state = 1
   ORDER BY id ASC
   LIMIT 10`
);
if (!users || users.length < 2) {
  throw new Error('No hay suficientes usuarios activos');
}

const recycler = users[0];
const collector = users.find((u) => Number(u.id) !== Number(recycler.id));
if (!collector) {
  throw new Error('No se pudo seleccionar collector');
}

const [materials] = await db.query(
  `SELECT id
   FROM material
   WHERE state = 1
   ORDER BY id ASC
   LIMIT 1`
);
if (!materials?.[0]) {
  throw new Error('No hay material activo');
}
const materialId = Number(materials[0].id);

const conn = await db.getConnection();
let requestId;
try {
  requestId = await RequestModel.create(
    conn,
    recycler.id,
    '[AUTO-TEST-CANCEL-ENDPOINT] collector-cancel fallback check',
    materialId,
    -17.3935,
    -66.157,
    REQUEST_STATE.OPEN
  );
} finally {
  conn.release();
}

const appointmentId = await AppointmentModel.createAppointment(
  requestId,
  '2026-12-31',
  collector.id,
  '11:00:00'
);

const accessToken = jwt.sign(
  {
    id: collector.id,
    email: collector.email,
    roleId: collector.roleId,
    role: 'user',
    state: 1,
  },
  JWT_SECRET,
  {
    expiresIn: '15m',
    issuer: 'greenbit-api',
  }
);

const response = await fetch(`http://localhost:3000/api/appointments/${appointmentId}/cancel`, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
  },
  body: JSON.stringify({
    userId: collector.id,
    userRole: 'collector',
  }),
});

const responseBody = await response.json();

const [notifRecyclerRows] = await db.query(
  `SELECT id, userId, type, title, body, requestId, appointmentId, createdAt
   FROM notifications
   WHERE userId = ?
     AND appointmentId = ?
     AND type = 'appointment_canceled'
   ORDER BY id DESC
   LIMIT 1`,
  [recycler.id, appointmentId]
);

const [notifCollectorRows] = await db.query(
  `SELECT id, userId, type, title, body, requestId, appointmentId, createdAt
   FROM notifications
   WHERE userId = ?
     AND appointmentId = ?
     AND type = 'appointment_canceled'
   ORDER BY id DESC
   LIMIT 1`,
  [collector.id, appointmentId]
);

const output = {
  recycler: { id: recycler.id, email: recycler.email },
  collector: { id: collector.id, email: collector.email },
  requestId,
  appointmentId,
  endpointStatus: response.status,
  endpointSuccess: responseBody?.success,
  recyclerNotification: notifRecyclerRows?.[0] || null,
  collectorNotification: notifCollectorRows?.[0] || null,
};

console.log(JSON.stringify(output, null, 2));

const passed = response.status === 200 && responseBody?.success === true && Boolean(output.recyclerNotification);
process.exit(passed ? 0 : 1);

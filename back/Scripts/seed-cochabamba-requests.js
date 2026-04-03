import dotenv from 'dotenv';
import db from '../config/DBConnect.js';
import * as RequestModel from '../Models/Forms/requestModel.js';
import * as ScheduleModel from '../Models/Forms/scheduleModel.js';
import { REQUEST_STATE } from '../shared/constants.js';

dotenv.config();

const TARGET_EMAIL = 'ninja4321jsvj@gmail.com';
const SEED_TAG = '[SEED-CBBA-2026-04]';

const cochabambaRequests = [
  {
    zone: 'Queru Queru',
    reference: 'Cerca Av. América y Melchor Urquidi',
    latitude: -17.3768,
    longitude: -66.1587,
    timeFrom: '08:30:00',
    timeTo: '12:30:00',
    days: { monday: 1, tuesday: 1, wednesday: 1, thursday: 0, friday: 1, saturday: 0, sunday: 0 },
  },
  {
    zone: 'Cala Cala',
    reference: 'Entorno de Av. Beijing',
    latitude: -17.3702,
    longitude: -66.1679,
    timeFrom: '14:00:00',
    timeTo: '18:00:00',
    days: { monday: 0, tuesday: 1, wednesday: 0, thursday: 1, friday: 1, saturday: 1, sunday: 0 },
  },
  {
    zone: 'Sarco',
    reference: 'Zona Av. Juan de la Rosa',
    latitude: -17.3924,
    longitude: -66.1852,
    timeFrom: '09:00:00',
    timeTo: '13:00:00',
    days: { monday: 1, tuesday: 0, wednesday: 1, thursday: 1, friday: 0, saturday: 1, sunday: 0 },
  },
  {
    zone: 'Muyurina',
    reference: 'Inmediaciones UMSS',
    latitude: -17.3847,
    longitude: -66.1451,
    timeFrom: '16:00:00',
    timeTo: '19:00:00',
    days: { monday: 0, tuesday: 1, wednesday: 1, thursday: 0, friday: 1, saturday: 0, sunday: 0 },
  },
  {
    zone: 'Tiquipaya Centro',
    reference: 'Plaza principal Tiquipaya',
    latitude: -17.3384,
    longitude: -66.2155,
    timeFrom: '10:00:00',
    timeTo: '14:00:00',
    days: { monday: 1, tuesday: 1, wednesday: 0, thursday: 1, friday: 0, saturday: 1, sunday: 0 },
  },
  {
    zone: 'Colcapirhua',
    reference: 'Corredor Blanco Galindo',
    latitude: -17.3887,
    longitude: -66.2374,
    timeFrom: '07:30:00',
    timeTo: '11:30:00',
    days: { monday: 1, tuesday: 0, wednesday: 1, thursday: 0, friday: 1, saturday: 1, sunday: 0 },
  },
  {
    zone: 'Quillacollo Centro',
    reference: 'Entorno Plaza Bolívar',
    latitude: -17.3928,
    longitude: -66.2799,
    timeFrom: '15:00:00',
    timeTo: '19:00:00',
    days: { monday: 0, tuesday: 1, wednesday: 1, thursday: 1, friday: 0, saturday: 0, sunday: 0 },
  },
  {
    zone: 'Vinto',
    reference: 'Zona Plaza Principal Vinto',
    latitude: -17.3939,
    longitude: -66.3177,
    timeFrom: '09:30:00',
    timeTo: '13:30:00',
    days: { monday: 1, tuesday: 1, wednesday: 0, thursday: 0, friday: 1, saturday: 1, sunday: 0 },
  },
  {
    zone: 'Sacaba Centro',
    reference: 'Cerca Av. Villazón',
    latitude: -17.3973,
    longitude: -66.0387,
    timeFrom: '13:30:00',
    timeTo: '17:30:00',
    days: { monday: 0, tuesday: 1, wednesday: 0, thursday: 1, friday: 1, saturday: 1, sunday: 0 },
  },
  {
    zone: 'Pacata',
    reference: 'Eje Av. Petrolera',
    latitude: -17.4268,
    longitude: -66.1268,
    timeFrom: '08:00:00',
    timeTo: '12:00:00',
    days: { monday: 1, tuesday: 0, wednesday: 1, thursday: 1, friday: 1, saturday: 0, sunday: 0 },
  },
  {
    zone: 'Chimba',
    reference: 'Cruce Chimba - Canal',
    latitude: -17.4109,
    longitude: -66.1867,
    timeFrom: '17:00:00',
    timeTo: '20:00:00',
    days: { monday: 0, tuesday: 1, wednesday: 1, thursday: 0, friday: 1, saturday: 0, sunday: 0 },
  },
  {
    zone: 'Sipe Sipe',
    reference: 'Centro urbano Sipe Sipe',
    latitude: -17.4495,
    longitude: -66.3872,
    timeFrom: '09:00:00',
    timeTo: '12:30:00',
    days: { monday: 1, tuesday: 1, wednesday: 1, thursday: 0, friday: 0, saturday: 1, sunday: 0 },
  },
];

const run = async () => {
  const [users] = await db.query(
    `SELECT id, email
     FROM users
     WHERE email = ?
     LIMIT 1`,
    [TARGET_EMAIL]
  );

  if (!users || users.length === 0) {
    throw new Error(`No se encontró el usuario objetivo: ${TARGET_EMAIL}`);
  }

  const userId = Number(users[0].id);

  const [materials] = await db.query(
    `SELECT id, name
     FROM material
     WHERE state = 1
     ORDER BY id ASC`
  );

  if (!materials || materials.length === 0) {
    throw new Error('No hay materiales activos para crear solicitudes');
  }

  let inserted = 0;
  let skipped = 0;

  for (let i = 0; i < cochabambaRequests.length; i += 1) {
    const item = cochabambaRequests[i];
    const material = materials[i % materials.length];
    const description = `${SEED_TAG} ${item.zone} - ${item.reference}`;

    const [existingRows] = await db.query(
      `SELECT id
       FROM request
       WHERE idUser = ? AND description = ?
       LIMIT 1`,
      [userId, description]
    );

    if (existingRows && existingRows.length > 0) {
      skipped += 1;
      continue;
    }

    const conn = await db.getConnection();

    try {
      await conn.beginTransaction();

      const requestId = await RequestModel.create(
        conn,
        userId,
        description,
        Number(material.id),
        Number(item.latitude),
        Number(item.longitude),
        REQUEST_STATE.OPEN
      );

      await ScheduleModel.create(
        conn,
        item.timeFrom,
        item.timeTo,
        item.days.monday,
        item.days.tuesday,
        item.days.wednesday,
        item.days.thursday,
        item.days.friday,
        item.days.saturday,
        item.days.sunday,
        requestId
      );

      await conn.commit();
      inserted += 1;

      console.log('[INSERTED]', {
        requestId,
        zone: item.zone,
        material: material.name,
        timeFrom: item.timeFrom,
        timeTo: item.timeTo,
      });
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }

  const [summaryRows] = await db.query(
    `SELECT r.id, r.description, r.latitude, r.longitude, m.name AS materialName,
            s.startHour, s.endHour, s.monday, s.tuesday, s.wednesday, s.thursday, s.friday, s.saturday, s.sunday
     FROM request r
     LEFT JOIN material m ON m.id = r.materialId
     LEFT JOIN schedule s ON s.requestId = r.id
     WHERE r.idUser = ?
       AND r.description LIKE ?
     ORDER BY r.id DESC
     LIMIT 30`,
    [userId, `${SEED_TAG}%`]
  );

  console.log('\n=== RESUMEN SEED COCHABAMBA ===');
  console.log({
    userId,
    userEmail: TARGET_EMAIL,
    inserted,
    skipped,
    totalTaggedRequests: summaryRows.length,
  });

  summaryRows.forEach((row) => {
    console.log({
      requestId: row.id,
      description: row.description,
      material: row.materialName,
      coordinates: `${row.latitude}, ${row.longitude}`,
      hours: `${row.startHour} - ${row.endHour}`,
      days: {
        monday: row.monday,
        tuesday: row.tuesday,
        wednesday: row.wednesday,
        thursday: row.thursday,
        friday: row.friday,
        saturday: row.saturday,
        sunday: row.sunday,
      },
    });
  });
};

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('[ERROR] seed-cochabamba-requests:', error.message);
    console.error(error);
    process.exit(1);
  });

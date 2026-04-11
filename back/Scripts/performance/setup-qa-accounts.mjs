import bcrypt from 'bcrypt';
import db from '../../config/DBConnect.js';
import fs from 'fs';
import path from 'path';

const target = process.env.PERF_TARGET || 'http://localhost:3000';
const qaPassword = process.env.PERF_QA_PASSWORD || 'Tilin43*';
const rows = Number(process.env.PERF_CSV_ROWS || 500);
const csvPath = path.resolve(process.cwd(), 'Scripts/performance/artillery/users.sample.csv');

const qaAccounts = [
  {
    nombres: 'Admin',
    apellidos: 'Qa',
    email: 'svr0035567@est.univalle.edu',
    phone: '+59170000001',
    role_id: 1,
    role: 'admin',
    appointmentId: 101,
    ratedToUserId: 2
  },
  {
    nombres: 'Recolector',
    apellidos: 'Qa',
    email: 'ronaldjoelsaavedra@gmail.com',
    phone: '+59170000002',
    role_id: 2,
    role: 'recolector',
    appointmentId: 101,
    ratedToUserId: 1
  },
  {
    nombres: 'Reciclador',
    apellidos: 'Qa',
    email: 'ninja4321jsvj@gmail.com',
    phone: '+59170000003',
    role_id: 3,
    role: 'reciclador',
    appointmentId: 101,
    ratedToUserId: 1
  }
];

const ipFromIndex = (index) => {
  const third = Math.floor(index / 250) % 250;
  const fourth = (index % 250) + 1;
  return `10.40.${third}.${fourth}`;
};

const postJson = async (url, payload) => {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }

  return { ok: response.ok, status: response.status, body };
};

const resolveUserId = async (email) => {
  const [rows] = await db.query(
    'SELECT id, state FROM users WHERE LOWER(TRIM(email)) = LOWER(TRIM(?)) ORDER BY id DESC LIMIT 1',
    [email]
  );

  if (!rows.length) return null;
  return Number(rows[0].id);
};

const ensureAccount = async (account) => {
  let userId = await resolveUserId(account.email);

  if (!userId) {
    const created = await postJson(`${target}/api/users`, {
      nombres: account.nombres,
      apellidos: account.apellidos,
      email: account.email,
      phone: account.phone,
      role_id: account.role_id
    });

    if (!created.ok && created.status !== 400) {
      throw new Error(`No se pudo registrar ${account.email}: ${created.status}`);
    }

    userId = created.body?.id ? Number(created.body.id) : await resolveUserId(account.email);
  }

  if (!userId) {
    throw new Error(`No se pudo resolver userId para ${account.email}`);
  }

  const hashed = await bcrypt.hash(qaPassword, 10);
  await db.query('UPDATE users SET password = ?, state = 2 WHERE id = ?', [hashed, userId]);

  return {
    ...account,
    userId
  };
};

const run = async () => {
  try {
    const resolved = [];
    for (const account of qaAccounts) {
      const item = await ensureAccount(account);
      resolved.push(item);
      console.log(`QA account ready: ${item.email} (id=${item.userId}, role=${item.role})`);
    }

    const header = 'email,password,userId,role,appointmentId,ratedToUserId,clientIp';
    const lines = [header];

    for (let i = 0; i < rows; i += 1) {
      const item = resolved[i % resolved.length];
      lines.push([
        item.email,
        qaPassword,
        String(item.userId),
        item.role,
        String(item.appointmentId),
        String(item.ratedToUserId),
        ipFromIndex(i)
      ].join(','));
    }

    fs.writeFileSync(csvPath, `${lines.join('\n')}\n`, 'utf8');

    console.log('QA accounts configuradas y CSV actualizado.');
    console.log(`CSV: ${csvPath}`);
    console.log(`Rows: ${rows}`);
  } catch (error) {
    console.error('setup-qa-accounts failed:', error.message);
    process.exit(2);
  } finally {
    try {
      await db.end();
    } catch {}
  }
};

void run();

import fs from 'fs';
import path from 'path';

const csvPath = path.resolve(process.cwd(), process.argv[2] || 'Scripts/performance/artillery/users.sample.csv');
const target = process.env.PERF_TARGET || 'http://localhost:3000';
const normalizeRowsTo = Number(process.env.PERF_CSV_ROWS || 500);

const parseCsv = (raw) => {
  const [headerLine, ...rows] = raw.trim().split(/\r?\n/);
  const headers = headerLine.split(',').map((h) => h.trim());
  return rows
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const cols = line.split(',');
      const item = {};
      headers.forEach((h, i) => {
        item[h] = (cols[i] || '').trim();
      });
      return item;
    });
};

const ipFromIndex = (index) => {
  const third = Math.floor(index / 250) % 250;
  const fourth = (index % 250) + 1;
  return `10.20.${third}.${fourth}`;
};

const validateCredential = async ({ email, password }) => {
  const response = await fetch(`${target}/api/users/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': '10.10.10.10'
    },
    body: JSON.stringify({ email, password })
  });

  const bodyText = await response.text();
  let body = null;
  try {
    body = bodyText ? JSON.parse(bodyText) : null;
  } catch {
    body = null;
  }

  const token = body?.user?.token;
  const userId = body?.user?.id;
  const role = body?.user?.role;

  if (!response.ok || !token || !userId) {
    return {
      ok: false,
      status: response.status,
      error: body?.error || 'login_failed'
    };
  }

  return {
    ok: true,
    userId: String(userId),
    role: String(role || 'user')
  };
};

if (!fs.existsSync(csvPath)) {
  console.error(`CSV no encontrado: ${csvPath}`);
  process.exit(1);
}

const csvRaw = fs.readFileSync(csvPath, 'utf8');
const rows = parseCsv(csvRaw);
if (rows.length === 0) {
  console.error('CSV sin filas de datos.');
  process.exit(1);
}

const uniqueCredentialsMap = new Map();
for (const row of rows) {
  const email = String(row.email || '').toLowerCase();
  const password = String(row.password || '');
  if (!email || !password) continue;
  const key = `${email}::${password}`;
  if (!uniqueCredentialsMap.has(key)) {
    uniqueCredentialsMap.set(key, { email, password, row });
  }
}

const uniqueCredentials = Array.from(uniqueCredentialsMap.values());
const validSeeds = [];
const invalids = [];

for (const entry of uniqueCredentials) {
  try {
    const result = await validateCredential(entry);
    if (result.ok) {
      validSeeds.push({
        email: entry.email,
        password: entry.password,
        userId: result.userId,
        role: result.role,
        appointmentId: String(entry.row.appointmentId || '101'),
        ratedToUserId: String(entry.row.ratedToUserId || result.userId)
      });
    } else {
      invalids.push({ email: entry.email, status: result.status, error: result.error });
    }
  } catch (error) {
    invalids.push({ email: entry.email, status: 0, error: error.message });
  }
}

if (validSeeds.length === 0) {
  console.error('No se encontraron credenciales validas para pruebas de carga.');
  console.error('Carga abortada para evitar falsos negativos (401/429).');
  if (invalids.length > 0) {
    console.error('Ejemplos de error:', invalids.slice(0, 5));
  }
  process.exit(2);
}

const outputRows = [];
for (let i = 0; i < normalizeRowsTo; i += 1) {
  const seed = validSeeds[i % validSeeds.length];
  outputRows.push({
    ...seed,
    clientIp: ipFromIndex(i)
  });
}

const header = 'email,password,userId,role,appointmentId,ratedToUserId,clientIp';
const lines = [header];
for (const row of outputRows) {
  lines.push([
    row.email,
    row.password,
    row.userId,
    row.role,
    row.appointmentId,
    row.ratedToUserId,
    row.clientIp
  ].join(','));
}

fs.writeFileSync(csvPath, `${lines.join('\n')}\n`, 'utf8');

console.log('CSV validado y normalizado para carga.');
console.log(`Archivo: ${csvPath}`);
console.log(`Credenciales unicas validas: ${validSeeds.length}/${uniqueCredentials.length}`);
console.log(`Filas finales: ${outputRows.length}`);
if (invalids.length > 0) {
  console.log(`Credenciales invalidas detectadas: ${invalids.length}`);
}

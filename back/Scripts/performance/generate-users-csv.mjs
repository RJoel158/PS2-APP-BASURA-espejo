import fs from 'fs';
import path from 'path';

const outputPath = path.resolve(process.cwd(), 'Scripts/performance/artillery/users.sample.csv');
const rows = Number(process.env.PERF_CSV_ROWS || 500);

const templates = [
  { email: 'admin@example.com', password: 'Admin123!', userId: 1, role: 'admin', appointmentId: 101, ratedToUserId: 2 },
  { email: 'reciclador1@example.com', password: 'Pass123!', userId: 2, role: 'user', appointmentId: 101, ratedToUserId: 3 },
  { email: 'reciclador2@example.com', password: 'Pass123!', userId: 3, role: 'user', appointmentId: 101, ratedToUserId: 2 },
  { email: 'recolector1@example.com', password: 'Pass123!', userId: 4, role: 'user', appointmentId: 102, ratedToUserId: 2 },
  { email: 'institucion1@example.com', password: 'Pass123!', userId: 5, role: 'user', appointmentId: 103, ratedToUserId: 4 },
];

const ipFromIndex = (index) => {
  const third = Math.floor(index / 250) % 250;
  const fourth = (index % 250) + 1;
  return `10.20.${third}.${fourth}`;
};

const header = 'email,password,userId,role,appointmentId,ratedToUserId,clientIp';
const lines = [header];

for (let i = 0; i < rows; i += 1) {
  const item = templates[i % templates.length];
  lines.push([
    item.email,
    item.password,
    String(item.userId),
    item.role,
    String(item.appointmentId),
    String(item.ratedToUserId),
    ipFromIndex(i),
  ].join(','));
}

fs.writeFileSync(outputPath, `${lines.join('\n')}\n`, 'utf8');
console.log(`CSV generado: ${outputPath}`);
console.log(`Filas de datos: ${rows}`);

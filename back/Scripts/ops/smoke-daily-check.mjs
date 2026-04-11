import { spawnSync } from 'child_process';

const runCommand = (command, args) => {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32'
  });

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed with code ${result.status}`);
  }
};

try {
  console.log('1) Validando CSV de usuarios de prueba...');
  runCommand('npm', ['run', 'perf:validate-csv']);

  console.log('2) Ejecutando smoke...');
  runCommand('npm', ['run', 'perf:smoke']);

  console.log('3) Analizando reporte smoke...');
  runCommand('node', ['Scripts/performance/analyze-artillery-report.mjs', 'Scripts/performance/reports/smoke.json']);

  console.log('Smoke diario finalizado correctamente.');
} catch (error) {
  console.error('Smoke diario fallido:', error.message);
  process.exit(2);
}

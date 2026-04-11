import fs from 'fs';
import path from 'path';

const target = process.env.READINESS_URL || 'http://localhost:3000/health/ready';
const intervalMs = Number(process.env.READINESS_INTERVAL_MS || 30000);
const iterations = Number(process.env.READINESS_ITERATIONS || 10);
const timeoutMs = Number(process.env.READINESS_TIMEOUT_MS || 8000);

const outputPath = path.resolve(process.cwd(), 'Scripts/performance/reports/ready-monitor.latest.json');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const run = async () => {
  const results = [];

  for (let i = 0; i < iterations; i += 1) {
    const startedAt = Date.now();
    let ok = false;
    let status = 0;
    let body = null;
    let error = null;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      const response = await fetch(target, { signal: controller.signal });
      clearTimeout(timeout);
      status = response.status;
      body = await response.json().catch(() => null);
      ok = response.ok && body?.status === 'ready' && body?.services?.database === 'online';
    } catch (err) {
      error = err.message;
      ok = false;
    }

    const durationMs = Date.now() - startedAt;
    const item = {
      timestamp: new Date().toISOString(),
      ok,
      status,
      durationMs,
      error,
      body
    };

    results.push(item);
    const mark = ok ? 'OK' : 'FAIL';
    console.log(`[${mark}] #${i + 1}/${iterations} status=${status} duration=${durationMs}ms error=${error || 'none'}`);

    if (i < iterations - 1) {
      await sleep(intervalMs);
    }
  }

  const uptimeRatio = results.length > 0
    ? (results.filter((r) => r.ok).length / results.length) * 100
    : 0;

  const summary = {
    target,
    intervalMs,
    iterations,
    uptimeRatio: Number(uptimeRatio.toFixed(2)),
    startedAt: results[0]?.timestamp || null,
    endedAt: results[results.length - 1]?.timestamp || null,
    results
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');

  console.log('Readiness monitor summary:');
  console.log(`- uptimeRatio: ${summary.uptimeRatio}%`);
  console.log(`- output: ${outputPath}`);

  if (summary.uptimeRatio < 99) {
    process.exitCode = 2;
  }
};

void run();

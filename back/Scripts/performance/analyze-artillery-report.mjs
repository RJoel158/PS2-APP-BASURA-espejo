import fs from 'fs';
import path from 'path';

const reportPath = process.argv[2];
if (!reportPath) {
  console.error('Usage: node Scripts/performance/analyze-artillery-report.mjs <artillery-json-report>');
  process.exit(1);
}

const absolute = path.resolve(process.cwd(), reportPath);
if (!fs.existsSync(absolute)) {
  console.error(`Report not found: ${absolute}`);
  process.exit(1);
}

const raw = fs.readFileSync(absolute, 'utf8');
const report = JSON.parse(raw);

const summary = report.aggregate || report.intermediate || {};
const counters = summary.counters || {};
const rates = summary.rates || {};
const hist = summary.summaries || {};

const requestsCompleted = counters['http.requests'] || 0;
const requestsOk = Object.entries(counters)
  .filter(([key]) => /^http\.codes\.2\d\d$/.test(key))
  .reduce((acc, [, value]) => acc + Number(value || 0), 0);
const errors4xx = (counters['http.errors.4xx'] || 0) + (counters['http.codes.400'] || 0) + (counters['http.codes.401'] || 0) + (counters['http.codes.403'] || 0) + (counters['http.codes.404'] || 0) + (counters['http.codes.409'] || 0) + (counters['http.codes.429'] || 0);
const errors5xx = (counters['http.errors.5xx'] || 0) + (counters['http.codes.500'] || 0) + (counters['http.codes.502'] || 0) + (counters['http.codes.503'] || 0) + (counters['http.codes.504'] || 0);
const transportErrorCount = Object.entries(counters)
  .filter(([key]) => key.startsWith('errors.'))
  .reduce((acc, [, value]) => acc + Number(value || 0), 0);
const responseTime = hist['http.response_time'] || {};

const p95 = responseTime.p95 || 0;
const p99 = responseTime.p99 || 0;
const mean = responseTime.mean || 0;
const max = responseTime.max || 0;

const totalErrors = Math.max(0, requestsCompleted - requestsOk);
const successRate = requestsCompleted > 0 ? (requestsOk / requestsCompleted) * 100 : 0;
const p95TargetMs = Number(process.env.P95_TARGET_MS || 500);
const maxErrorRate = Number(process.env.MAX_ERROR_RATE || 1);
const errorRate = requestsCompleted > 0 ? (totalErrors / requestsCompleted) * 100 : 100;

const passLatency = p95 <= p95TargetMs;
const passErrorRate = errorRate <= maxErrorRate;

console.log('=== Performance Summary ===');
console.log(`Requests: ${requestsCompleted}`);
console.log(`Throughput (req/s): ${rates['http.request_rate'] || 0}`);
console.log(`HTTP 200: ${requestsOk}`);
console.log(`4xx errors: ${errors4xx}`);
console.log(`5xx errors: ${errors5xx}`);
console.log(`Transport errors: ${transportErrorCount}`);
console.log(`Error rate: ${errorRate.toFixed(2)}% (target <= ${maxErrorRate}%)`);
console.log(`Latency mean: ${mean} ms`);
console.log(`Latency p95: ${p95} ms (target <= ${p95TargetMs} ms)`);
console.log(`Latency p99: ${p99} ms`);
console.log(`Latency max: ${max} ms`);
console.log(`Success rate: ${successRate.toFixed(2)}%`);
console.log(`RESULT: ${passLatency && passErrorRate ? 'PASS' : 'FAIL'}`);

if (!passLatency || !passErrorRate) {
  process.exitCode = 2;
}

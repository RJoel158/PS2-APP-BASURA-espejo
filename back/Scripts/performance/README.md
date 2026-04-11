# Stress & Performance Suite (Backend)

Esta suite implementa pruebas de carga para GreenBit con Artillery y un analizador de resultados para validar SLA.

## Archivos
- `artillery/smoke.yml`: validacion rapida de salud + auth + endpoints protegidos.
- `artillery/load-500.yml`: perfil de carga orientado a 500 usuarios simultaneos (lecturas core + presion de reportes).
- `artillery/score-race.yml`: prueba dirigida a carreras en `POST /api/score`.
- `artillery/processor.cjs`: metricas custom (4xx/5xx/429/success).
- `analyze-artillery-report.mjs`: evalua p95 y error-rate contra umbrales.
- `db-observability-checks.sql`: consultas SQL para locks/deadlocks durante la prueba.

## Prerrequisitos
1. Ambiente staging estable.
2. CSV de usuarios de prueba con formato:
   `email,password,userId,role,appointmentId,ratedToUserId,clientIp`
3. Credenciales validas y entidades semilla consistentes (appointments para `score-race`).

## Variables de entorno
- `P95_TARGET_MS` (default: `500`)
- `MAX_ERROR_RATE` (default: `1`)

## Variables operativas recomendadas (produccion)
- `TRUST_PROXY=1` (si hay reverse proxy)
- `DB_POOL_CONNECTION_LIMIT=10`
- `DB_POOL_QUEUE_LIMIT=0`
- `RL_LOGIN_CAPACITY=20`
- `RL_LOGIN_REFILL_PER_SECOND=0.33`
- `RL_LOGIN_BLOCK_MS=120000`
- `RL_FORGOT_CAPACITY=8`
- `RL_FORGOT_REFILL_PER_SECOND=0.13`
- `RL_FORGOT_BLOCK_MS=300000`
- `RL_CHECK_EMAIL_CAPACITY=40`
- `RL_CHECK_EMAIL_REFILL_PER_SECOND=0.66`
- `RL_CHECK_EMAIL_BLOCK_MS=120000`

Estos valores son conservadores para una app municipal pequena: protegen abuso sin bloquear uso normal en horas pico.

## Configuracion de target y CSV
- Target por defecto: `http://localhost:3000`
- CSV por defecto: `Scripts/performance/artillery/users.sample.csv`
- Para apuntar a staging y otro CSV, ejecutar Artillery directo:
   `artillery run Scripts/performance/artillery/load-500.yml --target https://tu-staging --output Scripts/performance/reports/load-500.json`

## Ejecucion recomendada
1. Generar CSV (500 filas por defecto):
   `npm run perf:generate-csv`
2. Validar credenciales reales y normalizar IDs/IPs del CSV:
   `npm run perf:validate-csv`
3. Smoke:
   `npm run perf:smoke`
4. Carga principal:
   `npm run perf:load`
5. Carrera de score:
   `npm run perf:score-race`
6. Analisis automatico:
   `npm run perf:analyze -- Scripts/performance/reports/load-500.json`

## Nota importante sobre resultados
- Si el CSV contiene credenciales invalidas, la prueba producira 401/429 y timeouts que no representan la capacidad real del backend.
- `perf:validate-csv` evita ese falso negativo: elimina credenciales invalidas, actualiza `userId` al real y reparte `clientIp` por fila para no colapsar el rate limiter en un solo origen.

## Criterio rapido de aprobacion
- p95 <= 500 ms
- error rate <= 1%
- 0 hallazgos criticos de integridad (duplicados de score, estados inconsistentes)
- sin deadlocks recurrentes en DB

## Go / No-Go operativo
- GO: `health/ready` estable por 24h + smoke PASS + carga objetivo PASS.
- NO-GO: errores 401/429 por datos de prueba invalidos o `error rate > 1%` sostenido.
- Antes de desplegar: ejecutar `npm run perf:validate-csv` para eliminar falsos negativos.

## Nota de cobertura
Estas pruebas se enfocan en API. Para performance web (LCP/CLS/INP), ejecutar la suite de frontend con Lighthouse CI en el proyecto `front`.

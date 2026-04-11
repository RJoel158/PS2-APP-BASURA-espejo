# Umbrales Operativos y Alertas

## Objetivo
Definir alertas minimas para detectar degradacion antes de afectar a usuarios.

## Alertas criticas (P1)
1. /health/ready != ready por 3 chequeos consecutivos (30s c/u).
2. Error rate global > 2% por 5 minutos.
3. Errores 5xx > 1% por 5 minutos.
4. ETIMEDOUT recurrente en pruebas de humo o monitoreo activo.

## Alertas altas (P2)
1. p95 > 700 ms por 10 minutos.
2. 429 en login > 5% por 10 minutos.
3. Saturacion de pool DB: cola creciente o latencia DB en aumento sostenido.

## Alertas medias (P3)
1. p95 entre 500 y 700 ms por 15 minutos.
2. /health/ready intermitente (uptime ratio 97% a 99%).

## Reaccion recomendada
1. P1: activar rollback o limitar trafico temporalmente.
2. P2: ajustar rate limiter y revisar consultas calientes.
3. P3: abrir tarea de optimizacion y seguimiento en 24h.

## Comandos utiles
- Monitoreo readiness:
  - `npm run ops:monitor:ready`
- Smoke diario:
  - `npm run ops:smoke:daily`

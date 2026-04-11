# Plan de Escalamiento Seguro (Municipal)

## Objetivo
Aumentar la capacidad de usuarios concurrentes y reducir latencia sin romper la logica actual de negocio ni contratos de API consumidos por el frontend.

## Principios
- No cambiar estructura de respuestas JSON existentes sin versionado.
- Mantener calculos de score/ranking en backend.
- Mantener soft-delete y filtros de estado en consultas.
- Cambios incrementales con rollback facil.

## KPI de referencia (SLA)
- p95 de endpoints criticos <= 500 ms.
- tasa de error global <= 1%.
- 429 en login <= 2% en picos esperados.
- 0 regresiones funcionales en flujo: login -> request -> appointment -> notifications -> ranking.

## Fase 1 - Estabilizacion (1-2 dias)
1. Afinar variables operativas por entorno.
2. Activar monitoreo de /health/ready cada 30s.
3. Definir umbrales de alerta: p95, errores 5xx, timeouts, saturacion de pool DB.
4. Ejecutar smoke diario con credenciales reales de prueba (no de produccion).

Entregables:
- Perfil de entorno documentado.
- Dashboard minimo de salud.
- Checklist de despliegue y rollback.

## Fase 2 - Reduccion de carga DB (2-4 dias)
1. Agregar cache corto (30-60s) para lecturas calientes:
   - ranking periodos activos
   - reportes agregados de panel
2. Introducir paginacion por defecto y limite maximo en listados grandes.
3. Revisar consultas lentas con EXPLAIN e indices compuestos.

Entregables:
- p95 de endpoints de lectura reducido al menos 20%.
- Menor uso de conexiones simultaneas a DB en picos.

## Fase 3 - Escalado de autenticacion (2-3 dias)
1. Separar claramente trafico de login vs trafico autenticado en pruebas.
2. Ajustar rate limiter de login por entorno con valores seguros.
3. Reducir relogin innecesario en cliente usando refresh token correctamente.

Entregables:
- Menor 429 legitimo en login.
- Menor ETIMEDOUT en picos.

## Fase 4 - Escalado horizontal controlado (2-3 dias)
1. Ejecutar backend en modo cluster (PM2) en servidor multi-core.
2. Verificar compatibilidad de sesiones/cookies y socket rooms.
3. Prueba de carga de regresion con escenario municipal realista.

Entregables:
- Throughput sostenido mayor sin degradar p95.
- Plan de capacidad por rango de usuarios activos.

## Matriz de despliegue (Go/No-Go)
- GO:
  - p95 <= 500 ms en smoke y perfil municipal.
  - error rate <= 1% por 30 minutos continuos.
  - /health/ready estable y DB online.
- NO-GO:
  - timeouts recurrentes por mas de 5 minutos.
  - 5xx por encima de 1%.
  - degradacion funcional en endpoints protegidos.

## Riesgos y mitigacion
1. Riesgo: sobreajuste de rate limiter.
   Mitigacion: cambios graduales y medicion por endpoint.
2. Riesgo: cache con datos desactualizados.
   Mitigacion: TTL corto y exclusion de endpoints transaccionales.
3. Riesgo: cambios de performance afecten frontend.
   Mitigacion: no cambiar payloads; validar snapshots de respuesta.

## Siguiente ejecucion recomendada
1. Aplicar Fase 1 completa.
2. Medir 48 horas.
3. Priorizar Fase 2 segun endpoints con peor p95.

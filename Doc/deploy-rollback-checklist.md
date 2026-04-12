# Checklist de Despliegue y Rollback

## Pre-Deploy

1. Verificar `npm run ops:smoke:daily` en entorno candidato.
2. Verificar `npm run ops:monitor:ready` (>= 99% uptime ratio en ventana de prueba).
3. Confirmar variables operativas:
   - TRUST_PROXY
   - DB_POOL_CONNECTION_LIMIT
   - RL*LOGIN*\*
   - RL*FORGOT*\*
   - RL*CHECK_EMAIL*\*
4. Confirmar que no hay cambios de contrato API para frontend.

## Deploy Gradual

1. Inicio controlado (canary/piloto).
2. Monitorear 30 min: p95, 5xx, 429 login, readiness.
3. Escalar trafico por etapas solo si cumple SLA.

## Fase 4 (Cluster PM2)

1. Iniciar canary de cluster:
   - `cd back && npm run start:cluster:canary`
2. Validar smoke + flujo funcional critico en canary.
3. Escalar a cluster completo:
   - `cd back && npm run start:cluster`
4. Recargar sin downtime en cambios menores:
   - `cd back && npm run reload:cluster`
5. Validar Socket.IO en frontend (suscripcion y recepcion de notificaciones en tiempo real).

Nota operacional Socket.IO:

- En cluster, usar balanceador/reverse proxy con afinidad de sesion para trafico HTTP long-polling.
- No cambiar contratos API ni estructura JSON durante la transicion.

## Criterio Go

1. p95 <= 500 ms sostenido.
2. error rate <= 1%.
3. readiness estable.

## Criterio No-Go

1. 5xx > 1% por 5 min.
2. ETIMEDOUT sostenido.
3. readiness degradado por mas de 3 ciclos.

## Rollback

1. Revertir a version estable previa.
2. Restaurar variables del ultimo estado estable.
3. Validar `/health/ready` y flujo critico funcional.
4. Registrar incidente y causa raiz.

-- Ejecutar durante pruebas de carga para detectar contencion y deadlocks

-- 1) Locks activos
SELECT *
FROM performance_schema.events_waits_current
WHERE event_name LIKE '%lock%';

-- 2) Transacciones bloqueadas
SELECT trx_id, trx_state, trx_started, trx_wait_started, trx_mysql_thread_id, trx_query
FROM information_schema.innodb_trx
WHERE trx_state = 'LOCK WAIT';

-- 3) Esperas de bloqueo InnoDB
SELECT *
FROM information_schema.innodb_lock_waits;

-- 4) Ultimo deadlock detectado
SHOW ENGINE INNODB STATUS;

-- 5) Tablas con mayor tiempo de espera IO/lock
SELECT OBJECT_SCHEMA, OBJECT_NAME, COUNT_STAR, SUM_TIMER_WAIT
FROM performance_schema.table_io_waits_summary_by_table
WHERE OBJECT_SCHEMA = DATABASE()
ORDER BY SUM_TIMER_WAIT DESC
LIMIT 20;

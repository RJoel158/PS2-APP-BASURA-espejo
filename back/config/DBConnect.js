// config/DBConnect.js
// Conexión a la base de datos usando mysql2/promise
import mysql from "mysql2/promise";
import dotenv from "dotenv";

// Cargar variables de entorno
dotenv.config();

const isSilentLogLevel = () => {
  const level = String(process.env.LOG_LEVEL || '').trim().toLowerCase();
  return ['silent', 'off', 'none', '0'].includes(level);
};

const logInfo = (...args) => {
  if (!isSilentLogLevel()) {
    console.log(...args);
  }
};

const logError = (...args) => {
  if (!isSilentLogLevel()) {
    console.error(...args);
  }
};

// Validar variables de entorno requeridas
const requiredEnvVars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
const missingVars = requiredEnvVars.filter(v => !process.env[v]);
if (missingVars.length > 0) {
  logError(`❌ Variables de entorno de BD faltantes: ${missingVars.join(', ')}`);
  logError('Copia .env.example a .env y configura las credenciales de la base de datos.');
  process.exit(1);
}

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_POOL_CONNECTION_LIMIT || '10'),
  queueLimit: parseInt(process.env.DB_POOL_QUEUE_LIMIT || '0')
});

logInfo(`🔗 Pool de MySQL inicializado para ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);

logInfo("Pool de MySQL (mysql2) inicializado.");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Función para verificar la conectividad con reintentos
export const checkConnection = async () => {
  const maxAttempts = 10;
  const delayMs = 2000;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const connection = await pool.getConnection();
      await connection.ping();
      connection.release();
      logInfo("✅ Conexión a la base de datos verificada");
      return true;
    } catch (error) {
      logError("❌ Error de conexión a la base de datos:", {
        code: error.code,
        message: error.message,
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        database: process.env.DB_NAME,
        attempt,
        maxAttempts
      });

      if (attempt < maxAttempts) {
        await sleep(delayMs);
      }
    }
  }

  return false;
};

// Verificar conexión al inicializar
checkConnection().catch((error) => {
  logError("❌ Error inesperado verificando la base de datos:", error);
});

export default pool;

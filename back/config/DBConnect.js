// config/DBConnect.js
// Conexión a la base de datos usando mysql2/promise
import mysql from "mysql2/promise";
import dotenv from "dotenv";

// Cargar variables de entorno
dotenv.config();

// Validar variables de entorno requeridas
const requiredEnvVars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
const missingVars = requiredEnvVars.filter(v => !process.env[v]);
if (missingVars.length > 0) {
  console.error(`❌ Variables de entorno de BD faltantes: ${missingVars.join(', ')}`);
  console.error('Copia .env.example a .env y configura las credenciales de la base de datos.');
  process.exit(1);
}

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 0
});

console.log(`🔗 Pool de MySQL inicializado para ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);

console.log("Pool de MySQL (mysql2) inicializado.");

// Función para verificar la conectividad
export const checkConnection = async () => {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    console.log("✅ Conexión a la base de datos verificada");
    return true;
  } catch (error) {
    console.error("❌ Error de conexión a la base de datos:", {
      code: error.code,
      message: error.message,
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      database: process.env.DB_NAME
    });
    return false;
  }
};

// Verificar conexión al inicializar
checkConnection();

export default pool;

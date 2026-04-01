// server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import jwt from 'jsonwebtoken';
import { createServer } from 'http';
import { Server } from 'socket.io';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import routes from './Routes/index.js';
import { verifyEmailConnection } from './Services/emailService.js';
import DBConnect from './config/DBConnect.js';

// Cargar variables de entorno
dotenv.config();

// Obtener __dirname en ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Crear directorios necesarios para uploads
const ensureUploadDirectories = () => {
  const uploadDirs = [
    path.join(__dirname, 'uploads'),
    path.join(__dirname, 'uploads/temp'),
    path.join(__dirname, 'uploads/images'),
    path.join(__dirname, 'uploads/announcements')
  ];

  uploadDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`📁 Directorio creado: ${dir}`);
    }
  });
};

// Crear directorios al iniciar
ensureUploadDirectories();

// Debug: Verificar variables de entorno de BD
console.log('🔍 Variables de entorno de BD:');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '***configured***' : 'NOT SET');

const app = express();
const server = createServer(app);

const FALLBACK_JWT_SECRET = 'greenbit-dev-insecure-secret-change-me';
const JWT_SECRET = process.env.JWT_SECRET || process.env.JWT_ACCESS_SECRET || FALLBACK_JWT_SECRET;

app.set('trust proxy', 1);

// Configurar CORS usando variable de entorno
// Soporta múltiples orígenes separados por coma para túneles/dev
const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:5173")
  .split(",")
  .map(o => o.trim())
  .filter(Boolean);

const normalizeOrigin = (value) => (value || '').trim().replace(/\/+$/, '');
const localhostHosts = new Set(['localhost', '127.0.0.1', '[::1]']);

const parseOrigin = (value) => {
  try {
    return new URL(normalizeOrigin(value));
  } catch {
    return null;
  }
};

const isTryCloudflareOrigin = (origin) => {
  const parsed = parseOrigin(origin);
  return Boolean(parsed?.hostname?.endsWith('.trycloudflare.com'));
};

const isEquivalentLocalOrigin = (origin, allowed) => {
  const originUrl = parseOrigin(origin);
  const allowedUrl = parseOrigin(allowed);
  if (!originUrl || !allowedUrl) return false;

  return (
    localhostHosts.has(originUrl.hostname) &&
    localhostHosts.has(allowedUrl.hostname) &&
    originUrl.protocol === allowedUrl.protocol &&
    originUrl.port === allowedUrl.port
  );
};

const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  const normalizedOrigin = normalizeOrigin(origin);

  if (isTryCloudflareOrigin(normalizedOrigin)) return true;

  return allowedOrigins.some((allowed) => {
    const normalizedAllowed = normalizeOrigin(allowed);
    if (normalizedAllowed === '*') return true;
    if (normalizedOrigin === normalizedAllowed) return true;
    return isEquivalentLocalOrigin(normalizedOrigin, normalizedAllowed);
  });
};

const corsOptions = {
  origin: function (origin, callback) {
    // Permitir requests sin origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (isAllowedOrigin(origin)) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  optionsSuccessStatus: 200
};

// Configurar Socket.IO con CORS
const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (isAllowedOrigin(origin)) {
        return callback(null, true);
      }
      callback(new Error('Not allowed by CORS'));
    },
    methods: ["GET", "POST"]
  }
});

const getUserRoom = (userId) => `user:${String(userId)}`;

const normalizeSocketUserId = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return String(parsed);
};

const parseCookieHeader = (cookieHeader = '') => {
  if (!cookieHeader || typeof cookieHeader !== 'string') return {};

  return cookieHeader
    .split(';')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .reduce((acc, entry) => {
      const separatorIndex = entry.indexOf('=');
      if (separatorIndex === -1) return acc;
      const key = entry.slice(0, separatorIndex).trim();
      const value = entry.slice(separatorIndex + 1).trim();
      if (!key) return acc;
      acc[key] = decodeURIComponent(value);
      return acc;
    }, {});
};

const extractHandshakeAccessToken = (socket) => {
  const authTokenRaw = socket.handshake?.auth?.token;
  if (typeof authTokenRaw === 'string' && authTokenRaw.trim()) {
    return authTokenRaw.replace(/^Bearer\s+/i, '').trim();
  }

  const cookieHeader = socket.handshake?.headers?.cookie || '';
  const cookies = parseCookieHeader(cookieHeader);
  if (cookies.access_token) {
    return cookies.access_token;
  }

  return null;
};

const getAuthenticatedSocketUserId = (socket) => {
  const token = extractHandshakeAccessToken(socket);
  if (!token) return null;

  try {
    const payload = jwt.verify(token, JWT_SECRET, { issuer: 'greenbit-api' });
    return normalizeSocketUserId(payload?.id);
  } catch {
    return null;
  }
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use(express.json({ 
  limit: process.env.MAX_FILE_SIZE || '10mb' 
}));

// Servir archivos estáticos (imágenes)
const uploadDir = process.env.UPLOAD_DIR || 'uploads';
app.use('/uploads', express.static(uploadDir));

// ========================================
// RUTAS CENTRALIZADAS
// ========================================
// Todas las rutas están organizadas en un único lugar: Routes/index.js
// Se montan aquí con los prefijos de API correspondientes
app.use('/api', routes);

// Ruta de health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Ruta para verificar el estado de la base de datos
app.get('/api/db-status', async (req, res) => {
  const isConnected = await checkConnection();
  res.json({
    database: {
      connected: isConnected,
      host: process.env.DB_HOST,
      status: isConnected ? 'online' : 'offline'
    },
    environment: process.env.NODE_ENV,
    timestamp: new Date()
  });
});

// Configurar Socket.IO
io.on('connection', (socket) => {
  console.log('[Socket.IO] Usuario conectado:', socket.id);
  socket.authUserId = getAuthenticatedSocketUserId(socket);

  if (socket.authUserId) {
    const authRoom = getUserRoom(socket.authUserId);
    socket.join(authRoom);
    socket.userId = socket.authUserId;
    console.log(`[Socket.IO] Socket autenticado para usuario ${socket.authUserId} en sala ${authRoom}`);
  }

  // El cliente debe enviar su userId al conectarse
  socket.on('join', (userId) => {
    const normalizedUserId = normalizeSocketUserId(userId);
    if (!normalizedUserId) {
      console.warn(`[Socket.IO] Join ignorado para socket ${socket.id}: userId inválido (${userId})`);
      return;
    }

    if (socket.authUserId && socket.authUserId !== normalizedUserId) {
      console.warn(`[Socket.IO] Join denegado para socket ${socket.id}: intentó userId ${normalizedUserId} distinto a autenticado ${socket.authUserId}`);
      return;
    }

    const nextRoom = getUserRoom(normalizedUserId);
    const previousRoom = socket.userId ? getUserRoom(socket.userId) : null;

    if (previousRoom && previousRoom !== nextRoom) {
      socket.leave(previousRoom);
    }

    socket.join(nextRoom);
    socket.userId = normalizedUserId;
    console.log(`[Socket.IO] Usuario ${normalizedUserId} unido a sala ${nextRoom} con socket ${socket.id}`);
  });

  socket.on('disconnect', () => {
    if (socket.userId) {
      console.log(`[Socket.IO] Usuario ${socket.userId} desconectado`);
    }
  });
});

// Función para enviar notificación en tiempo real
export const sendRealTimeNotification = (userId, notification) => {
  const normalizedUserId = normalizeSocketUserId(userId);
  if (!normalizedUserId) {
    console.warn(`[Socket.IO] Envío omitido: userId inválido (${userId})`);
    return false;
  }

  const room = getUserRoom(normalizedUserId);
  const socketsInRoom = io.sockets.adapter.rooms.get(room);
  const connectedSockets = socketsInRoom?.size || 0;

  if (connectedSockets > 0) {
    io.to(room).emit('notification', notification);
    console.log(`[Socket.IO] Notificación enviada a usuario ${normalizedUserId} (${connectedSockets} socket(s)):`, notification.title);
    return true;
  }

  console.log(`[Socket.IO] Usuario ${normalizedUserId} no conectado`);
  return false;
};

const PORT = process.env.PORT || 3000;

// ========================================
// MIDDLEWARE DE MANEJO DE ERRORES
// ========================================

// 404 handler - debe ir antes del error handler
app.use((req, res) => {
  console.warn(`[404] ${req.method} ${req.path}`);
  res.status(404).json({ 
    success: false, 
    error: 'Ruta no encontrada: ' + req.method + ' ' + req.path 
  });
});

// Error handler global - SIEMPRE debe ser el último middleware
app.use((err, req, res, next) => {
  const status = err.status || 500;

  console.error('[ERROR GLOBAL]:', {
    message: err.message,
    status,
    path: req.path,
    method: req.method,
    stack: err.stack.split('\n').slice(0, 3).join('\n')
  });
  
  res.status(status).json({ 
    success: false, 
    error: status >= 500 ? 'Error interno del servidor' : (err.message || 'Solicitud inválida')
  });
});

server.listen(PORT, async () => {
  console.log(`🚀 ${process.env.APP_NAME || 'GreenBit'} v${process.env.APP_VERSION || '1.0.0'}`);
  console.log(`🌐 Servidor + Socket.IO escuchando en puerto ${PORT}`);
  console.log(`📱 Frontend permitido desde: ${process.env.FRONTEND_URL}`);
  console.log(`🗄️  Base de datos: ${process.env.DB_HOST}/${process.env.DB_NAME}`);
  console.log(`📂 Directorio de uploads: ${uploadDir}`);
  console.log(`🔔 Sistema de notificaciones en tiempo real activo`);
  
  // Verificar conexión de email al iniciar
  const emailReady = await verifyEmailConnection();
  if (emailReady) {
    console.log("📧 Servicio de email listo para enviar credenciales");
  } else {
    console.log("⚠️ Servicio de email no disponible - revisa tu configuración .env");
  }

  console.log("✅ Servidor completamente iniciado");
});
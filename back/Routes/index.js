/**
 * RUTAS CENTRALIZADAS - Green Bit API
 * 
 * Este archivo contiene TODAS las rutas del backend organizadas en un único lugar.
 * Incluye SOLO los endpoints que se usan realmente en el frontend.
 * 
 * NOTA: Las rutas NO incluyen el prefijo /api/ porque se montan con app.use('/api', routes)
 * El prefijo /api/ se agregará en server.js
 * 
 * IMPORTANTE: Las rutas están ordenadas por especificidad (específicas PRIMERO, genéricas DESPUÉS)
 * para evitar conflictos con parámetros dinámicos
 * 
 * Estructura:
 * - 17 rutas de USUARIOS
 * - 5 rutas de MATERIALES
 * - 7 rutas de SOLICITUDES
 * - 12 rutas de CITAS
 * - 3 rutas de NOTIFICACIONES
 * - 4 rutas de PUNTUACIONES
 * - 6 rutas de ANUNCIOS
 * - 2 rutas de UPLOAD
 * - 7 rutas de RANKING
 * - 3 rutas de REPORTES
 * - 1 ruta de SISTEMA
 * = 67 rutas totales
 */

import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

// Importar controllers
import * as userController from '../Controllers/userController.js';
import * as materialController from '../Controllers/materialController.js';
import * as requestController from '../Controllers/requestController.js';
import * as appointmentController from '../Controllers/appointmentController.js';
import * as notificationController from '../Controllers/notificationController.js';
import * as scoreController from '../Controllers/scoreController.js';
import * as announcementController from '../Controllers/announcementController.js';
import * as uploadController from '../Controllers/uploadController.js';
import rankingController from '../Controllers/rankingController.js';
import * as reportController from '../Controllers/reportController.js';
import * as requestReportController from '../Controllers/requestReportController.js';
import * as userMaterialController from '../Controllers/userMaterialController.js';
import appConfigRoutes from './appConfigRoutes.js';
import * as securityController from '../Controllers/securityController.js';
import {
  requireAuth,
  requireAdmin,
  requireOwnershipByParam,
  requireOwnershipByBody
} from '../shared/auth.js';
import {
  loginRateLimiter,
  forgotPasswordRateLimiter,
  checkEmailRateLimiter
} from '../shared/rateLimiter.js';

// Configuración de multer para uploads
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const tempDir = path.join(__dirname, '../uploads/temp');
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}_${file.originalname}`);
  }
});

const uploadMiddleware = multer({
  storage: uploadStorage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido'));
    }
  }
});

const router = express.Router();

// ==========================================
// USUARIOS (17 rutas)
// ==========================================

// Auth
router.post('/users/login', loginRateLimiter, userController.loginUser);
router.post('/users/refresh-token', userController.refreshToken);
router.post('/users/logout', requireAuth, userController.logoutUser);

// Registro
router.post('/users', userController.createUser);
router.post('/users/collector', userController.createCollectorUser);
router.post('/users/institution', userController.createUserWithInstitution);
router.post('/users/institution-admin', requireAuth, requireAdmin, userController.createUserWithInstitutionByAdmin);

// Recuperar contraseña
router.post('/users/forgotpassword', forgotPasswordRateLimiter, userController.forgotPassword);

// Cambiar contraseña
router.put('/users/changePassword/:userId', requireAuth, requireOwnershipByParam('userId'), userController.changePassword);

// Gestión de recolectores - ESPECÍFICAS PRIMERO
router.get('/users/collectors/pending/institution', userController.getCollectorsPendingWithInstitution);
router.get('/users/collectors/pending', userController.getCollectorsPendingWithPerson);

// Gestión de instituciones - RUTAS CON PATHS FIJOS ANTES QUE CON PARÁMETROS
router.get('/users/institution', userController.getUsersWithInstitution);
router.post('/users/institution/approve/:id', requireAuth, requireAdmin, userController.approveInstitution);
router.post('/users/institution/reject/:id', requireAuth, requireAdmin, userController.rejectInstitution);
router.delete('/users/institution/:id', requireAuth, requireAdmin, userController.deleteUserWithInstitution);

// Gestión de usuarios - RUTAS CON PATHS FIJOS ANTES QUE CON PARÁMETROS
router.get('/users/withPerson', userController.getUsersPerson);
router.post('/users/approve/:id', requireAuth, requireAdmin, userController.approveUser);
router.post('/users/reject/:id', requireAuth, requireAdmin, userController.rejectUser);

// CRÍTICO: Esta ruta DEBE ir ANTES de /users/:id para que no sea interceptada
router.get('/users/withInstitution/:id', userController.getUserWithInstitutionById);

// Rutas genéricas con parámetros dinámicos - AL FINAL
router.get('/users/person/:id', requireAuth, requireOwnershipByParam('id'), userController.getUsersPerson);
router.get('/users/check-email/:email', checkEmailRateLimiter, userController.checkEmailExists); 
router.put('/users/:id/role', requireAuth, requireAdmin, userController.updateUserRole);
router.get('/users/:id', requireAuth, requireOwnershipByParam('id'), userController.getUserById);
router.delete('/users/:id', requireAuth, requireAdmin, userController.deleteUser);

// ==========================================
// MATERIALES (5 rutas)
// ==========================================
// Rutas específicas PRIMERO
router.get('/material/:id', materialController.getMaterialById);
// Rutas genéricas DESPUÉS
router.get('/material', materialController.getMaterials);
router.post('/material', materialController.createMaterial);
router.put('/material/:id', materialController.updateMaterial);
router.delete('/material/:id', materialController.deleteMaterial);

// ==========================================
// FAVORITOS DE MATERIALES (4 rutas)
// ==========================================
router.get('/user-materials/check/:userId/:materialId', requireAuth, requireOwnershipByParam('userId'), userMaterialController.checkFavoriteMaterial);
router.get('/user-materials/:userId/matching-requests-count', requireAuth, requireOwnershipByParam('userId'), userMaterialController.getMatchingRequestsCount);
router.get('/user-materials/:userId', requireAuth, requireOwnershipByParam('userId'), userMaterialController.getUserFavoriteMaterials);
router.post('/user-materials', requireAuth, requireOwnershipByBody('userId'), userMaterialController.addFavoriteMaterial);
router.delete('/user-materials/:userId/:materialId', requireAuth, requireOwnershipByParam('userId'), userMaterialController.removeFavoriteMaterial);

// ==========================================
// SOLICITUDES (7 rutas)
// ==========================================
// Rutas específicas PRIMERO
router.get('/request/user/:userId/state', requireAuth, requireOwnershipByParam('userId'), requestController.getRequestsByUserAndState);
router.post('/request/:id/schedule', appointmentController.createNewAppointment);
router.get('/request/:id/schedule', requestController.getRequestWithSchedule);
router.put('/request/:id/state', requestController.updateRequestState);
router.get('/request/:id', requestController.getRequestById);
// Rutas genéricas DESPUÉS
router.post('/request', requireAuth, requestController.upload.array('photos'), requireOwnershipByBody('idUser'), requestController.createRequest);
router.get('/request', requestController.getAllRequests);

// ==========================================
// CITAS (12 rutas)
// ==========================================
// Rutas específicas PRIMERO
router.post('/appointments/schedule', requireAuth, requireOwnershipByBody('collectorId'), appointmentController.createNewAppointment);
router.get('/appointments/collector/:collectorId', requireAuth, requireOwnershipByParam('collectorId'), appointmentController.getAppointmentsByCollector);
router.get('/appointments/recycler/:recyclerId', requireAuth, requireOwnershipByParam('recyclerId'), appointmentController.getAppointmentsByRecycler);
router.put('/appointments/:id/accept', appointmentController.acceptAppointmentEndpoint);
router.put('/appointments/:id/reject', appointmentController.rejectAppointmentEndpoint);
router.put('/appointments/:id/cancel', requireAuth, requireOwnershipByBody('userId'), appointmentController.cancelAppointment);
router.put('/appointments/:id/complete', appointmentController.completeAppointmentEndpoint);
// Rutas genéricas DESPUÉS
router.get('/appointments/:id', appointmentController.getAppointmentById);
router.put('/appointments/:id', appointmentController.updateAppointmentStatus);
router.post('/appointments', appointmentController.createAppointment);
router.get('/appointments', appointmentController.getAppointments);

// ==========================================
// NOTIFICACIONES (3 rutas)
// ==========================================
router.get('/notifications/user/:userId', requireAuth, requireOwnershipByParam('userId'), notificationController.getUserNotifications);
router.get('/notifications/unread/:userId', requireAuth, requireOwnershipByParam('userId'), notificationController.getUnreadCount);
router.put('/notifications/read', requireAuth, requireOwnershipByBody('userId'), notificationController.markNotificationAsRead);

// ==========================================
// PUNTUACIONES (4 rutas)
// ==========================================
router.post('/score', requireAuth, requireOwnershipByBody('ratedByUserId'), scoreController.createScore);
router.get('/score/check/:appointmentId/:userId', requireAuth, requireOwnershipByParam('userId'), scoreController.checkUserRated);
router.get('/score/appointment/:appointmentId', requireAuth, scoreController.getAppointmentScores);
router.get('/score/user/:userId/total', requireAuth, requireOwnershipByParam('userId'), scoreController.getUserTotalScore);
router.get('/score/user/:userId/average', requireAuth, requireOwnershipByParam('userId'), scoreController.getUserAverageRating);

// ==========================================
// ANUNCIOS (6 rutas)
// ==========================================
// Rutas específicas PRIMERO
router.get('/announcements/role/:role', announcementController.getAnnouncementsByRole);
router.get('/announcements/:id', announcementController.getAnnouncementById);
// Rutas genéricas DESPUÉS
router.get('/announcements', announcementController.getAllAnnouncements);
router.post('/announcements', announcementController.createAnnouncement);
router.put('/announcements/:id', announcementController.updateAnnouncement);
router.delete('/announcements/:id', announcementController.deleteAnnouncement);

// ==========================================
// UPLOAD (3 rutas)
// ==========================================
// Rutas específicas PRIMERO
router.post('/upload/announcement', uploadMiddleware.single('image'), uploadController.uploadAnnouncementImage);
router.get('/upload/announcement/:filename', uploadController.getAnnouncementImageInfo);
router.delete('/upload/announcement/:filename', uploadController.deleteAnnouncementImage);

// ==========================================
// RANKING (7 rutas)
// ==========================================
// Rutas específicas PRIMERO
router.get('/ranking/periods/active-or-last', rankingController.getActiveOrLastPeriod);
router.post('/ranking/periods/close', rankingController.closePeriod);
router.get('/ranking/live/:periodo_id', rankingController.getLiveRankingByPeriod);
router.get('/ranking/tops/:periodo_id', rankingController.getTopsByPeriod);
router.get('/ranking/history/:periodo_id', rankingController.getHistory);
// Rutas genéricas DESPUÉS
router.get('/ranking/periods', rankingController.getPeriods);
router.post('/ranking/periods', rankingController.createPeriod);

// ==========================================
// REPORTES (3 rutas)
// ==========================================
router.get('/reports/materiales', requireAuth, requireAdmin, reportController.getMaterialesReport);
router.get('/reports/scores', requireAuth, requireAdmin, reportController.getScoresReport);
router.get('/reports/recolecciones', requireAuth, requireAdmin, reportController.getRecolectionsReport);

// ==========================================
// REPORTES DE SOLICITUD (6 rutas)
// ==========================================
router.get('/request-reports', requireAuth, requireAdmin, requestReportController.getAllReports);
router.post('/request-reports', requireAuth, requireOwnershipByBody('prosecutorId'), requestReportController.createReport);
router.get('/request-reports/check/:requestId/:prosecutorId', requireAuth, requireOwnershipByParam('prosecutorId'), requestReportController.checkUserReported);
router.get('/request-reports/request/:requestId', requestReportController.getReportsByRequest);
router.get('/request-reports/prosecutor/:prosecutorId', requireAuth, requireOwnershipByParam('prosecutorId'), requestReportController.getReportsByProsecutor);
router.get('/request-reports/:id', requireAuth, requireAdmin, requestReportController.getReportById);
router.patch('/request-reports/:id/state', requireAuth, requireAdmin, requestReportController.updateReportStateEndpoint);
router.delete('/request-reports/:id', requireAuth, requireAdmin, requestReportController.deleteReport);

// ==========================================
// SISTEMA (1 ruta)
// ==========================================
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ==========================================
// APP CONFIG (2 rutas)
// ==========================================
router.use('/app-config', appConfigRoutes);

// ==========================================
// SEGURIDAD ADMIN (8 rutas)
// ==========================================
router.get('/security/config', requireAuth, requireAdmin, securityController.listAppConfig);
router.get('/security/config/:key', requireAuth, requireAdmin, securityController.getAppConfig);
router.put('/security/config/:key', requireAuth, requireAdmin, securityController.upsertAppConfig);
router.get('/security/suspicious-activity/grouped', requireAuth, requireAdmin, securityController.listSuspiciousActivityGrouped);
router.get('/security/suspicious-activity/details', requireAuth, requireAdmin, securityController.listSuspiciousActivityDetails);
router.get('/security/suspicious-activity', requireAuth, requireAdmin, securityController.listSuspiciousActivity);
router.get('/security/audit-log', requireAuth, requireAdmin, securityController.listAudit);
router.get('/security/blacklist', requireAuth, requireAdmin, securityController.listBlacklist);
router.post('/security/blacklist', requireAuth, requireAdmin, securityController.addBlacklist);
router.patch('/security/blacklist/:id/deactivate', requireAuth, requireAdmin, securityController.deactivateBlacklist);

export default router;

import express from 'express';
import * as requestReportController from '../Controllers/requestReportController.js';

const router = express.Router();

// Crear un reporte
router.post('/', requestReportController.createReport);

// Verificar si un usuario ya reportó una solicitud
router.get('/check/:requestId/:prosecutorId', requestReportController.checkUserReported);

// Obtener reportes por solicitud
router.get('/request/:requestId', requestReportController.getReportsByRequest);

// Obtener reportes por usuario que reporta
router.get('/prosecutor/:prosecutorId', requestReportController.getReportsByProsecutor);

// Obtener reporte por ID
router.get('/:id', requestReportController.getReportById);

// Desactivar reporte (soft delete)
router.delete('/:id', requestReportController.deleteReport);

export default router;

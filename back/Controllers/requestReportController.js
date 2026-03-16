import * as RequestReportModel from '../Models/requestReportModel.js';
import { Validator } from '../shared/Validator.js';

const MAX_REPORT_DESCRIPTION_LENGTH = 150;
const MIN_REPORT_DESCRIPTION_LENGTH = 10;

/**
 * Crear un reporte sobre una solicitud
 * POST /api/request-reports
 * Body: { reason, description, prosecutorId, requestId }
 */
export const createReport = async (req, res) => {
	try {
		const { reason, description, prosecutorId, requestId } = req.body;
		const normalizedReason = Validator.normalizeSpaces(reason || '');
		const normalizedDescription = Validator.normalizeDescription(description || '');

		console.log('[INFO] requestReportController.createReport - Request body:', req.body);

		// Validaciones básicas
		if (!normalizedReason || !prosecutorId || !requestId) {
			return res.status(400).json({
				success: false,
				error: 'Faltan campos requeridos: reason, prosecutorId, requestId'
			});
		}

		const descriptionError = Validator.validateDescription(
			normalizedDescription,
			MAX_REPORT_DESCRIPTION_LENGTH,
			MIN_REPORT_DESCRIPTION_LENGTH
		);

		if (descriptionError) {
			return res.status(400).json({
				success: false,
				error: descriptionError
			});
		}

		// Verificar si el usuario ya reportó esta solicitud
		const alreadyReported = await RequestReportModel.hasUserReportedRequest(requestId, prosecutorId);
		if (alreadyReported) {
			return res.status(409).json({
				success: false,
				error: 'Ya has reportado esta solicitud'
			});
		}

		const reportId = await RequestReportModel.createReport(
			normalizedReason,
			normalizedDescription,
			prosecutorId,
			requestId
		);

		res.status(201).json({
			success: true,
			message: 'Reporte creado exitosamente',
			data: { id: reportId }
		});
	} catch (error) {
		console.error('[ERROR] requestReportController.createReport:', error);
		res.status(500).json({
			success: false,
			error: 'Error al crear el reporte'
		});
	}
};

/**
 * Obtener todos los reportes (vista admin)
 * GET /api/request-reports
 */
export const getAllReports = async (req, res) => {
	try {
		const reports = await RequestReportModel.getAllReports();

		res.json({
			success: true,
			data: reports
		});
	} catch (error) {
		console.error('[ERROR] requestReportController.getAllReports:', error);
		res.status(500).json({
			success: false,
			error: 'Error al obtener reportes'
		});
	}
};

/**
 * Obtener un reporte por ID
 * GET /api/request-reports/:id
 */
export const getReportById = async (req, res) => {
	try {
		const { id } = req.params;

		const report = await RequestReportModel.getReportById(id);

		if (!report) {
			return res.status(404).json({
				success: false,
				error: 'Reporte no encontrado'
			});
		}

		res.json({
			success: true,
			data: report
		});
	} catch (error) {
		console.error('[ERROR] requestReportController.getReportById:', error);
		res.status(500).json({
			success: false,
			error: 'Error al obtener el reporte'
		});
	}
};

/**
 * Obtener todos los reportes de una solicitud
 * GET /api/request-reports/request/:requestId
 */
export const getReportsByRequest = async (req, res) => {
	try {
		const { requestId } = req.params;

		const reports = await RequestReportModel.getReportsByRequest(requestId);

		res.json({
			success: true,
			data: reports
		});
	} catch (error) {
		console.error('[ERROR] requestReportController.getReportsByRequest:', error);
		res.status(500).json({
			success: false,
			error: 'Error al obtener los reportes de la solicitud'
		});
	}
};

/**
 * Obtener todos los reportes hechos por un usuario
 * GET /api/request-reports/prosecutor/:prosecutorId
 */
export const getReportsByProsecutor = async (req, res) => {
	try {
		const { prosecutorId } = req.params;

		const reports = await RequestReportModel.getReportsByProsecutor(prosecutorId);

		res.json({
			success: true,
			data: reports
		});
	} catch (error) {
		console.error('[ERROR] requestReportController.getReportsByProsecutor:', error);
		res.status(500).json({
			success: false,
			error: 'Error al obtener los reportes del usuario'
		});
	}
};

/**
 * Verificar si un usuario ya reportó una solicitud específica
 * GET /api/request-reports/check/:requestId/:prosecutorId
 */
export const checkUserReported = async (req, res) => {
	try {
		const { requestId, prosecutorId } = req.params;

		const hasReported = await RequestReportModel.hasUserReportedRequest(requestId, prosecutorId);

		res.json({
			success: true,
			data: { hasReported }
		});
	} catch (error) {
		console.error('[ERROR] requestReportController.checkUserReported:', error);
		res.status(500).json({
			success: false,
			error: 'Error al verificar el reporte'
		});
	}
};

/**


/**
 * Actualizar estado de un reporte
 * PATCH /api/request-reports/:id/state
 * Body: { state: number }
 */
export const updateReportStateEndpoint = async (req, res) => {
	try {
		const { id } = req.params;
		const { state } = req.body;

		if (state === undefined || state === null) {
			return res.status(400).json({ success: false, error: 'Campo state requerido' });
		}

		const existing = await RequestReportModel.getReportById(id);
		if (!existing) {
			return res.status(404).json({ success: false, error: 'Reporte no encontrado' });
		}

		const updated = await RequestReportModel.updateReportState(id, state);
		if (!updated) {
			return res.status(400).json({ success: false, error: 'No se pudo actualizar el estado del reporte' });
		}

		res.json({ success: true, message: 'Estado del reporte actualizado' });
	} catch (error) {
		console.error('[ERROR] requestReportController.updateReportStateEndpoint:', error);
		res.status(500).json({ success: false, error: 'Error al actualizar estado del reporte' });
	}
};

/**
 * Desactivar un reporte (soft delete)
 * DELETE /api/request-reports/:id
 */
export const deleteReport = async (req, res) => {
	try {
		const { id } = req.params;

		const existing = await RequestReportModel.getReportById(id);
		if (!existing) {
			return res.status(404).json({
				success: false,
				error: 'Reporte no encontrado'
			});
		}

		const deleted = await RequestReportModel.updateReportState(id, 0);

		if (!deleted) {
			return res.status(400).json({
				success: false,
				error: 'No se pudo desactivar el reporte'
			});
		}

		res.json({
			success: true,
			message: 'Reporte desactivado exitosamente'
		});
	} catch (error) {
		console.error('[ERROR] requestReportController.deleteReport:', error);
		res.status(500).json({
			success: false,
			error: 'Error al desactivar el reporte'
		});
	}
};

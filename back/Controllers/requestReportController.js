import * as RequestReportModel from '../Models/requestReportModel.js';

/**
 * Crear un reporte sobre una solicitud
 * POST /api/request-reports
 * Body: { reason, description?, prosecutorId, requestId }
 */
export const createReport = async (req, res) => {
	try {
		const { reason, description, prosecutorId, requestId } = req.body;

		console.log('[INFO] requestReportController.createReport - Request body:', req.body);

		// Validaciones básicas
		if (!reason || !prosecutorId || !requestId) {
			return res.status(400).json({
				success: false,
				error: 'Faltan campos requeridos: reason, prosecutorId, requestId'
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
			reason,
			description || null,
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

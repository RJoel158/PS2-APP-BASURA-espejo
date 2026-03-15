import db from '../config/DBConnect.js';

/**
 * Crear un nuevo reporte
 * @param {string} reason - Razón del reporte
 * @param {string|null} description - Descripción del reporte
 * @param {number} prosecutorId - Usuario que reporta
 * @param {number} requestId - Solicitud reportada
 * @returns {Promise<number>} ID del reporte creado
 */
export const createReport = async (reason, description = null, prosecutorId, requestId) => {
	try {
		console.log('[INFO] RequestReportModel.createReport - Parameters:', {
			reason,
			description,
			prosecutorId,
			requestId
		});

		const query = `
			INSERT INTO report_info (
				reason,
				description,
				prosecutorId,
				requestId,
				reportedAt
			)
			VALUES (?, ?, ?, ?, NOW())
		`;

		const [result] = await db.query(query, [
			reason,
			description,
			prosecutorId,
			requestId
		]);

		console.log('[INFO] ReportModel.createReport - Success!', {
			insertId: result.insertId,
			prosecutorId,
			requestId
		});

		return result.insertId;
	} catch (err) {
		console.error('[ERROR] ReportModel.createReport:', err);
		console.error('[ERROR] Query parameters:', {
			reason,
			description,
			prosecutorId,
			requestId
		});
		throw err;
	}
};

/**
 * Verificar si un usuario ya reportó una solicitud específica
 * @param {number} requestId
 * @param {number} prosecutorId
 * @returns {Promise<boolean>}
 */
export const hasUserReportedRequest = async (requestId, prosecutorId) => {
	try {
		const query = `
			SELECT COUNT(*) as count
			FROM report_info
			WHERE requestId = ?
				AND prosecutorId = ?
				AND state = 1
		`;

		const [rows] = await db.query(query, [requestId, prosecutorId]);
		return rows[0].count > 0;
	} catch (err) {
		console.error('[ERROR] ReportModel.hasUserReportedRequest:', err);
		throw err;
	}
};

/**
 * Obtener reportes por solicitud
 * @param {number} requestId 
 * @returns {Promise<Array>}
 */
export const getReportsByRequest = async (requestId) => {
	try {
		const query = `
			SELECT
				r.id,
				r.reason,
				r.description,
				r.requestId,
				r.prosecutorId,
				r.reportedAt,
				r.state,
				COALESCE(CONCAT(p.firstname, ' ', p.lastname), u.email) as prosecutorName
			FROM report_info r
			LEFT JOIN users u ON r.prosecutorId = u.id
			LEFT JOIN person p ON p.userId = u.id
			WHERE r.requestId = ?
				AND r.state = 1
			ORDER BY r.reportedAt DESC
		`;

		const [rows] = await db.query(query, [requestId]);
		return rows;
	} catch (err) {
		console.error('[ERROR] ReportModel.getReportsByRequest:', err);
		throw err;
	}
};

/**
 * Obtener reportes creados por un usuario (prosecutor)
 * @param {number} prosecutorId - ID del usuario que reporta
 * @returns {Promise<Array>}
 */
export const getReportsByProsecutor = async (prosecutorId) => {
	try {
		const query = `
			SELECT
				r.id,
				r.reason,
				r.description,
				r.requestId,
				r.prosecutorId,
				r.reportedAt,
				r.state,
				m.name as materialName,
				req.description as requestDescription
			FROM report_info r
			LEFT JOIN request req ON req.id = r.requestId
			LEFT JOIN material m ON m.id = req.materialId
			WHERE r.prosecutorId = ?
				AND r.state = 1
			ORDER BY r.reportedAt DESC
		`;

		const [rows] = await db.query(query, [prosecutorId]);
		return rows;
	} catch (err) {
		console.error('[ERROR] ReportModel.getReportsByProsecutor:', err);
		throw err;
	}
};

/**
 * Obtener un reporte por ID
 * @param {number} reportId
 * @returns {Promise<Object|null>}
 */
export const getReportById = async (reportId) => {
	try {
		const query = `
			SELECT
				id,
				reason,
				description,
				requestId,
				prosecutorId,
				reportedAt,
				state
			FROM report_info
			WHERE id = ?
			LIMIT 1
		`;

		const [rows] = await db.query(query, [reportId]);
		return rows[0] || null;
	} catch (err) {
		console.error('[ERROR] ReportModel.getReportById:', err);
		throw err;
	}
};



/**
 * Actualizar estado de un reporte (soft delete)
 * @param {number} reportId - ID del reporte
 * @param {number} state - Nuevo estado
 * @returns {Promise<boolean>}
 */
export const updateReportState = async (reportId, state) => {
	try {
		const query = `
			UPDATE report_info
			SET state = ?
			WHERE id = ?
		`;

		const [result] = await db.query(query, [state, reportId]);
		return result.affectedRows > 0;
	} catch (err) {
		console.error('[ERROR] ReportModel.updateReportState:', err);
		throw err;
	}
};
